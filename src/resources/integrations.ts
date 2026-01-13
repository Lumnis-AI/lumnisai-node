// Integrations API resource
import type { Http } from '../core/http'
import type {
  AppEnabledResponse,
  AppsListResponse,
  BatchConnectionRequest,
  BatchConnectionResponse,
  CheckAppEnabledParams,
  ConnectionCallbackRequest,
  ConnectionCallbackResponse,
  ConnectionStatusResponse,
  DeleteConnectionsResponse,
  DisconnectRequest,
  DisconnectResponse,
  GetConnectionStatusParams,
  GetToolsRequest,
  GetToolsResponse,
  GetUserConnectionsParams,
  InitiateConnectionRequest,
  InitiateConnectionResponse,
  LinkedInSyncStatusResponse,
  ListProvidersResponse,
  TriggerSyncResponse,
  UpdateAppStatusParams,
  UpdateAppStatusResponse,
  UserConnectionsResponse,
} from '../types/integrations'

export class IntegrationsResource {
  constructor(private readonly http: Http) {}

  /**
   * Start an OAuth connection flow for a user
   */
  async initiateConnection(data: InitiateConnectionRequest): Promise<InitiateConnectionResponse> {
    // Uppercase app name as required by API
    const requestData = {
      ...data,
      appName: data.appName.toUpperCase(),
    }
    return this.http.post<InitiateConnectionResponse>('/integrations/connections/initiate', requestData)
  }

  /**
   * Check the status of a specific connection
   */
  async getConnectionStatus(params: GetConnectionStatusParams): Promise<ConnectionStatusResponse> {
    const { userId, appName, provider, includeEnabled } = params
    const queryParams = new URLSearchParams()
    if (provider)
      queryParams.append('provider', provider)
    if (includeEnabled)
      queryParams.append('include_enabled', 'true')

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.http.get<ConnectionStatusResponse>(
      `/integrations/connections/${encodeURIComponent(userId)}/${appName.toUpperCase()}${query}`,
    )
  }

  /**
   * Check connection status for multiple apps in a single request
   * Optimized for onboarding flows - checks multiple connections in parallel
   */
  async getConnectionsBatch(params: BatchConnectionRequest): Promise<BatchConnectionResponse> {
    const requestData = {
      userId: params.userId,
      appNames: params.appNames.map(name => name.toUpperCase()),
      provider: params.provider || 'composio',
      includeEnabledStatus: params.includeEnabledStatus ?? true,
    }
    return this.http.post<BatchConnectionResponse>(
      '/integrations/connections/batch',
      requestData,
    )
  }

  /**
   * Get all connections for a user
   */
  async getUserConnections(params: GetUserConnectionsParams): Promise<UserConnectionsResponse> {
    const { userId, provider, appFilter } = params
    const queryParams = new URLSearchParams()
    if (provider)
      queryParams.append('provider', provider)
    if (appFilter)
      queryParams.append('app_filter', appFilter)

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.http.get<UserConnectionsResponse>(
      `/integrations/connections/${encodeURIComponent(userId)}${query}`,
    )
  }

  /**
   * Get available tools for a user based on connections
   */
  async getTools(data: GetToolsRequest): Promise<GetToolsResponse> {
    // Uppercase app names in filter
    const requestData = {
      ...data,
      appFilter: data.appFilter?.map(app => app.toUpperCase()),
    }
    return this.http.post<GetToolsResponse>('/integrations/tools', requestData)
  }

  /**
   * Disconnect a user from an external app
   */
  async disconnect(data: DisconnectRequest): Promise<DisconnectResponse> {
    const requestData = {
      ...data,
      appName: data.appName.toUpperCase(),
    }
    return this.http.post<DisconnectResponse>('/integrations/connections/disconnect', requestData)
  }

  /**
   * Handle OAuth callback (for custom implementations)
   */
  async handleCallback(data: ConnectionCallbackRequest): Promise<ConnectionCallbackResponse> {
    return this.http.post<ConnectionCallbackResponse>('/integrations/connections/callback', data)
  }

  /**
   * List apps enabled for the tenant
   */
  async listApps(params?: { includeAvailable?: boolean, provider?: string }): Promise<AppsListResponse> {
    const urlParams = new URLSearchParams()
    if (params?.includeAvailable)
      urlParams.append('include_available', 'true')
    if (params?.provider)
      urlParams.append('provider', params.provider)

    const query = urlParams.toString() ? `?${urlParams.toString()}` : ''
    return this.http.get<AppsListResponse>(`/integrations/apps${query}`)
  }

  /**
   * List available integration providers
   */
  async listProviders(): Promise<ListProvidersResponse> {
    return this.http.get<ListProvidersResponse>('/integrations/providers')
  }

  /**
   * Check if a specific app is enabled
   */
  async checkAppEnabled(params: CheckAppEnabledParams): Promise<AppEnabledResponse> {
    const { appName, provider } = params
    const queryParams = new URLSearchParams()
    if (provider)
      queryParams.append('provider', provider)

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.http.get<AppEnabledResponse>(
      `/integrations/apps/${appName.toUpperCase()}/enabled${query}`,
    )
  }

  /**
   * Enable or disable an app for the tenant
   */
  async updateAppStatus(params: UpdateAppStatusParams): Promise<UpdateAppStatusResponse> {
    const { appName, enabled, provider } = params
    const queryParams = new URLSearchParams()
    queryParams.append('enabled', String(enabled))
    if (provider)
      queryParams.append('provider', provider)

    return this.http.put<UpdateAppStatusResponse>(
      `/integrations/apps/${appName.toUpperCase()}?${queryParams.toString()}`,
    )
  }

  /**
   * Get required fields for non-OAuth authentication (future)
   */
  async getNonOAuthRequiredFields(appName: string, authScheme: string): Promise<any> {
    const params = new URLSearchParams({ auth_scheme: authScheme })
    return this.http.get(
      `/integrations/non-oauth/required-fields/${appName.toUpperCase()}?${params.toString()}`,
    )
  }

  // Aliases for backward compatibility with client methods
  async isAppEnabled(appName: string, provider?: string): Promise<AppEnabledResponse> {
    return this.checkAppEnabled({ appName, provider: provider as any })
  }

  async setAppEnabled(appName: string, data: { enabled: boolean, provider?: string }): Promise<UpdateAppStatusResponse> {
    return this.updateAppStatus({ appName, enabled: data.enabled, provider: data.provider as any })
  }

  async listConnections(userId: string, params?: { appFilter?: string, provider?: string }): Promise<UserConnectionsResponse> {
    return this.getUserConnections({ userId, appFilter: params?.appFilter, provider: params?.provider as any })
  }

  // ═══════════════════════════════════════════════════════════════════
  // LinkedIn Connections Sync Methods
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get LinkedIn contact history & connections sync status
   *
   * Returns separate progress for:
   * - Contact history (message sync)
   * - Connections (network sync)
   *
   * Use this endpoint to show sync progress in the UI.
   *
   * @param userId - User ID or email
   * @returns Detailed sync status with progress tracking
   *
   * @example
   * ```typescript
   * const status = await client.integrations.getLinkedInSyncStatus('user@example.com')
   * console.log(`Connected: ${status.connected}`)
   * console.log(`Contacts messaged: ${status.contactHistory?.contactsMessaged}`)
   * console.log(`Connections stored: ${status.connections?.connectionsStored}`)
   * ```
   */
  async getLinkedInSyncStatus(userId: string): Promise<LinkedInSyncStatusResponse> {
    const params = new URLSearchParams({ user_id: userId })
    return this.http.get<LinkedInSyncStatusResponse>(
      `/integrations/linkedin/sync-status?${params.toString()}`,
    )
  }

  /**
   * Manually trigger LinkedIn connections sync
   *
   * Runs in background. Use getLinkedInSyncStatus() to poll progress.
   *
   * This syncs:
   * - 1st-degree LinkedIn connections
   * - Connection metadata (name, headline, connected_at)
   * - Resolves hashed URLs using CrustData (if API key is configured)
   *
   * @param userId - User ID or email
   * @returns Sync trigger status
   *
   * @example
   * ```typescript
   * const response = await client.integrations.triggerLinkedInSync('user@example.com')
   * console.log(response.message) // "Sync started in background"
   *
   * // Poll status until complete
   * while (true) {
   *   const status = await client.integrations.getLinkedInSyncStatus('user@example.com')
   *   if (!status.syncInProgress) break
   *   await new Promise(resolve => setTimeout(resolve, 2000))
   * }
   * ```
   */
  async triggerLinkedInSync(userId: string): Promise<TriggerSyncResponse> {
    const params = new URLSearchParams({ user_id: userId })
    return this.http.post<TriggerSyncResponse>(
      `/integrations/linkedin/sync?${params.toString()}`,
      {},
    )
  }

  /**
   * Delete all stored LinkedIn connections for user
   *
   * Keeps contacts that have been messaged (contact_count > 0).
   * Only removes connection-only entries.
   *
   * Use this to:
   * - Reset connections before re-syncing
   * - Clear stale connection data
   * - Handle user privacy requests
   *
   * @param userId - User ID or email
   * @returns Number of connections deleted
   *
   * @example
   * ```typescript
   * const response = await client.integrations.deleteLinkedInConnections('user@example.com')
   * console.log(`Deleted ${response.deletedCount} connections`)
   * ```
   */
  async deleteLinkedInConnections(userId: string): Promise<DeleteConnectionsResponse> {
    const params = new URLSearchParams({ user_id: userId })
    return this.http.delete<DeleteConnectionsResponse>(
      `/integrations/linkedin/connections?${params.toString()}`,
    )
  }
}
