/**
 * Outreach connections (funnel-people + stats) types.
 *
 * These map to the Python backend endpoints under /v1/outreach, which list the
 * PEOPLE behind any outreach funnel stage — connected, messaged, replied, or
 * meeting_booked — reached via Lumnis through a sequence or an AI campaign.
 */

/** Concrete funnel stage on a per-person row. */
export type Stage = 'connected' | 'messaged' | 'replied' | 'meeting_booked'

/** Stage filter accepted on the request (and echoed on the response). */
export type StageFilter = 'all' | 'connected' | 'messaged' | 'replied' | 'meeting_booked'

/** Channel filter — applies to the "messaged" stage (LinkedIn DM vs InMail vs email). */
export type Channel = 'all' | 'linkedin' | 'email' | 'inmail'

/** Which outreach system a row came from. */
export type OutreachSource = 'all' | 'sequence' | 'campaign'

// ==================== Request Types ====================

export interface ListConnectionsParams {
  /** User ID or email (REQUIRED) — results are scoped to this user. */
  userId: string
  /** Funnel stage, or 'all' for the furthest stage per person. Defaults to 'connected'. */
  stage?: StageFilter
  /** For stage='messaged': linkedin | email | inmail | all. Defaults to 'all'. */
  channel?: Channel
  /** Restrict to a single outreach system. Defaults to 'all'. */
  source?: OutreachSource
  /**
   * One or more campaign IDs to filter to. When set, results are campaign-only
   * (sequences are excluded).
   */
  campaignId?: string[]
  /** Only include rows reaching the stage on/after this date (YYYY-MM-DD). */
  since?: string
  /** Also return the per-channel funnel stats + ratios for the scope. Defaults to false. */
  stats?: boolean
  limit?: number
  offset?: number
}

export interface ListAcceptedConnectionsParams {
  /** User ID or email (REQUIRED) — results are scoped to this user. */
  userId: string
  /** Restrict to a single outreach system. Defaults to 'all'. */
  source?: OutreachSource
  /** One or more campaign IDs to filter to (campaign-only when set). */
  campaignId?: string[]
  /** Only include rows accepted on/after this date (YYYY-MM-DD). */
  since?: string
  limit?: number
  offset?: number
}

// ==================== Response Types ====================

/**
 * A person at a given outreach funnel stage, reached via Lumnis.
 *
 * When `stage='all'` was requested, `stage` is the FURTHEST stage this person
 * reached (meeting_booked > replied > messaged > connected) and `stageAt` is
 * that stage's timestamp.
 */
export interface Connection {
  rowId: string
  source: 'sequence' | 'campaign'
  sourceId: string
  sourceName?: string | null
  userId?: string | null
  fullName?: string | null
  title?: string | null
  company?: string | null
  linkedinUrl?: string | null
  providerId?: string | null
  senderAccountId?: string | null
  stage: Stage
  stageAt?: string | null
}

/**
 * Conversion ratios WITHIN one channel — all <= 1.0 (100%) by construction.
 *
 * `connectRate` / `messageRate` apply only to LinkedIn (InMail/email have no
 * connect step, so they are `null` there). `null` whenever the denominator is 0.
 */
export interface ChannelRatios {
  /** connected / connectionRequestsSent (LinkedIn only) */
  connectRate?: number | null
  /** sent / connected (LinkedIn only) */
  messageRate?: number | null
  /** replied / sent */
  replyRate?: number | null
  /** meetingBooked / replied (a.k.a. book rate) */
  meetingRate?: number | null
}

/**
 * One channel's funnel. For InMail/email, `connectionRequestsSent` and
 * `connected` are 0 (those channels have no connect step).
 */
export interface ChannelFunnel {
  /** LinkedIn only (0 for inmail/email). */
  connectionRequestsSent: number
  /** LinkedIn only (0 for inmail/email). */
  connected: number
  /** Messages sent in this channel (DMs / InMails / emails). */
  sent: number
  replied: number
  meetingBooked: number
  ratios: ChannelRatios
}

/**
 * Per-channel funnels, folded into the list response when `stats=true`.
 *
 * Channels are reported separately on purpose so conversion ratios stay valid.
 * Keys: 'linkedin', 'inmail', 'email'.
 */
export interface OutreachStats {
  byChannel: Record<string, ChannelFunnel>
}

export interface ConnectionsResponse {
  items: Connection[]
  total: number
  stage: StageFilter
  channel: Channel
  limit: number
  offset: number
  stats?: OutreachStats | null
  computedAt: string
}
