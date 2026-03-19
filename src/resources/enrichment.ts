// Contact Enrichment API resource
import type { Http } from '../core/http'
import type {
  ContactEnrichRequest,
  ContactEnrichResponse,
} from '../types/enrichment'

export class EnrichmentResource {
  constructor(private readonly http: Http) {}

  /**
   * Enrich contacts with email and phone data.
   *
   * Accepts 1-50 persons identified by LinkedIn URL, email,
   * name + company, or person_id. Returns verified email and
   * phone data.
   *
   * @param params - Enrichment request
   * @param params.prospects - List of persons to enrich (1-50)
   * @param params.onlyVerifiedEmail - Only return verified emails (default: true)
   * @param params.enrichMobile - Include mobile enrichment, 10x cost (default: false)
   * @param params.onlyVerifiedMobile - Only return verified mobiles (default: false)
   * @returns Promise resolving to enrichment results
   *
   * @example
   * ```typescript
   * const result = await client.enrichment.enrichContacts({
   *   prospects: [
   *     { linkedinUrl: 'https://linkedin.com/in/johndoe' },
   *     { firstName: 'Jane', lastName: 'Smith', companyName: 'Acme Inc' },
   *   ],
   * });
   *
   * for (const r of result.results) {
   *   if (r.matched) {
   *     console.log(`Match at index ${r.index}:`, r.person);
   *   }
   * }
   * ```
   */
  async enrichContacts(params: ContactEnrichRequest): Promise<ContactEnrichResponse> {
    return this.http.post<ContactEnrichResponse>('/enrichment/contact', params)
  }
}
