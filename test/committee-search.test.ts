import type {
  CommitteeFocus,
  CommitteeOrgChart,
  CommitteeSearchParams,
  CreateResponseRequest,
} from '../src'
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
        criterion_text: params.criteriaDefinitions![0].criterionText,
        weight: 2,
        scoring_relevance: 'full',
      }],
    })
    expect(params).toEqual(original)
  })

  it('sends the query as the message and no criteria when none were reviewed', async () => {
    fetchMock.mockResolvedValue(json({ response_id: 'resp-q', status: 'queued' }))
    const query = 'Map the team building the AI travel agent at Example, director level and above.'
    await client.responses.create({
      messages: [{ role: 'user', content: query }],
      specializedAgent: 'committee_search',
      specializedAgentParams: {
        accounts: [{ id: 'account-1', name: 'Example', domain: 'example.com' }],
        focus: 'the team building the AI travel agent',
      } satisfies CommitteeSearchParams,
    })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.messages).toEqual([{ role: 'user', content: query }])
    expect(body.specialized_agent_params).not.toHaveProperty('criteria_definitions')
    expect(body.specialized_agent_params).not.toHaveProperty('criteria_classification')
    expect(body.specialized_agent_params).not.toHaveProperty('org_chart')
    expect(body.specialized_agent_params).not.toHaveProperty('limit_per_account')
  })

  it('reads the criteria source from the result', async () => {
    fetchMock.mockResolvedValue(json({
      response_id: 'resp-g',
      status: 'succeeded',
      structured_response: {
        producer: 'committee_search',
        criteria: {
          version: 1,
          created_at: '2026-11-10T00:00:00Z',
          source: 'query',
          source_response_id: null,
          criteria_definitions: [{ criterion_id: 'request', column_name: 'Matches the request', criterion_text: 'Map the team.' }],
          criteria_classification: { universal_criteria: [], varying_criteria: [], validation_only_criteria: [] },
        },
      },
    }))
    const response = await client.responses.get('resp-g')
    expect(response.structuredResponse?.criteria).toMatchObject({
      source: 'query',
      criteriaDefinitions: [{ criterionId: 'request', columnName: 'Matches the request', criterionText: 'Map the team.' }],
    })
  })

  it('sends the org chart option snake-cased', async () => {
    fetchMock.mockResolvedValue(json({ response_id: 'resp-2', status: 'queued' }))
    const params: CommitteeSearchParams = {
      accounts: [{ id: 'account-1', name: 'Example', domain: 'example.com' }],
      criteriaDefinitions: [{
        criterionId: 'Role',
        columnName: 'Role',
        criterionText: 'Security leader.',
        criterionType: 'universal',
        weight: 1,
        scoringRelevance: 'full',
      }],
      criteriaClassification: { universalCriteria: [], varyingCriteria: [], validationOnlyCriteria: [] },
      orgChart: true,
    }
    await client.responses.create({
      messages: [{ role: 'user', content: 'Find this committee.' }],
      specializedAgent: 'committee_search',
      specializedAgentParams: params,
    })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.specialized_agent_params.org_chart).toBe(true)
    expect(body.specialized_agent_params).not.toHaveProperty('orgChart')
  })

  it('sends the focus text unchanged with an org chart and no people limit', async () => {
    fetchMock.mockResolvedValue(json({ response_id: 'resp-3', status: 'queued' }))
    const focus = 'the team building the AI travel agent'
    const params: CommitteeSearchParams = {
      accounts: [{ id: 'account-1', name: 'Example', domain: 'example.com' }],
      criteriaDefinitions: [{
        criterionId: 'Role',
        columnName: 'Role',
        criterionText: 'Director or above on the team, or leading a team around it.',
        criterionType: 'universal',
        weight: 1,
        scoringRelevance: 'full',
      }],
      criteriaClassification: { universalCriteria: [], varyingCriteria: [], validationOnlyCriteria: [] },
      focus,
      orgChart: true,
      limitPerAccount: 200,
    }
    await client.responses.create({
      messages: [{ role: 'user', content: 'Map this focus.' }],
      specializedAgent: 'committee_search',
      specializedAgentParams: params,
    })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.specialized_agent_params.focus).toBe(focus)
    expect(body.specialized_agent_params.org_chart).toBe(true)
    expect(body.specialized_agent_params.limit_per_account).toBe(200)
  })

  it('sends depth only when asked for', async () => {
    fetchMock.mockImplementation(async () => json({ response_id: 'resp-4', status: 'queued' }))
    const params: CommitteeSearchParams = {
      accounts: [{ id: 'account-1', name: 'Example', domain: 'example.com' }],
      criteriaDefinitions: [{
        criterionId: 'Role',
        columnName: 'Role',
        criterionText: 'Security leader.',
        criterionType: 'universal',
        weight: 1,
        scoringRelevance: 'full',
      }],
      criteriaClassification: { universalCriteria: [], varyingCriteria: [], validationOnlyCriteria: [] },
    }
    const send = async (specializedAgentParams: CommitteeSearchParams) => {
      await client.responses.create({
        messages: [{ role: 'user', content: 'Find this committee.' }],
        specializedAgent: 'committee_search',
        specializedAgentParams,
      })
      return JSON.parse(fetchMock.mock.calls.at(-1)![1].body).specialized_agent_params
    }
    expect(await send(params)).not.toHaveProperty('depth')
    expect((await send({ ...params, depth: 'deep' })).depth).toBe('deep')
  })

  it('returns the focus block and org chart under committee unconverted', async () => {
    const account: {
      focus: CommitteeFocus
      org_chart: CommitteeOrgChart
    } = {
      focus: {
        status: 'ok',
        error: null,
        description: 'the team building the AI travel agent',
        title_phrases: ['AI Experiences', 'Conversational Products'],
        posts_read: 115,
        jobs: [{
          title: 'Staff Machine Learning Engineer',
          url: 'https://example.com/jobs/1',
          date_added: '2025-07-30',
          location: 'San Francisco, CA',
          team_name: 'AI Experience Team',
          reports_to: '',
          quote: 'We are building the ultimate concierge.',
        }],
      },
      org_chart: {
        status: 'ok',
        error: null,
        focus: 'the team building the AI travel agent',
        model: 'gpt-6-luna',
        root_ids: ['p1'],
        nodes: [{
          id: 'p1',
          kind: 'person',
          name: 'Example Leader',
          title: 'CTO',
          linkedin_url: null,
          candidate_id: null,
          manager_id: null,
          confidence: 1,
          other_managers: [],
          basis: 'inferred',
          evidence: '',
        }],
      },
    }
    fetchMock.mockResolvedValue(json({
      response_id: 'resp-4',
      status: 'succeeded',
      structured_response: { committee: { accounts: [account] } },
    }))
    const response = await client.responses.get('resp-4')
    expect(response.structuredResponse?.committee.accounts[0]).toEqual(account)
  })
})
