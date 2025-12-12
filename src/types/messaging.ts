// Messaging API types

/**
 * Channel types for messaging
 */
export enum ChannelType {
  GMAIL = 'gmail',
  OUTLOOK = 'outlook',
  LINKEDIN = 'linkedin',
}

/**
 * Outreach methods for LinkedIn
 */
export enum OutreachMethod {
  CONNECTION_REQUEST = 'connection_request',
  DIRECT_MESSAGE = 'direct_message',
  INMAIL = 'inmail',
  INMAIL_ESCALATION = 'inmail_escalation',
  EMAIL = 'email',
}

/**
 * Conversation status types
 */
export enum ConversationStatus {
  ACTIVE = 'active',
  NEEDS_RESPONSE = 'needs_response',
  WAITING = 'waiting',
  BOOKED = 'booked',
  CLOSED = 'closed',
}

/**
 * Message types in a conversation
 */
export enum MessageType {
  MESSAGE = 'message',
  CONNECTION_REQUEST = 'connection_request',
  CONNECTION_ACCEPTED = 'connection_accepted',
  INMAIL = 'inmail',
}

/**
 * Draft status types
 */
export enum DraftStatus {
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  DISCARDED = 'discarded',
}

/**
 * Sync job status types
 */
export enum SyncJobStatus {
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Batch job status types (for batch draft jobs)
 */
export enum BatchJobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Queue item status types
 */
export enum QueueItemStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * LinkedIn subscription types
 */
export enum LinkedInSubscriptionType {
  BASIC = 'basic',
  PREMIUM = 'premium', // Career Premium - 5 InMails/month
  SALES_NAVIGATOR = 'sales_navigator',
  RECRUITER_LITE = 'recruiter_lite',
  RECRUITER_CORPORATE = 'recruiter_corporate',
}

/**
 * InMail subscription types for explicit subscription selection when sending InMails.
 * Use null or omit to auto-select based on available credits.
 */
export type InmailSubscription = 'sales_navigator' | 'recruiter_lite' | 'recruiter_corporate' | 'premium'

/**
 * LinkedIn network distance values
 */
export enum NetworkDistance {
  FIRST_DEGREE = 'FIRST_DEGREE',
  SECOND_DEGREE = 'SECOND_DEGREE',
  THIRD_DEGREE = 'THIRD_DEGREE',
  OUT_OF_NETWORK = 'OUT_OF_NETWORK',
}

// Request Models

/**
 * Prospect identifier for sync operations
 */
export interface ProspectSyncIdentifier {
  prospectId?: string | null // External ID from frontend
  email?: string | null // Email address for Gmail/Outlook
  linkedinUrl?: string | null // LinkedIn profile URL
  providerId?: string | null // LinkedIn provider ID
}

/**
 * Request to sync conversations for specific prospects.
 *
 * Prospects list is required - syncs only conversations for the specified prospects.
 * This ensures efficient, targeted syncing without pulling unrelated inbox data.
 */
export interface SyncRequest {
  channels?: string[] | null
  /** List of prospects to sync (required). Must include at least one prospect with an identifier. */
  prospects: ProspectSyncIdentifier[]
}

/**
 * Request to sync a single prospect
 */
export interface SyncProspectRequest {
  email?: string | null
  linkedinUrl?: string | null
  providerId?: string | null
  channel?: string | null // Specific channel to sync ('gmail', 'outlook', 'linkedin')
}

/**
 * Request to check LinkedIn connection
 */
export interface CheckLinkedInConnectionRequest {
  linkedinUrl?: string | null
  providerId?: string | null
}

/**
 * Request to send LinkedIn outreach
 */
export interface LinkedInSendRequest {
  prospectProviderId?: string | null
  prospectLinkedInUrl?: string | null
  prospectName: string
  content: string
  isPriority?: boolean
  enableEscalation?: boolean
  escalationDays?: number // 1-30
  projectId?: string | null
  prospectExternalId?: string | null
  organizationId?: string | null // Frontend organization ID for multi-org support
}

/**
 * Request to send a message
 */
export interface SendMessageRequest {
  channel: string
  recipientId: string
  content: string
  conversationId?: string | null
  subject?: string | null
  recipientName?: string | null
  projectId?: string | null
  prospectExternalId?: string | null
  organizationId?: string | null // Frontend organization ID for multi-org support
}

/**
 * Request to reply to a conversation
 */
export interface SendReplyRequest {
  content: string
  organizationId?: string | null // Frontend organization ID for multi-org support
}

/**
 * Prospect connection check for batch operations
 */
export interface ProspectConnectionCheck {
  prospectId: string
  linkedinUrl?: string | null
  providerId?: string | null
}

/**
 * Request to batch check LinkedIn connections
 */
export interface BatchCheckConnectionRequest {
  prospects: ProspectConnectionCheck[]
}

/**
 * Request to create a draft
 */
export interface CreateDraftRequest {
  channel: string
  content: string
  recipientEmail?: string | null
  recipientLinkedinUrl?: string | null
  recipientProviderId?: string | null
  recipientName?: string | null
  conversationId?: string | null
  projectId?: string | null
  prospectExternalId?: string | null
  subject?: string | null
  isPriority?: boolean
  outreachMethod?: string | null
  organizationId?: string | null // Frontend organization ID for multi-org support
  /**
   * Explicit InMail subscription to use for sending (LinkedIn InMail only).
   * - 'sales_navigator': Use Sales Navigator InMail credits
   * - 'recruiter_lite': Use Recruiter Lite InMail credits
   * - 'recruiter_corporate': Use Recruiter Corporate InMail credits
   * - 'premium': Use Premium/Career InMail credits
   * - null/undefined: Auto-select subscription with available credits (default)
   */
  inmailSubscription?: InmailSubscription | null
}

/**
 * Request to update a draft
 */
export interface UpdateDraftRequest {
  content?: string | null
  subject?: string | null
  status?: string | null
  /**
   * Override outreach method (LinkedIn only).
   * Valid values: 'connection_request' | 'direct_message' | 'inmail' | 'inmail_escalation'
   */
  outreachMethod?: OutreachMethod | null
  /**
   * Explicit InMail subscription to use for sending (LinkedIn InMail only).
   * - 'sales_navigator': Use Sales Navigator InMail credits
   * - 'recruiter_lite': Use Recruiter Lite InMail credits
   * - 'recruiter_corporate': Use Recruiter Corporate InMail credits
   * - 'premium': Use Premium/Career InMail credits
   * - null/undefined: Auto-select subscription with available credits (default)
   */
  inmailSubscription?: InmailSubscription | null
}

/**
 * Prospect info for batch draft creation
 */
export interface ProspectInfo {
  externalId: string
  name: string
  email?: string | null
  linkedinUrl?: string | null
  providerId?: string | null
  currentTitle?: string | null
  currentCompany?: string | null
  isPriority?: boolean
  selectedChannel?: string | null
  /** Outreach method to use for this prospect */
  outreachMethod?: 'direct_message' | 'connection_request' | 'inmail' | 'email' | null
  /** Whether the user is already connected to this prospect on LinkedIn */
  isConnected?: boolean | null
  /**
   * Override batch-level usePriorContact setting for this prospect.
   * - `true`: Check for prior contact and include in AI context
   * - `false`: Don't check for prior contact
   * - `null`/`undefined`: Use batch-level setting
   */
  usePriorContact?: boolean | null
  /**
   * Override/extend batch-level aiContext for this prospect.
   * Merged with batch context (prospect keys take precedence).
   */
  aiContext?: Record<string, any> | null
  /**
   * Queue priority (0-10). Higher = processed first when rate limited.
   * @default 0
   */
  priority?: number
  /**
   * Explicit InMail subscription to use for this prospect (LinkedIn InMail only).
   * Overrides batch-level auto-selection when outreachMethod is 'inmail'.
   * - 'sales_navigator': Use Sales Navigator InMail credits
   * - 'recruiter_lite': Use Recruiter Lite InMail credits
   * - 'recruiter_corporate': Use Recruiter Corporate InMail credits
   * - 'premium': Use Premium/Career InMail credits
   * - null/undefined: Auto-select subscription with available credits (default)
   */
  inmailSubscription?: InmailSubscription | null
}

/**
 * Request to create batch drafts
 */
export interface BatchDraftRequest {
  prospects: ProspectInfo[]
  projectId: string
  /** Default channel if not specified per prospect */
  channel: string
  subjectTemplate?: string | null
  contentTemplate?: string | null
  useAiGeneration?: boolean
  /**
   * If true and useAiGeneration=true, check for prior contact with each prospect
   * and include conversation history in AI context for more personalized messages.
   * Can be overridden per-prospect via ProspectInfo.usePriorContact.
   * @default true
   */
  usePriorContact?: boolean
  aiContext?: Record<string, any> | null
  organizationId?: string | null // Frontend organization ID for multi-org support
}

/**
 * Per-draft override options for batch send.
 */
export interface DraftSendOverride {
  /** Draft ID to apply override to */
  draftId: string

  /**
   * If true, send connection request without personalized note (empty content).
   * Only applies to LinkedIn connection requests.
   */
  skipNote?: boolean

  /**
   * Override the outreach method (e.g., switch to InMail).
   * Valid values: 'connection_request' | 'direct_message' | 'inmail' | 'inmail_escalation'
   * Note: Only applies to LinkedIn drafts.
   */
  outreachMethod?: OutreachMethod

  /**
   * Override the InMail subscription for this draft (LinkedIn InMail only).
   * - 'sales_navigator': Use Sales Navigator InMail credits
   * - 'recruiter_lite': Use Recruiter Lite InMail credits
   * - 'recruiter_corporate': Use Recruiter Corporate InMail credits
   * - 'premium': Use Premium/Career InMail credits
   * - null: Clear any previous selection and auto-select
   */
  inmailSubscription?: InmailSubscription | null
}

/**
 * Request to batch send drafts with optional rate limiting and queue priority.
 */
export interface BatchSendRequest {
  draftIds: string[]
  /**
   * Daily send limit (1-100). If not provided, uses subscription-based limits for LinkedIn.
   */
  sendRatePerDay?: number | null
  /**
   * Queue priority (0-10). Higher = processed first. Only applies to rate-limited items.
   * @default 0
   */
  priority?: number
  /**
   * Optional per-draft overrides.
   * Applied before sending (updates drafts via PATCH).
   */
  draftOverrides?: DraftSendOverride[]
}

/**
 * Request to update LinkedIn subscription
 */
export interface UpdateLinkedInSubscriptionRequest {
  subscriptionType: LinkedInSubscriptionType | string // Use enum value
  inmailCredits?: number | null // Manually set credit count (optional)
}

// Response Models

/**
 * Statistics from a sync operation
 */
export interface SyncStats {
  synced: number
  created: number
  updated: number
  errors: number
  prospectsRequested?: number // Number of prospects requested (v3.4+)
  prospectsFound?: number // Number of prospects with conversations found (v3.4+)
}

/**
 * Response from sync operations
 */
export interface SyncJobResponse {
  jobId: string
  status: SyncJobStatus | string // 'queued' | 'in_progress' | 'completed' | 'failed'
  startedAt?: string | null // ISO timestamp
  completedAt?: string | null // ISO timestamp
  stats?: SyncStats | null
  error?: string | null
}

/**
 * Result for a single prospect sync
 */
export interface ProspectSyncResult {
  prospectId?: string | null // External ID from frontend
  email?: string | null // Email address for Gmail/Outlook
  linkedinUrl?: string | null // LinkedIn profile URL
  conversationId?: string | null // Conversation UUID if found
  messagesSynced: number // Number of messages synced (default: 0)
  status: string // 'found' | 'not_found' | 'error'
  error?: string | null // Error message if failed
}

/**
 * Response from single prospect sync
 */
export interface SyncProspectResponse {
  result: ProspectSyncResult
  conversation?: ConversationSummary | null // If found
}

/**
 * LinkedIn connection status
 */
export interface LinkedInConnectionStatus {
  connected: boolean
  providerId?: string | null // LinkedIn member ID
  chatId?: string | null // Existing chat ID if connected
  canMessage: boolean // True if can send direct message
  canInmail: boolean // True if user has InMail capability
  isOpenProfile?: boolean // True if prospect has open profile (free InMail)
  networkDistance?: NetworkDistance | null // LinkedIn network distance (FIRST_DEGREE, SECOND_DEGREE, THIRD_DEGREE, OUT_OF_NETWORK)
}

/**
 * Connection summary for batch operations
 */
export interface ConnectionSummary {
  total: number
  connected: number
  notConnected: number
}

/**
 * Response from batch connection check
 */
export interface BatchConnectionStatusResponse {
  results: Record<string, LinkedInConnectionStatus> // Keyed by prospect_id from request
  summary: ConnectionSummary
}

/**
 * LinkedIn credits response with multiple subscription support.
 *
 * A LinkedIn account can have multiple subscriptions (e.g., Sales Navigator + Recruiter).
 * Each subscription has its own InMail credit pool.
 */
export interface LinkedInCreditsResponse {
  // Per-subscription breakdown (same as account-info)
  subscriptions: LinkedInSubscriptionInfo[]

  // Legacy/summary fields for backward compatibility
  subscriptionType?: string | null // Primary subscription type
  creditsRemaining?: number | null // Total credits across all subscriptions
  creditsUpdatedAt?: string | null
  isRealTime: boolean // True if fetched from Unipile API (not cached)

  // Capabilities
  canSendInmail: boolean
}

/**
 * Individual LinkedIn subscription with its own InMail credit pool.
 *
 * A LinkedIn account can have multiple subscriptions (e.g., Sales Navigator + Recruiter).
 * Each subscription has its own InMail credits.
 */
export interface LinkedInSubscriptionInfo {
  /** Subscription type: 'basic' | 'premium' | 'sales_navigator' | 'recruiter_lite' | 'recruiter_corporate' */
  type: string
  /** Raw Unipile feature: 'classic' | 'sales_navigator' | 'recruiter' */
  feature: string

  // InMail credits for this specific subscription
  inmailCreditsRemaining?: number | null
  inmailCreditsUpdatedAt?: string | null

  // Credit allowances for this subscription type
  monthlyAllowance: number
  maxAccumulation: number

  // Is this subscription currently active
  isActive: boolean
}

/**
 * Full LinkedIn account information with multiple subscription support.
 *
 * A LinkedIn account can have multiple subscriptions simultaneously:
 * - Sales Navigator (for sales professionals)
 * - Recruiter (for hiring)
 * - Premium Career (personal use)
 *
 * Each subscription has its own InMail credit pool.
 */
export interface LinkedInAccountInfoResponse {
  // Connection status
  connected: boolean
  accountId?: string | null
  connectedAt?: string | null

  // Multiple subscriptions support
  subscriptions: LinkedInSubscriptionInfo[]

  // Legacy fields for backward compatibility (primary subscription)
  subscriptionType?: string | null // Primary subscription type
  feature?: string | null // Primary feature from Unipile
  inmailCreditsRemaining?: number | null // Total credits across all subscriptions
  inmailCreditsUpdatedAt?: string | null
  monthlyInmailAllowance?: number | null // Total monthly allowance
  maxInmailAccumulation?: number | null // Total max accumulation

  // Capabilities (derived from all subscriptions)
  canSendInmail: boolean
  canUseSalesNavigatorApi: boolean
  canUseRecruiterApi: boolean

  // Daily usage statistics
  inmailSentToday?: number | null // Number of InMails sent today
  directMessagesSentToday?: number | null // Number of LinkedIn DMs sent today
  connectionRequestsSentToday?: number | null // Number of connection requests sent today
  gmailSentToday?: number | null // Number of emails sent via Gmail today
  outlookSentToday?: number | null // Number of emails sent via Outlook today

  // Account status from Unipile
  unipileStatus?: string | null // OK, CREDENTIALS, ERROR, etc.
}

/**
 * Conversation summary
 */
export interface ConversationSummary {
  id: string
  channel: string // 'gmail' | 'outlook' | 'linkedin'
  outreachMethod?: string | null // 'connection_request' | 'direct_message' | 'inmail' | 'inmail_escalation' | 'email'
  status: string // 'active' | 'needs_response' | 'waiting' | 'booked' | 'closed'
  prospectName: string
  prospectEmail?: string | null
  prospectCompany?: string | null
  prospectTitle?: string | null
  lastMessageAt?: string | null // ISO timestamp
  lastMessagePreview?: string | null // First 100 chars of last message
  messageCount: number
  // AI assistance
  aiSuggestedResponse?: string | null // AI-generated reply suggestion
  // LinkedIn-specific
  isLinkedinConnected?: boolean | null
  networkDistance?: NetworkDistance | null // LinkedIn network distance (FIRST_DEGREE, SECOND_DEGREE, THIRD_DEGREE, OUT_OF_NETWORK)
  connectionRequestSentAt?: string | null // ISO timestamp
  connectionAcceptedAt?: string | null // ISO timestamp
  escalationScheduledFor?: string | null // ISO timestamp - when CR will escalate to InMail
  // Frontend linking
  prospectExternalId?: string | null // External ID from frontend prospects table
  projectId?: string | null // Frontend project UUID
}

/**
 * Message response
 */
export interface MessageResponse {
  id: string
  messageType?: string // 'message' | 'connection_request' | 'connection_accepted' | 'inmail'
  direction: string // 'inbound' | 'outbound'
  content: string
  subject?: string | null // For email messages
  senderName: string
  sentAt: string // ISO timestamp
  aiGenerated?: boolean
}

/**
 * Conversation detail with messages
 */
export interface ConversationDetail {
  conversation: ConversationSummary
  messages: MessageResponse[]
}

/**
 * Email thread summary
 */
export interface EmailThreadSummary {
  threadId: string
  subject?: string | null
  lastMessageAt: string
  messageCount: number
  preview?: string | null
  isLumnisInitiated: boolean
}

/**
 * Draft response
 */
export interface DraftResponse {
  id: string
  /** Draft status: 'pending_review' | 'approved' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'discarded' */
  status: string
  content: string
  createdAt: string
  prospectExternalId?: string | null
  conversationId?: string | null
  /** Outreach method used for this draft: 'connection_request' | 'direct_message' | 'inmail' | 'email' */
  outreachMethod?: 'direct_message' | 'connection_request' | 'inmail' | 'email' | null
  /** Subject line for email drafts (optional) */
  subject?: string | null
  /** ISO timestamp when queued message will be sent (if status is 'scheduled') */
  scheduledFor?: string | null
  /** Error details if status is 'failed' */
  errorMessage?: string | null
  /**
   * InMail subscription selected for this draft (LinkedIn InMail only).
   * null means auto-selection will be used when sending.
   */
  inmailSubscription?: InmailSubscription | null
}

/**
 * Response from batch draft creation (legacy synchronous mode)
 */
export interface BatchDraftResponse {
  drafts: DraftResponse[]
  created: number
  errors: number
  errorDetails?: Array<Record<string, any>> | null
}

/**
 * Response when batch draft job is queued (async mode, 202 response).
 * Poll GET /drafts/batch/jobs/{jobId} for progress and results.
 */
export interface BatchDraftJobResponse {
  jobId: string
  status: string // 'pending'
  totalProspects: number
  pollUrl: string
  message?: string
}

/**
 * Progress information for a batch job
 */
export interface BatchDraftJobProgress {
  processed: number
  total: number
  percentage: number
  draftsCreated: number
  errors: number
}

/**
 * Response for GET /drafts/batch/jobs/{jobId} (polling endpoint)
 */
export interface BatchDraftJobStatusResponse {
  jobId: string
  status: string // 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: BatchDraftJobProgress
  drafts: DraftResponse[]
  errors: Array<Record<string, any>>
  createdAt: string
  startedAt?: string | null
  completedAt?: string | null
  errorMessage?: string | null
}

/**
 * Job started event data from streaming batch draft creation.
 * First event emitted, contains job_id for reconnection.
 */
export interface BatchDraftJobStartedData {
  jobId: string
}

/**
 * Progress event data from streaming batch draft creation
 */
export interface BatchDraftProgressData {
  processed: number
  total: number
  percentage: number
  currentProspect: string
}

/**
 * Draft created event data from streaming batch draft creation
 */
export interface BatchDraftCreatedData {
  draft: DraftResponse
  prospectExternalId?: string | null
}

/**
 * Error event data from streaming batch draft creation
 */
export interface BatchDraftErrorData {
  prospect: string
  error: string
}

/**
 * Complete event data from streaming batch draft creation
 */
export interface BatchDraftCompleteData {
  jobId?: string
  created: number
  errors: number
  drafts: DraftResponse[]
  errorDetails: Array<{ prospect: string, error: string }>
  errorMessage?: string | null
}

/**
 * Stream event types for batch draft creation
 */
export type BatchDraftStreamEventType = 'job_started' | 'progress' | 'draft_created' | 'error' | 'complete'

/**
 * Stream event from batch draft creation
 */
export interface BatchDraftStreamEvent {
  event: BatchDraftStreamEventType
  data: BatchDraftJobStartedData | BatchDraftProgressData | BatchDraftCreatedData | BatchDraftErrorData | BatchDraftCompleteData
}

/**
 * Callbacks for batch draft streaming
 */
export interface BatchDraftStreamCallbacks {
  /** Callback when job starts, provides job_id for reconnection if disconnected */
  onJobStarted?: (jobId: string) => void
  /** Callback for progress updates */
  onProgress?: (processed: number, total: number, percentage: number, prospectName: string) => void
  /** Callback when a draft is created */
  onDraftCreated?: (draft: DraftResponse) => void
  /** Callback when an error occurs for a prospect */
  onError?: (prospect: string, error: string) => void
  /** Callback when batch processing completes */
  onComplete?: (result: BatchDraftResponse) => void
}

/**
 * Send result (returned by reply, linkedin/send, drafts endpoints)
 */
export interface SendResult {
  success: boolean
  draftId?: string | null // Draft ID this result corresponds to
  conversationId?: string | null // Internal conversation UUID
  messageId?: string | null // Internal message UUID
  outreachMethod?: string | null // For LinkedIn: 'connection_request' | 'direct_message' | 'inmail'
  queued?: boolean | null // True if queued for later (rate limiting), false/null if sent immediately
  isFreeInmail?: boolean | null // True if InMail was free (open profile), false if credits consumed, null if not InMail
  error?: string | null
  errorCode?: string | null // 'SEND_FAILED' | 'REPLY_FAILED' | 'NOT_FOUND' | 'NO_RECIPIENT' | etc.
  prospectExternalId?: string | null // Frontend prospect ID for linking results back to prospects
}

/**
 * Response from the generic send message endpoint
 */
export interface SendMessageResponse {
  success: boolean
  messageId?: string | null // Internal message ID
  conversationId?: string | null // Internal conversation ID
  externalId?: string | null // Provider's message ID
}

/**
 * Response from batch send operation
 */
export interface BatchSendResponse {
  results: SendResult[]
  sent: number // Count sent immediately
  failed: number // Count failed
  queued: number // Count queued for later (rate limiting)
}

/**
 * Response from cancelling a draft
 */
export interface CancelDraftResponse {
  success: boolean
  draftId?: string
  prospectExternalId?: string | null
  error?: string
}

/**
 * Response from deleting a single conversation
 */
export interface DeleteConversationResponse {
  success: boolean
  conversationId: string
}

/**
 * Response from deleting conversations by project
 */
export interface DeleteConversationsByProjectResponse {
  success: boolean
  projectId: string
  deletedCount: number
}

/**
 * Response from unlinking conversations from project
 */
export interface UnlinkConversationsResponse {
  success: boolean
  projectId: string
  unlinkedCount: number
}

// ═══════════════════════════════════════════════════════════════════
// PRIOR CONTACT CHECK
// ═══════════════════════════════════════════════════════════════════

/**
 * Request to check if there's been prior contact with a person
 */
export interface CheckPriorContactRequest {
  /** Email address to check (for Gmail/Outlook) */
  email?: string | null
  /** LinkedIn profile URL to check */
  linkedinUrl?: string | null
  /** LinkedIn provider ID to check */
  providerId?: string | null
  /** Channels to check: 'gmail', 'outlook', 'linkedin'. Default: all connected channels */
  channels?: string[] | null
  /** Max messages to return per channel (1-20, default: 5) */
  messageLimit?: number | null
  /** Force fresh check, bypassing cache (default: false) */
  skipCache?: boolean | null
}

/**
 * A message from prior contact history
 */
export interface PriorContactMessage {
  id: string
  /** 'inbound' | 'outbound' */
  direction: string
  content: string
  subject?: string | null
  senderName: string
  /** ISO timestamp */
  sentAt: string
}

/**
 * Contact history for a single channel
 */
export interface ChannelContactHistory {
  /** 'gmail' | 'outlook' | 'linkedin' */
  channel: string
  hasContact: boolean
  /** True if user sent first message */
  isUserInitiated: boolean
  threadId?: string | null
  /** Internal ID if we have one */
  conversationId?: string | null
  messageCount: number
  /** ISO timestamp */
  firstContactAt?: string | null
  /** ISO timestamp */
  lastContactAt?: string | null
  prospectName?: string | null
  messages: PriorContactMessage[]
}

/**
 * Response from prior contact check
 */
export interface CheckPriorContactResponse {
  /** True if ANY channel has contact */
  hasPriorContact: boolean
  channelsChecked: string[]
  channelsWithContact: string[]
  contactHistory: ChannelContactHistory[]
  /** True if result was served from cache */
  cached?: boolean
}

/**
 * Identifier for a prospect in batch prior contact check
 */
export interface BatchProspectIdentifier {
  /** Unique identifier for this prospect (for mapping results) */
  prospectId: string
  /** Email address to check */
  email?: string | null
  /** LinkedIn profile URL */
  linkedinUrl?: string | null
  /** LinkedIn provider ID */
  providerId?: string | null
}

/**
 * Request to check prior contact for multiple prospects
 */
export interface BatchCheckPriorContactRequest {
  /** List of prospects to check (max 50) */
  prospects: BatchProspectIdentifier[]
  /** Channels to check: 'gmail', 'outlook', 'linkedin'. Default: all based on identifiers */
  channels?: string[] | null
  /** Max messages per channel per prospect (1-10, default: 3) */
  messageLimit?: number | null
  /** Force fresh check for all prospects, bypassing cache (default: false) */
  skipCache?: boolean | null
}

/**
 * Prior contact result for a single prospect in batch
 */
export interface ProspectPriorContactResult {
  prospectId: string
  hasPriorContact: boolean
  channelsWithContact: string[]
  contactHistory: ChannelContactHistory[]
  /** True if this result was from cache */
  cached?: boolean
  error?: string | null
}

/**
 * Response from batch prior contact check
 */
export interface BatchCheckPriorContactResponse {
  /** Keyed by prospect_id */
  results: Record<string, ProspectPriorContactResult>
  /** Aggregated counts */
  summary: {
    total: number
    withContact: number
    withoutContact: number
    errors: number
    /** Number of results served from cache */
    cached?: number
  }
}
