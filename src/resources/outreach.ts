import type { Http } from '../core/http'
import type {
  ConnectionsResponse,
  ListAcceptedConnectionsParams,
  ListConnectionsParams,
} from '../types/outreach'

/**
 * Resource for the outreach connections (funnel-people) API.
 *
 * Cross-system read endpoints that list the PEOPLE behind any outreach funnel
 * stage — connected (accepted a CR), messaged, replied, or meeting_booked —
 * reached via Lumnis, whether through a traditional sequence or an AI campaign.
 *
 * Wraps `GET /v1/outreach` and `GET /v1/outreach/accepted`.
 */
export class OutreachResource {
  constructor(private readonly http: Http) {}

  /**
   * List people at a funnel stage (connected/messaged/replied/meeting_booked),
   * or `stage='all'` for one row per person at their furthest stage.
   *
   * Pass `stats: true` to also get the per-channel funnel counts + conversion
   * ratios for the same scope (`userId`/`source`/`campaignId`) alongside the
   * people list. Pass `campaignId` to restrict to specific campaigns (this
   * excludes sequences).
   *
   * @example
   * ```typescript
   * const result = await client.outreach.listConnections({
   *   userId: 'user@example.com',
   *   stage: 'replied',
   *   stats: true,
   * })
   * console.log(result.total, result.stats?.byChannel.linkedin.ratios.replyRate)
   * ```
   */
  async listConnections(params: ListConnectionsParams): Promise<ConnectionsResponse> {
    const query = new URLSearchParams()
    query.append('user_id', params.userId)
    if (params.stage !== undefined)
      query.append('stage', params.stage)
    if (params.channel !== undefined)
      query.append('channel', params.channel)
    if (params.source !== undefined)
      query.append('source', params.source)
    if (params.campaignId)
      params.campaignId.forEach(id => query.append('campaign_id', id))
    if (params.since !== undefined)
      query.append('since', params.since)
    if (params.stats !== undefined)
      query.append('stats', String(params.stats))
    if (params.limit !== undefined)
      query.append('limit', String(params.limit))
    if (params.offset !== undefined)
      query.append('offset', String(params.offset))

    return this.http.get<ConnectionsResponse>(`/outreach?${query.toString()}`)
  }

  /**
   * Alias for `stage='connected'` — people who accepted a Lumnis-sent
   * connection request.
   */
  async listAcceptedConnections(
    params: ListAcceptedConnectionsParams,
  ): Promise<ConnectionsResponse> {
    const query = new URLSearchParams()
    query.append('user_id', params.userId)
    if (params.source !== undefined)
      query.append('source', params.source)
    if (params.campaignId)
      params.campaignId.forEach(id => query.append('campaign_id', id))
    if (params.since !== undefined)
      query.append('since', params.since)
    if (params.limit !== undefined)
      query.append('limit', String(params.limit))
    if (params.offset !== undefined)
      query.append('offset', String(params.offset))

    return this.http.get<ConnectionsResponse>(`/outreach/accepted?${query.toString()}`)
  }
}
