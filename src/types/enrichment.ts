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
  /**
   * "Extra deep search", ON by default. Any prospect the data vendors leave
   * without an acceptable WORK email is looked up on the organization's own
   * official web pages (team/people directories, profiles, org charts). For
   * LinkedIn-URL inputs the person's name + organization are resolved from the
   * profile first. Results come back in `deepWebFindings` on that person's
   * result - each with a source URL and a confidence tier - and NEVER overwrite
   * the vendor `person.email`. Pass false to disable (it spends search + scrape
   * + LLM + verification credits and adds latency). (default: true)
   */
  deepWebFallback?: boolean
}

/**
 * One contact found on the public web (deep-web fallback).
 *
 * Verification is a returned property, not a filter: findings carry their
 * evidence (`sourceUrl`), how they were obtained (`derivation`), and a
 * `confidence` tier so the caller decides what to trust. A `pattern_derived`
 * value is an inference, never a vendor-grade match.
 */
export interface ContactFinding {
  channel: 'email' | 'phone'
  value: string
  /** Official page the value came from */
  sourceUrl: string
  /** directory|profile|org_chart|listing|press_release|other */
  sourceType: string
  derivation: 'found_directly' | 'pattern_derived'
  /**
   * For email: the ZeroBounce status (valid/invalid/catch-all/unknown/
   * unverified). For phone: direct|main_line.
   */
  verification: string
  /**
   * confirmed: page confirms this person currently holds the role.
   * contradicted: page names a DIFFERENT current holder (they moved).
   * unconfirmed: pages don't establish the current role (not a stale signal -
   * just unknown).
   */
  roleStatus: 'confirmed' | 'contradicted' | 'unconfirmed'
  /**
   * When roleStatus=contradicted, the person the official page names as the
   * CURRENT holder of the role (i.e. who replaced this prospect).
   */
  currentRoleHolder?: string | null
  confidence: 'high' | 'medium' | 'low'
  notes?: string | null
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
  /**
   * Present only when deepWebFallback was requested AND the vendors left this
   * person without an acceptable work email. Public-web findings with source
   * URLs + confidence tiers; not billed as vendor matches, never merged into
   * `person.email`.
   */
  deepWebFindings?: ContactFinding[] | null
}

/** Response for bulk enrichment */
export interface ContactEnrichResponse {
  /** Total credits spent (0 for dedup/cached) */
  totalCost: number
  results: ContactEnrichPersonResult[]
}
