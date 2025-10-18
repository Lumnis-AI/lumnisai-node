// External API Keys resource
import type { Http } from '../core/http'
import type {
  ApiKeyModeRequest,
  ApiKeyModeResponse,
  ApiProvider,
  DeleteApiKeyResponse,
  ExternalApiKeyResponse,
  StoreApiKeyRequest,
} from '../types/external-api-keys'

export class ExternalAPIKeysResource {
  constructor(private readonly http: Http) {}

  /**
   * Store a new external API key (encrypted)
   */
  async store(data: StoreApiKeyRequest): Promise<ExternalApiKeyResponse> {
    return this.http.post<ExternalApiKeyResponse>('/external-api-keys', data)
  }

  /**
   * Create a new external API key (alias for store)
   */
  async create(data: StoreApiKeyRequest): Promise<ExternalApiKeyResponse> {
    return this.store(data)
  }

  /**
   * List all configured external API keys (metadata only, no key values)
   */
  async list(): Promise<ExternalApiKeyResponse[]> {
    return this.http.get<ExternalApiKeyResponse[]>('/external-api-keys')
  }

  /**
   * Get details for a specific external API key (no key value)
   */
  async get(keyId: string): Promise<ExternalApiKeyResponse> {
    return this.http.get<ExternalApiKeyResponse>(`/external-api-keys/${keyId}`)
  }

  /**
   * Delete an external API key for a specific provider
   */
  async delete(provider: ApiProvider): Promise<DeleteApiKeyResponse> {
    return this.http.delete<DeleteApiKeyResponse>(`/external-api-keys/${provider}`)
  }

  /**
   * Get the current API key mode
   */
  async getMode(): Promise<ApiKeyModeResponse> {
    return this.http.get<ApiKeyModeResponse>('/external-api-keys/mode')
  }

  /**
   * Update the API key mode
   */
  async updateMode(data: ApiKeyModeRequest): Promise<ApiKeyModeResponse> {
    return this.http.patch<ApiKeyModeResponse>('/external-api-keys/mode', data)
  }

  /**
   * Set the API key mode (alias for updateMode)
   */
  async setMode(data: ApiKeyModeRequest): Promise<ApiKeyModeResponse> {
    return this.updateMode(data)
  }
}
