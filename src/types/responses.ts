// Response API types
import type { Message, UUID } from './common'
import type { PersonResult } from './people'

export type ResponseStatus = 'queued' | 'in_progress' | 'succeeded' | 'failed' | 'cancelled'

export interface FileAttachment {
  name: string
  uri: string
  mimeType?: string | null
  sizeBytes?: number | null
}

export interface AgentConfig {
  plannerModelType?: 'SMART_MODEL' | 'REASONING_MODEL' | string
  coordinatorModelType?: 'SMART_MODEL' | 'REASONING_MODEL' | string
  orchestratorModelType?: 'SMART_MODEL' | 'REASONING_MODEL' | string | null

  // Optional: Model name overrides (e.g., 'openai:gpt-4o', 'anthropic:claude-3-7-sonnet-20250219')
  plannerModelName?: string | null
  coordinatorModelName?: string | null
  orchestratorModelName?: string | null
  finalResponseModelName?: string | null
  fastModelName?: string | null

  // Optional: Feature flags
  useCognitiveTools?: boolean
  enableTaskValidation?: boolean
  generateComprehensiveOutput?: boolean

  // Optional: Skill filtering
  skillIds?: string[]
}

export interface ModelOverrides {
  [key: string]: string
}

export type CriterionType = 'universal' | 'varying' | 'validation_only'

export interface CriterionDefinition {
  criterionId: string
  columnName: string
  criterionText: string
  criterionType: CriterionType
  weight: number
}

export interface CriteriaClassification {
  universalCriteria: CriterionDefinition[]
  varyingCriteria: CriterionDefinition[]
  validationOnlyCriteria: CriterionDefinition[]
  universalReasoning?: string
  varyingReasoning?: string
  validationReasoning?: string
}

export interface AddCriterionRequest {
  columnName: string
  criterionText: string
  criterionType?: CriterionType
  weight?: number
}

export interface AddAndRunCriterionRequest {
  criterionText: string
  suggestedColumnName?: string
}

export interface CriteriaMetadata {
  version: number
  createdAt: string
  source: 'generated' | 'reused' | 'provided'
  sourceResponseId?: string
  criteriaDefinitions: CriterionDefinition[]
  criteriaClassification: CriteriaClassification
}

export interface StructuredResponse extends Record<string, any> {
  criteria?: CriteriaMetadata
}

/**
 * Available specialized agents
 * Using a union type that can be extended with any string to support future agents
 */
export type SpecializedAgentType = 'quick_people_search' | 'deep_people_search' | 'people_scoring' | (string & {})

/**
 * Parameters for specialized agent execution
 * This is a flexible interface that supports any agent-specific parameters
 */
export interface SpecializedAgentParams {
  /**
   * Maximum number of results (1-100)
   * Agent-specific: For quick_people_search, limits the number of candidates returned
   */
  limit?: number
  /**
   * Number of candidates requested (for deep_people_search)
   * Range: 1-1000
   */
  requestedCandidates?: number
  /**
   * Specific data sources to use (agent-specific)
   * For people search agents: ["PDL", "CORESIGNAL", "CRUST_DATA"]
   */
  dataSources?: string[]
  /**
   * Custom LinkedIn profile URLs to exclude from people search results.
   * Used for CrustData post-processing (exclude_profiles) and also applied as a server-side post-filter.
   */
  excludeProfiles?: string[]
  /**
   * If true, exclude people the user has previously contacted (best-effort via stored LinkedIn URLs).
   * @default false
   */
  excludePreviouslyContacted?: boolean
  /**
   * Names to exclude from results (passed through to CrustData post-processing when supported).
   */
  excludeNames?: string[]
  /**
   * Response ID to reuse criteria from.
   */
  reuseCriteriaFrom?: string
  /**
   * Pre-defined criteria definitions to use.
   */
  criteriaDefinitions?: CriterionDefinition[]
  /**
   * Pre-defined criteria classification to use.
   */
  criteriaClassification?: CriteriaClassification
  /**
   * Run validation against a single criterion ID.
   */
  runSingleCriterion?: string
  /**
   * Add a new criterion to existing criteria.
   */
  addCriterion?: AddCriterionRequest
  /**
   * Add a new criterion from English text and run only that criterion.
   * Can be a string (criterion text) or an object with criterion_text and optional suggested_column_name.
   * Example string: 'Must have 5+ years Python experience'
   * Example object: { criterionText: 'Has ML experience', suggestedColumnName: 'ml_experience' }
   * If suggestedColumnName not provided, it will be auto-generated from the text.
   */
  addAndRunCriterion?: string | AddAndRunCriterionRequest
  /**
   * List of candidate profiles to score (for people_scoring agent).
   * Each candidate must include at least one identifier: linkedin_url or email/emails.
   */
  candidateProfiles?: Array<Record<string, any>>

  // ═══════════════════════════════════════════════════════════════════════════
  // LinkedIn Posts Integration (deep_people_search)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Whether to search profile databases (CrustData/PDL).
   * Options: true (always), false (never), 'auto' (LLM decides).
   * @default true
   * Used by deep_people_search.
   */
  searchProfiles?: boolean | 'auto'

  /**
   * Whether to search LinkedIn posts for engagement (authors, reactors, commenters).
   * Options: true (always), false (never), 'auto' (LLM decides based on query).
   * @default 'auto'
   * Used by deep_people_search.
   */
  searchPosts?: boolean | 'auto'

  /**
   * Whether to include LinkedIn post engagement in candidate scoring.
   * Options: true (always), false (never), 'auto' (LLM decides).
   * @default 'auto'
   * Used by deep_people_search.
   */
  includeEngagementInScore?: boolean | 'auto'

  /**
   * Maximum number of posts to search.
   * Range: 1-500
   * @default 50
   * Used by deep_people_search when searchPosts is enabled.
   */
  postsMaxResults?: number

  /**
   * Maximum number of keywords to use for posts search.
   * If not provided, all extracted keywords are used.
   * Range: 1-20
   * Used by deep_people_search when searchPosts is enabled.
   */
  postsMaxKeywords?: number

  /**
   * Date range for posts search.
   * Options: 'past-24h', 'past-week', 'past-month', 'past-year'
   * @default 'past-month'
   * Used by deep_people_search.
   */
  postsDateRange?: 'past-24h' | 'past-week' | 'past-month' | 'past-year'

  /**
   * Engagement fields to fetch from posts.
   * Options: 'reactors' (5 credits/post), 'comments' (5 credits/post), 'reactors,comments' (10 credits/post)
   * @default 'reactors'
   * Used by deep_people_search when searchPosts is enabled.
   */
  postsFields?: 'reactors' | 'comments' | 'reactors,comments'

  /**
   * Maximum reactors per post to fetch.
   * Range: 1-5000
   * @default 5000
   * No additional cost (same 5 credits/post for 1-5000 reactors).
   * Used by deep_people_search when postsFields includes 'reactors'.
   */
  postsMaxReactors?: number

  /**
   * Maximum comments per post to fetch.
   * Range: 1-5000
   * @default 5000
   * No additional cost (same 5 credits/post for 1-5000 comments).
   * Used by deep_people_search when postsFields includes 'comments'.
   */
  postsMaxComments?: number

  /**
   * Whether to enrich posts candidates with EnrichLayer.
   * @default false
   * CrustData posts API already provides rich data (skills, experience, education).
   * Enable only if you need additional fields from EnrichLayer.
   * Used by deep_people_search when searchPosts is enabled.
   */
  postsEnableEnrichment?: boolean

  /**
   * Whether to filter posts for relevance before extracting people.
   * @default true
   * Uses LLM to identify and skip hiring posts, spam, and irrelevant content.
   * Improves candidate quality at cost of ~1 LLM call per post.
   * Used by deep_people_search when searchPosts is enabled.
   */
  postsEnableFiltering?: boolean

  /**
   * Weight for engagement score when included in match score calculation.
   * Range: 0.0-0.3
   * @default 0.15
   * Used by deep_people_search when includeEngagementInScore is true.
   */
  engagementScoreWeight?: number

  // ═══════════════════════════════════════════════════════════════════════════
  // Direct LinkedIn Post URLs (deep_people_search)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Direct LinkedIn post URLs to extract candidates from.
   * System will extract authors, reactors, and commenters with full profile data.
   *
   * **Format:** `['https://www.linkedin.com/posts/username_topic-activity-123456-hash']`
   *
   * **Note:** Only works reliably for recent posts (~1 month). Older posts return author only.
   *
   * **Cost:** ~11 + N credits per URL (N = people to enrich).
   *
   * Used by deep_people_search.
   */
  directPostUrls?: string[]

  /**
   * Maximum number of reactors to fetch per direct post URL.
   * Range: 0-5000
   * @default 500
   * Used by deep_people_search when directPostUrls is provided.
   */
  directPostsMaxReactors?: number

  /**
   * Maximum number of comments to fetch per direct post URL.
   * Range: 0-5000
   * @default 100
   * Used by deep_people_search when directPostUrls is provided.
   */
  directPostsMaxComments?: number

  /**
   * Whether to extract the post author as a candidate.
   * @default true
   * Used by deep_people_search when directPostUrls is provided.
   */
  directPostsExtractAuthor?: boolean

  /**
   * Whether to extract post reactors as candidates.
   * @default true
   * Used by deep_people_search when directPostUrls is provided.
   */
  directPostsExtractReactors?: boolean

  /**
   * Whether to extract post commenters as candidates.
   * @default true
   * Used by deep_people_search when directPostUrls is provided.
   */
  directPostsExtractCommenters?: boolean

  // ═══════════════════════════════════════════════════════════════════════════
  // LinkedIn Connections Search (deep_people_search)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Search user's 1st-degree LinkedIn connections for candidates.
   * Requires LinkedIn connected and synced.
   * Cost: ~$0.01 per connection enriched (EnrichLayer).
   * LLM pre-filters connections based on headline before enrichment.
   * @default false
   * Used by deep_people_search.
   */
  searchConnections?: boolean

  /**
   * Additional parameters for any specialized agent
   * This allows flexibility for future agents without SDK updates
   */
  [key: string]: any
}

export interface CreateResponseRequest {
  threadId?: UUID
  messages: Message[]
  files?: FileAttachment[]
  options?: Record<string, any>
  userId?: string
  agentConfig?: AgentConfig
  responseFormat?: Record<string, any>
  responseFormatInstructions?: string
  modelOverrides?: ModelOverrides
  /**
   * Route to a specialized agent instead of the main Lumnis agent
   * Known agents: 'quick_people_search', 'deep_people_search', 'people_scoring'
   * Accepts any string to support future agents without SDK updates
   */
  specializedAgent?: SpecializedAgentType
  /**
   * Parameters specific to the specialized agent
   */
  specializedAgentParams?: SpecializedAgentParams
}

export interface ProgressEntry {
  ts: string
  state: string
  message: string
  toolCalls?: Array<Record<string, any>> | null
  outputText?: string | null
}

export interface ResponseArtifact {
  type: string
  language?: string
  content: string
  [key: string]: any
}

export interface ResponseObject {
  responseId: UUID
  threadId: UUID
  tenantId: UUID
  userId?: UUID | null
  status: ResponseStatus
  progress: ProgressEntry[]
  inputMessages: Message[]
  outputText?: string | null
  content?: string | null // Alias for outputText
  responseTitle?: string | null // Human-readable title for the response (generated after plan creation)
  structuredResponse?: StructuredResponse | null
  artifacts?: ResponseArtifact[] | null
  createdAt: string
  completedAt?: string | null
  error?: Record<string, any> | null
  options?: Record<string, any> | null
}

export interface CreateResponseResponse {
  responseId: UUID
  threadId: UUID
  status: ResponseStatus
  tenantId: UUID
  createdAt: string
}

export interface CancelResponseResponse {
  status: string
  message: string
}

export interface ArtifactObject {
  artifactId: UUID
  responseId: UUID
  name: string
  uri: string
  mimeType: string
  bytes: number
  createdAt: string
}

export interface ArtifactsListResponse {
  artifacts: ArtifactObject[]
  total: number
  limit: number
  offset: number
}

export interface ResponseListResponse {
  responses: ResponseObject[]
  total: number
  limit: number
  offset: number
}

// Feedback types
export type FeedbackType = 'suggestion' | 'correction' | 'guidance'

export interface CreateFeedbackRequest {
  feedbackText: string
  feedbackType?: FeedbackType
  userId?: string
  progressId?: string
  toolCallId?: string
  toolArgsUpdate?: Record<string, any>
}

export interface CreateFeedbackResponse {
  feedbackId: UUID
  createdAt: string
}

export interface FeedbackObject {
  feedbackId: UUID
  responseId: UUID
  tenantId: UUID
  userId?: UUID | null
  feedbackText: string
  feedbackType: FeedbackType
  progressId?: UUID | null
  toolCallId?: string | null
  toolArgsUpdate?: Record<string, any> | null
  isConsumed: boolean
  consumedAt?: string | null
  createdAt: string
}

export interface FeedbackListResponse {
  responseId: UUID
  progressIdFilter?: UUID | null
  totalFeedback: number
  consumedCount: number
  unconsumedCount: number
  feedback: FeedbackObject[]
  note: string
}

// Specialized Agent Response Types

/**
 * Structured output from quick_people_search specialized agent
 * This will be available in ResponseObject.structuredResponse
 * Note: PersonResult is imported from './people' to avoid duplication
 */
export interface QuickPeopleSearchOutput {
  candidates: PersonResult[]
  totalFound: number
  appliedFilters: Record<string, any>
  executionTimeMs: number
  dataSourcesUsed: string[]
}

/**
 * Note: Deep people search and other specialized agents may return different
 * structured outputs. The actual structure will be available in
 * ResponseObject.structuredResponse as a generic Record<string, any>
 *
 * The SDK is designed to be flexible and accept any specialized agent
 * without requiring updates for each new agent type.
 */
