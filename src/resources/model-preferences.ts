// Model Preferences API resource
import type { Http } from '../core/http'
import type {
  ModelAvailability,
  ModelPreferenceCreate,
  ModelPreferencesBulkUpdate,
  ModelType,
  TenantModelPreference,
  TenantModelPreferencesResponse,
} from '../types/model-preferences'

export class ModelPreferencesResource {
  constructor(private readonly http: Http) {}

  /**
   * Get all model preferences for the tenant
   */
  async get(includeDefaults = true): Promise<TenantModelPreferencesResponse> {
    const params = new URLSearchParams()
    params.append('include_defaults', includeDefaults.toString())

    return this.http.get<TenantModelPreferencesResponse>(`/model-preferences?${params.toString()}`)
  }

  /**
   * Update multiple model preferences in a single request
   */
  async updateBulk(data: ModelPreferencesBulkUpdate): Promise<TenantModelPreferencesResponse> {
    return this.http.put<TenantModelPreferencesResponse>('/model-preferences', data)
  }

  /**
   * Update a specific model type preference
   */
  async update(modelType: ModelType, data: ModelPreferenceCreate): Promise<TenantModelPreference> {
    return this.http.patch<TenantModelPreference>(`/model-preferences/${modelType}`, data)
  }

  /**
   * Delete a model preference to revert to system default
   */
  async delete(modelType: ModelType): Promise<void> {
    await this.http.delete(`/model-preferences/${modelType}`)
  }

  /**
   * Check which models are available based on API key configuration
   */
  async checkAvailability(models: ModelPreferenceCreate[]): Promise<ModelAvailability[]> {
    return this.http.post<ModelAvailability[]>('/model-preferences/check-availability', models)
  }

  /**
   * List all model preferences (alias for get)
   */
  async list(params?: { includeDefaults?: boolean }): Promise<TenantModelPreferencesResponse> {
    return this.get(params?.includeDefaults)
  }
}
