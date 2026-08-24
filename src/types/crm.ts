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

// ==================== exclusion grants (org sharing) ====================

/**
 * Grant or revoke a member's right to exclude against an owner's CRM ledger.
 * Per-owner (all of that owner's synced CRMs inherit). Self-grant is a no-op.
 */
export interface CrmExclusionGrantRequest {
  /** Member (UUID or email) who reads the owner's exclusion ledger. */
  memberUserId: string
  /** CRM owner (UUID or email) whose ledger is shared. */
  ownerUserId: string
}

export interface CrmExclusionGrantResponse {
  memberUserId: string
  ownerUserId: string
  status: 'granted' | 'revoked'
}

export interface CrmExclusionGrantListResponse {
  memberUserId: string
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
 * The backend accepts 1..1000 candidates per request.
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
