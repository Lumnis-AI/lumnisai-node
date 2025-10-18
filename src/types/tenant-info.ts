// Tenant Info API types
import type { UUID } from './common'

export type Plan = 'shared'
export type DatabaseStatus = 'provisioning' | 'active' | 'suspended' | 'failed'
export type BillingStatus = 'trial' | 'active' | 'past_due' | 'canceled'
export type ApiKeyMode = 'platform' | 'byo_keys'

export interface TenantDetailsResponse {
  id: UUID
  name: string
  developerId: UUID
  developerEmail: string
  plan: Plan
  dbStatus: DatabaseStatus
  billingStatus: BillingStatus
  apiKeyMode: ApiKeyMode
  createdAt: string
  updatedAt: string
}
