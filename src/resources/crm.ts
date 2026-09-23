import type { Http } from '../core/http'
import type {
  CrmAccountContextBatchRequest,
  CrmAccountContextBatchResponse,
  CrmAttioCompanyPropertiesResponse,
  CrmAttioCompanySearchResponse,
  CrmCompanyPropertiesRequest,
  CrmCompanyPropertiesResponse,
  CrmCompanySearchRequest,
  CrmCompanySearchResponse,
  CrmContactsSyncRequest,
  CrmContactsSyncResponse,
  CrmContactsSyncStatusResponse,
  CrmExclusionGrantListResponse,
  CrmExclusionGrantRequest,
  CrmExclusionGrantResponse,
  CrmHubspotCompanyPropertiesResponse,
  CrmHubspotCompanySearchResponse,
  CrmMatchBatchRequest,
  CrmMatchBatchResponse,
  CrmProvider,
  CrmSyncProspectRequest,
  CrmSyncProspectResponse,
} from '../types/crm'

/**
 * Subtrees of the company-search payload that carry provider-native keys and
 * must cross the wire untouched: `filters` is HubSpot/Attio query syntax on
 * the way out, and each company's `properties` and `owners` maps are keyed
 * by CRM property names on the way back (`hubspot_owner_id` would otherwise
 * come back as `hubspotOwnerId`). The exemption is per-request rather than
 * global because `filters` and `properties` mean Lumnis fields on other
 * routes.
 */
const COMPANY_SEARCH_PASSTHROUGH_KEYS = ['filters', 'properties', 'owners'] as const

/**
 * Resource for the user-triggered CRM Sync API.
 *
 * Wraps prospect sync/match, account context, company reads, contacts-ledger
 * sync, and CRM access-grant routes under `/v1/crm` (the grant routes keep
 * their original `exclusion-grants` path for compatibility).
 *
 * The user identified by `userId` must already have an active CRM
 * connection (see `client.integrations.initiateConnection`). When the
 * connection is missing, the server returns `409 crm_not_connected`
 * with `connect_url` in the error body so callers can route the user
 * to the OAuth flow.
 *
 * Failure modes worth handling:
 * - `409 crm_not_connected` — user hasn't connected the provider.
 * - `404 prospect_not_found` (sync) — profile could not be identified.
 * - `422 linkedin_url_unresolved` (sync) — internal member-id URL could not
 *   be resolved to a public vanity URL.
 * - `502 crm_upstream_error` — Attio/HubSpot returned an error.
 * - `503 crm_upstream_rate_limited` — upstream rate-limit; the response
 *   includes a `Retry-After` header.
 * - `503 crm_connection_status_unavailable` (account context) — the provider
 *   connection status could not be verified. Retryable; the response includes
 *   a `Retry-After` header. Distinct from `409 crm_not_connected`.
 *
 * The company routes ({@link CrmResource.getCompanyProperties},
 * {@link CrmResource.searchCompanies}) report failures with their own codes —
 * `crm_access_denied`, `crm_access_unavailable`, `invalid_crm_filter`,
 * `invalid_crm_request`, `crm_property_not_found`, `crm_rate_limited`,
 * `crm_read_timeout`, `crm_read_failed` — carried in the error body's
 * `detail.error`. Provider error text is never forwarded.
 */
export class CrmResource {
  constructor(private readonly http: Http) {}

  /**
   * Push one Lumnis prospect to the connected CRM.
   *
   * Idempotent: repeated calls for the same
   * `(userId, provider, linkedinUrl)` return `linked` with the same
   * `crmRecordId`. Stale links (record deleted in the CRM) are detected
   * and re-created automatically.
   *
   * Pass `contact` to avoid re-deriving attributes the caller already has.
   * Any omitted contact fields are gap-filled from campaign/profile data when
   * available. `customFields` keys are provider-native property names.
   *
   * @example
   * ```typescript
   * const result = await client.crm.syncProspect({
   *   userId: 'user@example.com',
   *   provider: 'attio',
   *   linkedinUrl: 'https://www.linkedin.com/in/jane-doe/',
   *   contact: {
   *     fullName: 'Jane Doe',
   *     email: 'jane@example.com',
   *     jobTitle: 'VP of Sales',
   *     company: 'Acme',
   *   },
   *   customFields: { lead_source: 'Lumnis' },
   * })
   * console.log(result.action, result.crmUrl)
   * ```
   */
  async syncProspect(data: CrmSyncProspectRequest): Promise<CrmSyncProspectResponse> {
    return this.http.post<CrmSyncProspectResponse>('/crm/prospects/sync', data)
  }

  /**
   * Bulk-check whether prospects are already in the CRM. Designed for
   * list-view badge rendering: feed it every visible LinkedIn URL and
   * render a "linked" indicator for the ones that come back true.
   *
   * Layered cache on the server side: persistent positive matches are
   * served from the `campaign_prospects.crm_record_id` column and the
   * local `crm_contacts` ledger; negative results are served from a Redis
   * cache (TTL configured by `CRM_MATCH_NEGATIVE_CACHE_TTL_SECONDS`).
   * Only the leftover unknowns fan out to the live CRM, bounded by
   * `CRM_MATCH_LIVE_SEARCH_PARALLELISM`.
   *
   * Provider-id/URN inputs are resolved to vanity before matching.
   *
   * @example
   * ```typescript
   * const { matches } = await client.crm.matchBatch({
   *   userId: 'user@example.com',
   *   provider: 'attio',
   *   linkedinUrls: prospects.map(p => p.linkedinUrl),
   * })
   * for (const m of matches) {
   *   if (m.linked) console.log(m.linkedinUrl, '->', m.crmUrl)
   * }
   * ```
   */
  async matchBatch(data: CrmMatchBatchRequest): Promise<CrmMatchBatchResponse> {
    return this.http.post<CrmMatchBatchResponse>('/crm/prospects/match-batch', data)
  }

  /**
   * Return exact-person presence and account/deal context across every
   * configured CRM. This remains separate from {@link matchBatch}: an account
   * match does not mean the candidate is personally present in the CRM.
   *
   * Results preserve candidate order and reference deduplicated account
   * details through `accountRef`. Provider degradation and unknown deal stages
   * are returned explicitly and must not be treated as safe negative results.
   *
   * Capped at 100 candidates per request; chunk longer lists and reassemble by
   * `inputKey`. Provider selection comes from the resolved owner's active
   * HubSpot/Attio connections: no active supported connection is
   * `409 crm_not_connected`, and a connection-verification failure is a
   * retryable `503 crm_connection_status_unavailable`.
   *
   * @example
   * ```typescript
   * const context = await client.crm.accountContextBatch({
   *   userId: 'owner@example.com',
   *   candidates: [{
   *     inputKey: 'candidate-123',
   *     linkedinUrl: 'https://www.linkedin.com/in/jane-doe/',
   *     companyDomain: 'acme.example',
   *   }],
   * })
   * console.log(context.results[0].salesState)
   * ```
   */
  async accountContextBatch(
    data: CrmAccountContextBatchRequest,
  ): Promise<CrmAccountContextBatchResponse> {
    return this.http.post<CrmAccountContextBatchResponse>(
      '/crm/account-context/batch',
      data,
    )
  }

  /**
   * List the company fields the connected CRM exposes, with the operators each
   * one accepts — what a filter builder needs before calling
   * {@link searchCompanies}. A live, read-only provider call: nothing is
   * written to the CRM and nothing is served from the `crm_contacts` ledger.
   *
   * Pass `propertyName` to narrow to a single field. Attio returns
   * `select`/`status` choices only that way; HubSpot already includes
   * enumeration choices in the full listing, except for externally-sourced
   * ones, which come back as `options: null, optionsComplete: false`.
   *
   * Field metadata is provider-shaped, so the return type narrows on the
   * `provider` you pass.
   *
   * A definition with `references: 'owner'` holds a CRM user id; request it
   * in {@link searchCompanies} to have each company's `owners` map resolve
   * it to a name and email. HubSpot's is `hubspot_owner_id`; Attio has no
   * standard one, so take the actor-reference slug this listing flags.
   *
   * Failure modes: `403 crm_access_denied` and `503 crm_access_unavailable`
   * (the `crmUserId` grant), `409 crm_not_connected` (no single active
   * connection for the owner), `404 crm_property_not_found`,
   * `429 crm_rate_limited`, `504 crm_read_timeout`, `502 crm_read_failed`.
   *
   * @example
   * ```typescript
   * const { properties } = await client.crm.getCompanyProperties({
   *   userId: 'user@example.com',
   *   provider: 'hubspot',
   * })
   * const filterable = properties.filter(p => p.operators.length > 0)
   *
   * // Attio choices need the field named explicitly.
   * const tier = await client.crm.getCompanyProperties({
   *   userId: 'user@example.com',
   *   provider: 'attio',
   *   propertyName: 'employee_range',
   * })
   * console.log(tier.properties[0].options)
   *
   * // The field that can fill an owner column.
   * const ownerField = properties.find(p => p.references === 'owner')
   * ```
   */
  async getCompanyProperties<T extends CrmCompanyPropertiesRequest>(
    params: T,
  ): Promise<
      T extends { provider: 'hubspot' }
        ? CrmHubspotCompanyPropertiesResponse
        : CrmAttioCompanyPropertiesResponse
    > {
    const response = await this.http.get<CrmCompanyPropertiesResponse>(
      '/crm/companies/properties',
      {
        // Backend requires snake_case query params (see getContactsSyncStatus).
        params: {
          user_id: params.userId,
          provider: params.provider,
          property_name: params.propertyName,
          crm_user_id: params.crmUserId,
        },
      },
    )
    // The API returns the shape that matches the provider it was given; the
    // conditional return type is what makes that visible to the caller.
    return response as any
  }

  /**
   * Read one page of companies from the connected CRM using that provider's
   * own filter syntax. Read-only: no CRM writes, no local persistence, so the
   * same request can be replayed to refresh a preview.
   *
   * Filters are never translated. HubSpot takes `filterGroups` (AND within a
   * group, OR between groups) with string comparison values; Attio takes its
   * record-query object with `$`-prefixed operators. Both cross the wire
   * verbatim — the SDK's camelCase ↔ snake_case conversion is switched off for
   * `filters` and for each company's `properties` and `owners` maps, whose
   * keys are CRM property names. Discover valid names and operators with
   * {@link getCompanyProperties}.
   *
   * Requesting an owner-typed field (`references: 'owner'` in its definition)
   * also resolves it: `owners[field]` is the CRM user's `{ id, name, email }`,
   * null when the company has none, with `name`/`email` null when the id is
   * not in the user directory. Resolution is part of the page — if the
   * directory read fails the whole request fails with the codes below rather
   * than returning half-resolved owners. Cost: any requested field adds one
   * definitions read per page; an owner field adds one directory read on top.
   *
   * Paging is cursor-based: pass the previous page's `nextCursor` back as
   * `cursor` and keep every other field identical, because HubSpot pages by
   * record id inside the original query. `nextCursor: null` is the last page.
   * `total` is reported on the first HubSpot page only, and is always null for
   * Attio.
   *
   * An empty `companies` array is a real "no matches" result — provider
   * failures raise instead. Failure modes: `403 crm_access_denied` and
   * `503 crm_access_unavailable` (the `crmUserId` grant),
   * `409 crm_not_connected`, `400 invalid_crm_filter` (the provider rejected
   * the query), `422 invalid_crm_request` (filter/limit/cursor budgets,
   * checked before the provider call), `429 crm_rate_limited`,
   * `504 crm_read_timeout`, `502 crm_read_failed`.
   *
   * @example
   * ```typescript
   * const request: CrmHubspotCompanySearchRequest = {
   *   userId: 'user@example.com',
   *   provider: 'hubspot',
   *   filters: {
   *     filterGroups: [{
   *       filters: [
   *         { propertyName: 'domain', operator: 'CONTAINS_TOKEN', value: 'acme' },
   *         { propertyName: 'numberofemployees', operator: 'GT', value: '50' },
   *       ],
   *     }],
   *   },
   *   properties: ['numberofemployees', 'industry', 'hubspot_owner_id'],
   *   limit: 50,
   * }
   *
   * const page = await client.crm.searchCompanies(request)
   * for (const company of page.companies)
   *   console.log(company.name, company.properties.industry, company.owners?.hubspot_owner_id?.name)
   *
   * // Same query, next page.
   * if (page.nextCursor)
   *   await client.crm.searchCompanies({ ...request, cursor: page.nextCursor })
   * ```
   */
  async searchCompanies<T extends CrmCompanySearchRequest>(
    data: T,
  ): Promise<
      T extends { provider: 'hubspot' }
        ? CrmHubspotCompanySearchResponse
        : CrmAttioCompanySearchResponse
    > {
    const response = await this.http.post<CrmCompanySearchResponse>(
      '/crm/companies/search',
      data,
      { passthroughKeys: COMPANY_SEARCH_PASSTHROUGH_KEYS },
    )
    // See getCompanyProperties: the cast narrows to the provider's own shape.
    return response as any
  }

  /**
   * Trigger a full mirror of the owner's CRM contact book into the local
   * `crm_contacts` ledger. Returns immediately (`202`); poll
   * {@link getContactsSyncStatus} for progress.
   */
  async syncContacts(data: CrmContactsSyncRequest): Promise<CrmContactsSyncResponse> {
    return this.http.post<CrmContactsSyncResponse>('/crm/contacts/sync', data)
  }

  /**
   * Ledger sync freshness for an owner+provider: connection state, whether a
   * sync is in progress, last reconcile time, and row count in the ledger.
   */
  async getContactsSyncStatus(
    userId: string,
    provider: CrmProvider,
  ): Promise<CrmContactsSyncStatusResponse> {
    return this.http.get<CrmContactsSyncStatusResponse>('/crm/contacts/sync-status', {
      // Backend requires snake_case query params (FastAPI `user_id`). Query
      // keys are sent verbatim by the http layer (only bodies are snake-cased),
      // so pass snake_case here like every other resource — a camelCase
      // `userId` 422s with "field required: user_id".
      params: { user_id: userId, provider },
    })
  }

  /**
   * Grant a member access to an owner's CRM — every provider that owner has
   * synced. One grant serves both reads that name another owner: ledger
   * exclusion in search and campaigns, and `account_monitor`'s `crmUserId`.
   * Both users must be in the authenticated tenant; a self-grant is a no-op.
   * Typically called by the FE on org join.
   */
  async grantExclusionGrant(
    data: CrmExclusionGrantRequest,
  ): Promise<CrmExclusionGrantResponse> {
    return this.http.post<CrmExclusionGrantResponse>('/crm/exclusion-grants', data)
  }

  /**
   * Revoke a member's access to an owner's CRM. Implicit access to their own
   * CRM cannot be revoked.
   */
  async revokeExclusionGrant(
    data: CrmExclusionGrantRequest,
  ): Promise<CrmExclusionGrantResponse> {
    return this.http.delete<CrmExclusionGrantResponse>('/crm/exclusion-grants', {
      body: data,
    })
  }

  /**
   * List the CRM owners a member may read via grants. The member's own CRM is
   * implicit and is not listed.
   */
  async listExclusionGrants(memberUserId: string): Promise<CrmExclusionGrantListResponse> {
    return this.http.get<CrmExclusionGrantListResponse>('/crm/exclusion-grants', {
      // Backend requires snake_case `member_user_id` (see getContactsSyncStatus).
      params: { member_user_id: memberUserId },
    })
  }
}
