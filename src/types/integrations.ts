// Integrations API types

export type ConnectionStatus = 'pending' | 'active' | 'failed' | 'expired' | 'not_connected'

export interface InitiateConnectionRequest {
  userId: string
  appName: string
  redirectUrl?: string
  authMode?: string // Future use
  connectionParams?: Record<string, any> // Future use
}

export interface InitiateConnectionResponse {
  redirectUrl?: string | null
  status: string
  message?: string | null
}

export interface ConnectionStatusResponse {
  appName: string
  status: ConnectionStatus
  connectedAt?: string | null
  errorMessage?: string | null
}

export interface ConnectionInfo {
  appName: string
  status: ConnectionStatus
  connectedAt?: string | null
  errorMessage?: string | null
}

export interface UserConnectionsResponse {
  userId: string
  connections: ConnectionInfo[]
}

export interface GetToolsRequest {
  userId: string
  appFilter?: string[]
}

export interface ToolInfo {
  name: string
  description: string
  appName: string
  parameters?: Record<string, any> | null
}

export interface GetToolsResponse {
  userId: string
  tools: ToolInfo[]
  toolCount: number
}

export interface DisconnectRequest {
  userId: string
  appName: string
}

export interface DisconnectResponse {
  success: boolean
  message: string
}

export interface ConnectionCallbackRequest {
  connectionId: string
  code?: string
  state?: string
  error?: string
}

export interface ConnectionCallbackResponse {
  success: boolean
  status: string
  message: string
}

export interface AppsListResponse {
  enabledApps: string[]
  totalEnabled: number
  availableApps?: string[]
  totalAvailable?: number
}

export interface AppEnabledResponse {
  appName: string
  enabled: boolean
  message: string
}

export interface UpdateAppStatusResponse {
  appName: string
  enabled: boolean
  message: string
  updatedAt: string
}
