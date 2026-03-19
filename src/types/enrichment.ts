// Contact Enrichment types

/** Input for one person to enrich */
export interface ContactEnrichPersonInput {
  linkedinUrl?: string | null
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  companyName?: string | null
  companyWebsite?: string | null
  companyLinkedinUrl?: string | null
  personId?: string | null
}

/** Request to enrich one or more persons */
export interface ContactEnrichRequest {
  prospects: ContactEnrichPersonInput[]
  /** Only return/charge for records with verified email (default: true) */
  onlyVerifiedEmail?: boolean
  /** Enrich mobile number - costs 10 credits per match vs 1 for email only (default: false) */
  enrichMobile?: boolean
  /** Only return/charge for records with verified mobile (default: false) */
  onlyVerifiedMobile?: boolean
}

/** Result for one person */
export interface ContactEnrichPersonResult {
  /** Position in input list */
  index: number
  matched: boolean
  freeEnrichment?: boolean | null
  /** NO_MATCH, INVALID_DATAPOINTS, or URL_RESOLUTION_FAILED */
  errorCode?: string | null
  person?: Record<string, any> | null
  company?: Record<string, any> | null
}

/** Response for bulk enrichment */
export interface ContactEnrichResponse {
  /** Total credits spent (0 for dedup/cached) */
  totalCost: number
  results: ContactEnrichPersonResult[]
}
