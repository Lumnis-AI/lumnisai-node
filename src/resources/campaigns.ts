import type { Http } from '../core/http'
import type {
  AddProspectsRequest,
  AddProspectsResponse,
  ApprovalActionRequest,
  CampaignActionListResponse,
  CampaignBulkApprovalRequest,
  CampaignBulkApprovalResponse,
  CampaignCreate,
  CampaignListResponse,
  CampaignMetricsResponse,
  CampaignProspectDetailResponse,
  CampaignProspectResponse,
  CampaignResponse,
  CampaignUpdate,
  CancelQueuedRequest,
  EditQueuedRequest,
  LinkAssetsRequest,
  LinkedAssetsResponse,
  ListAssetsOptions,
  ListCampaignActionsOptions,
  ListCampaignProspectsOptions,
  ListCampaignsOptions,
  ListPendingApprovalsOptions,
  ListPlaybooksOptions,
  OutreachAssetCreate,
  OutreachAssetResponse,
  OutreachAssetUpdate,
  PauseResumeQueuedRequest,
  PlaybookCreate,
  PlaybookResponse,
  PlaybookUpdate,
  PlaybookVersionResponse,
  RecordOutcomeRequest,
  RejectActionRequest,
  SkipActionRequest,
} from '../types/campaigns'

/**
 * Resource for managing AI-powered outbound campaigns.
 *
 * Campaigns use an LLM-based router to decide the best next action for each
 * prospect, guided by a natural-language playbook written by the SDR.
 */
export class CampaignsResource {
  constructor(private readonly http: Http) {}

  // ==================== Playbooks ====================

  /**
   * Create a playbook with natural-language instructions for the AI agent.
   */
  async createPlaybook(playbook: PlaybookCreate): Promise<PlaybookResponse> {
    return this.http.post<PlaybookResponse>('/campaigns/playbooks', playbook)
  }

  /**
   * List playbooks for the tenant.
   */
  async listPlaybooks(
    options?: ListPlaybooksOptions,
  ): Promise<PlaybookResponse[]> {
    const params: Record<string, unknown> = {}
    if (options?.userId)
      params.user_id = options.userId
    if (options?.activeOnly !== undefined)
      params.active_only = options.activeOnly
    return this.http.get<PlaybookResponse[]>('/campaigns/playbooks', { params })
  }

  /**
   * Get a specific playbook.
   */
  async getPlaybook(playbookId: string): Promise<PlaybookResponse> {
    return this.http.get<PlaybookResponse>(
      `/campaigns/playbooks/${encodeURIComponent(playbookId)}`,
    )
  }

  /**
   * Update a playbook. Creates a new version automatically.
   */
  async updatePlaybook(
    playbookId: string,
    update: PlaybookUpdate,
  ): Promise<PlaybookResponse> {
    return this.http.put<PlaybookResponse>(
      `/campaigns/playbooks/${encodeURIComponent(playbookId)}`,
      update,
    )
  }

  /**
   * Archive a playbook (soft delete).
   * Fails with 409 if the playbook is used by active campaigns.
   */
  async archivePlaybook(
    playbookId: string,
  ): Promise<{ success: boolean, playbook: PlaybookResponse }> {
    return this.http.delete<{ success: boolean, playbook: PlaybookResponse }>(
      `/campaigns/playbooks/${encodeURIComponent(playbookId)}`,
    )
  }

  /**
   * Get version history for a playbook.
   */
  async listPlaybookVersions(
    playbookId: string,
  ): Promise<PlaybookVersionResponse[]> {
    return this.http.get<PlaybookVersionResponse[]>(
      `/campaigns/playbooks/${encodeURIComponent(playbookId)}/versions`,
    )
  }

  // ==================== Campaigns ====================

  /**
   * Create a new campaign in draft status.
   */
  async createCampaign(campaign: CampaignCreate): Promise<CampaignResponse> {
    return this.http.post<CampaignResponse>('/campaigns', campaign)
  }

  /**
   * List campaigns with optional filters.
   */
  async listCampaigns(
    options?: ListCampaignsOptions,
  ): Promise<CampaignListResponse> {
    const params: Record<string, unknown> = {}
    if (options?.userId)
      params.user_id = options.userId
    if (options?.projectId)
      params.project_id = options.projectId
    if (options?.status)
      params.status = options.status
    return this.http.get<CampaignListResponse>('/campaigns', { params })
  }

  /**
   * Get a campaign with current metrics.
   */
  async getCampaign(campaignId: string): Promise<CampaignResponse> {
    return this.http.get<CampaignResponse>(
      `/campaigns/${encodeURIComponent(campaignId)}`,
    )
  }

  /**
   * Update a campaign. Field mutability depends on campaign status.
   */
  async updateCampaign(
    campaignId: string,
    update: CampaignUpdate,
  ): Promise<CampaignResponse> {
    return this.http.put<CampaignResponse>(
      `/campaigns/${encodeURIComponent(campaignId)}`,
      update,
    )
  }

  /**
   * Start a campaign (draft → active).
   * Prospects begin evaluation on the next sweep cycle.
   */
  async startCampaign(campaignId: string): Promise<CampaignResponse> {
    return this.http.post<CampaignResponse>(
      `/campaigns/${encodeURIComponent(campaignId)}/start`,
    )
  }

  /**
   * Pause an active campaign.
   * Cancels pending/queued actions and preserves approved ones.
   */
  async pauseCampaign(
    campaignId: string,
    reason?: string,
  ): Promise<CampaignResponse> {
    const params: Record<string, unknown> = {}
    if (reason)
      params.reason = reason
    return this.http.post<CampaignResponse>(
      `/campaigns/${encodeURIComponent(campaignId)}/pause`,
      undefined,
      { params },
    )
  }

  /**
   * Resume a paused campaign.
   */
  async resumeCampaign(campaignId: string): Promise<CampaignResponse> {
    return this.http.post<CampaignResponse>(
      `/campaigns/${encodeURIComponent(campaignId)}/resume`,
    )
  }

  /**
   * Stop a campaign permanently.
   * All non-terminal prospects are marked as stopped.
   */
  async stopCampaign(
    campaignId: string,
    reason?: string,
  ): Promise<CampaignResponse> {
    const params: Record<string, unknown> = {}
    if (reason)
      params.reason = reason
    return this.http.post<CampaignResponse>(
      `/campaigns/${encodeURIComponent(campaignId)}/stop`,
      undefined,
      { params },
    )
  }

  // ==================== Prospects ====================

  /**
   * Add prospects to a campaign. Can be called on active campaigns.
   * Returns per-prospect warnings for cross-system overlap.
   */
  async addProspects(
    campaignId: string,
    request: AddProspectsRequest,
  ): Promise<AddProspectsResponse> {
    return this.http.post<AddProspectsResponse>(
      `/campaigns/${encodeURIComponent(campaignId)}/prospects`,
      request,
    )
  }

  /**
   * List prospects in a campaign with optional state filter.
   */
  async listProspects(
    campaignId: string,
    options?: ListCampaignProspectsOptions,
  ): Promise<CampaignProspectResponse[]> {
    const params: Record<string, unknown> = {}
    if (options?.state)
      params.state = options.state
    if (options?.limit !== undefined)
      params.limit = options.limit
    if (options?.offset !== undefined)
      params.offset = options.offset
    return this.http.get<CampaignProspectResponse[]>(
      `/campaigns/${encodeURIComponent(campaignId)}/prospects`,
      { params },
    )
  }

  /**
   * Get a single prospect with full action timeline and pending action.
   */
  async getProspectDetail(
    campaignId: string,
    prospectId: string,
  ): Promise<CampaignProspectDetailResponse> {
    return this.http.get<CampaignProspectDetailResponse>(
      `/campaigns/${encodeURIComponent(campaignId)}/prospects/${encodeURIComponent(prospectId)}`,
    )
  }

  /**
   * Remove a prospect from a campaign.
   */
  async removeProspect(
    campaignId: string,
    prospectId: string,
  ): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `/campaigns/${encodeURIComponent(campaignId)}/prospects/${encodeURIComponent(prospectId)}`,
    )
  }

  // ==================== Actions & History ====================

  /**
   * List actions for a campaign with optional filters.
   */
  async listActions(
    campaignId: string,
    options?: ListCampaignActionsOptions,
  ): Promise<CampaignActionListResponse> {
    const params: Record<string, unknown> = {}
    if (options?.status)
      params.status = options.status
    if (options?.actionType)
      params.action_type = options.actionType
    if (options?.prospectId)
      params.prospect_id = options.prospectId
    if (options?.limit !== undefined)
      params.limit = options.limit
    if (options?.offset !== undefined)
      params.offset = options.offset
    return this.http.get<CampaignActionListResponse>(
      `/campaigns/${encodeURIComponent(campaignId)}/actions`,
      { params },
    )
  }

  /**
   * Get campaign funnel metrics.
   */
  async getMetrics(campaignId: string): Promise<CampaignMetricsResponse> {
    return this.http.get<CampaignMetricsResponse>(
      `/campaigns/${encodeURIComponent(campaignId)}/metrics`,
    )
  }

  /**
   * Record an outcome for a campaign action.
   * Can trigger prospect state transitions (meeting_booked, not_interested).
   */
  async recordOutcome(
    actionId: string,
    request: RecordOutcomeRequest,
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `/campaigns/actions/${encodeURIComponent(actionId)}/record-outcome`,
      request,
    )
  }

  // ==================== Approval Queue ====================

  /**
   * List pending approvals across campaigns.
   */
  async listPendingApprovals(
    options?: ListPendingApprovalsOptions,
  ): Promise<CampaignActionListResponse> {
    const params: Record<string, unknown> = {}
    if (options?.campaignId)
      params.campaign_id = options.campaignId
    if (options?.limit !== undefined)
      params.limit = options.limit
    if (options?.offset !== undefined)
      params.offset = options.offset
    return this.http.get<CampaignActionListResponse>(
      '/campaigns/approvals',
      { params },
    )
  }

  /**
   * Approve a campaign action (optionally with edits).
   */
  async approveAction(
    actionId: string,
    request: ApprovalActionRequest,
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `/campaigns/actions/${encodeURIComponent(actionId)}/approve`,
      request,
    )
  }

  /**
   * Reject a campaign action.
   */
  async rejectAction(
    actionId: string,
    request: RejectActionRequest,
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `/campaigns/actions/${encodeURIComponent(actionId)}/reject`,
      request,
    )
  }

  /**
   * Skip a campaign action without negative signal.
   */
  async skipAction(
    actionId: string,
    request: SkipActionRequest,
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `/campaigns/actions/${encodeURIComponent(actionId)}/skip`,
      request,
    )
  }

  /**
   * Bulk approve, reject, or skip multiple campaign actions.
   */
  async bulkApprovals(
    request: CampaignBulkApprovalRequest,
  ): Promise<CampaignBulkApprovalResponse> {
    return this.http.post<CampaignBulkApprovalResponse>(
      '/campaigns/approvals/bulk',
      request,
    )
  }

  // ==================== Queued Action Management ====================

  /**
   * Cancel an approved/queued action before it is sent.
   */
  async cancelQueuedAction(
    actionId: string,
    request: CancelQueuedRequest,
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `/campaigns/actions/${encodeURIComponent(actionId)}/cancel-queued`,
      request,
    )
  }

  /**
   * Edit content of an approved/queued action before it is sent.
   */
  async editQueuedAction(
    actionId: string,
    request: EditQueuedRequest,
  ): Promise<Record<string, unknown>> {
    return this.http.put<Record<string, unknown>>(
      `/campaigns/actions/${encodeURIComponent(actionId)}/edit-queued`,
      request,
    )
  }

  /**
   * Pause an approved/queued action — hold it from being sent.
   */
  async pauseQueuedAction(
    actionId: string,
    request: PauseResumeQueuedRequest,
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `/campaigns/actions/${encodeURIComponent(actionId)}/pause-queued`,
      request,
    )
  }

  /**
   * Resume a paused action for sending.
   */
  async resumeQueuedAction(
    actionId: string,
    request: PauseResumeQueuedRequest,
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `/campaigns/actions/${encodeURIComponent(actionId)}/resume-queued`,
      request,
    )
  }

  // ==================== Campaign Asset Links ====================

  /**
   * Link outreach assets to a campaign.
   */
  async linkAssets(
    campaignId: string,
    request: LinkAssetsRequest,
  ): Promise<{ linked: number }> {
    return this.http.post<{ linked: number }>(
      `/campaigns/${encodeURIComponent(campaignId)}/assets`,
      request,
    )
  }

  /**
   * List assets linked to a campaign.
   */
  async listLinkedAssets(
    campaignId: string,
  ): Promise<LinkedAssetsResponse> {
    return this.http.get<LinkedAssetsResponse>(
      `/campaigns/${encodeURIComponent(campaignId)}/assets`,
    )
  }

  /**
   * Unlink an asset from a campaign.
   */
  async unlinkAsset(
    campaignId: string,
    assetId: string,
  ): Promise<void> {
    await this.http.delete(
      `/campaigns/${encodeURIComponent(campaignId)}/assets/${encodeURIComponent(assetId)}`,
    )
  }

  // ==================== Tenant-Level Assets ====================

  /**
   * Create a tenant-level outreach asset.
   */
  async createAsset(asset: OutreachAssetCreate): Promise<OutreachAssetResponse> {
    return this.http.post<OutreachAssetResponse>('/assets', asset)
  }

  /**
   * List outreach assets for a specific user.
   */
  async listAssets(
    options: ListAssetsOptions,
  ): Promise<OutreachAssetResponse[]> {
    const params: Record<string, unknown> = {
      user_id: options.userId,
    }
    if (options.activeOnly !== undefined)
      params.active_only = options.activeOnly
    if (options.campaignId)
      params.campaign_id = options.campaignId
    return this.http.get<OutreachAssetResponse[]>('/assets', { params })
  }

  /**
   * Get an outreach asset by ID, scoped to user.
   */
  async getAsset(assetId: string, userId: string): Promise<OutreachAssetResponse> {
    return this.http.get<OutreachAssetResponse>(
      `/assets/${encodeURIComponent(assetId)}`,
      { params: { user_id: userId } },
    )
  }

  /**
   * Update an outreach asset.
   */
  async updateAsset(
    assetId: string,
    update: OutreachAssetUpdate,
  ): Promise<OutreachAssetResponse> {
    return this.http.put<OutreachAssetResponse>(
      `/assets/${encodeURIComponent(assetId)}`,
      update,
    )
  }

  /**
   * Deactivate an outreach asset (soft delete), scoped to user.
   */
  async deactivateAsset(assetId: string, userId: string): Promise<OutreachAssetResponse> {
    return this.http.delete<OutreachAssetResponse>(
      `/assets/${encodeURIComponent(assetId)}`,
      { params: { user_id: userId } },
    )
  }
}
