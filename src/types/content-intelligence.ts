import type { PostsDateRange } from './responses'

/** Outputs currently supported by the content_intelligence agent. */
export type ContentIntelligenceOutputName =
  | 'top_posts'
  | 'post_ideas'
  | 'engagement_analysis'

/** Options accepted by {@link ResponsesResource.contentIntelligence}. */
export interface ContentIntelligenceOptions {
  /** Number of audience members whose reactions are collected. @default 100 */
  limit?: number
  /** How far back to collect each audience member's reactions. @default 'past-month' */
  postsDateRange?: PostsDateRange
  /** Mark junk posts during curation without deleting them from the package. @default true */
  postsEnableFiltering?: boolean
  /** Results requested from each Exa people-search query. The search lane defaults to 100. */
  exaResultsPerQuery?: number
  /**
   * Company the post ideas are for. Used only to tailor post ideas; it does not
   * affect search, curation, engagement analysis, or grounding of neutral drafts.
   */
  companyContext?: string
  /**
   * Requested content style, angle, format, or exclusions. Used only to tailor
   * post ideas so audience discovery and analysis remain unbiased.
   */
  contentDirection?: string
  /** Re-cook the package stored on this response ID without collecting again. */
  reusePackageFrom?: string
  /** Outputs to produce. Omit to use the backend's current default set. */
  outputs?: ContentIntelligenceOutputName[]
  /**
   * Up to five competitor names or domains. When present, the response also
   * contains a separate report about what those companies and their executives
   * published in the same window. Competitor posts never enter audience metrics.
   */
  competitors?: string[]
  /**
   * Own company name or domain to compare with `competitors`. It is read through
   * the same sources, tagged as `self`, and does not count toward the five-company
   * competitor limit. Only meaningful when `competitors` is present.
   */
  company?: string
  /** Read each competitor's company-page posts. @default true */
  includeCompanyPosts?: boolean
  /** Read posts from each competitor's executives. @default true */
  includeExecPosts?: boolean
  /**
   * Read posts by other people that tag each competitor's LinkedIn page, plus
   * the caller's own company when provided. Targets are matched by page rather
   * than name. This incurs one CrustData call per target and one credit per post.
   * @default true
   */
  includeMentionPosts?: boolean
  /**
   * Mentions read per target, returned in vendor relevance order.
   * This is also the worst-case per-target credit charge for mention collection.
   * @default 50 @minimum 1 @maximum 500
   */
  maxMentionsPerTarget?: number
  /**
   * Executive title stems, most senior first. Supplying this list replaces the
   * backend's default title list.
   */
  execTitles?: string[]
  /** Executives read per competitor, most senior first. @default 10 @minimum 1 @maximum 20 */
  maxExecsPerTarget?: number
}

export interface ContentIntelligenceResolvedParams {
  limit: number
  postsDateRange: PostsDateRange
  postsEnableFiltering: boolean
  exaResultsPerQuery?: number | null
  companyContext?: string | null
  contentDirection?: string | null
  reusePackageFrom?: string | null
  outputs: ContentIntelligenceOutputName[]
  /** Present on responses produced by competitor-aware backend versions. */
  competitors?: string[] | null
  /** Own-company comparison target; null when none was supplied. */
  company?: string | null
  /** @default true */
  includeCompanyPosts?: boolean
  /** @default true */
  includeExecPosts?: boolean
  /** @default true */
  includeMentionPosts?: boolean
  /** @default 50 */
  maxMentionsPerTarget?: number
  /** Null means the backend's default executive-title list was used. */
  execTitles?: string[] | null
  /** @default 10 */
  maxExecsPerTarget?: number
}

export interface ContentIntelligenceDateValue {
  kind: 'exact' | 'age'
  value: string
}

export interface ContentIntelligenceAuthor {
  name?: string | null
  url?: string | null
}

export interface ContentIntelligenceEngager {
  person: string
  action: 'reaction' | 'comment'
  when?: ContentIntelligenceDateValue | null
}

export interface ContentIntelligencePost {
  key: string
  ids: string[]
  text?: string | null
  author?: ContentIntelligenceAuthor | null
  published?: ContentIntelligenceDateValue | null
  url?: string | null
  sources: string[]
  engagers: ContentIntelligenceEngager[]
  audienceCount: number
  totals?: {
    reactions?: number | null
    comments?: number | null
  } | null
  missing: string[]
  reasoning?: string
  removalClass?: 'hiring' | 'personal' | 'promo' | 'bait' | 'no_substance' | 'unclassified'
  relevance?: number | null
  totalReactions?: number | null
  totalComments?: number | null
  /** Whether the source post includes video. The backend does not expose the media URL. */
  hasVideo?: boolean
  hybridScore?: number
}

export interface ContentIntelligencePackage {
  posts: ContentIntelligencePost[]
  uncopiedFields: Record<string, number>
}

export interface TopPost {
  key?: string | null
  url?: string | null
  hybridScore?: number | null
  relevance?: number | null
  totalReactions?: number | null
  totalComments?: number | null
  audienceCount?: number | null
  author?: string | null
  text: string
}

export interface TopPostsOutput {
  artifact: 'top_posts'
  n: number
  requested: number
  posts: TopPost[]
}

export interface PostIdea {
  reasoning: string
  idea: string
  angle: string
  citedPostKeys: string[]
  /** Clickable source posts that inspired the idea. */
  citedPosts: Array<{
    key: string
    url?: string | null
    author?: string | null
  }>
  /** Neutral draft, with no company mention. */
  draft: string
  /**
   * The same post rewritten with an honest company tie-in. Null when no
   * company context was supplied.
   */
  draftWithCompany?: string | null
  probability: number
  keysExist: number
  keysCited: number
  supported: boolean
  groundingReason: string
  /** Independent grounding verdict for `draftWithCompany`. */
  supportedWithCompany?: boolean
  /** Why `draftWithCompany` did or did not pass its two-source grounding check. */
  groundingReasonWithCompany?: string
}

export interface PostIdeasOutput {
  artifact: 'post_ideas'
  n: number
  ideas: PostIdea[]
  allSupported?: boolean
  /** Number of ideas that include a company-tailored draft. */
  draftsWithCompany?: number
  /** Number of company-tailored drafts that passed grounding. */
  companyDraftsSupported?: number
  postsSeen?: number
  chunks?: number
  /** Request fields that actually steered the generated post ideas. */
  steeredBy?: Array<'company_context' | 'content_direction'>
  note?: string
}

export interface ThemeStats {
  posts: number
  audienceEngagements: number
  marketReactions: number
  avgRelevance?: number | null
}

export interface ThemeAssignment {
  theme: string
  postKeys: string[]
  keysCited: number
  keysExist: number
  stats: ThemeStats
}

export interface StandoutPost {
  postKey: string
  whyItWorked: string
  keyExists: boolean
}

export interface PeriodInsight {
  reasoning: string
  startDay: string
  endDay: string
  headline: string
  topTheme: string
  themes: ThemeAssignment[]
  gravitatedTo: string
  standoutPost?: StandoutPost | null
  examplePostKeys: string[]
  shiftFromPrevious?: string | null
  keysCited: number
  keysExist: number
}

export interface Takeaway {
  reasoning: string
  finding: string
  action: string
  examplePostKeys: string[]
  keysCited: number
  keysExist: number
}

export interface Opportunity {
  reasoning: string
  topic: string
  evidence: string
  suggestedAngle: string
  examplePostKeys: string[]
  keysCited: number
  keysExist: number
}

export interface PainPoint {
  reasoning: string
  pain: string
  whoFeelsIt: string
  evidence: string
  resonatingLanguage: string[]
  messagingImplication: string
  examplePostKeys: string[]
  keysCited: number
  keysExist: number
}

export interface ThemePeriodStats extends ThemeStats {
  period: number
  share: number
}

export interface ThemeTrend {
  theme: string
  perPeriod: ThemePeriodStats[]
  shareDelta: number
  trend: 'rising' | 'flat' | 'falling'
}

export interface TopVoice {
  author: string
  authorUrl?: string | null
  posts: number
  audienceEngagements: number
  marketReactions: number
  themes: string[]
  examplePostKey?: string | null
}

export interface EngagementAnalysisScope {
  audience: string
  windowStart?: string | null
  windowEnd?: string | null
  daysPresent: number
  feedPosts: number
  packagePosts: number
  removalMix: Record<string, number>
}

export interface EngagementAnalysisOutput {
  artifact: 'engagement_analysis'
  n: number
  periods: PeriodInsight[]
  themeStats?: ThemeTrend[]
  takeaways: Takeaway[]
  opportunities?: Opportunity[]
  painPoints?: PainPoint[]
  topVoices?: TopVoice[]
  summary: string
  segmentationReasoning?: string
  scope?: EngagementAnalysisScope
  chunks?: number
  note?: string
}

export interface ContentIntelligenceCurationStats {
  kept?: number
  removedByClass?: Record<string, number>
  unscored?: number
  [key: string]: unknown
}

export interface ContentIntelligenceOutputs {
  outputsRequested: ContentIntelligenceOutputName[]
  curation: ContentIntelligenceCurationStats
  note?: string
  topPosts?: TopPostsOutput
  postIdeas?: PostIdeasOutput
  engagementAnalysis?: EngagementAnalysisOutput
  /** Automatically produced when competitors were requested; not selectable in `outputs`. */
  competitorAnalysis?: ContentIntelligenceCompetitorAnalysis
}

export interface ContentIntelligenceCoveragePerson {
  linkedinUrl?: string
  pages?: number
  records?: number
  credits?: number
  stopReason?: string
  error?: unknown
  [key: string]: unknown
}

export interface ContentIntelligenceCoverage {
  audienceSize?: number
  windowDays?: number
  budgetCredits?: number
  creditsSpent?: number
  records?: number
  peopleWithRecords?: number
  dormantPeople?: Array<{ linkedinUrl?: string, name?: string }>
  resumedPeople?: number
  resumedAvailable?: number
  perPerson?: ContentIntelligenceCoveragePerson[] | Record<string, ContentIntelligenceCoveragePerson>
  durationMs?: number
  stopReason?: string
}

export interface ContentIntelligenceSummary {
  audienceSize: number
  peopleWithRecords?: number | null
  creditsSpent?: number | null
  windowDays?: number | null
  outputsProduced: ContentIntelligenceOutputName[]
  feedPosts: number
  curation: ContentIntelligenceCurationStats
  reusedPackageFrom?: string | null
  posts: number
  postsKept: number
  postsRemoved: number
  /** Present only when competitors were requested. */
  competitors?: ContentIntelligenceCompetitorSummary
}

export interface ContentIntelligenceAudienceStats {
  scored: number
  scoredByBucket: Record<string, number>
  limit: number
  audienceSize: number
  audienceByBucket: Record<string, number>
  droppedMissingUrl: number
  droppedDuplicateUrl: number
  topScore?: number | null
  lowestScore?: number | null
  durationMs: number
}

// ═════════════════════════════════════════════════════════════════════════════════
// Competitor content output (separate from audience engagement output)
// ═════════════════════════════════════════════════════════════════════════════════

export type ContentIntelligenceCompetitorStatus
  = | 'complete'
    | 'partial'
    | 'unresolved'
    | 'empty'

export type ContentIntelligenceCompetitorPostAuthorType = 'company' | 'exec'
export type ContentIntelligenceCompetitorPostSource = 'competitor_company' | 'competitor_exec'
export type ContentIntelligenceCompetitorRole = 'self' | 'competitor'

export interface ContentIntelligenceCompetitorSource {
  /** The caller's original competitor or own-company input. */
  competitor: string
  competitorName: string
  competitorDomain?: string | null
  /** Missing on packages saved before own-company comparisons were introduced. */
  role?: ContentIntelligenceCompetitorRole
  postAuthorType: ContentIntelligenceCompetitorPostAuthorType
  postAuthorName: string
  postAuthorUrl?: string | null
}

export interface ContentIntelligenceCompetitorPost {
  key: string
  ids: string[]
  text?: string | null
  author?: ContentIntelligenceAuthor | null
  published?: ContentIntelligenceDateValue | null
  /** Exact publication instant used for time bucketing; null when unknown. */
  publishedAt: string | null
  url?: string | null
  sources: ContentIntelligenceCompetitorPostSource[]
  /** Aggregate LinkedIn reactions; null means unknown, not zero. */
  totalReactions: number | null
  /** Aggregate LinkedIn comments; null means unknown, not zero. */
  totalComments: number | null
  competitorSources: ContentIntelligenceCompetitorSource[]
  missing: string[]
  reasoning?: string
  removalClass?: 'hiring' | 'personal' | 'promo' | 'bait' | 'no_substance' | 'unclassified'
  relevance?: number | null
  hybridScore?: number
}

export interface ContentIntelligenceCompetitorPackage {
  posts: ContentIntelligenceCompetitorPost[]
  uncopiedFields: Record<string, number>
}

export interface ContentIntelligenceResolvedCompetitor {
  input: string
  name: string
  domain?: string | null
  linkedinUrl?: string | null
}

export type ContentIntelligenceCompetitorResolutionReason
  = | 'not_resolved'
    | 'provider_error'
    | 'no_provider'

export interface ContentIntelligenceUnresolvedCompetitor {
  input: string
  reason: ContentIntelligenceCompetitorResolutionReason
}

export type ContentIntelligenceCompetitorStopReason
  = | 'fetched'
    | 'empty'
    | 'error'
    | 'not_attempted'

export interface ContentIntelligenceCompetitorTargetCoverage {
  input: string
  name: string
  companyPosts: number
  execPosts: number
  execsConsidered: number
  execsFetched: number
  pagesFiber: number
  pagesCrust: number
  stopReason: ContentIntelligenceCompetitorStopReason
  error?: unknown
}

/** Resolution and collection coverage for the caller's own comparison company. */
export interface ContentIntelligenceOwnCompanyCoverage {
  input: string
  resolved: ContentIntelligenceResolvedCompetitor | null
  reason: ContentIntelligenceCompetitorResolutionReason | null
  target: ContentIntelligenceCompetitorTargetCoverage | null
}

export interface ContentIntelligenceCompetitorCoverage {
  requested: string[]
  resolved: ContentIntelligenceResolvedCompetitor[]
  unresolved: ContentIntelligenceUnresolvedCompetitor[]
  targets: ContentIntelligenceCompetitorTargetCoverage[]
  /** Absent on responses saved before own-company comparison support. */
  own?: ContentIntelligenceOwnCompanyCoverage | null
  requestedWindow: PostsDateRange
  requestedDays: number
  datedPosts: number
  undatedPosts: number
  /** Earliest dated post actually observed, which may be narrower than the request. */
  observedStart?: string | null
  /** Latest dated post actually observed, which may be narrower than the request. */
  observedEnd?: string | null
  status: ContentIntelligenceCompetitorStatus
}

export interface ContentIntelligenceCompetitorSummary {
  requested: number
  resolved: number
  posts: number
  status?: ContentIntelligenceCompetitorStatus | null
  /** Resolved display name of the own-company comparison target. */
  own?: string | null
}

export type ContentIntelligenceCompetitorBucket
  = | 'snapshot'
    | 'day'
    | 'week'
    | 'month'
    | 'quarter'

export interface ContentIntelligenceCompetitorAnalysisScope {
  windowPreset: PostsDateRange
  requestedDays: number
  windowStart: string
  windowEnd: string
  bucket: ContentIntelligenceCompetitorBucket
  posts: number
  datedPosts: number
  undatedPosts: number
  /** Actual span covered by dated posts. */
  observedWindowStart: string | null
  /** Actual span covered by dated posts. */
  observedWindowEnd: string | null
  curatedPosts: number
  competitorsRequested: number
  competitorsResolved: number
}

export interface ContentIntelligenceCompetitorPeriodPoint {
  text: string
  postKeys: string[]
  keysCited: number
  keysExist: number
}

export interface ContentIntelligenceCompetitorPeriodTheme {
  theme: string
  posts: number
  share: number
}

export interface ContentIntelligenceCompetitorPeriod {
  start: string
  end: string
  durationDays: number
  isPartial: boolean
  headline?: string
  points?: ContentIntelligenceCompetitorPeriodPoint[]
  whatChanged?: string | null
  standoutPostKey?: string | null
  standoutKeyExists?: boolean
  whyItStandsOut?: string | null
  posts: number
  companyPosts: number
  execPosts: number
  activeAuthors: number
  reactionsKnownSum: number
  commentsKnownSum: number
  reactionsKnownPosts: number
  /** Posts from the caller's own company; absent on historical reports. */
  ownPosts?: number
  /** Known reactions on own-company posts; absent on historical reports. */
  ownReactionsKnownSum?: number
  perCompetitor: Record<string, number>
  themes: ContentIntelligenceCompetitorPeriodTheme[]
}

export interface ContentIntelligenceCompetitorAdjacentDelta {
  from: number
  to: number
  postsDelta: number
  reactionsDelta: number
}

export interface ContentIntelligenceCompetitorDelta {
  postsDelta: number
  reactionsDelta: number
}

export interface ContentIntelligenceCompetitorDeltas {
  adjacent: ContentIntelligenceCompetitorAdjacentDelta[]
  firstToLast: ContentIntelligenceCompetitorDelta | null
}

export interface ContentIntelligenceCompetitorThemePeriod {
  period: number
  posts: number
  share: number
}

export interface ContentIntelligenceCompetitorThemeStats {
  theme: string
  posts: number
  share: number
  /** Own-company themed posts and share; absent on historical reports. */
  ownPosts?: number
  ownShare?: number
  /** Competitor-only themed posts and share; absent on historical reports. */
  competitorPosts?: number
  competitorShare?: number
  reactionsKnownSum: number
  perPeriod: ContentIntelligenceCompetitorThemePeriod[]
  examplePostKeys: string[]
}

export interface ContentIntelligenceCompetitorRow {
  name: string
  input: string
  /** Missing on reports saved before own-company comparisons were introduced. */
  role?: ContentIntelligenceCompetitorRole
  posts: number
  companyPosts: number
  execPosts: number
  reactionsKnownSum: number
  commentsKnownSum: number
  topThemes: string[]
  examplePostKey: string | null
}

export interface ContentIntelligenceCompetitorComparisonTotals {
  posts: number
  companyPosts: number
  execPosts: number
  reactionsKnownSum: number
  commentsKnownSum: number
}

export interface ContentIntelligenceCompetitorComparison {
  ownResolved: boolean
  ownName: string | null
  sharedThemes: string[]
  ownOnlyThemes: string[]
  competitorOnlyThemes: string[]
  own: ContentIntelligenceCompetitorComparisonTotals
  competitors: ContentIntelligenceCompetitorComparisonTotals
}

export interface ContentIntelligenceCompetitorHighlight {
  reasoning: string
  insight: string
  examplePostKeys: string[]
  keysCited: number
  keysExist: number
}

export interface ContentIntelligenceCompetitorTakeaway {
  reasoning: string
  finding: string
  action: string
  examplePostKeys: string[]
  keysCited: number
  keysExist: number
}

export interface ContentIntelligenceCompetitorAnalysis {
  artifact: 'competitor_analysis'
  status: ContentIntelligenceCompetitorStatus
  scope: ContentIntelligenceCompetitorAnalysisScope
  periods: ContentIntelligenceCompetitorPeriod[]
  deltas: ContentIntelligenceCompetitorDeltas
  themeStats: ContentIntelligenceCompetitorThemeStats[]
  competitors: ContentIntelligenceCompetitorRow[]
  /** Absent on reports saved before own-company comparisons were introduced. */
  comparison?: ContentIntelligenceCompetitorComparison
  highlights: ContentIntelligenceCompetitorHighlight[]
  takeaways: ContentIntelligenceCompetitorTakeaway[]
  summary: string
  note?: string
  invalidCitations: number
}

/** Full structured response returned by the content_intelligence agent. */
export interface ContentIntelligenceOutput {
  package: ContentIntelligencePackage
  summary: ContentIntelligenceSummary
  outputs: ContentIntelligenceOutputs
  coverage: ContentIntelligenceCoverage
  audienceStats: ContentIntelligenceAudienceStats | Record<string, never>
  agentParams: ContentIntelligenceResolvedParams
  /** Present only when competitors were requested. */
  competitorPackage?: ContentIntelligenceCompetitorPackage
  /** Present only when competitors were requested. */
  competitorCoverage?: ContentIntelligenceCompetitorCoverage
}
