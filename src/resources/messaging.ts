// Messaging API resource
import type { Http } from '../core/http'
import type {
  BatchCheckConnectionRequest,
  BatchConnectionStatusResponse,
  BatchDraftRequest,
  BatchDraftResponse,
  BatchSendRequest,
  BatchSendResponse,
  CheckLinkedInConnectionRequest,
  ConversationDetail,
  ConversationSummary,
  CreateDraftRequest,
  DeleteConversationResponse,
  DeleteConversationsByProjectResponse,
  DraftResponse,
  EmailThreadSummary,
  LinkedInConnectionStatus,
  LinkedInCreditsResponse,
  LinkedInSendRequest,
  NetworkDistance,
  SendMessageRequest,
  SendMessageResponse,
  SendReplyRequest,
  SendResult,
  SyncJobResponse,
  SyncProspectRequest,
  SyncProspectResponse,
  SyncRequest,
  UnlinkConversationsResponse,
  UpdateLinkedInSubscriptionRequest,
} from '../types/messaging'
import { MessagingNotFoundError, MessagingValidationError, NotFoundError, ValidationError } from '../errors'

export class MessagingResource {
  constructor(private readonly http: Http) {}

  /**
   * Sync conversations from connected providers for specific prospects.
   * Prospects list is REQUIRED.
   */
  async syncConversations(
    userId: string,
    request: SyncRequest,
  ): Promise<SyncJobResponse> {
    // Validate that prospects array is provided and non-empty
    if (!request.prospects || request.prospects.length === 0) {
      throw new MessagingValidationError('prospects array is required and must not be empty', { code: 'VALIDATION_ERROR' })
    }

    // Validate that each prospect has at least one identifier
    for (const prospect of request.prospects) {
      const hasIdentifier = prospect.email || prospect.linkedinUrl || prospect.providerId
      if (!hasIdentifier) {
        throw new MessagingValidationError('Each prospect must have at least one identifier (email, linkedinUrl, or providerId)', { code: 'VALIDATION_ERROR' })
      }
    }

    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.post<SyncJobResponse>(
      `/messaging/sync?${queryParams.toString()}`,
      request,
    )
  }

  /**
   * Sync conversation for a single prospect on-demand.
   * Use when viewing a prospect's detail page.
   */
  async syncProspect(
    userId: string,
    request: SyncProspectRequest,
  ): Promise<SyncProspectResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.post<SyncProspectResponse>(
      `/messaging/sync/prospect?${queryParams.toString()}`,
      request,
    )
  }

  /**
   * Get sync job status
   */
  async getSyncStatus(jobId: string): Promise<SyncJobResponse> {
    return this.http.get<SyncJobResponse>(`/messaging/sync/${encodeURIComponent(jobId)}`)
  }

  /**
   * List conversations with filtering
   */
  async listConversations(
    userId: string,
    params?: {
      status?: string
      channel?: string
      projectId?: string
      networkDistance?: NetworkDistance | null
      limit?: number
      offset?: number
    },
  ): Promise<ConversationSummary[]> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    if (params?.status)
      queryParams.append('status', params.status)
    if (params?.channel)
      queryParams.append('channel', params.channel)
    if (params?.projectId)
      queryParams.append('project_id', params.projectId)
    if (params?.networkDistance)
      queryParams.append('network_distance', params.networkDistance)
    if (params?.limit !== undefined)
      queryParams.append('limit', String(params.limit))
    if (params?.offset !== undefined)
      queryParams.append('offset', String(params.offset))

    return this.http.get<ConversationSummary[]>(
      `/messaging/conversations?${queryParams.toString()}`,
    )
  }

  /**
   * Get all conversations for a project
   */
  async listConversationsByProject(
    projectId: string,
    userId: string,
    params?: {
      limit?: number
      offset?: number
    },
  ): Promise<ConversationSummary[]> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    if (params?.limit !== undefined)
      queryParams.append('limit', String(params.limit))
    if (params?.offset !== undefined)
      queryParams.append('offset', String(params.offset))

    return this.http.get<ConversationSummary[]>(
      `/messaging/conversations/by-project/${encodeURIComponent(projectId)}?${queryParams.toString()}`,
    )
  }

  /**
   * Get conversation with messages
   */
  async getConversation(
    conversationId: string,
    userId: string,
    params?: {
      fetchLive?: boolean
    },
  ): Promise<ConversationDetail> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    if (params?.fetchLive !== undefined)
      queryParams.append('fetch_live', String(params.fetchLive))

    return this.http.get<ConversationDetail>(
      `/messaging/conversations/${encodeURIComponent(conversationId)}?${queryParams.toString()}`,
    )
  }

  /**
   * Send a message (creates new conversation or adds to existing)
   */
  async sendMessage(
    userId: string,
    request: SendMessageRequest,
  ): Promise<SendMessageResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.post<SendMessageResponse>(
      `/messaging/send?${queryParams.toString()}`,
      request,
    )
  }

  /**
   * Reply to an existing conversation
   */
  async replyToConversation(
    conversationId: string,
    userId: string,
    request: SendReplyRequest,
  ): Promise<SendResult> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.post<SendResult>(
      `/messaging/conversations/${encodeURIComponent(conversationId)}/reply?${queryParams.toString()}`,
      request,
    )
  }

  /**
   * Get all email threads with a specific person
   */
  async getEmailThreads(
    emailAddress: string,
    userId: string,
    params?: {
      limit?: number
    },
  ): Promise<EmailThreadSummary[]> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    if (params?.limit !== undefined)
      queryParams.append('limit', String(params.limit))

    return this.http.get<EmailThreadSummary[]>(
      `/messaging/email-threads/${encodeURIComponent(emailAddress)}?${queryParams.toString()}`,
    )
  }

  /**
   * Check if user is connected to a prospect on LinkedIn
   */
  async checkLinkedInConnection(
    userId: string,
    request: CheckLinkedInConnectionRequest,
  ): Promise<LinkedInConnectionStatus> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.post<LinkedInConnectionStatus>(
      `/messaging/linkedin/check-connection?${queryParams.toString()}`,
      request,
    )
  }

  /**
   * Batch check connection status for multiple prospects
   */
  async batchCheckLinkedInConnections(
    userId: string,
    request: BatchCheckConnectionRequest,
  ): Promise<BatchConnectionStatusResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.post<BatchConnectionStatusResponse>(
      `/messaging/linkedin/check-connections/batch?${queryParams.toString()}`,
      request,
    )
  }

  /**
   * Smart LinkedIn outreach with automatic method selection
   */
  async sendLinkedInOutreach(
    userId: string,
    request: LinkedInSendRequest,
  ): Promise<SendResult> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.post<SendResult>(
      `/messaging/linkedin/send?${queryParams.toString()}`,
      request,
    )
  }

  /**
   * Get InMail credit information.
   * By default returns cached data. Set forceRefresh=true to fetch real-time data from Unipile API.
   */
  async getLinkedInCredits(
    userId: string,
    options?: {
      forceRefresh?: boolean // Fetch from Unipile API instead of cache
    },
  ): Promise<LinkedInCreditsResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    if (options?.forceRefresh) {
      queryParams.append('force_refresh', 'true')
    }

    return this.http.get<LinkedInCreditsResponse>(
      `/messaging/linkedin/credits?${queryParams.toString()}`,
    )
  }

  /**
   * Force refresh InMail credits from Unipile API.
   * Fetches real-time credit balance from provider and updates cache.
   */
  async refreshLinkedInCredits(userId: string): Promise<LinkedInCreditsResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.post<LinkedInCreditsResponse>(
      `/messaging/linkedin/refresh-credits?${queryParams.toString()}`,
    )
  }

  /**
   * Update LinkedIn subscription type and credits
   */
  async updateLinkedInSubscription(
    userId: string,
    request: UpdateLinkedInSubscriptionRequest,
  ): Promise<{ success: boolean }> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.put<{ success: boolean }>(
      `/messaging/linkedin/subscription?${queryParams.toString()}`,
      request,
    )
  }

  /**
   * Create a single draft message
   */
  async createDraft(
    userId: string,
    request: CreateDraftRequest,
  ): Promise<DraftResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.post<DraftResponse>(
      `/messaging/drafts?${queryParams.toString()}`,
      request,
    )
  }

  /**
   * Create drafts for multiple prospects with AI generation
   */
  async createBatchDrafts(
    userId: string,
    request: BatchDraftRequest,
  ): Promise<BatchDraftResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.post<BatchDraftResponse>(
      `/messaging/drafts/batch?${queryParams.toString()}`,
      request,
    )
  }

  /**
   * Approve and send a single draft
   */
  async sendDraft(
    draftId: string,
    userId: string,
  ): Promise<SendResult> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.post<SendResult>(
      `/messaging/drafts/${encodeURIComponent(draftId)}/send?${queryParams.toString()}`,
    )
  }

  /**
   * Send multiple drafts with rate limiting
   */
  async sendBatchDrafts(
    userId: string,
    request: BatchSendRequest,
  ): Promise<BatchSendResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('user_id', userId)

    return this.http.post<BatchSendResponse>(
      `/messaging/drafts/batch/send?${queryParams.toString()}`,
      request,
    )
  }

  /**
   * Delete a single conversation and all its messages.
   *
   * @param conversationId - UUID of the conversation to delete
   * @param userId - User ID or email
   * @returns DeleteConversationResponse with success status and conversation_id
   * @throws MessagingNotFoundError if conversation not found (404)
   * @throws MessagingValidationError if conversation_id is invalid (400)
   */
  async deleteConversation(
    conversationId: string,
    userId: string,
  ): Promise<DeleteConversationResponse> {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('user_id', userId)

      return await this.http.delete<DeleteConversationResponse>(
        `/messaging/conversations/${encodeURIComponent(conversationId)}?${queryParams.toString()}`,
      )
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        throw new MessagingNotFoundError(
          `Conversation ${conversationId} not found`,
        )
      }
      if (error instanceof ValidationError) {
        throw new MessagingValidationError(
          `Invalid conversation ID: ${conversationId}`,
        )
      }
      throw error
    }
  }

  /**
   * Delete all conversations for a project.
   *
   * **Warning:** This permanently deletes conversations and messages.
   * Consider using unlinkConversationsFromProject() instead.
   *
   * @param projectId - UUID of the project
   * @param userId - User ID or email
   * @returns DeleteConversationsByProjectResponse with deleted count
   */
  async deleteConversationsByProject(
    projectId: string,
    userId: string,
  ): Promise<DeleteConversationsByProjectResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('project_id', projectId)
    queryParams.append('user_id', userId)

    return this.http.delete<DeleteConversationsByProjectResponse>(
      `/messaging/conversations?${queryParams.toString()}`,
    )
  }

  /**
   * Unlink conversations from a project without deleting them.
   *
   * This preserves conversation history by setting project_id = NULL.
   * Recommended approach when deleting a project.
   *
   * @param projectId - UUID of the project
   * @param userId - User ID or email
   * @returns UnlinkConversationsResponse with unlinked count
   */
  async unlinkConversationsFromProject(
    projectId: string,
    userId: string,
  ): Promise<UnlinkConversationsResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('project_id', projectId)
    queryParams.append('user_id', userId)

    return this.http.post<UnlinkConversationsResponse>(
      `/messaging/conversations/unlink-project?${queryParams.toString()}`,
      null,
    )
  }
}
