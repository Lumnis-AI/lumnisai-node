// Skills API resource
import type { Http } from '../core/http'
import type {
  SkillAnalyticsRequest,
  SkillEffectivenessMetrics,
  SkillGuidelineCreate,
  SkillGuidelineListResponse,
  SkillGuidelineResponse,
  SkillGuidelineUpdate,
  SkillUsageCreate,
  SkillUsageListResponse,
  SkillUsageResponse,
  SkillUsageUpdate,
} from '../types/skills'

export class SkillsResource {
  constructor(private readonly http: Http) {}

  /**
   * Create a new skill guideline
   * @param skillData - Skill guideline data
   * @param options - Optional parameters
   * @param options.userId - Optional user ID for skill ownership
   */
  async create(
    skillData: SkillGuidelineCreate,
    options?: { userId?: string },
  ): Promise<SkillGuidelineResponse> {
    const params: Record<string, string> = {}
    if (options?.userId) {
      params.user_id = options.userId
    }

    return this.http.post<SkillGuidelineResponse>('/skills', skillData, { params })
  }

  /**
   * List skill guidelines with optional filtering
   * @param params - Optional filter parameters
   * @param params.category - Filter by skill category
   * @param params.isActive - Filter by active status
   * @param params.page - Page number for pagination
   * @param params.pageSize - Number of items per page
   */
  async list(params?: {
    category?: string
    isActive?: boolean
    page?: number
    pageSize?: number
  }): Promise<SkillGuidelineListResponse> {
    const queryParams: Record<string, any> = {}
    if (params?.category)
      queryParams.category = params.category
    if (params?.isActive !== undefined)
      queryParams.is_active = params.isActive
    if (params?.page)
      queryParams.page = params.page
    if (params?.pageSize)
      queryParams.page_size = params.pageSize

    return this.http.get<SkillGuidelineListResponse>('/skills', { params: queryParams })
  }

  /**
   * Get a skill guideline by ID
   * @param skillId - The skill ID
   */
  async get(skillId: string): Promise<SkillGuidelineResponse> {
    return this.http.get<SkillGuidelineResponse>(`/skills/${skillId}`)
  }

  /**
   * Update a skill guideline
   * @param skillId - The skill ID
   * @param updates - Fields to update
   */
  async update(
    skillId: string,
    updates: SkillGuidelineUpdate,
  ): Promise<SkillGuidelineResponse> {
    return this.http.put<SkillGuidelineResponse>(`/skills/${skillId}`, updates)
  }

  /**
   * Delete a skill guideline
   * @param skillId - The skill ID
   */
  async delete(skillId: string): Promise<void> {
    await this.http.delete(`/skills/${skillId}`)
  }

  /**
   * Create a skill usage record
   * @param usageData - Skill usage data
   */
  async createUsage(usageData: SkillUsageCreate): Promise<SkillUsageResponse> {
    return this.http.post<SkillUsageResponse>('/skills/usage', usageData)
  }

  /**
   * List skill usage records
   * @param params - Optional filter parameters
   * @param params.skillId - Filter by skill ID
   * @param params.responseId - Filter by response ID
   * @param params.page - Page number for pagination
   * @param params.pageSize - Number of items per page
   */
  async listUsage(params?: {
    skillId?: string
    responseId?: string
    page?: number
    pageSize?: number
  }): Promise<SkillUsageListResponse> {
    const queryParams: Record<string, any> = {}
    if (params?.skillId)
      queryParams.skill_id = params.skillId
    if (params?.responseId)
      queryParams.response_id = params.responseId
    if (params?.page)
      queryParams.page = params.page
    if (params?.pageSize)
      queryParams.page_size = params.pageSize

    return this.http.get<SkillUsageListResponse>('/skills/usage', { params: queryParams })
  }

  /**
   * Update a skill usage record
   * @param usageId - The usage record ID
   * @param updates - Fields to update
   */
  async updateUsage(
    usageId: string,
    updates: SkillUsageUpdate,
  ): Promise<SkillUsageResponse> {
    return this.http.put<SkillUsageResponse>(`/skills/usage/${usageId}`, updates)
  }

  /**
   * Get skill effectiveness metrics
   * @param request - Analytics request parameters
   */
  async getAnalytics(request?: SkillAnalyticsRequest): Promise<SkillEffectivenessMetrics> {
    const queryParams: Record<string, any> = {}
    if (request?.skillId)
      queryParams.skill_id = request.skillId
    if (request?.tenantId)
      queryParams.tenant_id = request.tenantId
    if (request?.daysBack)
      queryParams.days_back = request.daysBack

    return this.http.get<SkillEffectivenessMetrics>('/skills/analytics', { params: queryParams })
  }
}
