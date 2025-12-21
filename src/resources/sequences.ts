import type { Http } from '../core/http'
import type {
  ApprovalListResponse,
  ApprovalResponse,
  ApproveStepRequest,
  BulkApprovalRequest,
  BulkApprovalResponse,
  BulkOperationRequest,
  BulkOperationResponse,
  ExecutionDetailResponse,
  ExecutionListResponse,
  ExecutionMetricsOptions,
  ExecutionMetricsResponse,
  LifecycleOperationRequest,
  LifecycleOperationResponse,
  ListApprovalsOptions,
  ListExecutionsOptions,
  ListTemplatesOptions,
  RejectStepRequest,
  SequenceTemplateCreate,
  SequenceTemplateResponse,
  StartExecutionRequest,
  StartExecutionResponse,
  ValidationResponse,
} from '../types/sequences'

/**
 * Resource for managing automated multi-step outreach sequences.
 */
export class SequencesResource {
  constructor(private readonly http: Http) {}

  // ==================== Templates ====================

  /**
   * List all sequence templates for the tenant.
   */
  async listTemplates(
    options?: ListTemplatesOptions,
  ): Promise<SequenceTemplateResponse[]> {
    const params: Record<string, unknown> = {}
    if (options?.useCase)
      params.use_case = options.useCase
    if (options?.includeSystem !== undefined)
      params.include_system = options.includeSystem
    if (options?.includeArchived !== undefined)
      params.include_archived = options.includeArchived

    return this.http.get<SequenceTemplateResponse[]>('/sequences/templates', {
      params,
    })
  }

  /**
   * Get a specific sequence template with all steps and transitions.
   */
  async getTemplate(templateId: string): Promise<SequenceTemplateResponse> {
    return this.http.get<SequenceTemplateResponse>(
      `/sequences/templates/${encodeURIComponent(templateId)}`,
    )
  }

  /**
   * Create a new sequence template.
   * @param template - The template configuration
   * @param userId - User ID or email creating the template
   */
  async createTemplate(
    template: SequenceTemplateCreate,
    userId: string,
  ): Promise<SequenceTemplateResponse> {
    return this.http.post<SequenceTemplateResponse>(
      '/sequences/templates',
      template,
      { params: { user_id: userId } },
    )
  }

  /**
   * Archive a sequence template (soft delete).
   */
  async archiveTemplate(templateId: string): Promise<void> {
    await this.http.delete(
      `/sequences/templates/${encodeURIComponent(templateId)}`,
    )
  }

  /**
   * Validate a sequence configuration without saving.
   */
  async validateTemplate(
    template: SequenceTemplateCreate,
  ): Promise<ValidationResponse> {
    return this.http.post<ValidationResponse>(
      '/sequences/templates/validate',
      template,
    )
  }

  // ==================== Executions ====================

  /**
   * Start sequence executions for prospects.
   * @param request - The execution request with template and prospects
   * @param userId - User ID or email starting the executions
   */
  async startExecutions(
    request: StartExecutionRequest,
    userId: string,
  ): Promise<StartExecutionResponse> {
    return this.http.post<StartExecutionResponse>(
      '/sequences/executions',
      request,
      { params: { user_id: userId } },
    )
  }

  /**
   * List executions with optional filters.
   */
  async listExecutions(
    options?: ListExecutionsOptions,
  ): Promise<ExecutionListResponse> {
    const params: Record<string, unknown> = {}
    if (options?.templateId)
      params.template_id = options.templateId
    if (options?.projectId)
      params.project_id = options.projectId
    if (options?.status)
      params.status = options.status
    if (options?.limit !== undefined)
      params.limit = options.limit
    if (options?.offset !== undefined)
      params.offset = options.offset

    return this.http.get<ExecutionListResponse>('/sequences/executions', {
      params,
    })
  }

  /**
   * Get execution metrics/stats.
   */
  async getExecutionMetrics(
    options?: ExecutionMetricsOptions,
  ): Promise<ExecutionMetricsResponse> {
    const params: Record<string, unknown> = {}
    if (options?.templateId)
      params.template_id = options.templateId
    if (options?.projectId)
      params.project_id = options.projectId

    return this.http.get<ExecutionMetricsResponse>(
      '/sequences/executions/metrics',
      { params },
    )
  }

  /**
   * Get detailed execution state with step history.
   */
  async getExecution(executionId: string): Promise<ExecutionDetailResponse> {
    return this.http.get<ExecutionDetailResponse>(
      `/sequences/executions/${encodeURIComponent(executionId)}`,
    )
  }

  // ==================== Lifecycle ====================

  /**
   * Pause a single execution.
   */
  async pauseExecution(
    executionId: string,
    userId: string,
    options?: LifecycleOperationRequest,
  ): Promise<LifecycleOperationResponse> {
    return this.http.post<LifecycleOperationResponse>(
      `/sequences/executions/${encodeURIComponent(executionId)}/pause`,
      options ?? {},
      { params: { user_id: userId } },
    )
  }

  /**
   * Resume a paused execution.
   */
  async resumeExecution(
    executionId: string,
    userId: string,
  ): Promise<LifecycleOperationResponse> {
    return this.http.post<LifecycleOperationResponse>(
      `/sequences/executions/${encodeURIComponent(executionId)}/resume`,
      {},
      { params: { user_id: userId } },
    )
  }

  /**
   * Stop an execution permanently.
   */
  async stopExecution(
    executionId: string,
    userId: string,
    options?: LifecycleOperationRequest,
  ): Promise<LifecycleOperationResponse> {
    return this.http.post<LifecycleOperationResponse>(
      `/sequences/executions/${encodeURIComponent(executionId)}/stop`,
      options ?? {},
      { params: { user_id: userId } },
    )
  }

  /**
   * Retry a failed execution.
   */
  async retryExecution(
    executionId: string,
    userId: string,
  ): Promise<LifecycleOperationResponse> {
    return this.http.post<LifecycleOperationResponse>(
      `/sequences/executions/${encodeURIComponent(executionId)}/retry`,
      {},
      { params: { user_id: userId } },
    )
  }

  /**
   * Pause multiple executions.
   */
  async bulkPauseExecutions(
    request: BulkOperationRequest,
    userId: string,
  ): Promise<BulkOperationResponse> {
    return this.http.post<BulkOperationResponse>(
      '/sequences/executions/bulk/pause',
      request,
      { params: { user_id: userId } },
    )
  }

  /**
   * Resume multiple paused executions.
   */
  async bulkResumeExecutions(
    request: BulkOperationRequest,
    userId: string,
  ): Promise<BulkOperationResponse> {
    return this.http.post<BulkOperationResponse>(
      '/sequences/executions/bulk/resume',
      request,
      { params: { user_id: userId } },
    )
  }

  /**
   * Stop multiple executions permanently.
   */
  async bulkStopExecutions(
    request: BulkOperationRequest,
    userId: string,
  ): Promise<BulkOperationResponse> {
    return this.http.post<BulkOperationResponse>(
      '/sequences/executions/bulk/stop',
      request,
      { params: { user_id: userId } },
    )
  }

  // ==================== Approvals ====================

  /**
   * List steps waiting for approval.
   */
  async listPendingApprovals(
    options?: ListApprovalsOptions,
  ): Promise<ApprovalListResponse> {
    const params: Record<string, unknown> = {}
    if (options?.templateId)
      params.template_id = options.templateId
    if (options?.projectId)
      params.project_id = options.projectId
    if (options?.limit !== undefined)
      params.limit = options.limit
    if (options?.offset !== undefined)
      params.offset = options.offset

    return this.http.get<ApprovalListResponse>('/sequences/approvals', {
      params,
    })
  }

  /**
   * Approve a step for sending.
   */
  async approveStep(
    stepExecutionId: string,
    userId: string,
    options?: ApproveStepRequest,
  ): Promise<ApprovalResponse> {
    return this.http.post<ApprovalResponse>(
      `/sequences/approvals/${encodeURIComponent(stepExecutionId)}/approve`,
      options ?? {},
      { params: { user_id: userId } },
    )
  }

  /**
   * Reject a step (cancels the execution).
   */
  async rejectStep(
    stepExecutionId: string,
    request: RejectStepRequest,
    userId: string,
  ): Promise<ApprovalResponse> {
    return this.http.post<ApprovalResponse>(
      `/sequences/approvals/${encodeURIComponent(stepExecutionId)}/reject`,
      request,
      { params: { user_id: userId } },
    )
  }

  /**
   * Bulk approve multiple steps.
   */
  async bulkApprove(
    request: BulkApprovalRequest,
    userId: string,
  ): Promise<BulkApprovalResponse> {
    return this.http.post<BulkApprovalResponse>(
      '/sequences/approvals/bulk',
      request,
      { params: { user_id: userId } },
    )
  }
}
