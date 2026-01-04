/**
 * Sequences types for automated multi-step outreach campaigns.
 */

// ==================== Step & Transition Configuration ====================

export type SequenceChannel = 'linkedin' | 'email'

export type LinkedInAction =
  | 'connection_request'
  | 'message'
  | 'inmail'
  | 'view_profile'
  | 'like_post'
  | 'comment_post'

export type EmailAction = 'send'

export type SequenceAction = LinkedInAction | EmailAction

export type ContentSource = 'template' | 'ai_generate' | 'ai_enhance' | 'none'

export type OnFailure = 'fail' | 'skip' | 'retry'

export interface StepConfig {
  stepKey: string
  name: string
  description?: string
  channel: SequenceChannel
  action: SequenceAction
  contentSource?: ContentSource
  contentTemplate?: string
  aiInstructions?: string
  requiresApproval?: boolean
  aiPrecheck?: boolean
  aiPrecheckInstructions?: string
  actionConfig?: Record<string, unknown>
  onFailure?: OnFailure
  maxRetries?: number
  uiPositionX?: number
  uiPositionY?: number
}

export type ReplySentiment = 'positive' | 'negative' | 'neutral' | 'objection' | 'ooo'

/**
 * Valid event types that can trigger transitions in a sequence.
 */
export type SequenceEventType =
  // Timing events
  | 'step_completed' // Step finished executing
  | 'delay_elapsed' // Wait period finished
  // Response events (use event_params.sentiment for sentiment-based branching)
  | 'reply_received' // Any reply received
  // LinkedIn events
  | 'connection_accepted'
  | 'connection_ignored' // No response after X days
  | 'inmail_accepted'
  | 'profile_viewed_back'
  // Email events
  | 'email_opened'
  | 'email_clicked'
  | 'email_bounced'
  // Outcome events
  | 'meeting_booked'
  | 'opted_out'
  | 'outcome_recorded' // Manual outcome recording
  // Failure events
  | 'step_failed'
  // Manual events
  | 'manual_advance'
  | 'manual_exit'
  | 'step_skipped' // Step skipped by user

/**
 * Valid sequence event types as a readonly array for validation purposes.
 */
export const VALID_EVENT_TYPES: readonly SequenceEventType[] = [
  'step_completed',
  'delay_elapsed',
  'reply_received',
  'connection_accepted',
  'connection_ignored',
  'inmail_accepted',
  'profile_viewed_back',
  'email_opened',
  'email_clicked',
  'email_bounced',
  'meeting_booked',
  'opted_out',
  'outcome_recorded',
  'step_failed',
  'manual_advance',
  'manual_exit',
  'step_skipped',
] as const

export interface TransitionEventParams {
  sentiment?: ReplySentiment
  daysWaiting?: number
  minDelayDays?: number
  [key: string]: unknown
}

export type TransitionConditionType =
  | 'no_reply'
  | 'has_email'
  | 'is_connected'
  | 'prospect_field'

export type TransitionConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'exists'
  | 'not_exists'
  | 'gt'
  | 'lt'
  | 'contains'
  | 'in'

export interface TransitionCondition {
  type: TransitionConditionType
  field?: string
  operator?: TransitionConditionOperator
  value?: unknown
}

export interface TransitionConfig {
  fromStepKey?: string | null
  toStepKey?: string | null
  eventType: SequenceEventType
  eventParams?: TransitionEventParams
  conditions?: TransitionCondition[]
  priority?: number
  delayDays?: number
  delayHours?: number
  exitReason?: string
  uiLabel?: string
}

// ==================== Template Types ====================

export enum SharePermission {
  VIEW = 'view',
  USE = 'use',
  EDIT = 'edit',
}

export interface TemplateShareConfig {
  userId?: string | null
  permission: SharePermission
}

export interface SequenceTemplateCreate {
  name: string
  description?: string
  useCase?: string
  steps: StepConfig[]
  transitions: TransitionConfig[]
  shareWithTenant?: boolean
  shareWith?: TemplateShareConfig[]
}

export interface SequenceTemplateUpdate {
  name?: string
  description?: string
  useCase?: string
  steps?: StepConfig[]
  transitions?: TransitionConfig[]
}

export interface SequenceTemplateResponse {
  id: string
  name: string
  description?: string
  useCase?: string
  version: number
  isArchived: boolean
  steps: StepConfig[]
  transitions: TransitionConfig[]
  timesUsed: number
  avgReplyRate?: number
  createdBy?: string | null
  created_by_email?: string | null
  isOwner?: boolean
  isTenantWide?: boolean
  userPermission?: string | null
  createdAt: string
  updatedAt: string
}

// ==================== Execution Types ====================

export interface ProspectInput {
  prospectId: string
  prospectExternalId?: string
  context?: Record<string, unknown>
}

export interface StartExecutionRequest {
  templateId: string
  prospects: ProspectInput[]
  projectId?: string
  stepOverrides?: Record<string, unknown>
  replaceExisting?: boolean
}

export interface SkippedProspect {
  prospectId: string
  prospectExternalId?: string | null
  reason: string
  existingExecutionId?: string | null
  existingStatus?: string | null
}

export interface StartExecutionResponse {
  started: number
  executionIds: string[]
  templateId: string
  projectId?: string
  skipped?: SkippedProspect[]
  skippedCount?: number
}

export type ExecutionStatus =
  | 'queued'
  | 'processing'
  | 'active'
  | 'waiting_delay'
  | 'waiting_event'
  | 'waiting_approval'
  | 'paused'
  | 'completed'
  | 'exited'
  | 'cancelled'
  | 'failed'

export type StepExecutionStatus =
  | 'pending'
  | 'scheduled'
  | 'waiting_approval'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'replied'
  | 'accepted'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'

export interface ExecutionSummary {
  id: string
  templateId: string
  templateName: string
  prospectId: string
  prospectExternalId?: string
  projectId?: string
  status: ExecutionStatus
  currentStepKey?: string
  startedAt?: string
  createdAt: string
}

export interface StepHistoryEntry {
  stepKey: string
  stepName?: string
  action?: string
  status: string
  scheduledAt?: string
  startedAt?: string
  sentAt?: string
  completedAt?: string
  actualChannel?: string
  actualAction?: string
  actualContent?: string
  errorMessage?: string
  replyReceivedAt?: string
  replyContent?: string
  replySentiment?: ReplySentiment
}

export interface ExecutionEventData {
  sentiment?: ReplySentiment
  messageContent?: string
  messagePreview?: string
  skipped?: boolean
  reason?: string
  notes?: string
  atStepKey?: string
  [key: string]: unknown
}

export interface ExecutionEvent {
  eventType: string
  eventData?: ExecutionEventData
  createdAt: string
  processingStatus?: string
}

export interface ExecutionDetailResponse extends ExecutionSummary {
  currentStep?: {
    stepKey: string
    name: string
  }
  completedAt?: string
  exitReason?: string
  pausedAt?: string
  pauseReason?: string
  lastError?: string
  errorCount?: number
  stepHistory: StepHistoryEntry[]
  events: ExecutionEvent[]
}

export interface ExecutionListResponse {
  executions: ExecutionSummary[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface StepMetric {
  stepKey: string
  sent: number
  delivered: number
  replied: number
  accepted: number
}

export interface ExecutionMetricsResponse {
  filters: {
    templateId?: string
    projectId?: string
  }
  total: number
  statusCounts: Record<string, number>
  stepMetrics: StepMetric[]
  funnel: {
    total: number
    active: number
    completed: number
    failed: number
  }
}

// ==================== Lifecycle Types ====================

export interface LifecycleOperationRequest {
  reason?: string
}

export interface LifecycleOperationResponse {
  status: string
  message: string
}

export interface BulkOperationRequest {
  templateId?: string
  projectId?: string
  projectIds?: string[]
  executionIds?: string[]
  reason?: string
  dryRun?: boolean
}

export interface BulkOperationResponse {
  status: string
  affectedCount: number
  failedCount?: number
  failedIds?: string[]
  errors?: Record<string, string>
  isDryRun?: boolean
}

// ==================== Approval Types ====================

export interface ApprovalItem {
  stepExecutionId: string
  executionId: string
  templateId: string
  projectId?: string
  prospectExternalId?: string
  stepName: string
  channel: string
  action: string
  content?: string
  aiPrecheckResult?: string
  aiPrecheckReason?: string
  createdAt: string
}

export interface ApprovalListResponse {
  approvals: ApprovalItem[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface ApproveStepRequest {
  notes?: string
  modifiedContent?: string
}

export interface RejectStepRequest {
  reason: string
}

export interface SkipStepRequest {
  reason?: string
}

export interface SkipStepResponse {
  success: boolean
  stepExecutionId: string
  previousStepKey: string
  previousStatus: string
  executionId: string
  executionStatus: string
  nextStepKey?: string
  nextStepAt?: string
}

export type ApprovalStatus = 'approved' | 'rejected'

export interface ApprovalResponse {
  status: ApprovalStatus
}

export type BulkApprovalAction = 'approve' | 'reject' | 'skip'

export interface BulkApprovalRequest {
  stepExecutionIds: string[]
  action?: BulkApprovalAction
  reason?: string
}

export interface BulkApprovalFailure {
  id: string
  error: string
}

export interface BulkApprovalResponse {
  succeeded: string[]
  failed: BulkApprovalFailure[]
  totalSucceeded: number
  totalFailed: number
}

// ==================== Outcome Recording ====================

export type OutcomeType =
  | 'meeting_booked'
  | 'interested'
  | 'hired'
  | 'not_interested'
  | 'other'

export interface CompleteExecutionRequest {
  outcome: OutcomeType
  notes?: string
}

export interface CompleteExecutionResponse {
  success: boolean
  executionId: string
  finalStatus: string
  exitReason: string
  completedAt: string
}

export interface BulkCompleteRequest {
  executionIds: string[]
  outcome: OutcomeType
  notes?: string
}

export interface BulkCompleteFailure {
  id: string
  error: string
}

export interface BulkCompleteResponse {
  succeeded: string[]
  failed: BulkCompleteFailure[]
  totalSucceeded: number
  totalFailed: number
}

// ==================== Rate Limit Status ====================

export interface ActionLimit {
  used: number
  limit: number
  remaining: number
  resetsAt: string
}

export interface RateLimitStatusResponse {
  linkedin: Record<string, ActionLimit>
  email: Record<string, ActionLimit>
}

// ==================== Template Management ====================

export interface DuplicateTemplateRequest {
  name: string
  share_with_tenant?: boolean
}

// ==================== Validation Types ====================

export interface ValidationIssue {
  stepKey?: string
  field?: string
  message: string
  suggestion?: string
}

export interface ValidationResponse {
  isValid: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

// ==================== Template Sharing Types ====================

export interface TemplateShareRequest {
  shareWithTenant?: boolean | null
  addUsers?: TemplateShareConfig[]
  removeUsers?: string[]
}

export interface TemplateShareInfo {
  id: string
  userId?: string | null
  userEmail?: string | null
  permission: string
  sharedBy?: string | null
  createdAt: string
}

export interface TemplateSharesResponse {
  templateId: string
  isTenantWide: boolean
  shares: TemplateShareInfo[]
}

// ==================== List/Filter Options ====================

export interface ListTemplatesOptions {
  userId?: string
  useCase?: string
  includeSystem?: boolean
  includeArchived?: boolean
  ownedOnly?: boolean
}

export interface ListExecutionsOptions {
  templateId?: string
  projectId?: string
  status?: ExecutionStatus
  limit?: number
  offset?: number
}

export interface ExecutionMetricsOptions {
  templateId?: string
  projectId?: string
}

export interface ListApprovalsOptions {
  templateId?: string
  projectId?: string
  channel?: SequenceChannel
  action?: SequenceAction
  limit?: number
  offset?: number
}

// ==================== Batch Polling ====================

export type BatchRequestType = 'executions' | 'metrics' | 'approvals' | 'rate_limits'

export interface ExecutionsParams {
  projectIds: string[]
  status?: ExecutionStatus
  limit?: number
  includeProspectDetails?: boolean
}

export interface MetricsParams {
  projectIds: string[]
}

export interface ApprovalsParams {
  projectIds: string[]
  limit?: number
  includeContent?: boolean
}

export interface RateLimitsParams {
  channels?: string[]
}

export interface ExecutionsRequestItem {
  id: string
  type: 'executions'
  params: ExecutionsParams
}

export interface MetricsRequestItem {
  id: string
  type: 'metrics'
  params: MetricsParams
}

export interface ApprovalsRequestItem {
  id: string
  type: 'approvals'
  params: ApprovalsParams
}

export interface RateLimitsRequestItem {
  id: string
  type: 'rate_limits'
  params?: RateLimitsParams
}

export type BatchRequestItem =
  | ExecutionsRequestItem
  | MetricsRequestItem
  | ApprovalsRequestItem
  | RateLimitsRequestItem

export interface BatchPollRequest {
  requests: BatchRequestItem[]
}

// Batch Polling Response Types

export interface ExecutionSummaryExtended {
  id: string
  templateId: string
  templateName: string
  prospectId: string
  prospectExternalId?: string
  prospectName?: string
  prospectTitle?: string
  projectId?: string
  status: string
  currentStepKey?: string
  currentStepName?: string
  currentStepStatus?: string
  nextTransitionAt?: string
  startedAt?: string
  createdAt: string
}

export interface ProjectExecutionsData {
  executions: ExecutionSummaryExtended[]
  total: number
  hasMore: boolean
}

export interface BatchStepMetric {
  stepKey: string
  stepName: string
  sent: number
  delivered: number
  replied: number
  accepted: number
  pending: number
}

export interface ProjectMetricsData {
  total: number
  statusCounts: Record<string, number>
  replied: number
  stepMetrics: BatchStepMetric[]
  funnel: Record<string, number>
}

export interface PendingApprovalExtended {
  stepExecutionId: string
  executionId: string
  templateId: string
  projectId?: string
  prospectId: string
  prospectExternalId?: string
  prospectName?: string
  prospectTitle?: string
  prospectCompany?: string
  stepName: string
  channel: string
  action: string
  content?: string
  aiPrecheckResult?: string
  aiPrecheckReason?: string
  createdAt: string
}

export interface ProjectApprovalsData {
  approvals: PendingApprovalExtended[]
  total: number
  hasMore: boolean
}

export interface RateLimitInfo {
  used: number
  limit: number
  resetsAt: string
}

export interface RateLimitData {
  linkedin: Record<string, RateLimitInfo>
  email: Record<string, RateLimitInfo>
}

export interface ExecutionsResponseItem {
  id: string
  type: 'executions'
  data: Record<string, ProjectExecutionsData>
}

export interface MetricsResponseItem {
  id: string
  type: 'metrics'
  data: Record<string, ProjectMetricsData>
}

export interface ApprovalsResponseItem {
  id: string
  type: 'approvals'
  data: Record<string, ProjectApprovalsData>
}

export interface RateLimitsResponseItem {
  id: string
  type: 'rate_limits'
  data: RateLimitData
}

export interface ErrorDetail {
  code: string
  message: string
  requestType: string
}

export interface ErrorResponseItem {
  id: string
  type: 'error'
  error: ErrorDetail
}

export type BatchResponseItem =
  | ExecutionsResponseItem
  | MetricsResponseItem
  | ApprovalsResponseItem
  | RateLimitsResponseItem
  | ErrorResponseItem

export interface BatchPollResponse {
  responses: BatchResponseItem[]
  polledAt: string
}
