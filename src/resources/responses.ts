// Responses API resource
//
// Specialized agents:
//   - quickPeopleSearch / deepPeopleSearch / peopleScoring — see method JSDoc below
//   - competitorPostEngagement — full reference in src/types/competitor-post-engagement.ts
//   - competitorRepEngagement — full reference in src/types/competitor-rep-engagement.ts
//   - engagementExpansion — expand a saved content-intelligence package into people
//   - influencerEngagement — score people engaging with a set of LinkedIn profiles
//   - companyIntelligence / personIntelligence — full reference in src/types/company-intelligence.ts
//
import type { Http } from '../core/http'
import type { PaginationParams } from '../types/common'
import type {
  CompanyIntelligenceOptions,
  PersonIntelligenceOptions,
} from '../types/company-intelligence'
import type {
  ContentIntelligenceOptions,
  ContentIntelligenceOutputName,
} from '../types/content-intelligence'
import type { EngagementExpansionOptions } from '../types/engagement-expansion'
import type { InfluencerEngagementOptions } from '../types/influencer-engagement'
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
    const validTypes: CriterionType[] = [
      'universal',
      'post_hard',
      'varying',
      'post_soft',
      'validation_only',
    ]

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
    const postHardCriteria = this._getParamValue<unknown>(criteriaClassification, 'postHardCriteria', 'post_hard_criteria')
    const varyingCriteria = this._getParamValue<unknown>(criteriaClassification, 'varyingCriteria', 'varying_criteria')
    const postSoftCriteria = this._getParamValue<unknown>(criteriaClassification, 'postSoftCriteria', 'post_soft_criteria')
    const validationOnlyCriteria = this._getParamValue<unknown>(criteriaClassification, 'validationOnlyCriteria', 'validation_only_criteria')

    if (!Array.isArray(universalCriteria))
      throw new ValidationError('criteria_classification missing or invalid universal_criteria')
    if (!Array.isArray(varyingCriteria))
      throw new ValidationError('criteria_classification missing or invalid varying_criteria')
    if (!Array.isArray(validationOnlyCriteria))
      throw new ValidationError('criteria_classification missing or invalid validation_only_criteria')
    if (postHardCriteria !== undefined && !Array.isArray(postHardCriteria))
      throw new ValidationError('criteria_classification has invalid post_hard_criteria')
    if (postSoftCriteria !== undefined && !Array.isArray(postSoftCriteria))
      throw new ValidationError('criteria_classification has invalid post_soft_criteria')
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

  private _validateContentIntelligenceParams(params: Record<string, any>): void {
    const limit = this._getParamValue<number>(params, 'limit', 'limit')
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 1000))
      throw new ValidationError('limit must be an integer between 1 and 1000 for content_intelligence')

    const exaResultsPerQuery = this._getParamValue<number>(
      params,
      'exaResultsPerQuery',
      'exa_results_per_query',
    )
    if (exaResultsPerQuery !== undefined
      && (!Number.isInteger(exaResultsPerQuery) || exaResultsPerQuery < 1)) {
      throw new ValidationError('exaResultsPerQuery must be a positive integer')
    }

    const outputs = this._getParamValue<ContentIntelligenceOutputName[]>(params, 'outputs', 'outputs')
    if (outputs !== undefined) {
      if (!Array.isArray(outputs) || outputs.length === 0)
        throw new ValidationError('outputs must contain at least one value')

      const supported: ContentIntelligenceOutputName[] = [
        'top_posts',
        'post_ideas',
        'engagement_analysis',
      ]
      for (const output of outputs) {
        if (!supported.includes(output)) {
          throw new ValidationError(
            `Invalid content_intelligence output: ${String(output)}. Supported outputs: ${supported.join(', ')}.`,
          )
        }
      }
    }
  }

  private _validateEngagementExpansionParams(params: Record<string, any>): void {
    const expandFromResponse = this._getParamValue<string>(
      params,
      'expandFromResponse',
      'expand_from_response',
    )
    if (expandFromResponse !== undefined
      && (typeof expandFromResponse !== 'string' || !expandFromResponse.trim())) {
      throw new ValidationError(
        'expandFromResponse must be a non-empty string when provided for engagement_expansion',
      )
    }

    for (const [camel, snake] of [
      ['hops', 'hops'],
      ['postsPerHop', 'posts_per_hop'],
      ['peoplePerNextHop', 'people_per_next_hop'],
      ['limit', 'limit'],
    ] as const) {
      const value = this._getParamValue<number>(params, camel, snake)
      if (value !== undefined && (!Number.isInteger(value) || value < 1))
        throw new ValidationError(`${camel} must be a positive integer for engagement_expansion`)
    }

    const excludeUrls = this._getParamValue<string[]>(params, 'excludeUrls', 'exclude_urls')
    if (excludeUrls !== undefined
      && (!Array.isArray(excludeUrls) || excludeUrls.some(url => typeof url !== 'string'))) {
      throw new ValidationError('excludeUrls must be an array of strings for engagement_expansion')
    }
  }

  private _validateInfluencerEngagementParams(params: Record<string, any>): void {
    const seedProfiles = this._getParamValue<string[]>(params, 'seedProfiles', 'seed_profiles')
    if (!Array.isArray(seedProfiles)
      || seedProfiles.some(url => typeof url !== 'string')
      || !seedProfiles.some(url => url.trim().length > 0)) {
      throw new ValidationError(
        'seedProfiles is required for influencer_engagement and must contain at least one non-empty string',
      )
    }

    const engagementTypes = this._getParamValue<PostEngagementType[]>(
      params,
      'engagementTypes',
      'engagement_types',
    )
    if (engagementTypes !== undefined) {
      if (!Array.isArray(engagementTypes) || engagementTypes.length === 0)
        throw new ValidationError('engagementTypes must contain at least one value')

      const validTypes: PostEngagementType[] = ['reactor', 'commenter']
      for (const type of engagementTypes) {
        if (!validTypes.includes(type)) {
          throw new ValidationError(
            `Invalid engagementTypes value: ${String(type)}. Expected 'reactor' and/or 'commenter'.`,
          )
        }
      }
    }

    const postsDateRange = this._getParamValue<PostsDateRange>(
      params,
      'postsDateRange',
      'posts_date_range',
    )
    if (postsDateRange !== undefined) {
      const validRanges: PostsDateRange[] = [
        'past-24h',
        'past-week',
        'past-month',
        'past-quarter',
        'past-6-months',
        'past-year',
        'past-2-years',
        'past-3-years',
      ]
      if (!validRanges.includes(postsDateRange))
        throw new ValidationError(`Invalid postsDateRange value: ${String(postsDateRange)}`)
    }

    for (const [camel, snake, maximum] of [
      ['limit', 'limit', 1000],
      ['maxReactorsPerPost', 'max_reactors_per_post', 5000],
      ['maxCommentsPerPost', 'max_comments_per_post', 5000],
    ] as const) {
      const value = this._getParamValue<number>(params, camel, snake)
      if (value !== undefined
        && (!Number.isInteger(value) || value < 1 || value > maximum)) {
        throw new ValidationError(
          `${camel} must be an integer between 1 and ${maximum} for influencer_engagement`,
        )
      }
    }

    for (const [camel, snake] of [
      ['includeReactedPosts', 'include_reacted_posts'],
      ['postsEnableFiltering', 'posts_enable_filtering'],
      ['thoroughEnrichment', 'thorough_enrichment'],
      ['deepValidationUseRelevanceReranker', 'deep_validation_use_relevance_reranker'],
    ] as const) {
      const value = this._getParamValue<boolean>(params, camel, snake)
      if (value !== undefined && typeof value !== 'boolean')
        throw new ValidationError(`${camel} must be a boolean for influencer_engagement`)
    }

    const excludeUrls = this._getParamValue<string[]>(params, 'excludeUrls', 'exclude_urls')
    if (excludeUrls !== undefined
      && (!Array.isArray(excludeUrls) || excludeUrls.some(url => typeof url !== 'string'))) {
      throw new ValidationError('excludeUrls must be an array of strings for influencer_engagement')
    }
  }

  private _validateSinceDays(value: unknown, agent: string): void {
    if (value === undefined)
      return
    if (!Number.isInteger(value as number) || (value as number) < 1 || (value as number) > 3650) {
      throw new ValidationError(
        `sinceDays must be an integer between 1 and 3650 for ${agent}`,
      )
    }
  }

  private _validateCompanyIntelligenceParams(params: Record<string, any>): void {
    const company = this._getParamValue<string>(params, 'company', 'company')
    if (typeof company !== 'string' || !company.trim()) {
      throw new ValidationError(
        '`company` is required for company_intelligence — give the company\'s domain. '
        + 'For a report on a person use the person_intelligence agent.',
      )
    }

    this._validateSinceDays(
      this._getParamValue<number>(params, 'sinceDays', 'since_days'),
      'company_intelligence',
    )

    const reader = this._getParamValue<string>(params, 'reader', 'reader')
    if (reader !== undefined && (typeof reader !== 'string' || !reader.trim()))
      throw new ValidationError('reader must be a non-empty string for company_intelligence')

    const allowSpend = this._getParamValue<boolean>(params, 'allowSpend', 'allow_spend')
    if (allowSpend !== undefined && typeof allowSpend !== 'boolean')
      throw new ValidationError('allowSpend must be a boolean for company_intelligence')
  }

  private _validatePersonIntelligenceParams(params: Record<string, any>): void {
    const linkedinUrl = this._getParamValue<string>(params, 'linkedinUrl', 'linkedin_url')
    const personName = this._getParamValue<string>(params, 'personName', 'person_name')
    const company = this._getParamValue<string>(params, 'company', 'company')

    const hasUrl = typeof linkedinUrl === 'string' && linkedinUrl.trim().length > 0
    const hasName = typeof personName === 'string' && personName.trim().length > 0
    const hasCompany = typeof company === 'string' && company.trim().length > 0

    if (hasName && !hasUrl && !hasCompany) {
      throw new ValidationError(
        '`personName` needs `company` (the employer\'s domain) to resolve the right '
        + 'person — or give `linkedinUrl` instead.',
      )
    }
    if (!hasUrl && !hasName) {
      throw new ValidationError(
        'Give a person for person_intelligence: `linkedinUrl`, or `personName` + '
        + '`company`. For a report on a company use the company_intelligence agent.',
      )
    }
  }

  private _validateSalesNavigatorRequest(request: CreateResponseRequest): void {
    const directParams = request.specializedAgentParams as Record<string, any> | undefined
    const directUrl = directParams
      ? this._getParamValue<unknown>(directParams, 'salesNavigatorUrl', 'sales_navigator_url')
      : undefined

    const requestOptions = request.options as Record<string, any> | undefined
    const nestedParams = requestOptions
      ? this._getParamValue<unknown>(
          requestOptions,
          'specializedAgentParams',
          'specialized_agent_params',
        )
      : undefined
    const nestedUrl = this._isPlainObject(nestedParams)
      ? this._getParamValue<unknown>(nestedParams, 'salesNavigatorUrl', 'sales_navigator_url')
      : undefined
    const optionsUrl = requestOptions
      ? this._getParamValue<unknown>(requestOptions, 'salesNavigatorUrl', 'sales_navigator_url')
      : undefined
    const salesNavigatorUrl = directUrl ?? nestedUrl ?? optionsUrl

    if (salesNavigatorUrl === undefined || salesNavigatorUrl === null)
      return

    if (typeof salesNavigatorUrl !== 'string'
      || salesNavigatorUrl.length > 8192
      || !salesNavigatorUrl.trim()) {
      throw new ValidationError(
        'salesNavigatorUrl must be a non-empty string no longer than 8192 characters',
      )
    }

    if ([...salesNavigatorUrl].some(character => character.charCodeAt(0) < 32)
      || salesNavigatorUrl.includes('\\')) {
      throw new ValidationError('salesNavigatorUrl contains unsafe characters')
    }

    let parsed: URL
    try {
      parsed = new URL(salesNavigatorUrl)
    }
    catch {
      throw new ValidationError('salesNavigatorUrl is malformed')
    }

    const authorityMatch = salesNavigatorUrl.match(/^[a-z][a-z\d+.-]*:\/\/([^/?#]*)/i)
    const rawAuthority = authorityMatch?.[1]
    if (parsed.protocol !== 'https:')
      throw new ValidationError('salesNavigatorUrl must use https')
    if (parsed.hostname !== 'www.linkedin.com')
      throw new ValidationError('salesNavigatorUrl must use www.linkedin.com')
    if (parsed.username || parsed.password || parsed.port
      || rawAuthority?.toLowerCase() !== 'www.linkedin.com') {
      throw new ValidationError('salesNavigatorUrl cannot contain credentials or a custom port')
    }
    if (parsed.hash)
      throw new ValidationError('salesNavigatorUrl cannot contain a fragment')

    const rawSuffix = authorityMatch
      ? salesNavigatorUrl.slice(authorityMatch[0].length)
      : ''
    const rawPath = rawSuffix.split(/[?#]/, 1)[0]
    if (rawPath === '/sales/search/company') {
      throw new ValidationError(
        'Company Sales Navigator searches are not supported yet; '
        + 'use a people search or people list URL',
      )
    }
    if (rawPath !== '/sales/search/people'
      && !/^\/sales\/lists\/people\/\d+$/.test(rawPath)) {
      throw new ValidationError(
        'salesNavigatorUrl must be a Sales Navigator people-search or people-list URL',
      )
    }

    if (typeof request.userId !== 'string' || !request.userId.trim())
      throw new ValidationError('userId is required when salesNavigatorUrl is provided')
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
      if (!reuseCriteriaFrom && !hasCriteria && specializedAgent !== 'people_scoring')
        throw new ValidationError('add_and_run_criterion requires existing criteria outside people_scoring.')

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
        const answerFormat = this._getParamValue<string>(addAndRunCriterion, 'answerFormat', 'answer_format')
        const columnKind = this._getParamValue<string>(addAndRunCriterion, 'columnKind', 'column_kind')
        const webVerify = this._getParamValue<boolean>(addAndRunCriterion, 'webVerify', 'web_verify')

        if (!criterionText || typeof criterionText !== 'string' || !criterionText.trim())
          throw new ValidationError('add_and_run_criterion object requires criterion_text')
        if (suggestedColumnName !== undefined && typeof suggestedColumnName !== 'string')
          throw new ValidationError('add_and_run_criterion suggested_column_name must be a string if provided')
        if (answerFormat !== undefined && typeof answerFormat !== 'string')
          throw new ValidationError('add_and_run_criterion answer_format must be a string if provided')
        if (columnKind !== undefined && columnKind !== 'extraction' && columnKind !== 'verdict')
          throw new ValidationError('add_and_run_criterion column_kind must be extraction or verdict')
        if (webVerify !== undefined && typeof webVerify !== 'boolean')
          throw new ValidationError('add_and_run_criterion web_verify must be a boolean if provided')
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

    if (specializedAgent === 'content_intelligence')
      this._validateContentIntelligenceParams(rawParams)

    if (specializedAgent === 'engagement_expansion')
      this._validateEngagementExpansionParams(rawParams)

    if (specializedAgent === 'influencer_engagement')
      this._validateInfluencerEngagementParams(rawParams)

    if (specializedAgent === 'company_intelligence')
      this._validateCompanyIntelligenceParams(rawParams)

    if (specializedAgent === 'person_intelligence')
      this._validatePersonIntelligenceParams(rawParams)
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
        // Defensive only: WHATWG URL never yields an empty hostname for
        // http/https — an extra slash collapses into one ('http:///a' parses
        // with hostname 'a') and a bare 'https://' throws above.
        if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && !parsed.hostname)
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
    this._validateSalesNavigatorRequest(request)
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
   * @param options.excludeCrmContacts - Exclude people in the acting user's synced CRM ledger; @default true (via request `options`)
   * @param options.crmExclusionOwners - Granted owner ledgers to exclude against (user id or email)
   * @param options.crmNameCompanyMatch - Also exclude by exact name+company; @default true
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
      excludeCrmContacts?: boolean
      crmExclusionOwners?: string[]
      crmNameCompanyMatch?: boolean
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

      const crmOptions: Record<string, unknown> = {}
      if (options.excludeCrmContacts !== undefined)
        crmOptions.excludeCrmContacts = options.excludeCrmContacts
      if (options.crmExclusionOwners)
        crmOptions.crmExclusionOwners = options.crmExclusionOwners
      if (options.crmNameCompanyMatch !== undefined)
        crmOptions.crmNameCompanyMatch = options.crmNameCompanyMatch
      if (Object.keys(crmOptions).length > 0)
        request.options = crmOptions
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
   *   Can be a string or an object with criterionText, columnKind, answerFormat, webVerify,
   *   and optional suggestedColumnName. Deep search still requires an existing criteria set;
   *   use peopleScoring to bootstrap a column on a plain candidate list.
   *   Example string: 'Must have 5+ years Python experience'
   *   Example object: { criterionText: 'Has ML experience', suggestedColumnName: 'ml_experience' }
   * @param options.excludeProfiles - LinkedIn URLs to exclude from results
   * @param options.excludePreviouslyContacted - Exclude previously contacted people
   * @param options.excludeNames - Names to exclude from results
   * @param options.excludeCrmContacts - Exclude people in the acting user's synced CRM ledger; @default true
   * @param options.crmExclusionOwners - Granted owner ledgers to exclude against (user id or email)
   * @param options.crmNameCompanyMatch - Also exclude by exact name+company; @default true
   * @param options.salesNavigatorUrl - Sales Navigator people-search or people-list URL to use as the only discovery source
   * @param options.userId - Acting user whose owned Sales Navigator connection should be used; required with `salesNavigatorUrl`
   * @param options.searchJobSignal - CrustData job-listing signal search (decision makers at hiring companies); true | false | 'auto'
   * @param options.deepVerify - Web verification for org/location/third-party criteria: 'auto' (default), 'always', or 'off'
   * @param options.deepValidationUseRelevanceReranker - SLM relevance reranker for surfaced candidates (ranking-only); @default true
   * @param options.deepValidationBackfillBelowCriteria - Pad with criteria-failed candidates when under count; @default true
   * @param options.enrichEngagementHistory - Add recent LinkedIn engagement evidence before validation; forced off for Sales Navigator V1
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
      excludeCrmContacts?: boolean
      crmExclusionOwners?: string[]
      crmNameCompanyMatch?: boolean
      salesNavigatorUrl?: string
      userId?: string
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
      postsExtractReactors?: boolean
      postsExtractCommenters?: boolean
      searchJobSignal?: boolean | 'auto'
      deepVerify?: 'off' | 'auto' | 'always'
      deepValidationUseRelevanceReranker?: boolean
      deepValidationBackfillBelowCriteria?: boolean
      enrichEngagementHistory?: boolean
      deepSearchCriteriaModel?: string
    },
  ): Promise<CreateResponseResponse> {
    const request: CreateResponseRequest = {
      messages: [{ role: 'user', content: query }],
      specializedAgent: 'deep_people_search',
    }

    if (options?.userId !== undefined)
      request.userId = options.userId

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
      if (options.excludeCrmContacts !== undefined)
        params.excludeCrmContacts = options.excludeCrmContacts
      if (options.crmExclusionOwners)
        params.crmExclusionOwners = options.crmExclusionOwners
      if (options.crmNameCompanyMatch !== undefined)
        params.crmNameCompanyMatch = options.crmNameCompanyMatch
      if (options.salesNavigatorUrl !== undefined)
        params.salesNavigatorUrl = options.salesNavigatorUrl
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
      if (options.postsExtractReactors !== undefined)
        params.postsExtractReactors = options.postsExtractReactors
      if (options.postsExtractCommenters !== undefined)
        params.postsExtractCommenters = options.postsExtractCommenters
      if (options.searchJobSignal !== undefined)
        params.searchJobSignal = options.searchJobSignal
      if (options.deepVerify !== undefined)
        params.deepVerify = options.deepVerify
      if (options.enrichEngagementHistory !== undefined)
        params.enrichEngagementHistory = options.enrichEngagementHistory
      if (options.deepSearchCriteriaModel)
        params.deepSearchCriteriaModel = options.deepSearchCriteriaModel

      if (options.salesNavigatorUrl !== undefined) {
        // Sales Navigator V1 is a fixed source/cost lane. Keep the outgoing
        // request consistent with the backend's authoritative overrides.
        params.searchProfiles = false
        params.searchPosts = false
        params.searchConnections = false
        params.searchJobSignal = false
        params.includeEngagementInScore = false
        params.postsEnableEnrichment = false
        params.postsEnableFiltering = false
        params.deepValidationUseRelevanceReranker = false
        params.deepValidationBackfillBelowCriteria = false
        params.enrichEngagementHistory = false
      }
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
   *   Can be a string or an object with criterionText, columnKind, answerFormat, webVerify,
   *   and optional suggestedColumnName. No existing criteria are required.
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
   * Discover what content a described audience engages with on LinkedIn.
   *
   * The backend searches for the audience, collects their reaction history,
   * saves the normalized package, and produces grounded views from it. Pass
   * `reusePackageFrom` to re-cook a saved package without collecting again.
   * `companyContext` and `contentDirection` steer post ideas only; collection,
   * curation, and engagement analysis remain an unbiased read of the audience.
   *
   * @param query - Natural-language description of the audience. A nonblank
   *   message is required even when reusing a package.
   * @param options - Audience, collection-window, package-reuse, and output controls.
   *   Omit `outputs` to use the backend's default set.
   */
  async contentIntelligence(
    query: string,
    options: ContentIntelligenceOptions = {},
  ): Promise<CreateResponseResponse> {
    if (!query.trim())
      throw new ValidationError('contentIntelligence requires a non-empty audience query')

    const params: SpecializedAgentParams = {}
    if (options.limit !== undefined)
      params.limit = options.limit
    if (options.postsDateRange !== undefined)
      params.postsDateRange = options.postsDateRange
    if (options.postsEnableFiltering !== undefined)
      params.postsEnableFiltering = options.postsEnableFiltering
    if (options.exaResultsPerQuery !== undefined)
      params.exaResultsPerQuery = options.exaResultsPerQuery
    if (options.companyContext !== undefined)
      params.companyContext = options.companyContext
    if (options.contentDirection !== undefined)
      params.contentDirection = options.contentDirection
    if (options.reusePackageFrom !== undefined)
      params.reusePackageFrom = options.reusePackageFrom
    if (options.outputs !== undefined)
      params.outputs = options.outputs

    return this.create({
      messages: [{ role: 'user', content: query }],
      specializedAgent: 'content_intelligence',
      specializedAgentParams: params,
    })
  }

  /**
   * Find new people by walking outward from a saved engagement package.
   *
   * With `expandFromResponse`, hop 1 pulls the other engagers of that response's
   * saved package. Without it, the backend first finds a seed audience from the
   * prompt, collects and saves its package, then expands it. Additional hops
   * select the highest-fit new people, rank posts from their feeds, and pull
   * their engagers. Collection breadth is derived from `limit` unless
   * `postsPerHop` is explicit. At the default limit, hop collection is about
   * 300 credits for one hop and 1,060 for three; prompt-only seed collection,
   * enrichment, and validation are additional.
   *
   * @param query - Persona prompt used to rank and validate discovered people.
   * @param options - Optional source response, hop, breadth, limit, and exclusion controls.
   * @returns Response; poll with `get()` and read `structuredResponse` as
   *   {@link EngagementExpansionOutput}.
   */
  async engagementExpansion(
    query: string,
    options: EngagementExpansionOptions = {},
  ): Promise<CreateResponseResponse> {
    if (!query.trim())
      throw new ValidationError('engagementExpansion requires a non-empty persona query')

    const params: SpecializedAgentParams = {}
    if (options.expandFromResponse !== undefined)
      params.expandFromResponse = options.expandFromResponse
    if (options?.hops !== undefined)
      params.hops = options.hops
    if (options?.postsPerHop !== undefined)
      params.postsPerHop = options.postsPerHop
    if (options?.peoplePerNextHop !== undefined)
      params.peoplePerNextHop = options.peoplePerNextHop
    if (options?.limit !== undefined)
      params.limit = options.limit
    if (options?.excludeUrls !== undefined)
      params.excludeUrls = options.excludeUrls
    if (options?.deepValidationUseRelevanceReranker !== undefined) {
      params.deepValidationUseRelevanceReranker
        = options.deepValidationUseRelevanceReranker
    }

    return this.create({
      messages: [{ role: 'user', content: query }],
      specializedAgent: 'engagement_expansion',
      specializedAgentParams: params,
    })
  }

  /**
   * Score people who react to or comment on posts connected to named LinkedIn profiles.
   *
   * The backend reads posts each seed authored within the requested window and can
   * optionally include posts they reacted to. It selects posts relevant to the
   * persona prompt, then runs their engagers through the deep people-search scoring
   * chain. Seed profiles are always excluded from delivered candidates.
   *
   * @param query - Persona prompt used to select posts and score discovered people.
   * @param options - Seed profiles plus optional window, extraction, and cost controls.
   * @returns Response; poll with `get()` and read `structuredResponse` as
   *   {@link InfluencerEngagementOutput}.
   */
  async influencerEngagement(
    query: string,
    options: InfluencerEngagementOptions,
  ): Promise<CreateResponseResponse> {
    if (!query.trim())
      throw new ValidationError('influencerEngagement requires a non-empty persona query')

    const params: SpecializedAgentParams = {
      seedProfiles: options.seedProfiles,
    }
    if (options.includeReactedPosts !== undefined)
      params.includeReactedPosts = options.includeReactedPosts
    if (options.postsDateRange !== undefined)
      params.postsDateRange = options.postsDateRange
    if (options.engagementTypes !== undefined)
      params.engagementTypes = options.engagementTypes
    if (options.postsEnableFiltering !== undefined)
      params.postsEnableFiltering = options.postsEnableFiltering
    if (options.thoroughEnrichment !== undefined)
      params.thoroughEnrichment = options.thoroughEnrichment
    if (options.deepValidationUseRelevanceReranker !== undefined) {
      params.deepValidationUseRelevanceReranker
        = options.deepValidationUseRelevanceReranker
    }
    if (options.maxReactorsPerPost !== undefined)
      params.maxReactorsPerPost = options.maxReactorsPerPost
    if (options.maxCommentsPerPost !== undefined)
      params.maxCommentsPerPost = options.maxCommentsPerPost
    if (options.excludeUrls !== undefined)
      params.excludeUrls = options.excludeUrls
    if (options.limit !== undefined)
      params.limit = options.limit

    return this.create({
      messages: [{ role: 'user', content: query }],
      specializedAgent: 'influencer_engagement',
      specializedAgentParams: params,
    })
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

  /** True when a person target reads as a LinkedIn profile URL rather than a name. */
  private _looksLikeLinkedInUrl(value: string): boolean {
    const target = value.trim().toLowerCase()
    return target.startsWith('http://')
      || target.startsWith('https://')
      || target.startsWith('www.linkedin.com/')
      || target.startsWith('linkedin.com/')
  }

  /**
   * Produce one deep intelligence report on a single company.
   *
   * The backend reads everything it can buy or fetch about the company — the
   * job-posting corpus with zero truncation, headcount and web-traffic series,
   * live careers boards and the careers page, executive LinkedIn posts and
   * company mentions, the employee roster, recent news and vendor enrichment —
   * prepares all of it in code, and has a writer model read it into a markdown
   * report. A second cheap call slices the same report into a display-block
   * envelope.
   *
   * Runs are long on a cold corpus (tens of minutes). `sinceDays` trades depth
   * for credits; omit it for the full posting history, which the report's
   * timelines and never-posted claims depend on. A posting fetch projected past
   * the per-run credit ceiling stops rather than spending — `allowSpend: true`
   * lets it through.
   *
   * @param company - The company's domain (the one it uses on LinkedIn when they
   *   differ). A pasted URL is normalized server-side: `https://www.acme.com/about`
   *   resolves to `acme.com`.
   * @param options - Requester context, register, posting window, and spend control.
   * @returns Response; poll with `get()`, read the report from `outputText` and
   *   the envelope from `structuredResponse` as {@link CompanyIntelligenceOutput}.
   *   See `src/types/company-intelligence.ts` for the full agent reference.
   */
  async companyIntelligence(
    company: string,
    options: CompanyIntelligenceOptions = {},
  ): Promise<CreateResponseResponse> {
    if (typeof company !== 'string' || !company.trim())
      throw new ValidationError('companyIntelligence requires a non-empty company domain')

    const params: SpecializedAgentParams = { company: company.trim() }
    if (options.companyContext !== undefined)
      params.companyContext = options.companyContext
    if (options.reader !== undefined)
      params.reader = options.reader
    if (options.sinceDays !== undefined)
      params.sinceDays = options.sinceDays
    if (options.allowSpend !== undefined)
      params.allowSpend = options.allowSpend

    const prompt = options.prompt?.trim()
      || `Company intelligence report for ${company.trim()}`

    return this.create({
      messages: [{ role: 'user', content: prompt }],
      specializedAgent: 'company_intelligence',
      specializedAgentParams: params,
    })
  }

  /**
   * Produce one deep intelligence report on a single person.
   *
   * Two doors, chosen from `person`. Pass a **LinkedIn profile URL** and no name
   * is needed — it is read from the live profile. Pass a **full name** and
   * `options.company` (the employer's domain) is required to resolve the right
   * person. The backend reads their live profile, their posts and the engagement
   * on them, other platforms (X/Instagram) and their web presence, and grades
   * how much evidence it actually found so thin sections stay honest.
   *
   * @param person - A LinkedIn profile URL, or the person's full name.
   * @param options - `company` (employer domain — required with a name),
   *   requester context, and an optional focus prompt.
   * @returns Response; poll with `get()`, read the report from `outputText` and
   *   the envelope from `structuredResponse` as {@link PersonIntelligenceOutput}.
   *   See `src/types/company-intelligence.ts` for the full agent reference.
   */
  async personIntelligence(
    person: string,
    options: PersonIntelligenceOptions = {},
  ): Promise<CreateResponseResponse> {
    if (typeof person !== 'string' || !person.trim()) {
      throw new ValidationError(
        'personIntelligence requires a LinkedIn profile URL or a person name',
      )
    }

    const target = person.trim()
    const params: SpecializedAgentParams = {}

    if (this._looksLikeLinkedInUrl(target)) {
      params.linkedinUrl = target
    }
    else {
      if (typeof options.company !== 'string' || !options.company.trim()) {
        throw new ValidationError(
          `personIntelligence needs \`company\` (the employer's domain) to resolve `
          + `"${target}" — or pass the person's LinkedIn profile URL instead.`,
        )
      }
      params.personName = target
    }

    if (options.company !== undefined)
      params.company = options.company
    if (options.companyContext !== undefined)
      params.companyContext = options.companyContext

    const prompt = options.prompt?.trim()
      || `Person intelligence report for ${target}`

    return this.create({
      messages: [{ role: 'user', content: prompt }],
      specializedAgent: 'person_intelligence',
      specializedAgentParams: params,
    })
  }
}
