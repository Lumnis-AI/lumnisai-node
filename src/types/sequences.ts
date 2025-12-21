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

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface ScheduleConfig {
  sendWindowStart?: string // "09:00" format (24h)
  sendWindowEnd?: string // "17:00" format (24h)
  sendDays?: DayOfWeek[]
  timezone?: string // IANA timezone, e.g., "America/New_York"
}

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
  scheduleConfig?: ScheduleConfig
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
  // Failure events
  | 'step_failed'
  // Manual events
  | 'manual_advance'
  | 'manual_exit'

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

export interface SequenceTemplateCreate {
  name: string
  description?: string
  useCase?: string
  steps: StepConfig[]
  transitions: TransitionConfig[]
}

export interface SequenceTemplateUpdate {
  name?: string
  description?: string
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
  createdAt: string
  updatedAt: string
}

// ==================== Execution Types ====================

export interface ProspectInput {
  prospectId: string
  prospectExternalId?: string
  context?: Record<string, unknown>
}

export type ExecutionMode = 'live' | 'dry_run' | 'preview'

export interface StartExecutionRequest {
  templateId: string
  prospects: ProspectInput[]
  projectId?: string
  stepOverrides?: Record<string, unknown>
  executionMode?: ExecutionMode
}

export interface StartExecutionResponse {
  started: number
  executionIds: string[]
  templateId: string
  projectId?: string
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
  status: string
  sentAt?: string
  completedAt?: string
  actualContent?: string
}

export interface ExecutionEvent {
  eventType: string
  eventData: Record<string, unknown>
  createdAt: string
}

export interface ExecutionDetailResponse extends ExecutionSummary {
  currentStep?: {
    stepKey: string
    name: string
  }
  stepHistory: StepHistoryEntry[]
  events: ExecutionEvent[]
}

export interface ExecutionListResponse {
  executions: ExecutionSummary[]
  limit: number
  offset: number
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
  executionIds?: string[]
  reason?: string
}

export interface BulkOperationResponse {
  status: string
  affectedCount: number
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

export type ApprovalStatus = 'approved' | 'rejected'

export interface ApprovalResponse {
  status: ApprovalStatus
}

export interface BulkApprovalRequest {
  stepExecutionIds: string[]
}

export interface BulkApprovalError {
  stepExecutionId: string
  error: string
}

export interface BulkApprovalResponse {
  approved: number
  errors: BulkApprovalError[]
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

// ==================== List/Filter Options ====================

export interface ListTemplatesOptions {
  useCase?: string
  includeSystem?: boolean
  includeArchived?: boolean
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
  limit?: number
  offset?: number
}
