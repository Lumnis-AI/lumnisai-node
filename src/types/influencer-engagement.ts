import type { PostEngagementType } from './competitor-post-engagement'
import type {
  CriteriaMetadata,
  PostsDateRange,
  ValidatedCandidate,
} from './responses'

/** Options accepted by {@link ResponsesResource.influencerEngagement}. */
export interface InfluencerEngagementOptions {
  /** LinkedIn profile URLs whose authored posts seed discovery. */
  seedProfiles: string[]
  /**
   * Also use posts the seeds reacted to. These posts describe a wider,
   * third-party audience and are disabled by default.
   * @default false
   */
  includeReactedPosts?: boolean
  /** How far back to inspect each seed's activity. @default 'past-month' */
  postsDateRange?: PostsDateRange
  /** Candidate engagement roles to collect. @default ['reactor', 'commenter'] */
  engagementTypes?: PostEngagementType[]
  /** Score post relevance against the persona prompt before opening posts. @default true */
  postsEnableFiltering?: boolean
  /** Enrich the full candidate pool before prefiltering. @default false */
  thoroughEnrichment?: boolean
  /** SLM relevance reranker for surfaced candidates. @default true */
  deepValidationUseRelevanceReranker?: boolean
  /** Reactors collected per selected post. @minimum 1 @maximum 5000 */
  maxReactorsPerPost?: number
  /**
   * Requested commenters per selected post. The backend currently accepts and
   * echoes this value but does not enforce it in direct-post extraction.
   * @minimum 1
   * @maximum 5000
   */
  maxCommentsPerPost?: number
  /** Additional LinkedIn profile URLs to exclude; seed profiles are always excluded. */
  excludeUrls?: string[]
  /** Maximum validated candidates returned. @default 50 @minimum 1 @maximum 1000 */
  limit?: number
}

/** Resolved parameters echoed in `structuredResponse.agentParams`. */
export interface InfluencerEngagementResolvedParams {
  seedProfiles: string[]
  includeReactedPosts: boolean
  postsDateRange: PostsDateRange
  engagementTypes: PostEngagementType[]
  postsEnableFiltering: boolean
  thoroughEnrichment: boolean
  maxReactorsPerPost: number | null
  maxCommentsPerPost: number | null
  excludeUrls: string[] | null
  limit: number
}

/** Per-seed collection accounting, including seeds with no activity in the window. */
export interface InfluencerEngagementSeedCoverage {
  seed: string
  authoredPosts: number
  reactedPosts: number
  postsSelected: number
  reactionCredits: number
  /** Authored or reacted-to records discarded because they had no usable post URL. */
  droppedNoUrl: number
  stopReason: string | null
  error?: string
}

export type InfluencerEngagementPostSource = 'authored' | 'reacted'

/** One selected LinkedIn post and the seed activity that led to it. */
export interface InfluencerEngagementSeedPost {
  key: string
  url: string
  author: {
    name?: string | null
    url?: string | null
  } | null
  sources: InfluencerEngagementPostSource[]
  seeds: string[]
  engagement: number | null
  intent: number | null
}

/** Full structured output from a succeeded `influencer_engagement` run. */
export interface InfluencerEngagementOutput {
  /** Scored prospects in backend delivery order, capped to `agentParams.limit`. */
  candidates: ValidatedCandidate[]
  excludedCandidates: ValidatedCandidate[]
  totalExcluded: number
  criteria: CriteriaMetadata
  seedCoverage: InfluencerEngagementSeedCoverage[]
  seedPosts: InfluencerEngagementSeedPost[]
  agentParams: InfluencerEngagementResolvedParams
}
