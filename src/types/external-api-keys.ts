// External API Keys types
import type { ApiKeyMode } from './tenant-info'

export type ApiProvider =
  | 'OPENAI_API_KEY'
  | 'ANTHROPIC_API_KEY'
  | 'EXA_API_KEY'
  | 'COHERE_API_KEY'
  | 'GOOGLE_API_KEY'
  | 'SERPAPI_API_KEY'
  | 'GROQ_API_KEY'
  | 'NVIDIA_API_KEY'
  | 'FIREWORKS_API_KEY'
  | 'MISTRAL_API_KEY'
  | 'TOGETHER_API_KEY'
  | 'XAI_API_KEY'
  | 'PPLX_API_KEY'
  | 'HUGGINGFACE_API_KEY'
  | 'DEEPSEEK_API_KEY'
  | 'IBM_API_KEY'
  | 'E2B_API_KEY'

export interface StoreApiKeyRequest {
  provider: ApiProvider
  apiKey: string
}

export interface ExternalApiKeyResponse {
  keyId: string
  provider: string
  isActive: boolean
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: string | null
}

export interface ApiKeyModeResponse {
  apiKeyMode: ApiKeyMode
}

export interface ApiKeyModeRequest {
  mode: ApiKeyMode
}

export interface DeleteApiKeyResponse {
  message: string
}
