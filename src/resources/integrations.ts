// Integrations API resource
import type { Http } from '../core/http'
import type {
  AppEnabledResponse,
  AppsListResponse,
  ConnectionCallbackRequest,
  ConnectionCallbackResponse,
  ConnectionStatusResponse,
  DisconnectRequest,
  DisconnectResponse,
  GetToolsRequest,
  GetToolsResponse,
  InitiateConnectionRequest,
  InitiateConnectionResponse,
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
  async getConnectionStatus(userId: string, appName: string): Promise<ConnectionStatusResponse> {
    return this.http.get<ConnectionStatusResponse>(
      `/integrations/connections/${encodeURIComponent(userId)}/${appName.toUpperCase()}`,
    )
  }

  /**
   * Get all connections for a user
   */
  async getUserConnections(userId: string, appFilter?: string): Promise<UserConnectionsResponse> {
    const params = new URLSearchParams()
    if (appFilter)
      params.append('app_filter', appFilter)

    const query = params.toString() ? `?${params.toString()}` : ''
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
  async listApps(params?: { includeAvailable?: boolean }): Promise<AppsListResponse> {
    const urlParams = new URLSearchParams()
    if (params?.includeAvailable)
      urlParams.append('include_available', 'true')

    const query = urlParams.toString() ? `?${urlParams.toString()}` : ''
    return this.http.get<AppsListResponse>(`/integrations/apps${query}`)
  }

  /**
   * Check if a specific app is enabled
   */
  async checkAppEnabled(appName: string): Promise<AppEnabledResponse> {
    return this.http.get<AppEnabledResponse>(
      `/integrations/apps/${appName.toUpperCase()}/enabled`,
    )
  }

  /**
   * Enable or disable an app for the tenant
   */
  async updateAppStatus(appName: string, enabled: boolean): Promise<UpdateAppStatusResponse> {
    return this.http.put<UpdateAppStatusResponse>(
      `/integrations/apps/${appName.toUpperCase()}?enabled=${enabled}`,
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
  async isAppEnabled(appName: string): Promise<AppEnabledResponse> {
    return this.checkAppEnabled(appName)
  }

  async setAppEnabled(appName: string, data: { enabled: boolean }): Promise<UpdateAppStatusResponse> {
    return this.updateAppStatus(appName, data.enabled)
  }

  async listConnections(userId: string, params?: { appFilter?: string }): Promise<UserConnectionsResponse> {
    return this.getUserConnections(userId, params?.appFilter)
  }
}
