// People Search API resource
import type { Http } from '../core/http'
import type {
  PeopleSearchRequest,
  PeopleSearchResponse,
} from '../types/people'
import {
  NoDataSourcesError,
  SourcesNotAvailableError,
  ValidationError,
} from '../errors'
import { PeopleDataSource } from '../types/people'

export class PeopleResource {
  constructor(private readonly http: Http) {}

  /**
   * Perform a quick people search across multiple data sources.
   *
   * This endpoint bypasses the full agent framework for faster response times.
   * It searches across PDL, CoreSignal, and CrustData in parallel and returns
   * deduplicated results.
   *
   * @param params - Search parameters
   * @param params.query - Natural language search query
   * @param params.limit - Maximum number of results (1-100, default: 20)
   * @param params.dataSources - Specific data sources to use (optional)
   * @returns Promise resolving to search results
   * @throws {NoDataSourcesError} When no data sources are configured
   * @throws {SourcesNotAvailableError} When requested sources aren't available
   * @throws {ValidationError} For other validation errors
   *
   * @example
   * ```typescript
   * const response = await client.people.quickSearch({
   *   query: "Senior engineers in SF with Python",
   *   limit: 50,
   *   dataSources: [PeopleDataSource.CORESIGNAL, PeopleDataSource.PDL]
   * });
   * ```
   */
  async quickSearch(params: PeopleSearchRequest): Promise<PeopleSearchResponse> {
    const { query, limit = 20, dataSources } = params

    // Validate limit
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100', {
        code: 'INVALID_LIMIT',
      })
    }

    // Validate data sources if provided
    if (dataSources) {
      const validSources = Object.values(PeopleDataSource)
      for (const source of dataSources) {
        if (!validSources.includes(source as PeopleDataSource)) {
          throw new ValidationError(
            `Invalid data source: ${source}. Valid sources: ${validSources.join(', ')}`,
            { code: 'INVALID_DATA_SOURCE' },
          )
        }
      }
    }

    try {
      const response = await this.http.post<PeopleSearchResponse>(
        '/people/quick-search',
        {
          query,
          limit,
          // HTTP client will convert camelCase to snake_case automatically
          dataSources: dataSources?.map(ds => ds as string) || undefined,
        },
      )

      return response
    }
    catch (error: any) {
      // Handle specific error codes
      // FastAPI wraps HTTPException detail in a 'detail' key
      // The HTTP client throws ValidationError for 400 status codes
      // Error details are in error.details, with structure: { detail: { error: { code, message } } }
      if (error instanceof ValidationError) {
        const details = error.details || {}
        // Try FastAPI structure: { detail: { error: { code, message } } }
        const errorDetail = details.detail?.error || details.error

        if (errorDetail?.code === 'NO_DATA_SOURCES') {
          throw new NoDataSourcesError(errorDetail.message || undefined)
        }

        if (errorDetail?.code === 'SOURCES_NOT_AVAILABLE') {
          // Extract available sources from message
          // Format is: "Available: ['PDL', 'CORESIGNAL']" (Python list string)
          const message = errorDetail.message || ''
          const availableMatch = message.match(/Available: \[(.+)\]/)
          const availableSources = availableMatch
            ? availableMatch[1]
                .replace(/'/g, '') // Remove single quotes
                .split(', ')
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0)
            : []

          throw new SourcesNotAvailableError(
            errorDetail.message || 'Requested data sources not available',
            availableSources,
          )
        }
      }

      // Re-throw other errors
      throw error
    }
  }
}
