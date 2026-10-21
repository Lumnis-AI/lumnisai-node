import type { CommitteeSearchParams, CreateResponseRequest } from '../src'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LumnisClient } from '../src'

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

describe('committee search transport', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let client: LumnisClient

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    client = new LumnisClient({
      apiKey: 'test-key',
      baseUrl: 'https://api.example.test',
      maxRetries: 3,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it.each(['committee_search', 'account_monitor'])('preserves an explicit idempotency key across %s submissions', async (agent) => {
    const noRetryClient = new LumnisClient({ apiKey: 'test-key', maxRetries: 0 })
    const request: CreateResponseRequest = {
      messages: [{ role: 'user', content: 'Find the current committee.' }],
      specializedAgent: agent,
      specializedAgentParams: agent === 'account_monitor' ? { account: 'example.com' } : undefined,
    }
    fetchMock.mockRejectedValueOnce(new TypeError('Connection closed'))
      .mockResolvedValueOnce(json({ response_id: 'resp-recovered', status: 'queued' }))
    const options = { idempotencyKey: 'committee-request-123' }

    await expect(noRetryClient.responses.create(request, options)).rejects.toThrow('Connection closed')
    expect(fetchMock).toHaveBeenCalledOnce()
    await expect(noRetryClient.responses.create(request, options)).resolves.toMatchObject({ responseId: 'resp-recovered' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers['Idempotency-Key']).toBe(options.idempotencyKey)
      expect(init).not.toHaveProperty('idempotencyKey')
      expect(JSON.parse(init.body)).not.toHaveProperty('idempotency_key')
    }
  })

  it('forwards reviewed committee criteria through Responses without generating criteria', async () => {
    const params: CommitteeSearchParams = {
      accounts: [{ id: 'account-1', name: 'Example', domain: 'example.com' }],
      titles: ['CTO'],
      criteriaDefinitions: [{
        criterionId: 'Role_OR_security',
        columnName: 'Reviewed role',
        criterionText: 'CTO OR security leader. Exclude advisory-only roles.',
        criterionType: 'universal',
        weight: 2,
        scoringRelevance: 'full',
      }],
      criteriaClassification: { universalCriteria: [], varyingCriteria: [], validationOnlyCriteria: [] },
      retrievalMode: 'bounded',
      filterModel: 'gpt-6-luna',
      maxCandidatesPerAccount: 75,
      limitPerAccount: 25,
    }
    const original = structuredClone(params)
    fetchMock.mockResolvedValue(json({ response_id: 'resp-1', status: 'queued' }))
    const result = await client.responses.create({
      messages: [{ role: 'user', content: 'Find this committee.' }],
      specializedAgent: 'committee_search',
      specializedAgentParams: params,
    })
    expect(result.responseId).toBe('resp-1')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.example.test/v1/responses')
    const body = JSON.parse(init.body)
    expect(body.specialized_agent).toBe('committee_search')
    expect(body.specialized_agent_params).toMatchObject({
      accounts: params.accounts,
      filter_model: 'gpt-6-luna',
      max_candidates_per_account: 75,
      criteria_definitions: [{
        criterion_id: 'Role_OR_security',
        criterion_text: params.criteriaDefinitions[0].criterionText,
        weight: 2,
        scoring_relevance: 'full',
      }],
    })
    expect(params).toEqual(original)
  })
})
