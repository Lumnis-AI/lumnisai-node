// Responses API resource
import type { Http } from '../core/http'
import type { PaginationParams } from '../types/common'
import type {
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
    const addAndRunCriterion = this._getParamValue<string>(rawParams, 'addAndRunCriterion', 'add_and_run_criterion')
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
      if (typeof addAndRunCriterion !== 'string' || !addAndRunCriterion.trim())
        throw new ValidationError('add_and_run_criterion must be a non-empty string')
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
   * @param options.addAndRunCriterion - Add criterion from text and run only that criterion
   * @param options.excludeProfiles - LinkedIn URLs to exclude from results
   * @param options.excludePreviouslyContacted - Exclude previously contacted people
   * @param options.excludeNames - Names to exclude from results
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
      addAndRunCriterion?: string
      excludeProfiles?: string[]
      excludePreviouslyContacted?: boolean
      excludeNames?: string[]
    },
  ): Promise<CreateResponseResponse> {
    const request: CreateResponseRequest = {
      messages: [{ role: 'user', content: query }],
      specializedAgent: 'deep_people_search',
    }

    if (options) {
      const params: SpecializedAgentParams = {}
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

      if (Object.keys(params).length > 0)
        request.specializedAgentParams = params
    }

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
   * @param options.addAndRunCriterion - Add criterion from text and run only that criterion
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
      addAndRunCriterion?: string
    },
  ): Promise<CreateResponseResponse> {
    const request: CreateResponseRequest = {
      messages: [{ role: 'user', content: query }],
      specializedAgent: 'people_scoring',
      specializedAgentParams: {
        candidateProfiles,
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
    }

    return this.create(request)
  }
}
