/**
 * Campaign types for the AI Conversation Manager.
 *
 * These types map to the Python backend endpoints under /v1/campaigns and /v1/assets.
 */

// ==================== Guardrails & Settings ====================

export interface ActiveHours {
  start: number
  end: number
  timezone: string
}

export interface CampaignGuardrails {
  maxActionsPerDay?: number
  maxFollowUps?: number
  maxLikesPerDay?: number
  maxCommentsPerDay?: number
  enableReactionEngagement?: boolean
  disableLikes?: boolean
  disableComments?: boolean
  activeHours?: ActiveHours
  daysOfWeek?: number[]
  minHoursBetweenActions?: number
  connectionIgnoredDays?: number
  maxWarmupActions?: number
}

export type ApprovalMode = 'auto' | 'require'

export interface ApprovalSettings {
  smartLikeLinkedin?: ApprovalMode
  smartCommentLinkedin?: ApprovalMode
  reactionLikeLinkedin?: ApprovalMode
  reactionCommentLinkedin?: ApprovalMode
  sendConnectionLinkedin?: ApprovalMode
  sendConnectionNoteLinkedin?: ApprovalMode
  sendInitialMessageLinkedin?: ApprovalMode
  sendFollowUpLinkedin?: ApprovalMode
  sendInmailLinkedin?: ApprovalMode
  replyLinkedin?: ApprovalMode
  stop?: ApprovalMode
}

// ==================== Playbooks ====================

export interface PlaybookCreate {
  userId?: string
  name: string
  content: string
  organizationId?: string
  source?: 'manual' | 'generated' | 'cloned'
  generatedFrom?: Record<string, unknown>
  stylePreferences?: Record<string, unknown>
  examples?: Array<Record<string, unknown>>
}

export interface PlaybookUpdate {
  name?: string
  content?: string
  stylePreferences?: Record<string, unknown>
  examples?: Array<Record<string, unknown>>
  changeReason?: string
}

export interface PlaybookResponse {
  id: string
  tenantId: string
  organizationId?: string | null
  createdBy?: string | null
  name: string
  content: string
  source: string
  generatedFrom?: Record<string, unknown> | null
  stylePreferences: Record<string, unknown>
  examples: Array<Record<string, unknown>>
  version: number
  parentVersionId?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PlaybookVersionResponse {
  id: string
  playbookId: string
  version: number
  content: string
  stylePreferences: Record<string, unknown>
  examples: Array<Record<string, unknown>>
  changeReason?: string | null
  changedBy: string
  createdAt: string
}

// ==================== Campaigns ====================

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed'

export interface CampaignCreate {
  userId: string
  name: string
  playbookId: string
  playbookVersion?: number
  projectId?: string
  organizationId?: string
  goal?: string
  companyContext?: string
  guardrails?: CampaignGuardrails
  approvalSettings?: ApprovalSettings
  maxProspects?: number
}

export interface CampaignUpdate {
  name?: string
  playbookId?: string
  playbookVersion?: number
  goal?: string
  companyContext?: string
  guardrails?: CampaignGuardrails
  approvalSettings?: ApprovalSettings
  maxProspects?: number
}

export interface CampaignResponse {
  id: string
  tenantId: string
  organizationId?: string | null
  userId: string
  projectId?: string | null
  name: string
  playbookId: string
  playbookVersion: number
  goal?: string | null
  companyContext?: string | null
  guardrails: CampaignGuardrails
  status: CampaignStatus
  approvalSettings: ApprovalSettings
  maxProspects?: number | null
  startedAt?: string | null
  pausedAt?: string | null
  terminalProspectCount: number
  totalProspectCount: number
  completionReason?: string | null
  completionMetadata?: Record<string, unknown> | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface CampaignListResponse {
  items: CampaignResponse[]
}

// ==================== Prospects ====================

export type CampaignProspectState =
  | 'not_connected'
  | 'pending_connection'
  | 'connected'
  | 'messaged'
  | 'followed_up'
  | 'replied'
  | 'meeting_booked'
  | 'intro_accepted'
  | 'stopped'
  | 'snoozed'

export interface CampaignProspectInput {
  prospectId: string
  prospectExternalId?: string
  prospectData?: Record<string, unknown>
}

export interface AddProspectsRequest {
  prospects: CampaignProspectInput[]
}

export interface ProspectWarning {
  prospectId: string
  warnings: string[]
}

export interface AddProspectsResponse {
  added: number
  skipped: number
  warnings: ProspectWarning[]
}

export interface CampaignProspectResponse {
  id: string
  campaignId: string
  tenantId: string
  prospectId: string
  prospectExternalId?: string | null
  prospectData: Record<string, unknown>
  state: CampaignProspectState
  stateChangedAt: string
  lastActionAt?: string | null
  lastActionType?: string | null
  followUpCount: number
  senderAccountId?: string | null
  pendingActionId?: string | null
  previousState?: string | null
  snoozedUntil?: string | null
  nextEvaluateAt?: string | null
  stopReason?: string | null
  stopReasoning?: string | null
  metadata: Record<string, unknown>
  version: number
  createdAt: string
  updatedAt: string
}

// ==================== Actions ====================

export type CampaignActionType =
  | 'smart_like_linkedin'
  | 'smart_comment_linkedin'
  | 'reaction_like_linkedin'
  | 'reaction_comment_linkedin'
  | 'send_connection_linkedin'
  | 'send_connection_note_linkedin'
  | 'send_initial_message_linkedin'
  | 'send_follow_up_linkedin'
  | 'send_inmail_linkedin'
  | 'reply_linkedin'
  | 'meeting_booked'
  | 'intro_accepted'
  | 'wait'
  | 'stop'

export type CampaignActionStatus =
  | 'pending_approval'
  | 'approved'
  | 'edited'
  | 'skipped'
  | 'auto_approved'
  | 'queued'
  | 'executed'
  | 'failed'
  | 'cancelled'
  | 'cancelled_by_pause'
  | 'paused'

export interface CampaignActionResponse {
  id: string
  tenantId: string
  campaignId: string
  prospectId: string
  playbookId: string
  playbookVersion: number
  senderAccountId?: string | null
  actionType: CampaignActionType
  status: CampaignActionStatus
  content?: string | null
  originalContent?: string | null
  agentReasoning?: string | null
  routerOutput?: Record<string, unknown> | null
  generatorMetadata?: Record<string, unknown> | null
  prospectStateAt?: Record<string, unknown> | null
  outcome?: Record<string, unknown> | null
  queuedAt: string
  decidedAt?: string | null
  executedAt?: string | null
  outcomeRecordedAt?: string | null
  approvedBy?: string | null
  approvalNotes?: string | null
  rejectedBy?: string | null
  rejectionReason?: string | null
  draftId?: string | null
  outreachQueueId?: string | null
  priority: number
  sourceMessageId?: string | null
  createdAt: string
  updatedAt: string
}

export interface CampaignProspectDetailResponse {
  prospect: CampaignProspectResponse
  actions: CampaignActionResponse[]
  pendingAction?: CampaignActionResponse | null
}

export interface CampaignActionListResponse {
  items: CampaignActionResponse[]
}

// ==================== Approvals ====================

export interface ApprovalActionRequest {
  userId: string
  notes?: string
  modifiedContent?: string
  modifiedSubject?: string
}

export interface RejectActionRequest {
  userId: string
  reason: string
}

export interface SkipActionRequest {
  userId: string
  reason?: string
}

export type CampaignBulkApprovalAction = 'approve' | 'reject' | 'skip'

export interface CampaignBulkApprovalItem {
  actionId: string
  action: CampaignBulkApprovalAction
  notes?: string
  reason?: string
  modifiedContent?: string
  modifiedSubject?: string
}

export interface CampaignBulkApprovalRequest {
  userId: string
  items: CampaignBulkApprovalItem[]
}

export interface CampaignBulkApprovalResult {
  actionId: string
  success: boolean
  error?: string | null
}

export interface CampaignBulkApprovalResponse {
  results: CampaignBulkApprovalResult[]
}

// ==================== Queued Action Management ====================

export interface CancelQueuedRequest {
  userId: string
  reason?: string
}

export interface EditQueuedRequest {
  userId: string
  content: string
  subject?: string
}

export interface PauseResumeQueuedRequest {
  userId: string
}

// ==================== Outcome Recording ====================

export type CampaignOutcomeType = 'meeting_booked' | 'intro_accepted' | 'not_interested' | 'other'

export interface RecordOutcomeRequest {
  userId: string
  outcome: CampaignOutcomeType
  notes?: string
}

// ==================== Metrics ====================

export interface FunnelStage {
  count: number
  /** count / total_prospects as a ratio (0.0 – 1.0) */
  rate: number
}

export interface StoppedBreakdown {
  total: number
  byReason: Record<string, number>
}

export interface CampaignMetricsResponse {
  totalProspects: number
  funnel: Record<string, FunnelStage>
  stopped: StoppedBreakdown
  pendingApproval: number
  actionSummary: Record<string, number>
  actionTypes: Record<string, Record<string, number>>
}

// ==================== Outreach Assets ====================

export type OutreachAssetType = 'link' | 'text' | 'file'

export interface OutreachAssetCreate {
  userId: string
  name: string
  key: string
  type?: OutreachAssetType
  value: string
}

export interface OutreachAssetUpdate {
  userId: string
  name?: string
  value?: string
  isActive?: boolean
}

export interface OutreachAssetResponse {
  id: string
  tenantId: string
  userId: string
  createdBy?: string | null
  name: string
  key: string
  type: string
  value: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LinkAssetsRequest {
  assetIds: string[]
}

export interface LinkedAssetsResponse {
  items: OutreachAssetResponse[]
}

// ==================== List/Filter Options ====================

export interface ListPlaybooksOptions {
  userId?: string
  activeOnly?: boolean
}

export interface ListCampaignsOptions {
  userId?: string
  projectId?: string
  status?: CampaignStatus
}

export interface ListCampaignProspectsOptions {
  state?: CampaignProspectState
  limit?: number
  offset?: number
}

export interface ListCampaignActionsOptions {
  status?: CampaignActionStatus
  actionType?: CampaignActionType
  prospectId?: string
  limit?: number
  offset?: number
}

export interface ListPendingApprovalsOptions {
  campaignId?: string
  limit?: number
  offset?: number
}

export interface ListAssetsOptions {
  activeOnly?: boolean
  userId: string
  campaignId?: string
}

// ==================== Playbook Generation ====================

export interface PlaybookGenerateRequest {
  userId: string
  playbookId?: string
  companyContext?: string
  context?: string
  historyMonths?: number
  modelName?: string
  maxChats?: number
  playbookName?: string
}

export interface PlaybookGenerateJobResponse {
  jobId: string
  status: string
  pollUrl: string
  message: string
}

export interface PlaybookGenerateJobStatusResponse {
  jobId: string
  status: string
  stage?: string | null
  progress?: Record<string, unknown> | null
  playbookId?: string | null
  playbook?: PlaybookResponse | null
  errorMessage?: string | null
  createdAt: string
  completedAt?: string | null
}
