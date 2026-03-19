// Contact Relationships API resource
import type { Http } from '../core/http'
import type {
  ContactRelationshipResponse,
  GetContactRelationshipsOptions,
} from '../types/contact-relationships'

export class ContactRelationshipsResource {
  constructor(private readonly http: Http) {}

  /**
   * Get ranked contact relationships for a user.
   *
   * Fetches email and calendar interaction data from the connected provider,
   * computes relationship scores, and returns contacts sorted by strength.
   *
   * @param options - Query options
   * @param options.userId - User UUID or email address
   * @param options.provider - "gmail", "outlook", or "auto" (default: "auto")
   * @param options.limit - Max contacts to return (1-500, default: 50)
   * @param options.offset - Pagination offset (default: 0)
   * @param options.forceRefresh - Force recompute even if cached
   * @returns Promise resolving to contact relationship data
   *
   * @example
   * ```typescript
   * const result = await client.contactRelationships.get({
   *   userId: 'user-uuid-or-email',
   *   provider: 'auto',
   *   limit: 50,
   * });
   *
   * for (const contact of result.contacts) {
   *   console.log(`${contact.name} (${contact.email}): ${contact.relationshipScore}`);
   * }
   * ```
   */
  async get(options: GetContactRelationshipsOptions): Promise<ContactRelationshipResponse> {
    const params: Record<string, unknown> = {
      user_id: options.userId,
    }
    if (options.provider !== undefined)
      params.provider = options.provider
    if (options.limit !== undefined)
      params.limit = options.limit
    if (options.offset !== undefined)
      params.offset = options.offset
    if (options.forceRefresh !== undefined)
      params.force_refresh = options.forceRefresh

    return this.http.get<ContactRelationshipResponse>('/contact-relationships', { params })
  }
}
