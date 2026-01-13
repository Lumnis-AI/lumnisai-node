// Integrations API types

/**
 * Integration provider types
 */
export enum ProviderType {
  COMPOSIO = 'composio',
  UNIPILE = 'unipile',
  NANGO = 'nango', // Future
  ARCADE = 'arcade', // Future
  MERGE = 'merge', // Future
}

export type ConnectionStatus = 'pending' | 'active' | 'failed' | 'expired' | 'not_connected'

export interface InitiateConnectionRequest {
  userId: string
  appName: string
  provider?: ProviderType
  redirectUrl?: string
  successRedirectUrl?: string
  failureRedirectUrl?: string
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
  isEnabled?: boolean // Optional for backwards compatibility
}

export interface ConnectionInfo {
  connectionId: string | null
  tenantId: string
  userId: string
  provider: ProviderType
  appName: string
  status: ConnectionStatus
  connectedAt: string | null
  metadata: Record<string, any>
}

export interface UserConnectionsResponse {
  userId: string
  connections: ConnectionInfo[]
}

export interface GetToolsRequest {
  userId: string
  provider?: ProviderType
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
  provider?: ProviderType
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
  providers: Record<string, string[]>
  totalProviders: number
  // Legacy fields for backward compatibility
  enabledApps?: string[]
  totalEnabled?: number
  availableApps?: string[]
  totalAvailable?: number
}

export interface AppEnabledResponse {
  provider: ProviderType
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

export interface ListProvidersResponse {
  providers: string[]
  total: number
}

export interface GetConnectionStatusParams {
  userId: string
  appName: string
  provider?: ProviderType
  includeEnabled?: boolean
}

export interface GetUserConnectionsParams {
  userId: string
  provider?: ProviderType
  appFilter?: string
}

export interface CheckAppEnabledParams {
  appName: string
  provider?: ProviderType
}

export interface UpdateAppStatusParams {
  appName: string
  enabled: boolean
  provider?: ProviderType
}

/**
 * Request parameters for batch connection status check
 */
export interface BatchConnectionRequest {
  userId: string
  appNames: string[]
  provider?: ProviderType
  includeEnabledStatus?: boolean
}

/**
 * Connection status in batch response
 */
export interface BatchConnectionStatus {
  appName: string
  status: ConnectionStatus
  connectedAt: string | null
  isEnabled: boolean
  errorMessage: string | null
}

/**
 * Response from batch connection status check
 */
export interface BatchConnectionResponse {
  userId: string
  connections: BatchConnectionStatus[]
  totalChecked: number
  activeCount: number
}

// ═══════════════════════════════════════════════════════════════════
// LinkedIn Connections Sync Types
// ═══════════════════════════════════════════════════════════════════

/**
 * Status for a sync phase (contact history or connections)
 */
export enum SyncPhaseStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'complete',
}

/**
 * Contact history (messages) sync status
 */
export interface ContactHistorySyncStatus {
  status: SyncPhaseStatus
  contactsMessaged: number
  progressPercent: number
  currentPage?: number | null
}

/**
 * Connections (network) sync status
 */
export interface ConnectionsSyncStatus {
  status: SyncPhaseStatus
  connectionsStored: number
  progressPercent: number
  lastSyncedAt?: string | null
}

/**
 * Detailed sync status for frontend progress tracking
 *
 * Example response:
 * {
 *   "connected": true,
 *   "syncInProgress": false,
 *   "lastSyncedAt": "2026-01-11T10:30:00Z",
 *   "contactHistory": {
 *     "status": "complete",
 *     "contactsMessaged": 21580,
 *     "progressPercent": 100
 *   },
 *   "connections": {
 *     "status": "complete",
 *     "connectionsStored": 6884,
 *     "progressPercent": 100,
 *     "lastSyncedAt": "2026-01-11T10:30:00Z"
 *   }
 * }
 */
export interface LinkedInSyncStatusResponse {
  connected: boolean
  syncInProgress: boolean
  lastSyncedAt?: string | null
  contactHistory?: ContactHistorySyncStatus | null
  connections?: ConnectionsSyncStatus | null
}

/**
 * Response after triggering a manual sync
 */
export interface TriggerSyncResponse {
  status: 'started' | 'already_running' | 'no_account'
  message: string
}

/**
 * Response after deleting connections
 */
export interface DeleteConnectionsResponse {
  deletedCount: number
  message: string
}
