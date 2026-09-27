import type { Http } from '../core/http'
import type { AccountMatchRequest, AccountMatchResponse } from '../types/accounts'

/**
 * Account-level helpers that work on a caller-supplied list of accounts.
 */
export class AccountsResource {
  constructor(private readonly http: Http) {}

  /**
   * Match people to the given accounts by company identity (company LinkedIn
   * URL, domain, then name). Writes nothing to your accounts or CRM. To fill
   * missing company identity it reads the shared profile cache only; it never
   * starts profile vendor refreshes, even when a cached profile is missing or
   * old.
   *
   * A person with no match, or with a tie between accounts, comes back with
   * `accountId: null`; a tie also sets `ambiguous: true`.
   *
   * @example
   * ```typescript
   * const { matches } = await client.accounts.match({
   *   accounts: [{ id: 'acct-1', name: 'Acme', domain: 'acme.example' }],
   *   people: [{
   *     inputKey: 'person-123',
   *     linkedinUrl: 'https://www.linkedin.com/in/jane-doe/',
   *     companyDomain: 'acme.example',
   *   }],
   * })
   * console.log(matches[0].accountId) // 'acct-1'
   * ```
   */
  async match(data: AccountMatchRequest): Promise<AccountMatchResponse> {
    return this.http.post<AccountMatchResponse>('/accounts/match', data)
  }
}
