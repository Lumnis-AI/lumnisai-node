/**
 * @module competitor_rep_engagement
 *
 * # Competitor Rep Engagement Agent — SDK Reference
 *
 * > Find the prospects your competitors' sales reps are actively working.
 *
 * Agent ID: `competitor_rep_engagement`
 *
 * The **inverse** of {@link ./competitor-post-engagement.ts}: instead of scoring
 * the people who engaged WITH competitor posts, this agent finds a competitor's
 * **sales reps** and surfaces the **AUTHORS** of the LinkedIn posts those reps
 * react to / comment on — i.e. the prospects the competitor is actively selling
 * to. Authors are ranked against a persona prompt using the shared
 * deep_people_search scoring chain.
 *
 * ---
 *
 * ## Invocation
 *
 * ```ts
 * import { LumnisClient, type CompetitorRepEngagementOutput } from 'lumnisai'
 *
 * const client = new LumnisClient({ apiKey: '...' })
 *
 * // Discovery mode — find competitors from a seed company
 * const { responseId } = await client.responses.competitorRepEngagement(
 *   'VP Eng or Heads of Data at AI-native startups (50-500 employees)',
 *   { company: 'lumnis.ai', companyContext: 'AI outbound automation for B2B sales', limit: 100 },
 * )
 *
 * // Explicit mode — you already know the competitors
 * const { responseId } = await client.responses.competitorRepEngagement(
 *   'Same persona prompt here',
 *   { competitors: ['outreach.io', 'apollo.io'], postsDateRange: 'past-quarter' },
 * )
 *
 * const result = await client.responses.get(responseId, { wait: 120 })
 * const output = result.structuredResponse as CompetitorRepEngagementOutput
 * ```
 *
 * Lower-level API (same payload):
 *
 * ```ts
 * await client.responses.create({
 *   messages: [{ role: 'user', content: '<persona prompt>' }],
 *   specializedAgent: 'competitor_rep_engagement',
 *   specializedAgentParams: { competitors: ['openai.com'], limit: 100 },
 * })
 * ```
 *
 * ---
 *
 * ## Input modes (exactly one required)
 *
 * | Mode | Param | Behavior |
 * |------|-------|----------|
 * | **A — Explicit** | `competitors: string[]` | Validates each domain/name, skips discovery |
 * | **B — Discovery** | `company: string` | ReAct finds competitors, then crawls each one's reps |
 *
 * The **persona prompt** lives in `messages[0].content` (required). Params only
 * control targets, rep selection, and the engagement window.
 *
 * ---
 *
 * ## API keys (BYO via external API keys, or platform env)
 *
 * | Key | Required | Role |
 * |-----|----------|------|
 * | `FIBER_API_KEY` | **Yes** | Company resolution + per-rep profile engagement (reactions/comments) |
 * | `CRUSTDATA_API_KEY` | **Yes** | Rep search (company-scoped role filter) + author enrichment |
 * | `EXA_API_KEY` | Discovery + deep validation | Web search in find_competitors ReAct + validation chain |
 *
 * ---
 *
 * ## Defaults & caps (per run)
 *
 * | Param | Default | Max |
 * |-------|---------|-----|
 * | `limit` | 100 | 1000 |
 * | `maxCompetitors` | 10 (discovery only) | 50 |
 * | `maxRepsPerCompetitor` | 20 | 100 |
 * | `maxEngagementsPerRep` | 100 | 1000 |
 * | `postsDateRange` | `past-month` | past-24h … past-3-years |
 * | `engagementTypes` | `['reactor','commenter']` | — |
 * | `restrictEngagementToTenure` | true | — |
 *
 * `engagementTypes` maps to each rep's OUTGOING actions: `reactor` → posts the
 * rep reacted to, `commenter` → posts the rep commented on. A rep comment is a
 * stronger buying signal than a like.
 *
 * Longer windows (`past-2-years`, `past-3-years`) apply fully here because
 * engagement is sourced from Fiber profile history (~3 years) — to genuinely
 * reach a long window for very active reps, also raise `maxEngagementsPerRep`.
 *
 * ---
 *
 * ## Pipeline (what happens server-side)
 *
 * 1. **criteria_decomposition** — persona → scorable criteria (reused from deep_people_search)
 * 2. **resolve_targets** — Fiber kitchen-sink (primary) / Crustdata identify (fallback)
 * 3. **find_competitors** *(discovery only)* — ReAct: Exa + optional Firecrawl + Fiber validate
 * 4. **discover_exclusion** — widen the competitor-employee exclusion set
 * 5. **fetch_rep_engagement** *(NEW)* — find each competitor's reps, paginate their
 *    Fiber reactions/comments, extract the POST AUTHORS (prospects) as candidates
 * 6. **reactor_prefilter → enrich → merge → fast_filter → realtime_refresh → validation**
 *    — reused scoring chain
 *
 * ---
 *
 * ## Structured output (`ResponseObject.structuredResponse`)
 *
 * Cast to {@link CompetitorRepEngagementOutput}:
 *
 * - `candidates[]` — scored prospect-authors, sorted by rank, capped to `limit`
 * - `competitorsResolved[]` — resolved target metadata per competitor analyzed
 * - `resolutionWarnings[]` — domain-owner mismatches (e.g. "outreach.io is owned by Canopy")
 * - `discoveredCompetitors[]` — domains found in discovery mode (Mode B)
 * - `discoveryTrace` — ReAct audit trail
 * - `repEngagementStats` — rep/author counts for the run
 * - `criteria` — generated criteria definitions + classification
 * - `agentParams` — echo of params used for the run
 *
 * ### Per-candidate `engagementData[]`
 *
 * Each entry is one post the prospect authored that a competitor rep engaged
 * with. See {@link RepEngagementData}. Multiple reps engaging the same prospect
 * → multiple entries on the one candidate.
 *
 * @see Backend agent: `src/specialized_agents/competitor_rep_engagement/`
 */

import type { DiscoveryTrace, ResolvedCompetitorTarget } from './competitor-post-engagement'
import type { CriteriaMetadata, ValidatedCandidate } from './responses'

/**
 * One LinkedIn post a prospect AUTHORED that a competitor's sales rep engaged
 * with (reacted to / commented on). Lives on a candidate's `engagementData[]`.
 *
 * Provenance is the full chain: PROSPECT (the candidate) authored the post →
 * engaged by REP at COMPETITOR via `engagementAction`.
 */
export interface RepEngagementData {
  /** LinkedIn URL of the post the prospect authored (and the rep engaged with) */
  postUrl?: string
  /** Full text of the prospect's post */
  postText?: string
  /** Provenance role — always `"post_author"` for this lane (the candidate is the author) */
  role?: 'post_author' | string
  /** How the rep engaged with the post */
  engagementAction?: 'reaction' | 'comment'
  /** Name of the competitor rep who engaged */
  engagedByRepName?: string
  /** LinkedIn URL of the competitor rep */
  engagedByRepUrl?: string
  /** Title of the competitor rep (e.g. "Account Executive") */
  engagedByRepTitle?: string
  /** Competitor company the rep works at */
  repCompetitor?: string
  /** Relative recency of the engagement, e.g. "2w" */
  engagedAgo?: string
  /** Numeric days-ago of the engagement (parsed from engagedAgo, for recency ranking) */
  engagedDaysAgo?: number
  /** The rep's OWN comment text (present only when engagementAction is "comment") */
  repCommentText?: string
  [key: string]: any
}

/**
 * Counts describing a competitor_rep_engagement run.
 * Surfaced on `structuredResponse.repEngagementStats`.
 */
export interface RepEngagementStats {
  /** Number of competitors analyzed */
  competitors: number
  /** Number of sales reps crawled across all competitors */
  reps: number
  /** Raw author-engagement records harvested before dedupe */
  rawAuthorEngagements: number
  /** Unique prospect-authors after dedupe */
  uniqueAuthors: number
  /** Engagement records dropped because the author was a rep itself */
  droppedRepSelfEngagements: number
  [key: string]: any
}

/**
 * Full structured output from a succeeded `competitor_rep_engagement` run.
 * Available on `ResponseObject.structuredResponse`.
 */
export interface CompetitorRepEngagementOutput {
  /** Scored prospect-authors, sorted by rank, capped to params.limit */
  candidates: ValidatedCandidate[]
  /** Generated or reused criteria metadata */
  criteria?: CriteriaMetadata
  /** Resolved competitor targets whose reps were crawled */
  competitorsResolved: ResolvedCompetitorTarget[]
  /** Domain-owner mismatch warnings (e.g. seed resolved to a different company) */
  resolutionWarnings?: string[]
  /** Competitors discovered from seed (discovery mode only) */
  discoveredCompetitors?: string[]
  /** Audit trail from the competitor-discovery ReAct */
  discoveryTrace?: DiscoveryTrace
  /** Rep/author counts for the run */
  repEngagementStats?: RepEngagementStats
  /** Echo of validated agent params used for this run */
  agentParams?: Record<string, any>
}
