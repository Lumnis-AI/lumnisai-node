/**
 * @module company_intelligence
 *
 * # Company Intelligence & Person Intelligence Agents — SDK Reference
 *
 * > One deep intelligence report on a single company, or on a single person.
 *
 * Agent IDs: `company_intelligence`, `person_intelligence`
 *
 * Two separately registered agents sharing one backend pipeline. Both read
 * everything the platform can buy or fetch about their subject, hand it to a
 * writer model, and return a long markdown report — plus a display-block
 * **envelope** that slices the same report into sections, blocks, tables and
 * code-built charts for rendering.
 *
 * ---
 *
 * ## Invocation
 *
 * ```ts
 * import { LumnisClient, type CompanyIntelligenceOutput } from 'lumnisai'
 *
 * const client = new LumnisClient({ apiKey: '...' })
 *
 * // Company report — `company` is the domain it uses on LinkedIn when they differ.
 * const { responseId } = await client.responses.companyIntelligence('acme.com', {
 *   companyContext: 'We sell observability tooling to platform teams',
 *   reader: 'vendor',
 * })
 *
 * const result = await client.responses.get(responseId, { wait: 120 })
 * const output = result.structuredResponse as CompanyIntelligenceOutput
 * console.log(output.reportMarkdown)          // the full report
 * console.log(output.envelope?.sections)      // section index for rendering
 * ```
 *
 * ```ts
 * // Person report — URL door (no name needed, it is read from the live profile)
 * await client.responses.personIntelligence('https://www.linkedin.com/in/danteran/')
 *
 * // Person report — name door (needs the employer's domain to resolve the person)
 * await client.responses.personIntelligence('Dan Chen', { company: 'acme.com' })
 * ```
 *
 * Lower-level API (same payload):
 *
 * ```ts
 * await client.responses.create({
 *   messages: [{ role: 'user', content: 'Company intelligence report for acme.com' }],
 *   specializedAgent: 'company_intelligence',
 *   specializedAgentParams: { company: 'acme.com', reader: 'investor' },
 * })
 * ```
 *
 * ---
 *
 * ## Input modes
 *
 * | Agent | Required | Optional |
 * |-------|----------|----------|
 * | `company_intelligence` | `company` (domain) | `companyContext`, `reader`, `sinceDays`, `allowSpend` |
 * | `person_intelligence` — URL door | `linkedinUrl` | `company` (employer domain, as context), `companyContext` |
 * | `person_intelligence` — name door | `personName` + `company` | `companyContext` |
 *
 * `company` accepts a pasted URL or a bare domain — the backend normalizes
 * `https://www.acme.com/about` to `acme.com`. `reader` and `sinceDays` are
 * company-lane knobs only; the person agent does not declare them.
 *
 * ---
 *
 * ## API keys (BYO via external API keys, or platform env)
 *
 * | Key | Role |
 * |-----|------|
 * | `CRUSTDATA_API_KEY` | Job-posting corpus, headcount/traffic series, enrichment, roster, exec posts |
 * | `FIBER_API_KEY` | Talent flow, second revenue estimate, person profile/posts/engagement, X + Instagram |
 * | `FIRECRAWL_API_KEY` | Careers page and press-page capture (plain fetch is the fallback) |
 * | `EXA_API_KEY` | News sweep, web-events check, person web presence |
 *
 * Every leg fails soft on a missing key: the run still produces a report from
 * whatever sources are credentialed, and says what was thin.
 *
 * ---
 *
 * ## Runtime & cost
 *
 * Company runs are long (tens of minutes on a cold corpus) because the posting
 * corpus is fetched with zero truncation. `sinceDays` trades depth for credits
 * by bounding the paid posting window; the default (`undefined`) is the full
 * indexed history, which the report's timelines and never-posted claims need.
 * A posting fetch projected above the per-run credit ceiling stops rather than
 * spending — pass `allowSpend: true` to let it through. Person runs are much
 * cheaper and typically finish in a few minutes.
 *
 * ---
 *
 * ## Output contract
 *
 * `outputText` is the full report markdown. `structuredResponse` carries
 * {@link CompanyIntelligenceOutput} / {@link PersonIntelligenceOutput}:
 *
 * - `reportMarkdown` — the same markdown, for consumers reading structured output only.
 * - `envelope` — the display-block document ({@link IntelligenceReportEnvelope}).
 *   `null` when the translator step failed; the report itself still ships and
 *   `summary.errors` counts the failure.
 * - `richness` — person lane only; `null` on company reports.
 * - `stats` — company corpus stats; `{}` on person reports.
 * - `credits` — the per-call credit ledger for the run.
 * - `summary` / `agentParams` — run summary and the resolved params.
 *
 * The envelope is lossless by construction: prose blocks are verbatim slices of
 * `reportMarkdown` (concatenating them reproduces the report minus its `##`
 * headings), overlays that are not word-for-word present in their section are
 * dropped and counted in `overlayDrops`, and charts are built in code from the
 * pipeline's own series — never plotted by a model.
 */

/** Report register for `company_intelligence`. Sets tone only — content tailoring comes from `companyContext`. */
export type IntelligenceReportReader =
  | 'investor'
  | 'competitor'
  | 'vendor'
  | 'neutral'
  | (string & {})

/** Options accepted by {@link ResponsesResource.companyIntelligence}. */
export interface CompanyIntelligenceOptions {
  /**
   * What the report should focus on, sent as the request message. Defaults to a
   * generic prompt naming the company; the backend requires a non-empty message.
   */
  prompt?: string
  /**
   * Free-text on who is asking and why. The only content-tailoring input —
   * it steers emphasis and the per-reader takeaways.
   */
  companyContext?: string
  /**
   * Report register: investor, competitor, vendor or neutral.
   * Register only; it never changes which findings appear or how they are weighted.
   * @default 'neutral'
   */
  reader?: IntelligenceReportReader
  /**
   * Job-posting window in days, filtered server-side on the posting's date added.
   * Omit for the FULL posting history, which the report's timelines,
   * first-of-function detection and never-posted claims depend on.
   * Set a window only to trade depth for credits.
   * @minimum 1 @maximum 3650
   */
  sinceDays?: number
  /**
   * Permit the posting fetch to spend past the per-run credit ceiling.
   * Off by default: an oversized corpus stops before buying.
   * @default false
   */
  allowSpend?: boolean
}

/** Options accepted by {@link ResponsesResource.personIntelligence}. */
export interface PersonIntelligenceOptions {
  /**
   * What the report should focus on, sent as the request message. Defaults to a
   * generic prompt naming the person; the backend requires a non-empty message.
   */
  prompt?: string
  /**
   * The employer's domain. **Required** when the target is a name (it resolves
   * the right person); optional employer context on the LinkedIn-URL door.
   */
  company?: string
  /** Free-text on who is asking and why — tailors the "how to approach" section. */
  companyContext?: string
}

/** Resolved `company_intelligence` params echoed back on the structured response. */
export interface CompanyIntelligenceResolvedParams {
  company: string
  companyContext?: string | null
  sinceDays?: number | null
  allowSpend: boolean
  reader: string
}

/** Resolved `person_intelligence` params echoed back on the structured response. */
export interface PersonIntelligenceResolvedParams {
  linkedinUrl?: string | null
  personName?: string | null
  company?: string | null
  companyContext?: string | null
}

/** What a report is about. `type` discriminates the two lanes. */
export type IntelligenceReportSubject =
  | CompanyReportSubject
  | PersonReportSubject

export interface CompanyReportSubject {
  type: 'company'
  /** Normalized domain the run resolved against. */
  domain: string
  /** True when the data vendor's index holds no company for this domain — a stub report is returned. */
  notIndexed?: boolean
}

export interface PersonReportSubject {
  type: 'person'
  /** Null on the URL door until the live profile supplies it. */
  name?: string | null
  linkedinUrl?: string | null
  /** Employer domain, when one was supplied. */
  companyDomain?: string | null
}

/** Per-category evidence grade on a person report. */
export type EvidenceRichnessGrade = 'poor' | 'fair' | 'rich'

/**
 * How much evidence the person lane actually found, graded before the report is
 * written so thin sections stay short instead of being padded. `null` on
 * company reports — this is a person-lane score.
 */
export interface PersonEvidenceRichness {
  /** Why these grades, in reader language — names the thin spots and their cause. */
  reasoning?: string
  identity?: EvidenceRichnessGrade
  voicePosts?: EvidenceRichnessGrade
  engagement?: EvidenceRichnessGrade
  otherPlatforms?: EvidenceRichnessGrade
  webPresence?: EvidenceRichnessGrade
  employerContext?: EvidenceRichnessGrade
  overall?: EvidenceRichnessGrade
  /** Model id that scored it, or `'code'` when the deterministic fallback ran. */
  scoredBy?: string
  [key: string]: any
}

/** One vendor call and what it cost. */
export interface IntelligenceCreditEntry {
  endpoint: string
  results: number
  credits: number
  /** `'header'` when the vendor reported the cost, `'estimate'` when it was derived. */
  creditsSource: 'header' | 'estimate' | (string & {})
  note?: string
}

/** Everything the run spent, per call. */
export interface IntelligenceCreditLedger {
  total: number
  entries: IntelligenceCreditEntry[]
}

/** Whether the report came out structurally whole. */
export interface IntelligenceReportCompleteness {
  complete: boolean
  /** Empty when complete; otherwise what is missing (truncated tail, mid-sentence end). */
  why?: string
}

/** Run summary carried on the structured response. */
export interface IntelligenceReportSummary {
  mode: 'company' | 'person' | (string & {})
  subject: IntelligenceReportSubject | Record<string, any>
  reportChars: number
  complete?: boolean | null
  creditsTotal?: number | null
  /** Count of recorded errors (not-indexed company, failed translation). */
  errors: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Envelope — the display-block document
// ─────────────────────────────────────────────────────────────────────────────

/** One `##` section of the report, for building an index or nav. */
export interface IntelligenceReportSectionRef {
  /** Slug derived from the heading, e.g. `1_executive_summary`. Matches `blocks[].sectionId`. */
  id: string
  title: string
}

/** A markdown table parsed out of a section in code. */
export interface IntelligenceReportTable {
  columns: string[]
  rows: string[][]
}

/** One option inside a weighted call, with the report's own label for it. */
export interface WeightedCallOption {
  /** The report's own wording — 'Bull', 'PE-driven expansion', never normalized. */
  label: string
  pct: number
  /** Verbatim sentence or clause from the section that carries this option. */
  excerpt: string
}

/**
 * Anywhere the report weighs alternatives with percentages — a Bull/Bear
 * verdict, competing explanations, weighted triggers. Two-way or n-way;
 * percentages usually sum to ~100.
 */
export interface WeightedCall {
  /** What is being weighed, briefly. */
  about: string
  options: WeightedCallOption[]
}

/** A quotation the report made, with its attribution when stated. */
export interface IntelligenceQuoteSpan {
  /** Verbatim quoted words, without the surrounding quotation marks. */
  quote: string
  speaker?: string | null
  date?: string | null
  url?: string | null
}

/** A named person or company the section calls out. */
export interface IntelligenceEntitySpan {
  name: string
  title?: string | null
  url?: string | null
  /** e.g. champion, economic buyer, founder. */
  role?: string | null
}

/** A headline figure lifted verbatim from the section. */
export interface IntelligenceStatSpan {
  label: string
  /** Verbatim value as written in the report. */
  value: string
  source?: string | null
}

/**
 * Typed annotations over one section. Every excerpt is verbatim in that
 * section's `prose` — anything that was not is dropped before delivery and
 * counted in {@link IntelligenceReportEnvelope.overlayDrops}. An empty object
 * means the section carried nothing of that kind, or the translator failed.
 */
export interface IntelligenceSectionOverlays {
  weightedCalls?: WeightedCall[]
  quotes?: IntelligenceQuoteSpan[]
  entities?: IntelligenceEntitySpan[]
  /** Verbatim items; watchlist sections only. */
  watchlistItems?: string[]
  keyStats?: IntelligenceStatSpan[]
  /** One sentence FROM this section for a chart to carry as its title. */
  chartTakeaway?: string | null
}

/** One renderable block: a verbatim section slice plus its annotations. */
export interface IntelligenceReportBlock {
  type: 'prose' | (string & {})
  sectionId: string
  title: string
  /** Verbatim slice of `reportMarkdown` — never rewritten or summarized. */
  prose: string
  tables: IntelligenceReportTable[]
  overlays: IntelligenceSectionOverlays | Record<string, never>
}

/** Series ids the pipeline builds charts for. */
export type IntelligenceChartId =
  | 'headcount_weekly'
  | 'web_traffic_monthly'
  | 'function_mix'
  | 'geo_mix'
  | 'engagement_tally'
  | (string & {})

export interface IntelligenceLineChartPoint {
  date: string
  value: number
}

export interface IntelligenceBarChartBar {
  label: string
  value: number
}

/** A dated series. Emitted only when it has at least 5 points. */
export interface IntelligenceLineChart {
  type: 'line_chart'
  id: IntelligenceChartId
  points: IntelligenceLineChartPoint[]
}

/** A ranked comparison, sorted descending. Emitted only when it has at least 5 bars. */
export interface IntelligenceBarChart {
  type: 'bar_chart'
  id: IntelligenceChartId
  bars: IntelligenceBarChartBar[]
}

export type IntelligenceChart = IntelligenceLineChart | IntelligenceBarChart

/**
 * The display-block document for one finished report.
 *
 * Sections, tables and charts are produced in code; a single cheap model call
 * only annotates the prose with verbatim overlays. That call fails soft — on a
 * model error the envelope still ships with empty overlays and
 * {@link IntelligenceReportEnvelope.translatorError} set.
 */
export interface IntelligenceReportEnvelope {
  subject: IntelligenceReportSubject | Record<string, any>
  /** ISO 8601 timestamp of when the envelope was built. */
  generatedAt: string
  translatorModel: string
  richness?: PersonEvidenceRichness | null
  sections: IntelligenceReportSectionRef[]
  blocks: IntelligenceReportBlock[]
  charts: IntelligenceChart[]
  /** How many model-proposed overlays were discarded for not being verbatim. */
  overlayDrops: number
  /** The canonical full report — the same markdown as `outputText`. */
  reportMarkdown: string
  /** Present only when the annotation call failed; overlays are empty in that case. */
  translatorError?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured responses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Corpus statistics for a company report, all computed in code.
 * Empty (`{}`) on person reports.
 */
export interface CompanyIntelligenceStats {
  rawPostings?: number
  exactDuplicatesDropped?: number
  requisitionsAfterClustering?: number
  boardCopiesFolded?: number
  datedPostings?: number
  undatedPostings?: number
  /** e.g. `'2024-02-01 to 2026-08-19'`, or a note when nothing is dated. */
  dateRange?: string
  /** Posting counts per source (LinkedIn, ATS boards, …). */
  sourceMix?: Record<string, number>
  repostedTrue?: number
  /** Repost share of the postings that carry the flag at all; null when none do. */
  repostShareOfFlagged?: number | null
  openingsSum?: number
  /** `[month, count]` pairs, oldest first. */
  monthlyHistogram?: Array<[string, number]>
  /** Free per-window posting counts, keyed by window (`30d`, `90d`, `allTime`, …). */
  velocitySeries?: Record<string, { all?: number, noReposts?: number }>
  /** Roles open on the live careers board now; null when only an unstructured page was captured. */
  liveBoardOpenRoles?: number | null
  stillUpdatedRecently?: number
  recencyWindowDays?: number
  [key: string]: any
}

/** Full structured response returned by the `company_intelligence` agent. */
export interface CompanyIntelligenceOutput {
  /** Display-block document; `null` when the translator step failed. */
  envelope: IntelligenceReportEnvelope | null
  /** The full report markdown — the same text as `outputText`. */
  reportMarkdown: string
  /** Always `null` on the company lane; richness is a person-lane score. */
  richness: PersonEvidenceRichness | null
  stats: CompanyIntelligenceStats
  credits: IntelligenceCreditLedger
  summary: IntelligenceReportSummary
  agentParams: CompanyIntelligenceResolvedParams
}

/** Full structured response returned by the `person_intelligence` agent. */
export interface PersonIntelligenceOutput {
  /** Display-block document; `null` when the translator step failed. */
  envelope: IntelligenceReportEnvelope | null
  /** The full report markdown — the same text as `outputText`. */
  reportMarkdown: string
  /** How much evidence the run actually found, graded per category. */
  richness: PersonEvidenceRichness | null
  /** Empty on the person lane — corpus stats are a company-lane artifact. */
  stats: Record<string, never> | Record<string, any>
  credits: IntelligenceCreditLedger
  summary: IntelligenceReportSummary
  agentParams: PersonIntelligenceResolvedParams
}
