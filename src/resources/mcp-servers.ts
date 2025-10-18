// MCP Servers API resource
import type { Http } from '../core/http'
import type {
  MCPScope,
  MCPServerCreateRequest,
  MCPServerListResponse,
  MCPServerResponse,
  MCPServerUpdateRequest,
  MCPToolListResponse,
  TestConnectionResponse,
} from '../types/mcp-servers'

export class MCPServersResource {
  constructor(private readonly http: Http) {}

  /**
   * Create a new MCP server configuration
   */
  async create(data: MCPServerCreateRequest): Promise<MCPServerResponse> {
    return this.http.post<MCPServerResponse>('/mcp-servers', data)
  }

  /**
   * List MCP server configurations
   */
  async list(params?: {
    scope?: MCPScope | 'all'
    userIdentifier?: string
    isActive?: boolean
    skip?: number
    limit?: number
  }): Promise<MCPServerListResponse> {
    const queryParams = new URLSearchParams()

    if (params?.scope)
      queryParams.append('scope', params.scope)
    if (params?.userIdentifier)
      queryParams.append('user_identifier', params.userIdentifier)
    if (params?.isActive !== undefined)
      queryParams.append('is_active', params.isActive.toString())
    if (params?.skip)
      queryParams.append('skip', params.skip.toString())
    if (params?.limit)
      queryParams.append('limit', params.limit.toString())

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.http.get<MCPServerListResponse>(`/mcp-servers${query}`)
  }

  /**
   * Get a specific MCP server configuration
   */
  async get(serverId: string): Promise<MCPServerResponse> {
    return this.http.get<MCPServerResponse>(`/mcp-servers/${serverId}`)
  }

  /**
   * Update an MCP server configuration
   */
  async update(serverId: string, data: MCPServerUpdateRequest): Promise<MCPServerResponse> {
    return this.http.patch<MCPServerResponse>(`/mcp-servers/${serverId}`, data)
  }

  /**
   * Delete an MCP server configuration
   */
  async delete(serverId: string): Promise<void> {
    await this.http.delete(`/mcp-servers/${serverId}`)
  }

  /**
   * List tools provided by an MCP server
   * Note: Currently returns empty list, tool indexing coming in Phase 1
   */
  async listTools(serverId: string): Promise<MCPToolListResponse> {
    return this.http.get<MCPToolListResponse>(`/mcp-servers/${serverId}/tools`)
  }

  /**
   * Test connection to an MCP server
   * Note: Currently returns placeholder, testing coming in Phase 1
   */
  async testConnection(serverId: string): Promise<TestConnectionResponse> {
    return this.http.post<TestConnectionResponse>(`/mcp-servers/${serverId}/test`)
  }

  /**
   * Test an MCP server configuration before saving
   * Validates that the server can be connected to without creating a permanent configuration
   */
  async testConfig(config: {
    transport: 'stdio' | 'streamable_http' | 'sse'
    command?: string
    args?: string[]
    url?: string
    env?: Record<string, string>
    headers?: Record<string, string>
  }): Promise<TestConnectionResponse> {
    return this.http.post<TestConnectionResponse>('/mcp-servers/test', config)
  }
}
