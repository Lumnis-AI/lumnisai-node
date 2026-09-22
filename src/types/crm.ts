/**
 * CRM Sync API types.
 *
 * These types map to the Python backend endpoints under /v1/crm.
 * Provider list mirrors `CrmProvider` in src/app/api/schemas/crm_schemas.py.
 *
 * All types are prefixed with `Crm` to avoid collisions with the
 * messaging-API prospect-sync types (`SyncProspectRequest`,
 * `SyncProspectResponse` in `./messaging`), which serve a different
 * purpose (LinkedIn/email conversation sync, not CRM linkage).
 */

// ==================== Providers ====================

/**
 * Connected CRM systems supported by the sync API.
 *
 * Capability notes:
 * - `attio` supports both email and LinkedIn-URL person search.
 * - `hubspot` reconciles via email and name+company; LinkedIn URLs are
 *   stored on create but are not directly searchable in live CRM calls.
 *   The local `crm_contacts` ledger (see contacts sync) improves match-batch
 *   and search/campaign exclusion without live HubSpot lookups.
 */
export type CrmProvider = 'attio' | 'hubspot'

// ==================== contacts ledger sync ====================

/**
 * Trigger a full mirror of the owner's CRM contact book into the local
 * `crm_contacts` ledger (used for fast exclusion/matching; not a live CRM call).
 */
export interface CrmContactsSyncRequest {
  /** UUID or email of the CRM owner whose connection is synced. */
  userId: string
  provider: CrmProvider
}

export interface CrmContactsSyncResponse {
  /** `started` — sync claimed; `already_in_progress` — another run holds the lock. */
  status: 'started' | 'already_in_progress'
  provider: CrmProvider
}

/** Sync freshness for an owner+provider ledger mirror. */
export interface CrmContactsSyncStatusResponse {
  provider: CrmProvider
  connected: boolean
  syncInProgress: boolean
  lastReconciledAt?: string | null
  syncedCount: number
  /** Null in v1 — LIST APIs do not return a reliable total. */
  totalInCrm?: number | null
}

// ==================== CRM access grants (org sharing) ====================

/**
 * Grant or revoke a member's access to an owner's CRM. Per-owner — all of that
 * owner's synced CRMs inherit it — and a self-grant is a no-op, because a
 * member always reaches their own CRM.
 *
 * One grant covers every read that names another owner: search and campaign
 * exclusion against their `crm_contacts` ledger, and the `crmUserId` an
 * `account_monitor` run reads relationship context from. Both users must
 * belong to the authenticated tenant. The `exclusion` naming is the original
 * route's, kept for compatibility.
 */
export interface CrmExclusionGrantRequest {
  /** Member (UUID or email) who receives access to the owner's CRM. */
  memberUserId: string
  /** CRM owner (UUID or email) sharing their CRM. */
  ownerUserId: string
}

export interface CrmExclusionGrantResponse {
  memberUserId: string
  ownerUserId: string
  status: 'granted' | 'revoked'
}

export interface CrmExclusionGrantListResponse {
  memberUserId: string
  /** Explicitly granted owners only — the member's own CRM is implicit. */
  ownerUserIds: string[]
}

// ==================== prospect sync ====================

/**
 * Contact attributes to send with a prospect sync.
 *
 * Every field is optional. The server fills omitted values from its campaign
 * and profile data when available. Supply either `fullName` or
 * `firstName` + `lastName`; `fullName` takes precedence when both are set.
 */
export interface CrmContactInput {
  fullName?: string
  firstName?: string
  lastName?: string
  email?: string
  jobTitle?: string
  company?: string
  /** Accepted by the API but not mapped to a CRM field in v1. */
  location?: string
}

/**
 * Push one Lumnis prospect to the connected CRM.
 *
 * Caller-supplied contact attributes take precedence. The server gap-fills
 * omitted values from campaign/profile data and creates the CRM record when
 * no existing contact matches.
 * Provider-id/URN LinkedIn URLs are resolved to vanity before reconcile.
 */
export interface CrmSyncProspectRequest {
  /** UUID or email of the user whose CRM connection executes the call. */
  userId: string
  provider: CrmProvider
  /** Must contain `linkedin.com/in/`. */
  linkedinUrl: string
  /** Optional contact details; omitted fields are gap-filled server-side. */
  contact?: CrmContactInput
  /**
   * Provider-native CRM property/attribute names mapped to string values.
   * These are applied on create and fill empty fields on an existing record.
   */
  customFields?: Record<string, string>
}

export interface CrmSyncProspectResponse {
  /**
   * `linked` — record already existed in the CRM (matched by email or
   * LinkedIn URL) and was linked back to the prospect.
   * `created` — no existing match, a new CRM record was created.
   */
  action: 'linked' | 'created'
  /** Provider-native record id (Attio record_id, HubSpot contact id). */
  crmRecordId: string
  /** Stable URL that opens the record in the CRM UI. */
  crmUrl: string
}

// ==================== match-batch ====================

/**
 * Bulk-check whether prospects are already in the CRM.
 *
 * Server-side fan-out is bounded by the
 * `CRM_MATCH_LIVE_SEARCH_PARALLELISM` setting; the array max
 * (1000) is a Pydantic guard, not a UX cap.
 */
export interface CrmMatchBatchRequest {
  userId: string
  provider: CrmProvider
  /** 1..1000 LinkedIn profile URLs. */
  linkedinUrls: string[]
}

export interface CrmMatchedProspect {
  /** Echoed input URL (in original casing/form). */
  linkedinUrl: string
  linked: boolean
  /** Present iff `linked` is true. */
  crmRecordId?: string | null
  crmUrl?: string | null
}

export interface CrmMatchBatchResponse {
  matches: CrmMatchedProspect[]
}

// ==================== account context ====================

/** Whether a provider source can support a trustworthy conclusion. */
export type CrmAccountContextSourceStatus
  = | 'complete'
    | 'empty_complete'
    | 'degraded'
    | 'not_configured'

/** Cross-provider deal-stage classification; native stage values stay intact. */
export type CrmAccountContextStageClass
  = | 'active'
    | 'terminal_won'
    | 'terminal_lost'
    | 'non_blocking'
    | 'unknown'

/** Interpreted account-level sales state. */
export type CrmAccountContextSalesState
  = | 'active_pipeline'
    | 'existing_customer'
    | 'marketing_only'
    | 'no_active_pipeline'
    | 'not_found'
    | 'unknown'

/** How a candidate was matched to a provider account. */
export type CrmAccountContextMatchMethod
  = | 'exact_person_association'
    | 'exact_domain'
    | 'exact_company_linkedin'
    | 'unique_exact_name'
    | 'ambiguous'
    | 'none'

export type CrmAccountContextMatchConfidence = 'high' | 'medium' | 'low' | 'none'

export type CrmAccountContextAssociationKind = 'direct' | 'via_contact'

export type CrmAccountContextAssociationConfidence = 'high' | 'medium' | 'low'

/** How precisely the deal-stage transition time was determined. */
export type CrmAccountContextStageChangeTimePrecision
  = | 'provider_timestamp'
    | 'observed'

/**
 * Stable candidate identity plus the best grounded current-company identity.
 *
 * At least one person identity (`linkedinUrl` or `email`) or account identity
 * (`companyDomain`, `companyLinkedinUrl`, or `companyName`) is required.
 * `inputKey` values must be unique within a batch.
 */
export interface CrmAccountContextCandidateInput {
  inputKey: string
  linkedinUrl?: string
  email?: string
  fullName?: string
  companyName?: string
  companyDomain?: string
  companyLinkedinUrl?: string
}

/**
 * Query exact-person and account/deal context across all configured CRMs.
 * The backend accepts 1..100 candidates per request; chunk longer lists
 * client-side and reassemble by `inputKey`.
 */
export interface CrmAccountContextBatchRequest {
  /** UUID or email of the CRM owner whose context is queried. */
  userId: string
  candidates: CrmAccountContextCandidateInput[]
}

export interface CrmAccountContextProviderCoverage {
  provider: CrmProvider
  accountSource: CrmAccountContextSourceStatus
  personSource: CrmAccountContextSourceStatus
  dealSource: CrmAccountContextSourceStatus
  /** ISO-8601 timestamp. */
  checkedAt: string
  /** ISO-8601 timestamp. */
  freshUntil: string
  generation: number
  errorCode?: string | null
}

export interface CrmAccountContextPersonPresence {
  provider: CrmProvider
  personId: string
  displayName: string
  recordUrl?: string | null
  relationshipClass: string
}

export interface CrmAccountContextPersonPreview {
  personId: string
  displayName: string
  recordUrl?: string | null
}

export interface CrmAccountContextDealSummary {
  dealId: string
  displayName: string
  recordUrl?: string | null
  pipelineId: string
  pipelineLabel: string
  stageId: string
  stageLabel: string
  stageClass: CrmAccountContextStageClass
  /** Previous native pipeline/stage values; absent on the first observation. */
  previousPipelineId?: string | null
  previousPipelineLabel?: string | null
  previousStageId?: string | null
  previousStageLabel?: string | null
  /** ISO-8601 timestamp for the latest observed or provider-reported transition. */
  stageChangedAt?: string | null
  stageChangeTimePrecision?: CrmAccountContextStageChangeTimePrecision | null
  associationKind: CrmAccountContextAssociationKind
  associationConfidence: CrmAccountContextAssociationConfidence
  /** Provider-native amount representation. */
  amount?: string | null
  /** ISO-8601 timestamp. */
  closeDate?: string | null
  participantCount: number
  participantPreview: CrmAccountContextPersonPreview[]
}

/** Provider-qualified account details emitted once and referenced by rows. */
export interface CrmAccountContextDetail {
  accountRef: string
  provider: CrmProvider
  accountId: string
  displayName: string
  recordUrl?: string | null
  domains: string[]
  linkedinUrl?: string | null
  website?: string | null
  industry?: string | null
  location?: string | null
  lifecycleStage?: string | null
  contactCount: number
  contactPreview: CrmAccountContextPersonPreview[]
  dealCount: number
  dealPreview: CrmAccountContextDealSummary[]
}

export interface CrmAccountContextProviderResult {
  provider: CrmProvider
  personPresence: CrmAccountContextPersonPresence[]
  accountRef?: string | null
  matchMethod: CrmAccountContextMatchMethod
  matchConfidence: CrmAccountContextMatchConfidence
  salesState: CrmAccountContextSalesState
  reasonCode: string
  coverageStatus: CrmAccountContextSourceStatus
}

export interface CrmAccountContextResult {
  inputKey: string
  salesState: CrmAccountContextSalesState
  providers: CrmAccountContextProviderResult[]
}

/** Ordered candidate results plus deduplicated provider-qualified accounts. */
export interface CrmAccountContextBatchResponse {
  results: CrmAccountContextResult[]
  accounts: CrmAccountContextDetail[]
  providerCoverage: CrmAccountContextProviderCoverage[]
}

// ==================== company reads ====================

// The company routes (`/crm/companies/*`) are live, read-only provider
// queries: nothing is written to the CRM, nothing is cached locally, and the
// `crm_contacts` ledger is not involved.
//
// Connection resolution matches the rest of this resource: `userId` is the
// requester and owns the connection by default, and `crmUserId` reads a
// colleague's CRM through an existing grant (see CrmExclusionGrantRequest).
// The owner must have exactly one active connection for the provider,
// otherwise the call is `409 crm_not_connected`.
//
// Filter syntax stays provider-native and is never translated: HubSpot takes
// `filterGroups` (AND within a group, OR between groups), Attio takes its
// record-query filter object. `filters` and each company's `properties` map
// cross the wire verbatim, without camelCase <-> snake_case rewriting,
// because those keys are the provider's own property names.

/**
 * Discover the company fields the connected CRM exposes, or one field's
 * choices. Split per provider so the response type narrows on `provider`.
 */
export interface CrmHubspotCompanyPropertiesRequest {
  provider: 'hubspot'
  /** UUID or email of the requester; the CRM owner unless `crmUserId` is set. */
  userId: string
  /**
   * Return only this field. A name the CRM does not have is
   * `404 crm_property_not_found` — not an empty list.
   */
  propertyName?: string
  /** Another tenant member's UUID or email, read through an existing CRM grant. */
  crmUserId?: string
}

export interface CrmAttioCompanyPropertiesRequest {
  provider: 'attio'
  /** UUID or email of the requester; the CRM owner unless `crmUserId` is set. */
  userId: string
  /**
   * Return only this attribute. Required to load `select`/`status` choices,
   * which the full listing omits. A slug the CRM does not have is
   * `404 crm_property_not_found` — not an empty list.
   */
  propertyName?: string
  /** Another tenant member's UUID or email, read through an existing CRM grant. */
  crmUserId?: string
}

export type CrmCompanyPropertiesRequest
  = | CrmHubspotCompanyPropertiesRequest
    | CrmAttioCompanyPropertiesRequest

/**
 * HubSpot operators, by property `type`:
 * - `string`: equality set plus `CONTAINS_TOKEN` / `NOT_CONTAINS_TOKEN`
 * - `enumeration`: equality set only
 * - `bool`: `EQ`, `NEQ`, `HAS_PROPERTY`, `NOT_HAS_PROPERTY`
 * - `number` / `date` / `datetime`: equality set plus range operators
 *
 * The equality set is `EQ`, `NEQ`, `IN`, `NOT_IN`, `HAS_PROPERTY`,
 * `NOT_HAS_PROPERTY`. A property whose type this API does not model comes back
 * with an empty `operators` array: readable, but not filterable.
 */
export type CrmHubspotFilterOperator
  = | 'EQ'
    | 'NEQ'
    | 'IN'
    | 'NOT_IN'
    | 'HAS_PROPERTY'
    | 'NOT_HAS_PROPERTY'
    | 'CONTAINS_TOKEN'
    | 'NOT_CONTAINS_TOKEN'
    | 'LT'
    | 'LTE'
    | 'GT'
    | 'GTE'
    | 'BETWEEN'

export interface CrmHubspotCompanyPropertyOption {
  /** Filter with this value, not with `label`. */
  value: string
  label: string
  /** Hidden in the HubSpot UI; still a valid filter value. */
  hidden: boolean
}

export interface CrmHubspotCompanyProperty {
  /** Native property name (`numberofemployees`, `hs_object_id`, …). */
  name: string
  label: string
  /** HubSpot type: `string`, `enumeration`, `bool`, `number`, `date`, `datetime`, … */
  type: string
  /** HubSpot input widget: `text`, `select`, `checkbox`, … */
  fieldType: string | null
  /** Operators valid for `type`; empty when the type is not modelled. */
  operators: CrmHubspotFilterOperator[]
  /**
   * Enumeration choices. Present for every self-contained enumeration, whether
   * or not `propertyName` was set; null for other types and for
   * externally-sourced enumerations.
   */
  options: CrmHubspotCompanyPropertyOption[] | null
  /**
   * False when the choices live outside the property definition (owners,
   * external ids). `options` is then null and the full set must come from
   * HubSpot directly.
   */
  optionsComplete: boolean
  externalOptions: boolean
  /** Hidden in the HubSpot UI. Archived properties are never returned. */
  hidden: boolean
}

/** Attio operators. `$not_empty` and `$in` are only valid on some attribute types. */
export type CrmAttioFilterOperator
  = | '$eq'
    | '$contains'
    | '$starts_with'
    | '$ends_with'
    | '$in'
    | '$not_empty'
    | '$lt'
    | '$lte'
    | '$gt'
    | '$gte'

export interface CrmAttioCompanyPropertyOption {
  /** Attio `option_id` / `status_id` — filter with this, not with `label`. */
  value: string
  label: string
}

/**
 * A nested filter path on a complex attribute, e.g. `option` on a select or
 * `country_code` on a location. Filter as
 * `{ [property]: { [field]: { [operator]: value } } }`.
 */
export interface CrmAttioCompanyPropertyFilterField {
  name: string
  operators: CrmAttioFilterOperator[]
}

export interface CrmAttioCompanyProperty {
  /** Attio `api_slug` (`employee_range`, `primary_location`, …). */
  name: string
  label: string
  /** Attio attribute type: `text`, `select`, `status`, `location`, `interaction`, … */
  type: string
  /** `multiselect` when the attribute holds many values, otherwise `type`. */
  fieldType: string
  /**
   * Operators that apply to the attribute directly. Empty for complex types
   * (select, status, location, interaction, references) — those filter through
   * {@link CrmAttioCompanyProperty.filterFields} instead.
   */
  operators: CrmAttioFilterOperator[]
  filterFields: CrmAttioCompanyPropertyFilterField[]
  /**
   * `select` / `status` choices, excluding archived ones. Only populated when
   * the request named this property; null in the full listing.
   */
  options: CrmAttioCompanyPropertyOption[] | null
}

export interface CrmHubspotCompanyPropertiesResponse {
  provider: 'hubspot'
  properties: CrmHubspotCompanyProperty[]
  /** Always null: field definitions are returned in a single page. */
  nextCursor: string | null
}

export interface CrmAttioCompanyPropertiesResponse {
  provider: 'attio'
  properties: CrmAttioCompanyProperty[]
  /** Always null: field definitions are returned in a single page. */
  nextCursor: string | null
}

export type CrmCompanyPropertiesResponse
  = | CrmHubspotCompanyPropertiesResponse
    | CrmAttioCompanyPropertiesResponse

/**
 * One HubSpot comparison, in HubSpot's own spelling. Arity is enforced by the
 * API: presence operators carry no value, `IN`/`NOT_IN` take `values`,
 * `BETWEEN` takes `value` + `highValue`, everything else takes `value`. All
 * comparison values are strings, including numbers and ISO dates.
 */
export type CrmHubspotCompanyFilter
  = | {
    propertyName: string
    operator: 'HAS_PROPERTY' | 'NOT_HAS_PROPERTY'
  }
  | {
    propertyName: string
    operator: 'IN' | 'NOT_IN'
    /** Non-empty; enum values keep their exact casing. */
    values: string[]
  }
  | {
    propertyName: string
    operator: 'BETWEEN'
    value: string
    highValue: string
  }
  | {
    propertyName: string
    operator: 'EQ' | 'NEQ' | 'CONTAINS_TOKEN' | 'NOT_CONTAINS_TOKEN' | 'LT' | 'LTE' | 'GT' | 'GTE'
    value: string
  }

/** Filters AND together inside a group. */
export interface CrmHubspotCompanyFilterGroup {
  /**
   * 1..5 comparisons. The sixth slot every group is allowed is reserved for
   * the keyset-pagination comparison the API adds to each branch.
   */
  filters: CrmHubspotCompanyFilter[]
}

/**
 * Native HubSpot search filters: groups OR together, filters within a group
 * AND together. `filterGroups` is the only accepted key — no `objectType`,
 * `sorts`, `after` or `query` overrides.
 *
 * Budgets, all enforced before the provider call and reported as
 * `422 invalid_crm_request`:
 * - at most 5 groups
 * - at most 5 filters per group, and filters + groups no more than 18, since
 *   every group also carries a reserved pagination slot
 * - a serialized request under ~3000 characters, again with room reserved for
 *   the pagination comparison
 *
 * Omit or pass `{}` to list companies unfiltered.
 */
export interface CrmHubspotCompanyFilters {
  filterGroups?: CrmHubspotCompanyFilterGroup[]
}

/**
 * Native Attio record-query filters, passed through untouched: attribute slugs
 * at the top level (`{ name: { $contains: 'Acme' } }`), nested paths on complex
 * attributes (`{ category: { option: { $eq: 'opt_id' } } }`), and `$and` / `$or`
 * for boolean structure. Pass `{}` to list companies unfiltered.
 */
export type CrmAttioCompanyFilters = Record<string, unknown>

export interface CrmHubspotCompanySearchRequest {
  provider: 'hubspot'
  /** UUID or email of the requester; the CRM owner unless `crmUserId` is set. */
  userId: string
  /** Another tenant member's UUID or email, read through an existing CRM grant. */
  crmUserId?: string
  filters?: CrmHubspotCompanyFilters
  /**
   * Extra native property names to return. `name` and `domain` are always
   * included. Names the CRM does not return are absent from `properties`.
   */
  properties?: string[]
  /** 1..100; defaults to 100 server-side. */
  limit?: number
  /** `nextCursor` from the previous page. Omit or pass null for the first page. */
  cursor?: string | null
}

export interface CrmAttioCompanySearchRequest {
  provider: 'attio'
  /** UUID or email of the requester; the CRM owner unless `crmUserId` is set. */
  userId: string
  /** Another tenant member's UUID or email, read through an existing CRM grant. */
  crmUserId?: string
  filters?: CrmAttioCompanyFilters
  /**
   * Attribute slugs to return alongside `name` and `domain`. An unknown slug
   * comes back as an empty array rather than an error.
   */
  properties?: string[]
  /** 1..100; defaults to 100 server-side. */
  limit?: number
  /** `nextCursor` from the previous page. Omit or pass null for the first page. */
  cursor?: string | null
}

export type CrmCompanySearchRequest
  = | CrmHubspotCompanySearchRequest
    | CrmAttioCompanySearchRequest

export interface CrmHubspotCompany {
  /** HubSpot record id (`hs_object_id`), always a decimal string. */
  id: string
  name: string | null
  domain: string | null
  /**
   * Requested properties keyed by their native HubSpot names, which the SDK
   * does not rewrite — read `properties.hs_lastmodifieddate`, not
   * `properties.hsLastmodifieddate`. HubSpot returns every value as a string.
   */
  properties: Record<string, string | null>
}

/**
 * One Attio value entry, verbatim from the provider. Its keys keep Attio's own
 * spelling (`active_from`, `active_until`, `attribute_type`, …) because the SDK
 * does not rewrite provider property data. Only currently-active entries are
 * returned, so `active_until` is null or empty.
 */
export interface CrmAttioCompanyPropertyValue {
  value?: unknown
  active_from?: string | null
  active_until?: string | null
  [key: string]: unknown
}

export interface CrmAttioCompany {
  /** Attio `record_id`. */
  id: string
  name: string | null
  domain: string | null
  /**
   * Requested attributes keyed by their Attio slugs, which the SDK does not
   * rewrite. Attio attributes are multi-valued, so each entry is an array —
   * empty when the company has no active value for that slug.
   */
  properties: Record<string, CrmAttioCompanyPropertyValue[]>
}

export interface CrmHubspotCompanySearchResponse {
  provider: 'hubspot'
  companies: CrmHubspotCompany[]
  /**
   * Opaque page token; pass it back as `cursor`. Null on the last page.
   * Keyset-based, so the underlying query must stay identical between pages.
   */
  nextCursor: string | null
  /** Match count, reported on the first page only; null on later pages. */
  total: number | null
}

export interface CrmAttioCompanySearchResponse {
  provider: 'attio'
  companies: CrmAttioCompany[]
  /** Opaque page token; pass it back as `cursor`. Null on the last page. */
  nextCursor: string | null
  /** Always null — Attio does not report a match count. */
  total: number | null
}

export type CrmCompanySearchResponse
  = | CrmHubspotCompanySearchResponse
    | CrmAttioCompanySearchResponse
