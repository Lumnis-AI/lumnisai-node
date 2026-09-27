/**
 * Tests for the Accounts resource.
 *
 * Checks the endpoint, the snake_case body on the wire, and the camelCase
 * response the caller gets back.
 */

import type { Http } from '../src/core/http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LumnisClient } from '../src/index'
import { AccountsResource } from '../src/resources/accounts'

function createMockHttp(): Http {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  } as unknown as Http
}

const REQUEST = {
  accounts: [
    { id: 'acct-1', name: 'Acme', domain: 'acme.example', linkedinUrl: 'https://www.linkedin.com/company/acme/' },
    { id: 'acct-2', name: 'Globex' },
  ],
  people: [{
    inputKey: 'person-123',
    linkedinUrl: 'https://www.linkedin.com/in/jane-doe/',
    fullName: 'Jane Doe',
    companyName: 'Acme',
    companyDomain: 'acme.example',
    companyLinkedinUrl: 'https://www.linkedin.com/company/acme/',
  }],
}

describe('accounts.match', () => {
  it('posts the request to /accounts/match', async () => {
    const http = createMockHttp()
    const accounts = new AccountsResource(http)
    vi.mocked(http.post).mockResolvedValue({ matches: [] })

    await accounts.match(REQUEST)

    expect(http.post).toHaveBeenCalledWith('/accounts/match', REQUEST)
  })
})

describe('accounts.match over the wire', () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  afterEach(() => {
    fetchMock.mockReset()
  })

  function respondWith(payload: unknown): void {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => payload,
    } as Response)
  }

  it('sends a snake_case body and returns camelCase matches', async () => {
    respondWith({
      matches: [
        { input_key: 'person-123', account_id: 'acct-1', method: 'linkedin', ambiguous: false },
        { input_key: 'person-456', account_id: null, method: null, ambiguous: true },
      ],
    })

    const client = new LumnisClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com',
      maxRetries: 0,
    })
    const result = await client.accounts.match(REQUEST)

    const [url, init] = fetchMock.mock.calls[0]
    expect(new URL(url).pathname).toBe('/v1/accounts/match')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      accounts: [
        { id: 'acct-1', name: 'Acme', domain: 'acme.example', linkedin_url: 'https://www.linkedin.com/company/acme/' },
        { id: 'acct-2', name: 'Globex' },
      ],
      people: [{
        input_key: 'person-123',
        linkedin_url: 'https://www.linkedin.com/in/jane-doe/',
        full_name: 'Jane Doe',
        company_name: 'Acme',
        company_domain: 'acme.example',
        company_linkedin_url: 'https://www.linkedin.com/company/acme/',
      }],
    })
    expect(result.matches).toEqual([
      { inputKey: 'person-123', accountId: 'acct-1', method: 'linkedin', ambiguous: false },
      { inputKey: 'person-456', accountId: null, method: null, ambiguous: true },
    ])
  })
})
