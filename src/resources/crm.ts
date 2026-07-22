import type { Http } from '../core/http'
import type {
  CrmContactsSyncRequest,
  CrmContactsSyncResponse,
  CrmContactsSyncStatusResponse,
  CrmExclusionGrantListResponse,
  CrmExclusionGrantRequest,
  CrmExclusionGrantResponse,
  CrmMatchBatchRequest,
  CrmMatchBatchResponse,
  CrmProvider,
  CrmSyncProspectRequest,
  CrmSyncProspectResponse,
} from '../types/crm'

/**
 * Resource for the user-triggered CRM Sync API.
 *
 * Wraps prospect sync/match, contacts-ledger sync, and exclusion-grant routes
 * under `/v1/crm`.
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
   * Grant a member the right to exclude against an owner's synced CRM ledger
   * (all providers for that owner). Typically called by the FE on org join.
   */
  async grantExclusionGrant(
    data: CrmExclusionGrantRequest,
  ): Promise<CrmExclusionGrantResponse> {
    return this.http.post<CrmExclusionGrantResponse>('/crm/exclusion-grants', data)
  }

  /**
   * Revoke a member's access to an owner's CRM exclusion ledger.
   */
  async revokeExclusionGrant(
    data: CrmExclusionGrantRequest,
  ): Promise<CrmExclusionGrantResponse> {
    return this.http.delete<CrmExclusionGrantResponse>('/crm/exclusion-grants', {
      body: data,
    })
  }

  /**
   * List CRM owners whose exclusion ledger a member may read (via grants).
   */
  async listExclusionGrants(memberUserId: string): Promise<CrmExclusionGrantListResponse> {
    return this.http.get<CrmExclusionGrantListResponse>('/crm/exclusion-grants', {
      // Backend requires snake_case `member_user_id` (see getContactsSyncStatus).
      params: { member_user_id: memberUserId },
    })
  }
}
