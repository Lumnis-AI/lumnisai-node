// Response API types
import type { Message, UUID } from './common'

export type ResponseStatus = 'queued' | 'in_progress' | 'succeeded' | 'failed' | 'cancelled'
export type AgentEffort = 'low' | 'medium' | 'high'

export interface FileAttachment {
  name: string
  uri: string
  mimeType?: string | null
  sizeBytes?: number | null
}

export interface AgentConfig {
  planStrategy?: 'llm_io' | string
  plannerModelType?: 'SMART_MODEL' | 'REASONING_MODEL' | string
  coordinatorModelType?: 'SMART_MODEL' | 'REASONING_MODEL' | string
  orchestratorModelType?: 'SMART_MODEL' | 'REASONING_MODEL' | string | null

  // Optional: Model name overrides (e.g., 'openai:gpt-4o', 'anthropic:claude-3-7-sonnet-20250219')
  plannerModelName?: string | null
  coordinatorModelName?: string | null
  orchestratorModelName?: string | null
  finalResponseModelName?: string | null
  fastModelName?: string | null

  // Optional: Feature flags
  useCognitiveTools?: boolean
  enableTaskValidation?: boolean
  generateComprehensiveOutput?: boolean
}

export interface ModelOverrides {
  [key: string]: string
}

export interface CreateResponseRequest {
  threadId?: UUID
  messages: Message[]
  agentEffort?: AgentEffort
  costCapUsd?: number
  files?: FileAttachment[]
  options?: Record<string, any>
  priority?: number
  userId?: string
  agentConfig?: AgentConfig
  responseFormat?: Record<string, any>
  responseFormatInstructions?: string
  modelOverrides?: ModelOverrides
}

export interface ProgressEntry {
  ts: string
  state: string
  message: string
  toolCalls?: Array<Record<string, any>> | null
  outputText?: string | null
}

export interface ResponseArtifact {
  type: string
  language?: string
  content: string
  [key: string]: any
}

export interface ResponseObject {
  responseId: UUID
  threadId: UUID
  tenantId: UUID
  userId?: UUID | null
  status: ResponseStatus
  progress: ProgressEntry[]
  inputMessages: Message[]
  outputText?: string | null
  content?: string | null // Alias for outputText
  structuredResponse?: Record<string, any> | null
  artifacts?: ResponseArtifact[] | null
  createdAt: string
  completedAt?: string | null
  error?: Record<string, any> | null
  options?: Record<string, any> | null
}

export interface CreateResponseResponse {
  responseId: UUID
  threadId: UUID
  status: ResponseStatus
  tenantId: UUID
  createdAt: string
}

export interface CancelResponseResponse {
  status: string
  message: string
}

export interface ArtifactObject {
  artifactId: UUID
  responseId: UUID
  name: string
  uri: string
  mimeType: string
  bytes: number
  createdAt: string
}

export interface ArtifactsListResponse {
  artifacts: ArtifactObject[]
  total: number
  limit: number
  offset: number
}

export interface ResponseListResponse {
  responses: ResponseObject[]
  total: number
  limit: number
  offset: number
}
