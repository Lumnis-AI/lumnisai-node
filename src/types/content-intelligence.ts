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

/** Full structured response returned by the content_intelligence agent. */
export interface ContentIntelligenceOutput {
  package: ContentIntelligencePackage
  summary: ContentIntelligenceSummary
  outputs: ContentIntelligenceOutputs
  coverage: ContentIntelligenceCoverage
  audienceStats: ContentIntelligenceAudienceStats | Record<string, never>
  agentParams: ContentIntelligenceResolvedParams
}
