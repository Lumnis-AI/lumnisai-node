/**
 * @module competitor_post_engagement
 *
 * # Competitor Post Engagement Agent — SDK Reference
 *
 * > Find the people who care about what your competitors are saying.
 *
 * Agent ID: `competitor_post_engagement`
 *
 * Scores LinkedIn users who **reacted to** or **commented on** competitor posts
 * (company pages + executive personal feeds), ranked against a persona prompt
 * using the shared deep_people_search scoring chain.
 *
 * ---
 *
 * ## Invocation
 *
 * ```ts
 * import { LumnisClient, type CompetitorPostEngagementOutput } from 'lumnisai'
 *
 * const client = new LumnisClient({ apiKey: '...' })
 *
 * // Discovery mode — find competitors from a seed company
 * const { responseId } = await client.responses.competitorPostEngagement(
 *   'Founders or VPs of Sales at B2B SaaS (50-500 employees) who care about outbound automation',
 *   { company: 'lumnis.ai', companyContext: 'AI outbound automation for B2B sales', limit: 100 },
 * )
 *
 * // Explicit mode — you already know the competitors
 * const { responseId } = await client.responses.competitorPostEngagement(
 *   'Same persona prompt here',
 *   { competitors: ['outreach.io', 'apollo.io'], postsDateRange: 'past-month' },
 * )
 *
 * const result = await client.responses.get(responseId, { wait: 120 })
 * const output = result.structuredResponse as CompetitorPostEngagementOutput
 * ```
 *
 * Lower-level API (same payload):
 *
 * ```ts
 * await client.responses.create({
 *   messages: [{ role: 'user', content: '<persona prompt>' }],
 *   specializedAgent: 'competitor_post_engagement',
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
 * | **B — Discovery** | `company: string` | ReAct finds competitors (Exa + Fiber validation), engagement-ranks, keeps top `maxCompetitors` |
 *
 * Discovery helpers (Mode B only):
 * - `companyContext` — disambiguates ambiguous domains (e.g. lumnis.ai → sales vs academic AI)
 * - `companyExamples` — anchor competitors; agent finds more in the same vertical
 *
 * The **persona prompt** lives in `messages[0].content` (required). Params only
 * control targets, post selection, and extraction — not who you're looking for.
 *
 * ---
 *
 * ## API keys (BYO via external API keys, or platform env)
 *
 * | Key | Required | Role |
 * |-----|----------|------|
 * | `FIBER_API_KEY` | **Yes** | Company resolution, post listing (free engagement counts) |
 * | `CRUSTDATA_API_KEY` | **Yes** | Exec search, reactor/commenter extraction (rich profiles inline) |
 * | `EXA_API_KEY` | Discovery + deep validation | Web search in find_competitors ReAct and validation chain |
 * | `FIRECRAWL_API_KEY` | Optional | Homepage/comparison-page scrape during discovery. Without it: Exa-only fallback (`fetch_url_content` returns `{error}`). Quality drops on ambiguous domains. |
 * | `ENRICH_LAYER_API_KEY` | Optional | Enriches ~29% of reactors missing employer data in direct_posts_node |
 *
 * ---
 *
 * ## Defaults & caps (per run)
 *
 * | Param | Default | Max |
 * |-------|---------|-----|
 * | `limit` | 100 | 1000 |
 * | `maxCompetitors` | 10 (discovery only) | 50 |
 * | `maxExecsPerTarget` | 5 | 20 |
 * | `maxPostsPerTarget` | 5 | 20 |
 * | `postsDateRange` | `past-month` | past-24h … past-year |
 * | `engagementTypes` | `['reactor','commenter']` | — |
 * | `maxReactorsPerPost` | 5000 (API max) | 5000 |
 * | `maxCommentsPerPost` | 100 (quality cliff) | 100 |
 *
 * D33 asymmetry: Crustdata bills **per post request**, not per reactor count —
 * capping reactors below 5000 saves time, not credits. Above 100 commenters,
 * profiles thin out (name + headline only) and scoring degrades.
 *
 * `engagementTypes` also drives **post ranking**: reactor-only ranks by reactions,
 * not comments, so extraction policy matches which posts win selection.
 *
 * ---
 *
 * ## Pipeline (what happens server-side)
 *
 * 1. **criteria_decomposition** — persona → scorable criteria (reused from deep_people_search)
 * 2. **resolve_targets** — Fiber kitchen-sink (primary) / Crustdata identify (fallback)
 * 3. **find_competitors** *(discovery only)* — ReAct: Exa + optional Firecrawl + Fiber validate
 * 4. **fetch_post_urls** — paginate company + exec posts, rank by engagement, top N per competitor
 * 5. **post_relevance_filter** — LLM drops noise posts (recruiting ads, bait) before Crustdata extraction
 * 6. **direct_posts** — Crustdata extract reactors/commenters + conditional enrichment (reused)
 * 7. **reactor_prefilter** — dedup, drop competitor employees, LLM pre-filter to ~limit×6 pool
 * 8. **merge_candidates → fast_filter → realtime_refresh → validation** — reused scoring chain;
 *    engagement_scoring auto-runs in validation (author=1.0, commenter=0.6, reactor=0.3)
 *
 * ---
 *
 * ## Structured output (`ResponseObject.structuredResponse`)
 *
 * Cast to {@link CompetitorPostEngagementOutput}:
 *
 * - `candidates[]` — scored people, sorted by `overallScore`, capped to `limit`
 * - `competitorsResolved[]` — resolved target metadata per competitor analyzed
 * - `discoveredCompetitors[]` — domains found in discovery mode (Mode B)
 * - `discoveryTrace` — ReAct audit trail (`reasoning`, `seed`, errors)
 * - `criteria` — generated criteria definitions + classification
 * - `costStats` — `{ crustdataCredits, fiberCredits }` (shape stable; values may be 0 until wired)
 * - `provenanceAttached` — whether post metadata was joined onto engagement records
 * - `agentParams` — echo of params used for the run
 *
 * ### Per-candidate `engagementData[]`
 *
 * Same shape as deep_people_search posts mode, plus competitor provenance.
 * **One entry per post** — multiple posts → multiple entries (merge preserves all).
 *
 * | Field | Example | Source |
 * |-------|---------|--------|
 * | `postUrl` | linkedin.com/posts/openai_… | direct_posts_node |
 * | `role` | `"reactor"` / `"commenter"` | direct_posts_node |
 * | `reactionType` | `"LIKE"` / `"PRAISE"` | direct_posts_node (reactors only) |
 * | `competitor` | `"openai.com"` | provenance |
 * | `competitorName` | `"OpenAI"` | provenance |
 * | `postAuthorType` | `"company"` / `"exec"` | provenance |
 * | `postAuthorName` | `"OpenAI"` / `"Sam Altman"` | provenance |
 * | `postAuthorUrl` | LinkedIn profile URL | provenance |
 * | `postDate` | ISO timestamp | provenance |
 * | `engagementScore` | reactions + comments at selection | provenance |
 *
 * ---
 *
 * ## Cost & latency (typical `limit=100`, `past-month`)
 *
 * Roughly **$14–18/run** with D40 pre-filter + D44 post filter, **~90–120s** wall time.
 * Dominant spend: Crustdata reactor extraction (~500 credits for ~50 posts × 10 cr/post)
 * + scoring-chain LLM/Exa on the pre-filtered pool (~600 survivors at limit×6).
 *
 * Cost levers (all opt-in via params — nothing capped silently):
 * - `postsDateRange: 'past-week'` — less post data
 * - `engagementTypes: ['reactor']` — halves extraction credits per post
 * - `includeExecPosts: false` — skips exec discovery stage
 * - `maxCompetitors` / `maxPostsPerTarget` — linear reduction
 *
 * @see Backend docs: `docs/post_engagement_agent/ARCHITECTURE.md`
 * @see Backend costs: `docs/post_engagement_agent/COSTS.md`
 */

import type { CriteriaMetadata, ValidatedCandidate } from './responses'

/** Which engagers to extract from each selected post. */
export type PostEngagementType = 'reactor' | 'commenter'

/**
 * Resolved competitor target.
 * Produced by `resolve_targets_node` via Fiber kitchen-sink (primary) or
 * Crustdata `identify_company` (fallback).
 */
export interface ResolvedCompetitorTarget {
  /** Original input identifier (domain or name as provided) */
  input: string
  /** Resolved display name */
  name?: string
  /** LinkedIn company slug */
  linkedinSlug?: string
  /** Full LinkedIn company profile URL */
  linkedinUrl?: string
  /** Identifier passed to Fiber post endpoints */
  fiberIdentifier?: string
  /** Employee count estimate from Fiber or Crustdata */
  headcount?: number | string | null
  /** Industry tags from company resolution */
  industries?: string[]
  /** Resolution source: `fiber` or `crustdata` */
  source?: string
  /** Human-readable note when resolution was partial */
  resolutionNote?: string | null
  /** Total reactions+comments on company posts in window (discovery ranking only) */
  engagementPreviewScore?: number
}

/**
 * One LinkedIn post a candidate engaged with.
 *
 * Base fields from `direct_posts_node`; competitor_post_engagement joins
 * provenance (competitor, author, date). Multiple posts → multiple entries.
 */
export interface PostEngagementData {
  /** LinkedIn post URL the person engaged with */
  postUrl: string
  /** How the person engaged */
  role: 'reactor' | 'commenter'
  /** Reaction type for reactors (e.g. LIKE, PRAISE, EMPATHY) */
  reactionType?: string
  /** Original competitor input identifier (e.g. "openai.com") */
  competitor?: string
  /** Display name of the competitor company */
  competitorName?: string
  /** Whether the post came from a company page or an executive's profile */
  postAuthorType?: 'company' | 'exec'
  /** Name of the post author (company or exec) */
  postAuthorName?: string
  /** LinkedIn URL of the post author */
  postAuthorUrl?: string
  /** ISO timestamp of the post */
  postDate?: string
  /** Total engagement on the post (reactions + comments) at selection time */
  engagementScore?: number
  [key: string]: any
}

/** @deprecated Use {@link PostEngagementData} */
export type PostEngagementProvenance = PostEngagementData

/** Discovery ReAct audit trail (Mode B / `company` seed only). */
export interface DiscoveryTrace {
  /** Seed company that discovery started from */
  seed?: string
  /** Number of validated competitors returned */
  candidateCount?: number
  /** ReAct reasoning explaining why each competitor was included */
  reasoning?: string
  /** Error when discovery failed (no Fiber key, ReAct error, etc.) */
  error?: string
  [key: string]: any
}

/**
 * Credit usage on structured output.
 * Shape is stable; values may be 0 until server-side accounting is wired.
 */
export interface AgentCostStats {
  crustdataCredits: number
  fiberCredits: number
}

/**
 * Full structured output from a succeeded `competitor_post_engagement` run.
 * Available on `ResponseObject.structuredResponse`.
 */
export interface CompetitorPostEngagementOutput {
  /** Scored candidates sorted by overallScore descending, capped to params.limit */
  candidates: ValidatedCandidate[]
  /** Generated or reused criteria metadata */
  criteria?: CriteriaMetadata
  /** Resolved competitor targets used for post extraction */
  competitorsResolved: ResolvedCompetitorTarget[]
  /** Competitors discovered from seed (discovery mode only) */
  discoveredCompetitors?: string[]
  /** Audit trail from the competitor-discovery ReAct */
  discoveryTrace?: DiscoveryTrace
  /** Credit usage (shape stable; values may be 0 until wired server-side) */
  costStats: AgentCostStats
  /** Whether post provenance was joined onto engagement_data entries */
  provenanceAttached: boolean
  /** Echo of validated agent params used for this run */
  agentParams?: Record<string, any>
}
