import type { CrmAccountContextCandidateInput } from './crm'

/**
 * One account a caller wants people matched against. `id` is the caller's own
 * account id and comes back unchanged as `AccountMatch.accountId`.
 */
export interface AccountMatchAccount {
  id: string
  name: string
  domain?: string
  linkedinUrl?: string
}

/**
 * Match people to a caller-supplied list of accounts by company identity.
 * `people` uses the same identity input as the CRM account-context batch;
 * Each person gets one entry in `matches`, in input order. `inputKey` is
 * echoed back as given; it is not required to be unique.
 */
export interface AccountMatchRequest {
  accounts: AccountMatchAccount[]
  people: CrmAccountContextCandidateInput[]
}

/** Which company identity produced the match; `null` when nothing matched. */
export type AccountMatchMethod
  = | 'linkedin'
    | 'domain'
    | 'name'
    | 'name_base'
    | 'tokens'

/**
 * The match for one person. `accountId` is `null` when no account matched,
 * or when the match was a tie (`ambiguous: true`).
 */
export interface AccountMatch {
  inputKey: string
  accountId: string | null
  method: AccountMatchMethod | null
  ambiguous: boolean
}

/** One match per requested person, in request order. */
export interface AccountMatchResponse {
  matches: AccountMatch[]
}
