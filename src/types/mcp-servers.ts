// MCP Servers API types
import type { UUID } from './common'

export type MCPTransport = 'stdio' | 'streamable_http' | 'sse'
export type MCPScope = 'tenant' | 'user'

export interface MCPServerCreateRequest {
  name: string
  description?: string
  transport: MCPTransport
  scope: MCPScope
  userIdentifier?: string // Required for user scope
  command?: string // Required for stdio transport
  args?: string[] // For stdio transport
  url?: string // Required for HTTP transports
  env?: Record<string, string>
  headers?: Record<string, string>
}

export interface MCPServerResponse {
  id: UUID
  tenantId: UUID
  userId?: UUID | null
  scope: MCPScope
  name: string
  description?: string | null
  transport: MCPTransport
  command?: string | null
  args?: string[] | null
  url?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MCPServerUpdateRequest {
  name?: string
  description?: string
  url?: string
  env?: Record<string, string>
  headers?: Record<string, string>
  isActive?: boolean
}

export interface MCPServerListResponse {
  servers: MCPServerResponse[]
  total: number
  skip: number
  limit: number
}

export interface MCPToolResponse {
  name: string
  description: string
  inputSchema?: Record<string, any> | null
}

export interface MCPToolListResponse {
  serverId: UUID
  serverName: string
  tools: MCPToolResponse[]
  total: number
}

export interface TestConnectionResponse {
  success: boolean
  message: string
  toolCount?: number | null
  errorDetails?: string | null
}
