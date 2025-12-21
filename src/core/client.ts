import type { Message, Scope } from '../types/common'
import type { ApiKeyModeResponse, DeleteApiKeyResponse, ExternalApiKeyResponse } from '../types/external-api-keys'
import type { AppEnabledResponse, AppsListResponse, BatchConnectionResponse, ConnectionStatusResponse, DisconnectResponse, GetToolsResponse, InitiateConnectionResponse, ListProvidersResponse, UpdateAppStatusResponse, UserConnectionsResponse } from '../types/integrations'
import type { MCPServerListResponse, MCPServerResponse, MCPToolListResponse, TestConnectionResponse } from '../types/mcp-servers'
import type { TenantModelPreferencesResponse } from '../types/model-preferences'
import type { CreateResponseRequest, CreateResponseResponse, ProgressEntry, ResponseObject } from '../types/responses'
import type { SkillGuidelineCreate, SkillGuidelineListResponse, SkillGuidelineResponse, SkillGuidelineUpdate } from '../types/skills'
import type { ThreadListResponse, ThreadObject } from '../types/threads'
import type { UserDeleteResponse, UserListResponse, UserResponse } from '../types/users'
import { DEFAULT_BASE_URL, DEFAULT_MAX_RETRIES, DEFAULT_POLL_INTERVAL_MS, DEFAULT_TIMEOUT_MS, LONG_POLL_TIMEOUT_S } from '../constants'
import { ExternalAPIKeysResource } from '../resources/external-api-keys'
import { FilesResource } from '../resources/files'
import { IntegrationsResource } from '../resources/integrations'
import { MCPServersResource } from '../resources/mcp-servers'
import { MessagingResource } from '../resources/messaging'
import { ModelPreferencesResource } from '../resources/model-preferences'
import { PeopleResource } from '../resources/people'
import { ResponsesResource } from '../resources/responses'
import { SequencesResource } from '../resources/sequences'
import { SkillsResource } from '../resources/skills'
import { TenantInfoResource } from '../resources/tenant-info'
import { ThreadsResource } from '../resources/threads'
import { UsersResource } from '../resources/users'
// Main Lumnis AI client
import { Http } from './http'

export interface LumnisClientOptions {
  apiKey?: string
  tenantId?: string
  baseUrl?: string
  timeoutMs?: number
  maxRetries?: number
  scope?: Scope
  _scopedUserId?: string
}

export type InvokeMessages = string | Message | Message[]

export interface InvokeOptions extends Partial<Omit<CreateResponseRequest, 'messages'>> {
  scope?: Scope
  showProgress?: boolean
  pollIntervalMs?: number
  maxWaitMs?: number
}

export interface InvokeStreamOptions extends InvokeOptions {
  showProgress?: false
}

export class LumnisClient {
  private readonly http: Http
  public readonly tenantId?: string

  // Resources
  public readonly threads: ThreadsResource
  public readonly responses: ResponsesResource
  public readonly users: UsersResource
  public readonly files: FilesResource
  public readonly tenantInfo: TenantInfoResource
  public readonly externalApiKeys: ExternalAPIKeysResource
  public readonly integrations: IntegrationsResource
  public readonly modelPreferences: ModelPreferencesResource
  public readonly mcpServers: MCPServersResource
  public readonly skills: SkillsResource
  public readonly people: PeopleResource
  public readonly messaging: MessagingResource
  public readonly sequences: SequencesResource

  private readonly _scopedUserId?: string
  private readonly _defaultScope: Scope

  constructor(options: LumnisClientOptions = {}) {
    // Use provided values or fall back to environment variables
    // eslint-disable-next-line node/prefer-global/process
    const apiKey = options.apiKey || (typeof process !== 'undefined' && process.env?.LUMNISAI_API_KEY)
    if (!apiKey) {
      throw new Error('API key is required. Provide it via options.apiKey or set LUMNISAI_API_KEY environment variable.')
    }

    // eslint-disable-next-line node/prefer-global/process
    this.tenantId = options.tenantId || (typeof process !== 'undefined' && process.env?.LUMNISAI_TENANT_ID) || undefined
    // eslint-disable-next-line node/prefer-global/process
    const baseUrl = options.baseUrl || (typeof process !== 'undefined' && process.env?.LUMNISAI_BASE_URL) || DEFAULT_BASE_URL

    this._defaultScope = options.scope || 'tenant'
    this._scopedUserId = options._scopedUserId

    this.http = new Http({
      baseUrl,
      apiPrefix: '/v1',
      headers: {
        'X-API-Key': apiKey,
      },
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    })

    // Initialize resources
    this.threads = new ThreadsResource(this.http)
    this.responses = new ResponsesResource(this.http)
    this.users = new UsersResource(this.http)
    this.files = new FilesResource(this.http)
    this.tenantInfo = new TenantInfoResource(this.http)
    this.externalApiKeys = new ExternalAPIKeysResource(this.http)
    this.integrations = new IntegrationsResource(this.http)
    this.modelPreferences = new ModelPreferencesResource(this.http)
    this.mcpServers = new MCPServersResource(this.http)
    this.skills = new SkillsResource(this.http)
    this.people = new PeopleResource(this.http)
    this.messaging = new MessagingResource(this.http)
    this.sequences = new SequencesResource(this.http)
  }

  forUser(userId: string): LumnisClient {
    return new LumnisClient({
      apiKey: (this.http as any).options.headers['X-API-Key'],
      tenantId: this.tenantId,
      baseUrl: (this.http as any).options.baseUrl,
      timeoutMs: (this.http as any).options.timeoutMs,
      maxRetries: (this.http as any).options.maxRetries,
      scope: 'user',
      _scopedUserId: userId,
    })
  }

  async invoke(
    messages: InvokeMessages,
    options: InvokeOptions & { stream?: false },
  ): Promise<ResponseObject>
  async invoke(
    messages: InvokeMessages,
    options: InvokeOptions & { stream: true },
  ): Promise<AsyncGenerator<ProgressEntry, void, unknown>>
  async invoke(
    messages: InvokeMessages,
    options: InvokeOptions & { stream?: boolean },
  ): Promise<ResponseObject | AsyncGenerator<ProgressEntry, void, unknown>> {
    const { stream = false, showProgress = true, ...restOptions } = options || {}

    if (stream) {
      if (showProgress)

        console.warn('showProgress is not supported in streaming mode.')
      return this._invokeStream(messages, restOptions)
    }
    else {
      let progressCallback: ((response: ResponseObject) => void) | undefined
      if (showProgress)
        progressCallback = createSimpleProgressCallback()

      return this._invokeAndWait(messages, restOptions, progressCallback)
    }
  }

  private async* _invokeStream(
    messages: InvokeMessages,
    options: Omit<InvokeOptions, 'showProgress'>,
  ): AsyncGenerator<ProgressEntry, void, unknown> {
    const response = await this._createResponse(messages, options)
    // eslint-disable-next-line no-console
    console.log(`Response ID: ${response.responseId}`)

    let lastMessageCount = 0
    const toolCallCounts = new Map<number, number>() // Track tool calls per message index

    while (true) {
      const current = await this.responses.get(response.responseId, { wait: LONG_POLL_TIMEOUT_S })
      const currentMessageCount = current.progress?.length || 0

      // Yield only new progress entries
      if (currentMessageCount > lastMessageCount && current.progress) {
        // Yield each new progress entry individually
        for (let i = lastMessageCount; i < currentMessageCount; i++) {
          const entry = current.progress[i]
          // Track initial tool call count for new entries
          toolCallCounts.set(i, entry.toolCalls?.length || 0)
          yield entry
        }
        lastMessageCount = currentMessageCount
      }

      // Check for new tool calls in existing messages
      if (current.progress) {
        for (let i = 0; i < Math.min(lastMessageCount, currentMessageCount); i++) {
          const entry = current.progress[i]
          const currentToolCallCount = entry.toolCalls?.length || 0
          const previousToolCallCount = toolCallCounts.get(i) || 0

          if (currentToolCallCount > previousToolCallCount) {
            // Create an update entry with just the new tool calls
            const newToolCalls = entry.toolCalls?.slice(previousToolCallCount) || []
            const truncatedMessage = entry.message.length > 50
              ? `${entry.message.substring(0, 50)}...`
              : entry.message

            const toolUpdateEntry: ProgressEntry = {
              ts: new Date().toISOString(),
              state: 'tool_update',
              message: `[Tool calls for: ${truncatedMessage}]`,
              toolCalls: newToolCalls,
            }
            yield toolUpdateEntry
            toolCallCounts.set(i, currentToolCallCount)
          }
        }
      }

      if (current.status === 'succeeded' || current.status === 'failed' || current.status === 'cancelled') {
        if (current.status === 'succeeded' && current.outputText) {
          const progressEntry: ProgressEntry = {
            ts: current.completedAt || new Date().toISOString(),
            state: 'completed',
            message: 'Task completed successfully',
            outputText: current.outputText,
          }
          yield progressEntry
        }
        break
      }

      // Wait before next poll (only in regular polling mode)
      await new Promise(resolve => setTimeout(resolve, DEFAULT_POLL_INTERVAL_MS))
    }
  }

  private async _invokeAndWait(
    messages: InvokeMessages,
    options: Omit<InvokeOptions, 'showProgress' | 'stream'>,
    progressCallback?: (response: ResponseObject) => void,
  ): Promise<ResponseObject> {
    const { pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, maxWaitMs = 300000, ...createOptions } = options || {}

    const response = await this._createResponse(messages, createOptions)

    if (!progressCallback)
      // eslint-disable-next-line no-console
      console.log(`Response ID: ${response.responseId}`)

    const startTime = Date.now()
    while (true) {
      const current = await this.responses.get(response.responseId, { wait: LONG_POLL_TIMEOUT_S })

      if (progressCallback)
        progressCallback(current)

      if (current.status === 'succeeded' || current.status === 'failed' || current.status === 'cancelled')
        return current

      if (Date.now() - startTime > maxWaitMs)
        throw new Error(`Response ${response.responseId} timed out after ${maxWaitMs}ms`)

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }
  }

  private async _createResponse(
    messages: InvokeMessages,
    options: Omit<InvokeOptions, 'showProgress' | 'stream' | 'pollIntervalMs' | 'maxWaitMs'>,
  ): Promise<CreateResponseResponse> {
    const { scope: optionScope, userId: optionUserId, ...restOptions } = options

    const effectiveUserId = optionUserId || this._scopedUserId
    let scope = optionScope || this._defaultScope

    if (effectiveUserId && scope === 'tenant')
      scope = 'user'

    if (scope === 'user' && !effectiveUserId)
      throw new Error('user_id is required for user scope')

    if (scope === 'tenant')
      await this.http.warnTenantScope()

    let messageArray: Message[]
    if (typeof messages === 'string')
      messageArray = [{ role: 'user', content: messages }]
    else if (Array.isArray(messages))
      messageArray = messages
    else
      messageArray = [messages]

    return this.responses.create({
      messages: messageArray,
      userId: effectiveUserId,
      ...restOptions,
    })
  }

  // Thread methods
  async listThreads(params?: Parameters<ThreadsResource['list']>[0]): Promise<ThreadListResponse> {
    return this.threads.list(params)
  }

  async createThread(params?: Parameters<ThreadsResource['create']>[0]): Promise<ThreadObject> {
    return this.threads.create(params)
  }

  async getThread(threadId: string): Promise<ThreadObject> {
    return this.threads.get(threadId)
  }

  async deleteThread(threadId: string): Promise<void> {
    return this.threads.delete(threadId)
  }

  // User methods
  async createUser(params: Parameters<UsersResource['create']>[0]): Promise<UserResponse> {
    return this.users.create(params)
  }

  async getUser(userId: string): Promise<UserResponse> {
    return this.users.get(userId)
  }

  async updateUser(userId: string, params: Parameters<UsersResource['update']>[1]): Promise<UserResponse> {
    return this.users.update(userId, params)
  }

  async deleteUser(userId: string): Promise<UserDeleteResponse> {
    return this.users.delete(userId)
  }

  async listUsers(params?: Parameters<UsersResource['list']>[0]): Promise<UserListResponse> {
    return this.users.list(params)
  }

  // External API Key methods
  async addApiKey(params: Parameters<ExternalAPIKeysResource['create']>[0]): Promise<ExternalApiKeyResponse> {
    return this.externalApiKeys.create(params)
  }

  async listApiKeys(): Promise<ExternalApiKeyResponse[]> {
    return this.externalApiKeys.list()
  }

  async getApiKey(keyId: string): Promise<ExternalApiKeyResponse> {
    return this.externalApiKeys.get(keyId)
  }

  async deleteApiKey(provider: Parameters<ExternalAPIKeysResource['delete']>[0]): Promise<DeleteApiKeyResponse> {
    return this.externalApiKeys.delete(provider)
  }

  async getApiKeyMode(): Promise<ApiKeyModeResponse> {
    return this.externalApiKeys.getMode()
  }

  async setApiKeyMode(mode: Parameters<ExternalAPIKeysResource['setMode']>[0]): Promise<ApiKeyModeResponse> {
    return this.externalApiKeys.setMode(mode)
  }

  // Integration methods
  async listApps(params?: Parameters<IntegrationsResource['listApps']>[0]): Promise<AppsListResponse> {
    return this.integrations.listApps(params)
  }

  async listProviders(): Promise<ListProvidersResponse> {
    return this.integrations.listProviders()
  }

  async isAppEnabled(appName: string, provider?: string): Promise<AppEnabledResponse> {
    return this.integrations.isAppEnabled(appName, provider)
  }

  async setAppEnabled(appName: string, enabled: boolean, provider?: string): Promise<UpdateAppStatusResponse> {
    return this.integrations.setAppEnabled(appName, { enabled, provider })
  }

  async initiateConnection(params: Parameters<IntegrationsResource['initiateConnection']>[0]): Promise<InitiateConnectionResponse> {
    return this.integrations.initiateConnection(params)
  }

  async getConnectionStatus(
    userId: string,
    appName: string,
    provider?: string,
  ): Promise<ConnectionStatusResponse>
  async getConnectionStatus(
    userId: string,
    appName: string,
    options?: { provider?: string, includeEnabled?: boolean },
  ): Promise<ConnectionStatusResponse>
  async getConnectionStatus(
    userId: string,
    appName: string,
    providerOrOptions?: string | { provider?: string, includeEnabled?: boolean },
  ): Promise<ConnectionStatusResponse> {
    // Handle backward compatibility: if third param is a string, treat it as provider
    if (typeof providerOrOptions === 'string') {
      return this.integrations.getConnectionStatus({
        userId,
        appName,
        provider: providerOrOptions as any,
      })
    }
    // Otherwise, treat it as options object
    return this.integrations.getConnectionStatus({
      userId,
      appName,
      provider: providerOrOptions?.provider as any,
      includeEnabled: providerOrOptions?.includeEnabled,
    })
  }

  async getConnectionsBatch(params: {
    userId: string
    appNames: string[]
    provider?: string
    includeEnabledStatus?: boolean
  }): Promise<BatchConnectionResponse> {
    return this.integrations.getConnectionsBatch({
      userId: params.userId,
      appNames: params.appNames,
      provider: params.provider as any,
      includeEnabledStatus: params.includeEnabledStatus,
    })
  }

  async listConnections(userId: string, params?: { appFilter?: string, provider?: string }): Promise<UserConnectionsResponse> {
    return this.integrations.listConnections(userId, params)
  }

  async getIntegrationTools(userId: string, params?: { appFilter?: string[], provider?: string }): Promise<GetToolsResponse> {
    return this.integrations.getTools({ userId, appFilter: params?.appFilter, provider: params?.provider as any })
  }

  async disconnect(userId: string, appName: string, provider?: string): Promise<DisconnectResponse> {
    return this.integrations.disconnect({ userId, appName, provider: provider as any })
  }

  // Model Preference methods
  async getModelPreferences(params?: Parameters<ModelPreferencesResource['list']>[0]): Promise<TenantModelPreferencesResponse> {
    return this.modelPreferences.list(params)
  }

  async updateModelPreferences(params: Parameters<ModelPreferencesResource['updateBulk']>[0]): Promise<TenantModelPreferencesResponse> {
    return this.modelPreferences.updateBulk(params)
  }

  // MCP Server methods
  async createMcpServer(params: Parameters<MCPServersResource['create']>[0]): Promise<MCPServerResponse> {
    return this.mcpServers.create(params)
  }

  async getMcpServer(serverId: string): Promise<MCPServerResponse> {
    return this.mcpServers.get(serverId)
  }

  async listMcpServers(params?: Parameters<MCPServersResource['list']>[0]): Promise<MCPServerListResponse> {
    return this.mcpServers.list(params)
  }

  async updateMcpServer(serverId: string, params: Parameters<MCPServersResource['update']>[1]): Promise<MCPServerResponse> {
    return this.mcpServers.update(serverId, params)
  }

  async deleteMcpServer(serverId: string): Promise<void> {
    return this.mcpServers.delete(serverId)
  }

  async listMcpServerTools(serverId: string): Promise<MCPToolListResponse> {
    return this.mcpServers.listTools(serverId)
  }

  async testMcpServer(serverId: string): Promise<TestConnectionResponse> {
    return this.mcpServers.testConnection(serverId)
  }

  // Skills methods
  async createSkill(skillData: SkillGuidelineCreate, options?: { userId?: string }): Promise<SkillGuidelineResponse> {
    return this.skills.create(skillData, options)
  }

  async getSkill(skillId: string): Promise<SkillGuidelineResponse> {
    return this.skills.get(skillId)
  }

  async listSkills(params?: Parameters<SkillsResource['list']>[0]): Promise<SkillGuidelineListResponse> {
    return this.skills.list(params)
  }

  async updateSkill(skillId: string, updates: SkillGuidelineUpdate): Promise<SkillGuidelineResponse> {
    return this.skills.update(skillId, updates)
  }

  async deleteSkill(skillId: string): Promise<void> {
    return this.skills.delete(skillId)
  }
}

function createSimpleProgressCallback(): (response: ResponseObject) => void {
  let lastStatus: string | undefined
  const seenMessages = new Set<string>()
  const messageToolCalls = new Map<string, Set<string>>() // Track tool calls per message

  return (response: ResponseObject) => {
    if (response.status !== lastStatus) {
      // Don't print status anymore to match Python behavior
      lastStatus = response.status
    }

    if (response.progress) {
      for (const entry of response.progress) {
        // Create a unique key for this message
        const messageKey = `${entry.state}:${entry.message}`

        // Print message if new
        if (!seenMessages.has(messageKey)) {
          // eslint-disable-next-line no-console
          console.log(`${entry.state.toUpperCase()}: ${entry.message}`)
          seenMessages.add(messageKey)
          messageToolCalls.set(messageKey, new Set())
        }

        // Print any new tool calls for this message
        if (entry.toolCalls && messageToolCalls.has(messageKey)) {
          const seenToolCalls = messageToolCalls.get(messageKey)!
          for (const toolCall of entry.toolCalls) {
            const toolName = toolCall.name || 'unknown'
            const toolArgs = toolCall.args || {}
            // Create unique key for this tool call
            const toolKey = `${toolName}:${JSON.stringify(toolArgs)}`

            if (!seenToolCalls.has(toolKey)) {
              // eslint-disable-next-line node/prefer-global/process
              process.stdout.write(`\t→ ${toolName}`)
              if (Object.keys(toolArgs).length > 0) {
                // Format args compactly
                const argsStr = Object.entries(toolArgs)
                  .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                  .join(', ')
                // eslint-disable-next-line no-console
                console.log(`(${argsStr})`)
              }
              else {
                // eslint-disable-next-line no-console
                console.log()
              }
              seenToolCalls.add(toolKey)
            }
          }
        }
      }
    }
  }
}
