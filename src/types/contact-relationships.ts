// Contact Relationship types

/** Provider type for contact relationship queries */
export type ContactRelationshipProvider = 'gmail' | 'outlook' | 'auto'

/** Status of the contact relationship computation */
export type ContactRelationshipStatus = 'ready' | 'not_connected' | 'computing' | 'failed'

/** A scored contact with email and calendar interaction data */
export interface ContactScore {
  email: string
  name: string
  sent: number
  received: number
  backAndForth: number
  threadCount: number
  meetingCount: number
  isBidirectional: boolean
  sources: string[]
  emailScore: number
  meetingScore: number
  relationshipScore: number
  reason: string
}

/** Response from the contact relationships endpoint */
export interface ContactRelationshipResponse {
  contacts: ContactScore[]
  totalContacts: number
  provider: string | null
  status: ContactRelationshipStatus
  cachedAt: string | null
  staleAfter: string | null
  isCached: boolean
  message: string | null
  availableProviders: string[] | null
  errorMessage: string | null
}

/** Options for fetching contact relationships */
export interface GetContactRelationshipsOptions {
  /** User UUID or email address */
  userId: string
  /** Email provider: "gmail", "outlook", or "auto" (default: "auto") */
  provider?: ContactRelationshipProvider
  /** Max contacts to return (1-500, default: 50) */
  limit?: number
  /** Pagination offset (default: 0) */
  offset?: number
  /** Force recompute even if cached (default: false) */
  forceRefresh?: boolean
}
