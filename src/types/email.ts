/**
 * Email infrastructure types.
 *
 * These types map to the Python backend endpoints under /v1/email.
 */

// ==================== Request Types ====================

export interface SenderPersonaInput {
  firstName: string
  lastName: string
  title?: string
}

export interface ContactDetailsInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  organization: string
  addressLine1: string
  city: string
  state: string
  country: string
  postalCode: string
}

export interface EmailOnboardRequest {
  userId: string
  organizationName: string
  primaryWebsiteUrl: string
  companyDescription?: string
  physicalAddress: string
  dailyVolume: number
  volumeMode?: string
  senderPersonas: SenderPersonaInput[]
  contactDetails: ContactDetailsInput
}

export interface EmailOrgSettingsUpdate {
  dailyVolume?: number
  physicalAddress?: string
}

export interface AddPersonaRequest {
  firstName: string
  lastName: string
  title?: string
}

export interface AddOrgMemberRequest {
  email: string
  role?: string
}

// ==================== Response Types ====================

export interface EmailOnboardResponse {
  organizationId: string
  status: string
  message: string
}

export interface EmailOnboardStatusResponse {
  organizationId: string
  organizationName: string
  phase: string
  domains: Record<string, number>
  mailboxes: Record<string, number>
  estimatedReadyAt?: string | null
}

export interface EmailOrgSettingsResponse {
  organizationId: string
  organizationName: string
  dailyVolume: number
  volumeMode: string
  physicalAddress?: string | null
  senderPersonas: Array<Record<string, unknown>>
  domainsActive: number
  mailboxesReady: number
}

export interface EmailOrgHealthResponse {
  organizationId: string
  domains: Record<string, number>
  mailboxes: Record<string, number>
  sendsToday: number
  dailyCapacity: number
}

export interface EmailOrgSummary {
  id: string
  name: string
  role: string
  phase: string
  domainsActive: number
  mailboxesReady: number
}

export interface EmailOrgListResponse {
  organizations: EmailOrgSummary[]
}

export interface AddPersonaResponse {
  personaId: string
  message: string
}

export interface AddOrgMemberResponse {
  message: string
}

export interface RemoveOrgMemberResponse {
  message: string
}

export interface TeardownOrgResponse {
  message: string
}
