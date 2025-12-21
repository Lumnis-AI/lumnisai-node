// People Search API types

/**
 * Available people search data sources
 */
export enum PeopleDataSource {
  PDL = 'PDL',
  CORESIGNAL = 'CORESIGNAL',
  CRUST_DATA = 'CRUST_DATA',
}

/**
 * Salary range projection data.
 * Note: Values represent total compensation (base salary + bonuses + equity),
 * not just base salary. Only available for CoreSignal results.
 */
export interface SalaryRange {
  /** Minimum total compensation (includes base + bonuses + equity, etc.) */
  min?: number
  /** Median total compensation projection */
  median?: number
  /** Maximum total compensation (includes base + bonuses + equity, etc.) */
  max?: number
  /** Currency code (e.g., "USD", "EUR") */
  currency?: string
  /** Period (e.g., "yearly", "monthly") */
  period?: string
}

/**
 * Simplified person result model returned in search results.
 * Contains normalized data from multiple sources (PDL, CoreSignal, CrustData).
 */
export interface PersonResult {
  /** Unique identifier for the person */
  id: string
  /** Full name */
  name: string
  /** Current job title */
  currentTitle?: string
  /** Current company name */
  currentCompany?: string
  /** Current department */
  currentDepartment?: string
  /** Full location string */
  location?: string
  /** City */
  city?: string
  /** Country */
  country?: string
  /** Primary email address */
  email?: string
  /** List of email addresses */
  emails: string[]
  /** LinkedIn profile URL */
  linkedinUrl?: string
  /** Profile picture URL for frontend display */
  profilePictureUrl?: string
  /** Years of professional experience */
  yearsExperience?: number
  /** List of skills */
  skills: string[]
  /** Seniority level (e.g., "Senior", "Director", "VP") */
  seniorityLevel?: string
  /** Whether person is identified as a decision maker */
  isDecisionMaker: boolean
  /** Number of LinkedIn connections */
  connectionsCount?: number
  /** Whether person recently changed jobs */
  recentlyChangedJobs: boolean
  /** Data source identifier ("PDL", "CORESIGNAL", or "CRUST_DATA") */
  source: string
  /** Confidence score (0.0-1.0) if available */
  confidenceScore?: number
  /** Salary range projection (CoreSignal only) */
  salaryRange?: SalaryRange
  /** Number of certifications (CoreSignal only) */
  certificationsCount?: number
  /** List of languages spoken (CoreSignal only) */
  languages?: string[]
  /** List of education degrees (CoreSignal only) */
  educationDegrees?: string[]
}

/**
 * Request model for people search queries.
 */
export interface PeopleSearchRequest {
  /**
   * Natural language search query describing the people you want to find.
   * Examples:
   * - "Senior software engineers in San Francisco with Python skills"
   * - "Product managers at Google or Meta with MBA"
   * - "Data scientists in NYC with 5+ years experience"
   */
  query: string
  /**
   * Maximum number of results to return.
   * Range: 1-100
   * Default: 20
   */
  limit?: number
  /**
   * Specific data sources to use for the search.
   * If not provided, all available sources will be used.
   * Valid values: "PDL", "CORESIGNAL", "CRUST_DATA"
   *
   * Note: The API accepts string values. SDKs should use enums for type safety
   * but serialize them as strings when sending the request.
   */
  dataSources?: PeopleDataSource[]
}

/**
 * Logic operator for filter values
 */
export type FilterLogic = 'or' | 'and' | 'should'

/**
 * A filter with values and logic operator.
 * Used in applied_filters response.
 */
export interface FilterValue {
  /** List of values for this filter */
  values: string[]
  /**
   * Logic operator:
   * - "or": ANY value matches (for alternatives like "SF or NYC")
   * - "and": ALL values must match (for "must have Python AND Java")
   * - "should": Optional/preferred (for "preferably PhD")
   */
  logic: FilterLogic
}

/**
 * Structure of the applied_filters field in the response.
 * Contains extracted filters from the natural language query.
 */
export interface AppliedFilters {
  /** Cities for the search */
  cities?: FilterValue
  /** Countries for the search */
  countries?: FilterValue
  /** Job titles/roles */
  jobTitles?: FilterValue
  /** Company names */
  companies?: FilterValue
  /** Technical skills */
  skills?: FilterValue
  /** Minimum years of professional experience */
  minYearsExperience?: number
  /** Seniority levels (entry/junior/mid/senior/lead/principal/staff/director/vp/executive) */
  seniorityLevels?: FilterValue
  /** Education levels (bachelors/masters/phd/mba) */
  educationLevels?: FilterValue
  /** Industries/sectors */
  industries?: FilterValue
}

/**
 * Response model for people search endpoint.
 */
export interface PeopleSearchResponse {
  /** List of matching candidates */
  candidates: PersonResult[]
  /** Total number of unique candidates found (may be more than returned) */
  totalFound: number
  /** Filters extracted and applied from the query */
  appliedFilters: AppliedFilters
  /** Execution time in milliseconds */
  executionTimeMs: number
  /** List of data sources that were actually used */
  dataSourcesUsed: string[]
}
