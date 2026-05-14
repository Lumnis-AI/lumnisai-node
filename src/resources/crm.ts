import type { Http } from '../core/http'
import type {
  CrmMatchBatchRequest,
  CrmMatchBatchResponse,
  CrmSyncProspectRequest,
  CrmSyncProspectResponse,
} from '../types/crm'

/**
 * Resource for the user-triggered CRM Sync API.
 *
 * Wraps `POST /v1/crm/prospects/sync` and `POST /v1/crm/prospects/match-batch`.
 *
 * The user identified by `userId` must already have an active CRM
 * connection (see `client.integrations.initiateConnection`). When the
 * connection is missing, the server returns `409 crm_not_connected`
 * with `connect_url` in the error body so callers can route the user
 * to the OAuth flow.
 *
 * Failure modes worth handling:
 * - `409 crm_not_connected` — user hasn't connected the provider.
 * - `404 prospect_not_found` (sync only) — no `campaign_prospects` row
 *   matches `linkedinUrl` for this user.
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
   * @example
   * ```typescript
   * const result = await client.crm.syncProspect({
   *   userId: 'user@example.com',
   *   provider: 'attio',
   *   linkedinUrl: 'https://www.linkedin.com/in/jane-doe/',
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
   * served from the `campaign_prospects.crm_record_id` column, negative
   * results are served from a Redis cache (TTL configured by
   * `CRM_MATCH_NEGATIVE_CACHE_TTL_SECONDS`). Only the leftover unknowns
   * fan out to the live CRM, bounded by
   * `CRM_MATCH_LIVE_SEARCH_PARALLELISM`.
   *
   * Note: HubSpot does not expose a LinkedIn-URL search field through
   * Composio, so for `provider: 'hubspot'` URLs that aren't already in
   * the persistent cache will always come back `linked: false`. The
   * sync endpoint still reconciles via email when available.
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
}
