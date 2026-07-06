// Responses API resource
//
// Specialized agents:
//   - quickPeopleSearch / deepPeopleSearch / peopleScoring — see method JSDoc below
//   - competitorPostEngagement — full reference in src/types/competitor-post-engagement.ts
//   - competitorRepEngagement — full reference in src/types/competitor-rep-engagement.ts
//
import type { Http } from '../core/http'
import type { PaginationParams } from '../types/common'
import type {
  AddAndRunCriterionRequest,
  ArtifactsListResponse,
  CancelResponseResponse,
  CreateFeedbackRequest,
  CreateFeedbackResponse,
  CreateResponseRequest,
  CreateResponseResponse,
  CriteriaClassification,
  CriterionDefinition,
  CriterionType,
  FeedbackListResponse,
  PostEngagementType,
  PostsDateRange,
  ResponseListResponse,
  ResponseObject,
  SpecializedAgentParams,
} from '../types/responses'
import { LocalFileNotSupportedError, ValidationError } from '../errors'

export class ResponsesResource {
  constructor(private readonly http: Http) {}

  private _getParamValue<T>(obj: Record<string, any>, camel: string, snake: string): T | undefined {
    if (!obj)
      return undefined
    if (Object.prototype.hasOwnProperty.call(obj, camel))
      return obj[camel] as T
    if (Object.prototype.hasOwnProperty.call(obj, snake))
      return obj[snake] as T
    return undefined
  }

  private _isPlainObject(value: unknown): value is Record<string, any> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
  }

  private _validateCriteriaDefinitions(criteriaDefinitions: unknown): void {
    if (!Array.isArray(criteriaDefinitions))
      throw new ValidationError('criteria_definitions must be a list')
    if (criteriaDefinitions.length === 0)
      throw new ValidationError('criteria_definitions cannot be empty')

    const criterionIds = new Set<string>()
    const columnNames = new Set<string>()
    const validTypes: CriterionType[] = ['universal', 'varying', 'validation_only']

    criteriaDefinitions.forEach((criterion, index) => {
      if (!this._isPlainObject(criterion))
        throw new ValidationError(`Criterion ${index} must be an object`)

      const criterionId = this._getParamValue<string>(criterion, 'criterionId', 'criterion_id')
      const columnName = this._getParamValue<string>(criterion, 'columnName', 'column_name')
      const criterionText = this._getParamValue<string>(criterion, 'criterionText', 'criterion_text')
      const criterionType = this._getParamValue<CriterionType>(criterion, 'criterionType', 'criterion_type')
      const weightRaw = this._getParamValue<unknown>(criterion, 'weight', 'weight')

      if (!criterionId || typeof criterionId !== 'string')
        throw new ValidationError(`Criterion ${index} criterion_id must be a non-empty string`)
      if (criterionIds.has(criterionId))
        throw new ValidationError(`Duplicate criterion_id: ${criterionId}`)
      criterionIds.add(criterionId)

      if (!columnName || typeof columnName !== 'string')
        throw new ValidationError(`Criterion ${index} column_name must be a non-empty string`)
      if (columnNames.has(columnName))
        throw new ValidationError(`Duplicate column_name: ${columnName}`)
      columnNames.add(columnName)

      if (!criterionText || typeof criterionText !== 'string')
        throw new ValidationError(`Criterion ${index} criterion_text must be a non-empty string`)

      if (!criterionType || !validTypes.includes(criterionType))
        throw new ValidationError(`Criterion ${index} has invalid criterion_type: ${String(criterionType)}`)

      const weight = Number(weightRaw)
      if (!Number.isFinite(weight))
        throw new ValidationError(`Criterion ${index} weight must be a number`)
      if (weight <= 0)
        throw new ValidationError(`Criterion ${index} weight must be positive`)
    })
  }

  private _validateCriteriaClassification(criteriaClassification: unknown): void {
    if (!this._isPlainObject(criteriaClassification))
      throw new ValidationError('criteria_classification must be an object')

    const universalCriteria = this._getParamValue<unknown>(criteriaClassification, 'universalCriteria', 'universal_criteria')
    const varyingCriteria = this._getParamValue<unknown>(criteriaClassification, 'varyingCriteria', 'varying_criteria')
    const validationOnlyCriteria = this._getParamValue<unknown>(criteriaClassification, 'validationOnlyCriteria', 'validation_only_criteria')

    if (!Array.isArray(universalCriteria))
      throw new ValidationError('criteria_classification missing or invalid universal_criteria')
    if (!Array.isArray(varyingCriteria))
      throw new ValidationError('criteria_classification missing or invalid varying_criteria')
    if (!Array.isArray(validationOnlyCriteria))
      throw new ValidationError('criteria_classification missing or invalid validation_only_criteria')
  }

  private _validateCompetitorPostEngagementParams(params: Record<string, any>): void {
    const company = this._getParamValue<string>(params, 'company', 'company')
    const competitors = this._getParamValue<string[]>(params, 'competitors', 'competitors')
    const engagementTypes = this._getParamValue<PostEngagementType[]>(
      params,
      'engagementTypes',
      'engagement_types',
    )

    const hasCompany = typeof company === 'string' && company.trim().length > 0
    const hasCompetitors = Array.isArray(competitors) && competitors.length > 0
    if (hasCompany === hasCompetitors) {
      throw new ValidationError(
        'Provide exactly one of `company` or `competitors` for competitor_post_engagement.',
      )
    }

    if (engagementTypes !== undefined) {
      if (!Array.isArray(engagementTypes) || engagementTypes.length === 0) {
        throw new ValidationError('engagementTypes must contain at least one value')
      }
      const validTypes: PostEngagementType[] = ['reactor', 'commenter']
      for (const type of engagementTypes) {
        if (!validTypes.includes(type)) {
          throw new ValidationError(
            `Invalid engagementTypes value: ${String(type)}. Expected 'reactor' and/or 'commenter'.`,
          )
        }
      }
    }

    const limit = this._getParamValue<number>(params, 'limit', 'limit')
    if (limit !== undefined && (limit < 1 || limit > 1000)) {
      throw new ValidationError('limit must be between 1 and 1000 for competitor_post_engagement')
    }

    const maxCompetitors = this._getParamValue<number>(params, 'maxCompetitors', 'max_competitors')
    if (maxCompetitors !== undefined && (maxCompetitors < 1 || maxCompetitors > 50)) {
      throw new ValidationError('maxCompetitors must be between 1 and 50')
    }

    const maxExecsPerTarget = this._getParamValue<number>(
      params,
      'maxExecsPerTarget',
      'max_execs_per_target',
    )
    if (maxExecsPerTarget !== undefined && (maxExecsPerTarget < 1 || maxExecsPerTarget > 20)) {
      throw new ValidationError('maxExecsPerTarget must be between 1 and 20')
    }

    const maxPostsPerTarget = this._getParamValue<number>(
      params,
      'maxPostsPerTarget',
      'max_posts_per_target',
    )
    if (maxPostsPerTarget !== undefined && (maxPostsPerTarget < 1 || maxPostsPerTarget > 20)) {
      throw new ValidationError('maxPostsPerTarget must be between 1 and 20')
    }

    const maxReactorsPerPost = this._getParamValue<number>(
      params,
      'maxReactorsPerPost',
      'max_reactors_per_post',
    )
    if (maxReactorsPerPost !== undefined && (maxReactorsPerPost < 1 || maxReactorsPerPost > 5000)) {
      throw new ValidationError('maxReactorsPerPost must be between 1 and 5000')
    }

    const maxCommentsPerPost = this._getParamValue<number>(
      params,
      'maxCommentsPerPost',
      'max_comments_per_post',
    )
    if (maxCommentsPerPost !== undefined && (maxCommentsPerPost < 1 || maxCommentsPerPost > 100)) {
      throw new ValidationError('maxCommentsPerPost must be between 1 and 100')
    }
  }

  private _validateCompetitorRepEngagementParams(params: Record<string, any>): void {
    const company = this._getParamValue<string>(params, 'company', 'company')
    const competitors = this._getParamValue<string[]>(params, 'competitors', 'competitors')
    const engagementTypes = this._getParamValue<PostEngagementType[]>(
      params,
      'engagementTypes',
      'engagement_types',
    )

    const hasCompany = typeof company === 'string' && company.trim().length > 0
    const hasCompetitors = Array.isArray(competitors) && competitors.length > 0
    if (hasCompany === hasCompetitors) {
      throw new ValidationError(
        'Provide exactly one of `company` or `competitors` for competitor_rep_engagement.',
      )
    }

    if (engagementTypes !== undefined) {
      if (!Array.isArray(engagementTypes) || engagementTypes.length === 0) {
        throw new ValidationError('engagementTypes must contain at least one value')
      }
      const validTypes: PostEngagementType[] = ['reactor', 'commenter']
      for (const type of engagementTypes) {
        if (!validTypes.includes(type)) {
          throw new ValidationError(
            `Invalid engagementTypes value: ${String(type)}. Expected 'reactor' and/or 'commenter'.`,
          )
        }
      }
    }

    const limit = this._getParamValue<number>(params, 'limit', 'limit')
    if (limit !== undefined && (limit < 1 || limit > 1000)) {
      throw new ValidationError('limit must be between 1 and 1000 for competitor_rep_engagement')
    }

    const maxCompetitors = this._getParamValue<number>(params, 'maxCompetitors', 'max_competitors')
    if (maxCompetitors !== undefined && (maxCompetitors < 1 || maxCompetitors > 50)) {
      throw new ValidationError('maxCompetitors must be between 1 and 50')
    }

    const maxRepsPerCompetitor = this._getParamValue<number>(
      params,
      'maxRepsPerCompetitor',
      'max_reps_per_competitor',
    )
    if (maxRepsPerCompetitor !== undefined && (maxRepsPerCompetitor < 1 || maxRepsPerCompetitor > 100)) {
      throw new ValidationError('maxRepsPerCompetitor must be between 1 and 100')
    }

    const maxEngagementsPerRep = this._getParamValue<number>(
      params,
      'maxEngagementsPerRep',
      'max_engagements_per_rep',
    )
    if (maxEngagementsPerRep !== undefined && (maxEngagementsPerRep < 1 || maxEngagementsPerRep > 1000)) {
      throw new ValidationError('maxEngagementsPerRep must be between 1 and 1000')
    }
  }

  private _validateCriteriaParams(params?: SpecializedAgentParams, specializedAgent?: string): void {
    if (!params)
      return

    const rawParams = params as Record<string, any>
    const reuseCriteriaFrom = this._getParamValue<string>(rawParams, 'reuseCriteriaFrom', 'reuse_criteria_from')
    const criteriaDefinitions = this._getParamValue<CriterionDefinition[]>(
      rawParams,
      'criteriaDefinitions',
      'criteria_definitions',
    )
    const criteriaClassification = this._getParamValue<CriteriaClassification>(
      rawParams,
      'criteriaClassification',
      'criteria_classification',
    )
    const runSingleCriterion = this._getParamValue<string>(rawParams, 'runSingleCriterion', 'run_single_criterion')
    const addCriterion = this._getParamValue<Record<string, any>>(rawParams, 'addCriterion', 'add_criterion')
    const addAndRunCriterion = this._getParamValue<string | Record<string, any>>(
      rawParams,
      'addAndRunCriterion',
      'add_and_run_criterion',
    )
    const candidateProfiles = this._getParamValue<Array<Record<string, any>>>(
      rawParams,
      'candidateProfiles',
      'candidate_profiles',
    )

    const hasCriteria = !!criteriaDefinitions && !!criteriaClassification

    if ((criteriaDefinitions && !criteriaClassification) || (!criteriaDefinitions && criteriaClassification)) {
      throw new ValidationError(
        'When providing criteria directly, both criteria_definitions and criteria_classification must be provided.',
      )
    }

    if (criteriaDefinitions || criteriaClassification) {
      this._validateCriteriaDefinitions(criteriaDefinitions)
      this._validateCriteriaClassification(criteriaClassification)
    }

    if (runSingleCriterion) {
      if (!reuseCriteriaFrom && !hasCriteria) {
        throw new ValidationError(
          'run_single_criterion requires reuse_criteria_from or explicit criteria_definitions/criteria_classification.',
        )
      }
      if (typeof runSingleCriterion !== 'string' || !runSingleCriterion.trim()) {
        throw new ValidationError('run_single_criterion must be a non-empty string')
      }
    }

    if (addCriterion) {
      if (!reuseCriteriaFrom && !hasCriteria)
        throw new ValidationError('add_criterion requires existing criteria (reuse or direct criteria).')
      if (!this._isPlainObject(addCriterion))
        throw new ValidationError('add_criterion must be an object')

      const columnName = this._getParamValue<string>(addCriterion, 'columnName', 'column_name')
      const criterionText = this._getParamValue<string>(addCriterion, 'criterionText', 'criterion_text')
      if (!columnName || typeof columnName !== 'string')
        throw new ValidationError('add_criterion requires column_name')
      if (!criterionText || typeof criterionText !== 'string')
        throw new ValidationError('add_criterion requires criterion_text')
    }

    if (addAndRunCriterion !== undefined) {
      if (!reuseCriteriaFrom && !hasCriteria)
        throw new ValidationError('add_and_run_criterion requires existing criteria (reuse or direct criteria).')

      if (typeof addAndRunCriterion === 'string') {
        if (!addAndRunCriterion.trim())
          throw new ValidationError('add_and_run_criterion must be a non-empty string')
      }
      else if (this._isPlainObject(addAndRunCriterion)) {
        const criterionText = this._getParamValue<string>(addAndRunCriterion, 'criterionText', 'criterion_text')
        const suggestedColumnName = this._getParamValue<string>(
          addAndRunCriterion,
          'suggestedColumnName',
          'suggested_column_name',
        )

        if (!criterionText || typeof criterionText !== 'string')
          throw new ValidationError('add_and_run_criterion object requires criterion_text')
        if (suggestedColumnName !== undefined && typeof suggestedColumnName !== 'string')
          throw new ValidationError('add_and_run_criterion suggested_column_name must be a string if provided')
      }
      else {
        throw new ValidationError('add_and_run_criterion must be a string or an object')
      }
    }

    if (specializedAgent === 'people_scoring') {
      if (!candidateProfiles || !Array.isArray(candidateProfiles) || candidateProfiles.length === 0)
        throw new ValidationError('candidate_profiles is required for people_scoring agent and must be a non-empty list')

      const missingIds: Array<{ index: number, name?: string }> = []
      candidateProfiles.forEach((candidate, index) => {
        const c = candidate || {}
        const linkedinUrl = c.linkedin_url || c.linkedinUrl
        const email = c.email
        const emails = c.emails
        if (!linkedinUrl && !email && (!emails || !Array.isArray(emails) || emails.length === 0))
          missingIds.push({ index, name: c.name })
      })

      if (missingIds.length > 0) {
        throw new ValidationError(
          `Each candidate in candidate_profiles must include at least one identifier: linkedin_url or email. Missing identifiers for ${missingIds.length} candidates: ${JSON.stringify(missingIds)}`,
        )
      }
    }

    if (specializedAgent === 'competitor_post_engagement')
      this._validateCompetitorPostEngagementParams(rawParams)

    if (specializedAgent === 'competitor_rep_engagement')
      this._validateCompetitorRepEngagementParams(rawParams)
  }

  private _validateFileReference(uri: string): void {
    if (uri.startsWith('artifact_'))
      return

    try {
      const parsed = new URL(uri)
      const allowedSchemes = [
        'http',
        'https',
        's3',
        'gs',
        'gcs',
        'file',
        'ftp',
        'ftps',
        'blob',
        'data',
      ]

      if (allowedSchemes.includes(parsed.protocol.replace(':', ''))) {
        if ((parsed.protocol === 'http:' || parsed.protocol === 'https протокол:') && !parsed.hostname)
          throw new LocalFileNotSupportedError(uri)

        return
      }
      else {
        throw new LocalFileNotSupportedError(uri)
      }
    }
    catch (error) {
      if (error instanceof LocalFileNotSupportedError)
        throw error
      // If new URL() fails, it's likely a local path
    }

    // No scheme - check for local file path indicators
    const isLocalPath = uri.startsWith('/')
      || uri.startsWith('./')
      || uri.startsWith('../')
      || /^[a-z]:/i.test(uri) // Windows paths
      || uri.startsWith('\\\\') // Windows UNC paths
      || (uri.split('/').length === 1 && uri.includes('.') && !uri.startsWith('artifact_'))

    if (isLocalPath)
      throw new LocalFileNotSupportedError(uri)
  }

  /**
   * Create a new response request for asynchronous processing
   */
  async create(request: CreateResponseRequest): Promise<CreateResponseResponse> {
    if (request.files) {
      for (const file of request.files)
        this._validateFileReference(file.uri)
    }
    if (request.specializedAgentParams)
      this._validateCriteriaParams(request.specializedAgentParams, request.specializedAgent)
    return this.http.post<CreateResponseResponse>('/responses', request)
  }

  /**
   * Get response status and content
   * @param responseId - The response ID
   * @param options - Optional parameters
   * @param options.wait - Wait time in seconds for long-polling
   */
  async get(responseId: string, options?: { wait?: number }): Promise<ResponseObject> {
    return this.http.get<ResponseObject>(`/responses/${responseId}`, { params: options })
  }

  /**
   * List responses with optional filtering
   * @param params - Optional filter parameters
   * @param params.userId - Filter by user ID
   * @param params.status - Filter by response status
   * @param params.startDate - Filter responses created after this date
   * @param params.endDate - Filter responses created before this date
   * @param params.limit - Maximum number of responses to return
   * @param params.offset - Number of responses to skip for pagination
   */
  async list(params?: {
    userId?: string
    status?: 'queued' | 'in_progress' | 'succeeded' | 'failed' | 'cancelled'
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<ResponseListResponse> {
    const queryParams: Record<string, any> = {}
    if (params?.userId)
      queryParams.user_id = params.userId
    if (params?.status)
      queryParams.status = params.status
    if (params?.startDate)
      queryParams.start_date = params.startDate
    if (params?.endDate)
      queryParams.end_date = params.endDate
    if (params?.limit)
      queryParams.limit = params.limit
    if (params?.offset)
      queryParams.offset = params.offset

    return this.http.get<ResponseListResponse>('/responses', { params: queryParams })
  }

  /**
   * Cancel a queued or in-progress response
   */
  async cancel(responseId: string): Promise<CancelResponseResponse> {
    return this.http.post<CancelResponseResponse>(`/responses/${responseId}/cancel`)
  }

  /**
   * List artifacts generated by a response
   */
  async listArtifacts(
    responseId: string,
    params?: PaginationParams,
  ): Promise<ArtifactsListResponse> {
    return this.http.get<ArtifactsListResponse>(`/responses/${responseId}/artifacts`, { params })
  }

  /**
   * Submit feedback for an active response
   * @param responseId - The response ID
   * @param request - Feedback request details
   */
  async createFeedback(
    responseId: string,
    request: CreateFeedbackRequest,
  ): Promise<CreateFeedbackResponse> {
    return this.http.post<CreateFeedbackResponse>(`/responses/${responseId}/feedback`, request)
  }

  /**
   * List all feedback for a response (consumed and unconsumed)
   * @param responseId - The response ID
   * @param options - Optional parameters
   * @param options.progressId - Optional progress ID to filter feedback
   */
  async listFeedback(
    responseId: string,
    options?: { progressId?: string },
  ): Promise<FeedbackListResponse> {
    const queryParams: Record<string, any> = {}
    if (options?.progressId)
      queryParams.progress_id = options.progressId

    return this.http.get<FeedbackListResponse>(`/responses/${responseId}/feedback`, { params: queryParams })
  }

  /**
   * Perform a quick people search using the specialized quick_people_search agent
   * @param query - Natural language search query (e.g., "Find engineers at Google in SF")
   * @param options - Optional search parameters
   * @param options.limit - Maximum number of results (1-100, default: 20)
   * @param options.dataSources - Specific data sources to use: ["PDL", "CORESIGNAL", "CRUST_DATA"]
   * @returns Response with structured_response containing:
   *   - candidates: List of person results
   *   - totalFound: Total unique candidates found
   *   - appliedFilters: Extracted search filters
   *   - executionTimeMs: Search duration
   *   - dataSourcesUsed: Which sources were queried
   */
  async quickPeopleSearch(
    query: string,
    options?: {
      limit?: number
      dataSources?: string[]
    },
  ): Promise<CreateResponseResponse> {
    const request: CreateResponseRequest = {
      messages: [{ role: 'user', content: query }],
      specializedAgent: 'quick_people_search',
    }

    if (options) {
      const params: Record<string, any> = {}
      if (options.limit !== undefined)
        params.limit = options.limit
      if (options.dataSources)
        params.dataSources = options.dataSources

      if (Object.keys(params).length > 0)
        request.specializedAgentParams = params
    }

    return this.create(request)
  }

  /**
   * Perform a deep people search with AI-generated criteria and validation
   * @param query - Natural language search query describing ideal candidates
   * @param options - Optional search parameters
   * @param options.requestedCandidates - Number of candidates to find (default: 100)
   * @param options.dataSources - Specific data sources to use: ["PDL", "CORESIGNAL", "CRUST_DATA"]
   * @param options.reuseCriteriaFrom - Response ID to reuse criteria from
   * @param options.criteriaDefinitions - Pre-defined criteria definitions
   * @param options.criteriaClassification - Pre-defined criteria classification
   * @param options.runSingleCriterion - Run only a single criterion by ID
   * @param options.addCriterion - Add a new criterion to existing criteria
   * @param options.addAndRunCriterion - Add criterion from text and run only that criterion.
   *   Can be a string (criterion text) or an object with criterionText and optional suggestedColumnName.
   *   Example string: 'Must have 5+ years Python experience'
   *   Example object: { criterionText: 'Has ML experience', suggestedColumnName: 'ml_experience' }
   * @param options.excludeProfiles - LinkedIn URLs to exclude from results
   * @param options.excludePreviouslyContacted - Exclude previously contacted people
   * @param options.excludeNames - Names to exclude from results
   * @param options.searchJobSignal - CrustData job-listing signal search (decision makers at hiring companies); true | false | 'auto'
   * @param options.deepVerify - Web verification for org/location/third-party criteria: 'auto' (default), 'always', or 'off'
   * @param options.deepValidationUseRelevanceReranker - SLM relevance reranker for surfaced candidates (ranking-only); @default true
   * @param options.deepValidationBackfillBelowCriteria - Pad with criteria-failed candidates when under count; @default true
   * @param options.deepSearchCriteriaModel - Override criteria decomposition model (e.g. 'openai:gpt-5.4')
   * @returns Response with structured_response containing:
   *   - candidates: Validated and scored candidates
   *   - criteria: Generated/reused criteria definitions and classification
   *   - searchStats: Search execution statistics
   */
  async deepPeopleSearch(
    query: string,
    options?: {
      requestedCandidates?: number
      dataSources?: string[]
      reuseCriteriaFrom?: string
      criteriaDefinitions?: CriterionDefinition[]
      criteriaClassification?: CriteriaClassification
      runSingleCriterion?: string
      addCriterion?: {
        columnName: string
        criterionText: string
        criterionType?: CriterionType
        weight?: number
      }
      addAndRunCriterion?: string | AddAndRunCriterionRequest
      excludeProfiles?: string[]
      excludePreviouslyContacted?: boolean
      excludeNames?: string[]
      // LinkedIn Posts Integration options
      searchProfiles?: boolean | 'auto'
      searchPosts?: boolean | 'auto'
      includeEngagementInScore?: boolean | 'auto'
      postsMaxResults?: number
      postsMaxKeywords?: number
      postsDateRange?: PostsDateRange
      postsFields?: 'reactors' | 'comments' | 'reactors,comments'
      postsMaxReactors?: number
      postsMaxComments?: number
      postsEnableEnrichment?: boolean
      postsEnableFiltering?: boolean
      engagementScoreWeight?: number
      postsExtractAuthor?: boolean
      searchJobSignal?: boolean | 'auto'
      deepVerify?: 'off' | 'auto' | 'always'
      deepValidationUseRelevanceReranker?: boolean
      deepValidationBackfillBelowCriteria?: boolean
      deepSearchCriteriaModel?: string
    },
  ): Promise<CreateResponseResponse> {
    const request: CreateResponseRequest = {
      messages: [{ role: 'user', content: query }],
      specializedAgent: 'deep_people_search',
    }

    const params: SpecializedAgentParams = {
      deepValidationUseRelevanceReranker: options?.deepValidationUseRelevanceReranker ?? true,
      deepValidationBackfillBelowCriteria: options?.deepValidationBackfillBelowCriteria ?? true,
    }

    if (options) {
      if (options.requestedCandidates !== undefined)
        params.requestedCandidates = options.requestedCandidates
      if (options.dataSources)
        params.dataSources = options.dataSources
      if (options.reuseCriteriaFrom)
        params.reuseCriteriaFrom = options.reuseCriteriaFrom
      if (options.criteriaDefinitions)
        params.criteriaDefinitions = options.criteriaDefinitions
      if (options.criteriaClassification)
        params.criteriaClassification = options.criteriaClassification
      if (options.runSingleCriterion)
        params.runSingleCriterion = options.runSingleCriterion
      if (options.addCriterion)
        params.addCriterion = options.addCriterion
      if (options.addAndRunCriterion)
        params.addAndRunCriterion = options.addAndRunCriterion
      if (options.excludeProfiles)
        params.excludeProfiles = options.excludeProfiles
      if (options.excludePreviouslyContacted !== undefined)
        params.excludePreviouslyContacted = options.excludePreviouslyContacted
      if (options.excludeNames)
        params.excludeNames = options.excludeNames
      // LinkedIn Posts Integration parameters
      if (options.searchProfiles !== undefined)
        params.searchProfiles = options.searchProfiles
      if (options.searchPosts !== undefined)
        params.searchPosts = options.searchPosts
      if (options.includeEngagementInScore !== undefined)
        params.includeEngagementInScore = options.includeEngagementInScore
      if (options.postsMaxResults !== undefined)
        params.postsMaxResults = options.postsMaxResults
      if (options.postsMaxKeywords !== undefined)
        params.postsMaxKeywords = options.postsMaxKeywords
      if (options.postsDateRange)
        params.postsDateRange = options.postsDateRange
      if (options.postsFields)
        params.postsFields = options.postsFields
      if (options.postsMaxReactors !== undefined)
        params.postsMaxReactors = options.postsMaxReactors
      if (options.postsMaxComments !== undefined)
        params.postsMaxComments = options.postsMaxComments
      if (options.postsEnableEnrichment !== undefined)
        params.postsEnableEnrichment = options.postsEnableEnrichment
      if (options.postsEnableFiltering !== undefined)
        params.postsEnableFiltering = options.postsEnableFiltering
      if (options.engagementScoreWeight !== undefined)
        params.engagementScoreWeight = options.engagementScoreWeight
      if (options.postsExtractAuthor !== undefined)
        params.postsExtractAuthor = options.postsExtractAuthor
      if (options.searchJobSignal !== undefined)
        params.searchJobSignal = options.searchJobSignal
      if (options.deepVerify !== undefined)
        params.deepVerify = options.deepVerify
      if (options.deepSearchCriteriaModel)
        params.deepSearchCriteriaModel = options.deepSearchCriteriaModel
    }

    request.specializedAgentParams = params

    return this.create(request)
  }

  /**
   * Score provided candidates against AI-generated or provided criteria
   * @param query - Natural language description of ideal candidate criteria
   * @param candidateProfiles - List of candidates to score (each must have linkedin_url or email)
   * @param options - Optional scoring parameters
   * @param options.reuseCriteriaFrom - Response ID to reuse criteria from
   * @param options.criteriaDefinitions - Pre-defined criteria definitions
   * @param options.criteriaClassification - Pre-defined criteria classification
   * @param options.runSingleCriterion - Run only a single criterion by ID
   * @param options.addCriterion - Add a new criterion to existing criteria
   * @param options.addAndRunCriterion - Add criterion from text and run only that criterion.
   *   Can be a string (criterion text) or an object with criterionText and optional suggestedColumnName.
   *   Example string: 'Must have 5+ years Python experience'
   *   Example object: { criterionText: 'Has ML experience', suggestedColumnName: 'ml_experience' }
   * @param options.deepValidationUseRelevanceReranker - SLM relevance reranker for surfaced candidates (ranking-only); @default true
   * @param options.deepValidationBackfillBelowCriteria - Pad with criteria-failed candidates when under count; @default true
   * @param options.deepSearchCriteriaModel - Override criteria decomposition model (e.g. 'openai:gpt-5.4')
   * @returns Response with structured_response containing:
   *   - candidates: Scored candidates with validation results
   *   - criteria: Generated/reused criteria definitions and classification
   */
  async peopleScoring(
    query: string,
    candidateProfiles: Array<Record<string, any>>,
    options?: {
      reuseCriteriaFrom?: string
      criteriaDefinitions?: CriterionDefinition[]
      criteriaClassification?: CriteriaClassification
      runSingleCriterion?: string
      addCriterion?: {
        columnName: string
        criterionText: string
        criterionType?: CriterionType
        weight?: number
      }
      addAndRunCriterion?: string | AddAndRunCriterionRequest
      deepValidationUseRelevanceReranker?: boolean
      deepValidationBackfillBelowCriteria?: boolean
      deepSearchCriteriaModel?: string
    },
  ): Promise<CreateResponseResponse> {
    const request: CreateResponseRequest = {
      messages: [{ role: 'user', content: query }],
      specializedAgent: 'people_scoring',
      specializedAgentParams: {
        candidateProfiles,
        deepValidationUseRelevanceReranker: options?.deepValidationUseRelevanceReranker ?? true,
        deepValidationBackfillBelowCriteria: options?.deepValidationBackfillBelowCriteria ?? true,
      },
    }

    if (options) {
      if (options.reuseCriteriaFrom)
        request.specializedAgentParams!.reuseCriteriaFrom = options.reuseCriteriaFrom
      if (options.criteriaDefinitions)
        request.specializedAgentParams!.criteriaDefinitions = options.criteriaDefinitions
      if (options.criteriaClassification)
        request.specializedAgentParams!.criteriaClassification = options.criteriaClassification
      if (options.runSingleCriterion)
        request.specializedAgentParams!.runSingleCriterion = options.runSingleCriterion
      if (options.addCriterion)
        request.specializedAgentParams!.addCriterion = options.addCriterion
      if (options.addAndRunCriterion)
        request.specializedAgentParams!.addAndRunCriterion = options.addAndRunCriterion
      if (options.deepSearchCriteriaModel)
        request.specializedAgentParams!.deepSearchCriteriaModel = options.deepSearchCriteriaModel
    }

    return this.create(request)
  }

  /**
   * Score people who reacted to or commented on competitor LinkedIn posts.
   *
   * **Discovery mode** — pass `company`: ReAct discovers competitors (Exa +
   * optional Firecrawl + Fiber validation), engagement-ranks them, extracts
   * engagers from top posts, scores against the persona prompt.
   *
   * **Explicit mode** — pass `competitors`: skips discovery, uses your list.
   *
   * Requires `FIBER_API_KEY` + `CRUSTDATA_API_KEY`. `FIRECRAWL_API_KEY` is
   * optional but improves discovery quality on ambiguous domains.
   *
   * @param query - Persona prompt in messages (e.g. "VP Sales at mid-market SaaS…")
   * @param options - Exactly one of `company` or `competitors` is required
   * @returns Response; poll with `get()` then read `structuredResponse` as
   *   {@link CompetitorPostEngagementOutput}. See `src/types/competitor-post-engagement.ts`
   *   for the full agent reference (pipeline, API keys, engagementData shape, costs).
   */
  async competitorPostEngagement(
    query: string,
    options: {
      /** Seed company domain/name — triggers competitor discovery ReAct */
      company?: string
      /** Explicit competitor domains/names — skips discovery */
      competitors?: string[]
      /**
       * What the seed company does — disambiguates ambiguous domains in discovery.
       * @example 'AI-powered outbound automation for B2B sales'
       */
      companyContext?: string
      /**
       * Known-good competitors to anchor discovery vertical.
       * @example ['outreach.io', 'apollo.io']
       */
      companyExamples?: string[]
      /** Final scored candidate cap @default 100 @minimum 1 @maximum 1000 */
      limit?: number
      /** Post selection time window @default 'past-month' */
      postsDateRange?: PostsDateRange
      /** Which engagers to extract; also affects post ranking @default ['reactor', 'commenter'] */
      engagementTypes?: PostEngagementType[]
      /** Include competitor company page posts @default true */
      includeCompanyPosts?: boolean
      /** Include exec personal page posts @default true */
      includeExecPosts?: boolean
      /**
       * Filter out people currently employed at analyzed competitors @default true.
       * Set false for poaching / hiring use cases.
       */
      excludeCompetitorEmployees?: boolean
      /** Exec title strings for CrustData exec search (OR-fanned fuzzy match) */
      execTitles?: string[]
      /** Cap after discovery engagement ranking @default 10 @maximum 50 */
      maxCompetitors?: number
      /** Top execs per competitor by engagement @default 5 @maximum 20 */
      maxExecsPerTarget?: number
      /** Top posts per competitor by engagement @default 5 @maximum 20 */
      maxPostsPerTarget?: number
      /**
       * Reactors per post cap. Omit for API max (5000).
       * Lower = faster runs, same Crustdata cost per call.
       */
      maxReactorsPerPost?: number
      /**
       * Commenters per post cap. Omit for default (100).
       * Hard max 100 — above that Crustdata returns thin profiles.
       */
      maxCommentsPerPost?: number
      /** SLM relevance reranker for surfaced candidates (ranking-only); @default true */
      deepValidationUseRelevanceReranker?: boolean
    },
  ): Promise<CreateResponseResponse> {
    const hasCompany = typeof options.company === 'string' && options.company.trim().length > 0
    const hasCompetitors = Array.isArray(options.competitors) && options.competitors.length > 0
    if (hasCompany === hasCompetitors) {
      throw new ValidationError(
        'Provide exactly one of `company` or `competitors` for competitorPostEngagement.',
      )
    }

    const request: CreateResponseRequest = {
      messages: [{ role: 'user', content: query }],
      specializedAgent: 'competitor_post_engagement',
    }

    const params: SpecializedAgentParams = {
      deepValidationUseRelevanceReranker: options.deepValidationUseRelevanceReranker ?? true,
    }
    if (options.company)
      params.company = options.company
    if (options.competitors)
      params.competitors = options.competitors
    if (options.companyContext)
      params.companyContext = options.companyContext
    if (options.companyExamples)
      params.companyExamples = options.companyExamples
    if (options.limit !== undefined)
      params.limit = options.limit
    if (options.postsDateRange)
      params.postsDateRange = options.postsDateRange
    if (options.engagementTypes)
      params.engagementTypes = options.engagementTypes
    if (options.includeCompanyPosts !== undefined)
      params.includeCompanyPosts = options.includeCompanyPosts
    if (options.includeExecPosts !== undefined)
      params.includeExecPosts = options.includeExecPosts
    if (options.excludeCompetitorEmployees !== undefined)
      params.excludeCompetitorEmployees = options.excludeCompetitorEmployees
    if (options.execTitles)
      params.execTitles = options.execTitles
    if (options.maxCompetitors !== undefined)
      params.maxCompetitors = options.maxCompetitors
    if (options.maxExecsPerTarget !== undefined)
      params.maxExecsPerTarget = options.maxExecsPerTarget
    if (options.maxPostsPerTarget !== undefined)
      params.maxPostsPerTarget = options.maxPostsPerTarget
    if (options.maxReactorsPerPost !== undefined)
      params.maxReactorsPerPost = options.maxReactorsPerPost
    if (options.maxCommentsPerPost !== undefined)
      params.maxCommentsPerPost = options.maxCommentsPerPost

    request.specializedAgentParams = params
    return this.create(request)
  }

  /**
   * Find a competitor's sales reps and surface the AUTHORS of the LinkedIn posts
   * those reps engage with — i.e. the prospects the competitor is actively
   * selling to. The INVERSE of {@link competitorPostEngagement}.
   *
   * **Discovery mode** — pass `company`: ReAct discovers competitors, then crawls
   * each one's reps and harvests their outgoing engagement.
   *
   * **Explicit mode** — pass `competitors`: skips discovery, uses your list.
   *
   * Requires `FIBER_API_KEY` + `CRUSTDATA_API_KEY`.
   *
   * @param query - Persona prompt for the prospect-authors (e.g. "VP Eng at AI-native startups…")
   * @param options - Exactly one of `company` or `competitors` is required
   * @returns Response; poll with `get()` then read `structuredResponse` as
   *   {@link CompetitorRepEngagementOutput}. See `src/types/competitor-rep-engagement.ts`
   *   for the full agent reference (pipeline, API keys, engagementData shape).
   */
  async competitorRepEngagement(
    query: string,
    options: {
      /** Seed company domain/name — triggers competitor discovery ReAct */
      company?: string
      /** Explicit competitor domains/names — skips discovery */
      competitors?: string[]
      /**
       * What the seed company does — disambiguates ambiguous domains in discovery.
       * @example 'AI-powered outbound automation for B2B sales'
       */
      companyContext?: string
      /**
       * Known-good competitors to anchor discovery vertical.
       * @example ['outreach.io', 'apollo.io']
       */
      companyExamples?: string[]
      /** Final scored candidate cap @default 100 @minimum 1 @maximum 1000 */
      limit?: number
      /**
       * How far back to look at each rep's OUTGOING engagement @default 'past-month'.
       * Longer windows (past-2-years/past-3-years) apply fully here.
       */
      postsDateRange?: PostsDateRange
      /**
       * Which OUTGOING engagement signals to harvest from each rep
       * (reactor → reacted-to posts, commenter → commented-on posts).
       * @default ['reactor', 'commenter']
       */
      engagementTypes?: PostEngagementType[]
      /**
       * Override the default sales-rep title list used to find competitor reps.
       * @example ['Account Executive', 'SDR', 'Account Manager']
       */
      repTitles?: string[]
      /** Max sales reps to crawl per competitor @default 20 @maximum 100 */
      maxRepsPerCompetitor?: number
      /**
       * Max outgoing engagements (reactions + comments) harvested per rep.
       * @default 100 @maximum 1000
       */
      maxEngagementsPerRep?: number
      /**
       * Only mine engagement from after a rep joined the competitor
       * (effective lookback = min(postsDateRange, time-since-joined)).
       * @default true
       */
      restrictEngagementToTenure?: boolean
      /**
       * Filter out authors currently employed at analyzed competitors @default true.
       * Reps themselves are always dropped.
       */
      excludeCompetitorEmployees?: boolean
      /**
       * In explicit-competitors mode, also run a names-only discovery to build a
       * broader employee-exclusion set across the vertical @default true.
       */
      expandExclusionViaDiscovery?: boolean
      /** Cap after discovery engagement ranking @default 10 @maximum 50 */
      maxCompetitors?: number
      /**
       * Enrich the full author pool BEFORE the LLM prefilter cuts it (~20x cost).
       * @default false
       */
      thoroughEnrichment?: boolean
      /** SLM relevance reranker for surfaced candidates (ranking-only); @default true */
      deepValidationUseRelevanceReranker?: boolean
    },
  ): Promise<CreateResponseResponse> {
    const hasCompany = typeof options.company === 'string' && options.company.trim().length > 0
    const hasCompetitors = Array.isArray(options.competitors) && options.competitors.length > 0
    if (hasCompany === hasCompetitors) {
      throw new ValidationError(
        'Provide exactly one of `company` or `competitors` for competitorRepEngagement.',
      )
    }

    const request: CreateResponseRequest = {
      messages: [{ role: 'user', content: query }],
      specializedAgent: 'competitor_rep_engagement',
    }

    const params: SpecializedAgentParams = {
      deepValidationUseRelevanceReranker: options.deepValidationUseRelevanceReranker ?? true,
    }
    if (options.company)
      params.company = options.company
    if (options.competitors)
      params.competitors = options.competitors
    if (options.companyContext)
      params.companyContext = options.companyContext
    if (options.companyExamples)
      params.companyExamples = options.companyExamples
    if (options.limit !== undefined)
      params.limit = options.limit
    if (options.postsDateRange)
      params.postsDateRange = options.postsDateRange
    if (options.engagementTypes)
      params.engagementTypes = options.engagementTypes
    if (options.repTitles)
      params.repTitles = options.repTitles
    if (options.maxRepsPerCompetitor !== undefined)
      params.maxRepsPerCompetitor = options.maxRepsPerCompetitor
    if (options.maxEngagementsPerRep !== undefined)
      params.maxEngagementsPerRep = options.maxEngagementsPerRep
    if (options.restrictEngagementToTenure !== undefined)
      params.restrictEngagementToTenure = options.restrictEngagementToTenure
    if (options.excludeCompetitorEmployees !== undefined)
      params.excludeCompetitorEmployees = options.excludeCompetitorEmployees
    if (options.expandExclusionViaDiscovery !== undefined)
      params.expandExclusionViaDiscovery = options.expandExclusionViaDiscovery
    if (options.maxCompetitors !== undefined)
      params.maxCompetitors = options.maxCompetitors
    if (options.thoroughEnrichment !== undefined)
      params.thoroughEnrichment = options.thoroughEnrichment

    request.specializedAgentParams = params
    return this.create(request)
  }
}
