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
  dailyVolumeCap?: number | null
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
  dailyVolumeCap?: number | null
}

export interface UpdatePersonaRequest {
  dailyVolumeCap?: number | null
}

export interface AddOrgMemberRequest {
  email: string
  role?: string
}

/**
 * Connect a customer's own (BYO) email inbox (Gmail/Outlook/IMAP) via Unipile
 * hosted auth. One call = one inbox; call once per inbox to add multiple.
 */
export interface ConnectInboxRequest {
  userId: string
  /** Email provider code: GOOGLE | OUTLOOK | MAIL. Defaults to GOOGLE. */
  appName?: string
  /** Base URL for OAuth success/failure callbacks. */
  redirectUrl: string
  /** Org to attach the mailbox to (defaults to the tenant BYO org). */
  organizationId?: string
  /** Persona to attach to (defaults to the shared BYO persona). */
  personaId?: string
  /** Initial per-mailbox daily cap; no hard ceiling, defaults to 40. */
  dailySendCap?: number
}

/**
 * Update a single mailbox's send settings. PATCH semantics — only provided
 * fields change.
 */
export interface MailboxUpdateRequest {
  /** Per-mailbox daily send cap (>= 1). No hard upper bound. */
  dailySendCap?: number
  /** Pause/unpause the mailbox. */
  paused?: boolean
}

/** Which inboxes to return from `listInboxes`. */
export type InboxKind = 'byo' | 'managed' | 'all'

/**
 * List the email inboxes (mailboxes) a user can send from.
 */
export interface ListInboxesParams {
  /** User email or UUID (REQUIRED). */
  userId: string
  /**
   * Which inboxes to return: 'byo' (customer-connected, the default),
   * 'managed' (Lumnis-provisioned), or 'all'. Defaults to 'byo'.
   */
  kind?: InboxKind
  /** Filter to a single organization. */
  organizationId?: string
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
  senderPersonas: EmailSenderPersona[]
  domainsActive: number
  mailboxesReady: number
}

export interface EmailSenderPersona {
  id: string
  firstName: string
  lastName: string
  title?: string | null
  dailyVolumeCap: number | null
  mailboxCount: number
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

export interface UpdatePersonaResponse {
  personaId: string
  dailyVolumeCap: number | null
  mailboxCount: number
  requestedTargetMailboxes: number
  mailboxesProvisioned: number
  partial: boolean
  shortfall: number
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

export interface ConnectInboxResponse {
  /** Hosted-auth redirect URL; the user authes there to complete the connect. */
  redirectUrl?: string | null
  status?: string | null
}

export interface MailboxUpdateResponse {
  mailboxId: string
  emailAddress: string
  status: string
  dailySendCap: number
  sendsToday: number
  /** Where this mailbox came from: inboxkit | unipile | smtp. */
  source: string
}

/** The sender persona an inbox is attached to (BYO inboxes share one). */
export interface EmailInboxPersona {
  id: string
  firstName: string
  lastName: string
  title?: string | null
}

/** A single sendable mailbox in the user's connected-inboxes list. */
export interface EmailInboxItem {
  mailboxId: string
  emailAddress: string
  displayName: string
  /** provisioning | warming | ready | paused | retired */
  status: string
  /** inboxkit | unipile | smtp */
  source: string
  dailySendCap: number
  sendsToday: number
  organizationId: string
  organizationName: string
  persona: EmailInboxPersona
  /** ISO8601 timestamp. */
  createdAt?: string | null
}

/** Connected inboxes for a user. `total` powers the count badge. */
export interface EmailInboxListResponse {
  inboxes: EmailInboxItem[]
  total: number
}
