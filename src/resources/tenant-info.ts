// Tenant Info API resource
import type { Http } from '../core/http'
import type { TenantDetailsResponse } from '../types/tenant-info'

export class TenantInfoResource {
  constructor(private readonly http: Http) {}

  /**
   * Get detailed information about a tenant
   * Users can only access information about their own tenant
   */
  async get(tenantId: string): Promise<TenantDetailsResponse> {
    return this.http.get<TenantDetailsResponse>(`/tenants/${tenantId}`)
  }
}
