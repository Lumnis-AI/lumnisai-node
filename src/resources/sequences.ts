import type { Http } from '../core/http'
import type {
  ApprovalListResponse,
  ApprovalResponse,
  ApproveStepRequest,
  BatchExecutionRequest,
  BatchExecutionResponse,
  BatchPollRequest,
  BatchPollResponse,
  BulkApprovalRequest,
  BulkApprovalResponse,
  BulkCompleteRequest,
  BulkCompleteResponse,
  BulkOperationRequest,
  BulkOperationResponse,
  CompleteExecutionRequest,
  CompleteExecutionResponse,
  DuplicateTemplateRequest,
  EngagementStatusRequest,
  EngagementStatusResponse,
  ExecutionDetailResponse,
  ExecutionListResponse,
  ExecutionMetricsOptions,
  ExecutionMetricsResponse,
  LifecycleOperationRequest,
  LifecycleOperationResponse,
  ListApprovalsOptions,
  ListExecutionsOptions,
  ListStepExecutionsOptions,
  ListTemplatesOptions,
  RateLimitStatusResponse,
  RejectStepRequest,
  SequenceTemplateCreate,
  SequenceTemplateResponse,
  SequenceTemplateUpdate,
  SkipStepRequest,
  SkipStepResponse,
  StartExecutionRequest,
  StartExecutionResponse,
  StepExecutionListResponse,
  TemplateShareRequest,
  TemplateSharesResponse,
  UpdateStepExecutionRequest,
  UpdateStepExecutionResponse,
  ValidationResponse,
} from '../types/sequences'

/**
 * Resource for managing automated multi-step outreach sequences.
 */
export class SequencesResource {
  constructor(private readonly http: Http) {}

  // ==================== Templates ====================

  /**
   * List sequence templates accessible to the user.
   *
   * When userId is provided:
   * - Returns templates the user owns (created_by = userId)
   * - Plus templates shared with the user specifically
   * - Plus templates shared tenant-wide (unless ownedOnly=true)
   *
   * When userId is not provided:
   * - Returns all templates in the tenant (admin view)
   */
  async listTemplates(
    options?: ListTemplatesOptions,
  ): Promise<SequenceTemplateResponse[]> {
    const params: Record<string, unknown> = {}
    if (options?.userId)
      params.user_id = options.userId
    if (options?.useCase)
      params.use_case = options.useCase
    if (options?.includeSystem !== undefined)
      params.include_system = options.includeSystem
    if (options?.includeArchived !== undefined)
      params.include_archived = options.includeArchived
    if (options?.ownedOnly !== undefined)
      params.owned_only = options.ownedOnly

    return this.http.get<SequenceTemplateResponse[]>('/sequences/templates', {
      params,
    })
  }

  /**
   * Get a specific sequence template with all steps and transitions.
   * @param templateId - The template ID
   * @param userId - Optional user ID for permission context
   */
  async getTemplate(
    templateId: string,
    userId?: string,
  ): Promise<SequenceTemplateResponse> {
    const params: Record<string, unknown> = {}
    if (userId)
      params.user_id = userId

    return this.http.get<SequenceTemplateResponse>(
      `/sequences/templates/${encodeURIComponent(templateId)}`,
      { params },
    )
  }

  /**
   * Create a new sequence template.
   * @param template - The template configuration
   * @param userId - Optional user ID or email creating the template (for audit)
   */
  async createTemplate(
    template: SequenceTemplateCreate,
    userId?: string,
  ): Promise<SequenceTemplateResponse> {
    const params: Record<string, unknown> = {}
    if (userId)
      params.user_id = userId

    return this.http.post<SequenceTemplateResponse>(
      '/sequences/templates',
      template,
      { params },
    )
  }

  /**
   * Archive a sequence template (soft delete).
   * @param templateId - The template ID to archive
   * @param userId - User ID or email archiving the template
   */
  async archiveTemplate(templateId: string, userId: string): Promise<void> {
    await this.http.delete(
      `/sequences/templates/${encodeURIComponent(templateId)}`,
      { params: { user_id: userId } },
    )
  }

  /**
   * Update an existing sequence template.
   * Note: Cannot update steps/transitions if template has active executions.
   * @param templateId - The template ID to update
   * @param template - The fields to update
   * @param userId - User ID or email updating the template
   */
  async updateTemplate(
    templateId: string,
    template: SequenceTemplateUpdate,
    userId: string,
  ): Promise<SequenceTemplateResponse> {
    return this.http.put<SequenceTemplateResponse>(
      `/sequences/templates/${encodeURIComponent(templateId)}`,
      template,
      { params: { user_id: userId } },
    )
  }

  /**
   * Duplicate an existing template with a new name.
   * Copies all steps and transitions, resets usage statistics.
   * @param templateId - The template ID to duplicate
   * @param request - The duplicate request with new name
   * @param userId - User ID or email duplicating the template
   */
  async duplicateTemplate(
    templateId: string,
    request: DuplicateTemplateRequest,
    userId: string,
  ): Promise<SequenceTemplateResponse> {
    return this.http.post<SequenceTemplateResponse>(
      `/sequences/templates/${encodeURIComponent(templateId)}/duplicate`,
      request,
      { params: { user_id: userId } },
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

  // ==================== Template Sharing ====================

  /**
   * Get sharing information for a template.
   */
  async getTemplateShares(
    templateId: string,
  ): Promise<TemplateSharesResponse> {
    return this.http.get<TemplateSharesResponse>(
      `/sequences/templates/${encodeURIComponent(templateId)}/shares`,
    )
  }

  /**
   * Update sharing settings for a template.
   * Only the template owner can modify shares.
   * @param templateId - The template ID
   * @param request - The sharing request
   * @param userId - Optional user ID making the request (for permission check)
   */
  async updateTemplateShares(
    templateId: string,
    request: TemplateShareRequest,
    userId?: string,
  ): Promise<TemplateSharesResponse> {
    const params: Record<string, unknown> = {}
    if (userId)
      params.user_id = userId

    return this.http.post<TemplateSharesResponse>(
      `/sequences/templates/${encodeURIComponent(templateId)}/shares`,
      request,
      { params },
    )
  }

  /**
   * Remove a specific share from a template.
   * Only the template owner can remove shares.
   * @param templateId - The template ID
   * @param shareId - The share ID to remove
   * @param userId - Optional user ID making the request (for permission check)
   */
  async removeTemplateShare(
    templateId: string,
    shareId: string,
    userId?: string,
  ): Promise<void> {
    const params: Record<string, unknown> = {}
    if (userId)
      params.user_id = userId

    await this.http.delete(
      `/sequences/templates/${encodeURIComponent(templateId)}/shares/${encodeURIComponent(shareId)}`,
      { params },
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

  /**
   * Fetch execution histories for multiple executions in a single request.
   *
   * Returns full execution details including step history and events for up to 100
   * execution IDs. Missing or unauthorized executions are returned as null with
   * an error message.
   *
   * @param request - The batch request with execution IDs and include options
   */
  async batchGetExecutions(
    request: BatchExecutionRequest,
  ): Promise<BatchExecutionResponse> {
    return this.http.post<BatchExecutionResponse>(
      '/sequences/executions/batch',
      request,
    )
  }

  /**
   * Derive engagement status for multiple executions in a single request.
   *
   * This is a lightweight endpoint that computes engagement status server-side
   * without returning full execution histories. Ideal for filtering and UI display.
   *
   * Engagement statuses:
   * - connection_pending: Connection request sent, awaiting acceptance
   * - connection_accepted: They accepted the connection
   * - message_sent: Follow-up message delivered
   * - awaiting_reply: Waiting for their response
   * - replied: They replied (no sentiment)
   * - replied_positive/negative/neutral: Reply with sentiment
   * - no_response: No response after 7+ days
   * - sequence_active: Still running
   * - sequence_failed: Error occurred
   * - unknown: Unable to determine status
   *
   * @param request - The request with up to 500 execution IDs
   */
  async getEngagementStatus(
    request: EngagementStatusRequest,
  ): Promise<EngagementStatusResponse> {
    return this.http.post<EngagementStatusResponse>(
      '/sequences/executions/engagement-status',
      request,
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

  // ==================== Outcome Recording ====================

  /**
   * Record an outcome and complete an execution.
   * @param executionId - The execution ID to complete
   * @param request - The outcome and optional notes
   * @param userId - User ID or email recording the outcome
   */
  async completeExecution(
    executionId: string,
    request: CompleteExecutionRequest,
    userId: string,
  ): Promise<CompleteExecutionResponse> {
    return this.http.post<CompleteExecutionResponse>(
      `/sequences/executions/${encodeURIComponent(executionId)}/complete`,
      request,
      { params: { user_id: userId } },
    )
  }

  /**
   * Record outcome and complete multiple executions.
   * @param request - The execution IDs, outcome, and optional notes
   * @param userId - User ID or email recording the outcomes
   */
  async bulkCompleteExecutions(
    request: BulkCompleteRequest,
    userId: string,
  ): Promise<BulkCompleteResponse> {
    return this.http.post<BulkCompleteResponse>(
      '/sequences/executions/bulk/complete',
      request,
      { params: { user_id: userId } },
    )
  }

  // ==================== Rate Limits ====================

  /**
   * Get current rate limit status for all actions.
   * @param userId - User ID or email to check rate limits for
   */
  async getRateLimitStatus(userId: string): Promise<RateLimitStatusResponse> {
    return this.http.get<RateLimitStatusResponse>(
      '/sequences/rate-limits/status',
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
    if (options?.channel)
      params.channel = options.channel
    if (options?.action)
      params.action = options.action
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
   * Skip a step without canceling the execution.
   * Advances to the next step in the sequence, or completes if no more steps.
   */
  async skipStep(
    stepExecutionId: string,
    userId: string,
    options?: SkipStepRequest,
  ): Promise<SkipStepResponse> {
    return this.http.post<SkipStepResponse>(
      `/sequences/approvals/${encodeURIComponent(stepExecutionId)}/skip`,
      options ?? {},
      { params: { user_id: userId } },
    )
  }

  /**
   * Bulk approve, reject, or skip multiple steps.
   * Use request.action to specify the operation (defaults to 'approve').
   */
  async bulkApprovalAction(
    request: BulkApprovalRequest,
    userId: string,
  ): Promise<BulkApprovalResponse> {
    return this.http.post<BulkApprovalResponse>(
      '/sequences/approvals/bulk',
      request,
      { params: { user_id: userId } },
    )
  }

  /**
   * Bulk approve multiple steps.
   * @deprecated Use bulkApprovalAction with action='approve' instead.
   */
  async bulkApprove(
    request: BulkApprovalRequest,
    userId: string,
  ): Promise<BulkApprovalResponse> {
    return this.bulkApprovalAction({ ...request, action: 'approve' }, userId)
  }

  // ==================== Step Executions Query ====================

  /**
   * List step executions with flexible filtering.
   *
   * Query step executions by status, template, project, user, channel, action,
   * and scheduled time range.
   *
   * Common use cases:
   * - Get scheduled messages: `{ status: 'scheduled' }`
   * - Get pending approvals: `{ status: 'waiting_approval' }`
   * - Get sent messages: `{ status: 'sent' }`
   * - Get multiple statuses: `{ status: ['scheduled', 'approved'] }`
   * - Get scheduled today: `{ status: 'scheduled', scheduledAfter: '2026-01-29T00:00:00Z', scheduledBefore: '2026-01-30T00:00:00Z' }`
   *
   * @param options - Filter options for querying step executions
   */
  async listStepExecutions(
    options?: ListStepExecutionsOptions,
  ): Promise<StepExecutionListResponse> {
    const params: Record<string, unknown> = {}
    if (options?.status) {
      params.status = Array.isArray(options.status)
        ? options.status
        : [options.status]
    }
    if (options?.templateId)
      params.template_id = options.templateId
    if (options?.projectId)
      params.project_id = options.projectId
    if (options?.userId)
      params.user_id = options.userId
    if (options?.channel)
      params.channel = options.channel
    if (options?.action)
      params.action = options.action
    if (options?.scheduledAfter)
      params.scheduled_after = options.scheduledAfter
    if (options?.scheduledBefore)
      params.scheduled_before = options.scheduledBefore
    if (options?.limit !== undefined)
      params.limit = options.limit
    if (options?.offset !== undefined)
      params.offset = options.offset

    return this.http.get<StepExecutionListResponse>(
      '/sequences/step-executions',
      { params },
    )
  }

  /**
   * Update a scheduled step execution's content or scheduled time.
   *
   * Only works for step executions in 'scheduled', 'approved', or 'waiting_approval' status.
   *
   * Use cases:
   * - Edit message content before sending
   * - Reschedule when a message will be sent
   *
   * @param stepExecutionId - The step execution ID to update
   * @param request - The update request with optional content and/or scheduledAt
   * @param userId - User ID or email making the update
   */
  async updateStepExecution(
    stepExecutionId: string,
    request: UpdateStepExecutionRequest,
    userId: string,
  ): Promise<UpdateStepExecutionResponse> {
    return this.http.patch<UpdateStepExecutionResponse>(
      `/sequences/step-executions/${encodeURIComponent(stepExecutionId)}`,
      request,
      { params: { user_id: userId } },
    )
  }

  // ==================== Batch Polling ====================

  /**
   * Batch poll multiple sequence data types in a single request.
   *
   * Supports fetching executions, metrics, approvals, and rate limits
   * across multiple projects efficiently.
   *
   * Limits:
   * - Max 10 requests per batch
   * - Max 20 project_ids per request item
   * - Max 100 limit per executions/approvals
   *
   * @param request - The batch poll request containing multiple request items
   * @param userId - User ID or email making the request
   */
  async batchPoll(
    request: BatchPollRequest,
    userId: string,
  ): Promise<BatchPollResponse> {
    return this.http.post<BatchPollResponse>(
      '/sequences/poll',
      request,
      { params: { user_id: userId } },
    )
  }
}
