// Model Preferences API types

export type ModelType = 'CHEAP_MODEL' | 'FAST_MODEL' | 'SMART_MODEL' | 'REASONING_MODEL' | 'VISION_MODEL'

export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'azure_openai'
  | 'azure_ai'
  | 'google_vertexai'
  | 'google_genai'
  | 'google_anthropic_vertex'
  | 'bedrock'
  | 'bedrock_converse'
  | 'cohere'
  | 'fireworks'
  | 'together'
  | 'mistralai'
  | 'huggingface'
  | 'groq'
  | 'ollama'
  | 'deepseek'
  | 'ibm'
  | 'nvidia'
  | 'xai'
  | 'perplexity'

export interface TenantModelPreference {
  tenantId: string
  modelType: ModelType
  provider: ModelProvider
  modelName: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TenantModelPreferencesResponse {
  tenantId: string
  preferences: TenantModelPreference[]
  defaultsApplied: ModelType[]
}

export interface ModelPreferenceCreate {
  modelType: ModelType
  provider: ModelProvider
  modelName: string
}

export interface ModelPreferencesBulkUpdate {
  preferences: Record<ModelType, {
    provider: ModelProvider
    modelName: string
  }>
}

export interface ModelAvailability {
  modelType: ModelType
  provider: ModelProvider
  modelName: string
  isAvailable: boolean
  reason?: string | null
  requiresApiKey: boolean
}
