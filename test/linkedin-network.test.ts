import type { CreateResponseRequest } from '../src/types/responses'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Http } from '../src/core/http'
import { ResponsesResource } from '../src/resources/responses'

afterEach(() => vi.unstubAllGlobals())

describe('linkedIn network SDK', () => {
  it('sends nested snake-case settings and retains normal deep evaluation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response_id: 'response' }), { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const responses = new ResponsesResource(new Http({ baseUrl: 'https://test.invalid', maxRetries: 0 }))
    await responses.deepPeopleSearch('Engineering leaders', {
      userId: 'actor@example.com',
      linkedinNetwork: { networkDistance: [2, 3], api: 'sales_navigator' },
      requestedCandidates: 10,
      searchProfiles: true,
      searchPosts: true,
      searchJobSignal: true,
    })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toMatchObject({
      user_id: 'actor@example.com',
      specialized_agent: 'deep_people_search',
      specialized_agent_params: {
        linkedin_network: { network_distance: [2, 3], api: 'sales_navigator' },
        search_profiles: false,
        search_posts: false,
        search_connections: false,
        search_job_signal: false,
        deep_validation_use_relevance_reranker: true,
        deep_validation_backfill_below_criteria: true,
        requested_candidates: 10,
      },
    })
  })

  it.each([{ networkDistance: [] }, { networkDistance: [4] }, { networkDistance: [3], connectionsOf: ['https://linkedin.com/in/ari'] }, { connectionsOf: 'ari' }, { targetAccounts: [' '] }, { teamMembers: [1] }, { account_id: 'foreign' }, { api: 'recruiter' }])('rejects invalid settings before HTTP: %j', async (linkedinNetwork) => {
    const post = vi.fn()
    const responses = new ResponsesResource({ post } as unknown as Http)
    await expect(responses.create({ messages: [{ role: 'user', content: 'Persona' }], userId: 'actor@example.com', specializedAgent: 'deep_people_search', specializedAgentParams: { linkedinNetwork } } as CreateResponseRequest)).rejects.toThrow()
    expect(post).not.toHaveBeenCalled()
  })

  it('requires an acting user and the correct agent', async () => {
    const post = vi.fn()
    const responses = new ResponsesResource({ post } as unknown as Http)
    await expect(responses.create({ messages: [{ role: 'user', content: 'Persona' }], specializedAgent: 'deep_people_search', specializedAgentParams: { linkedinNetwork: {} } })).rejects.toThrow('userId')
    await expect(responses.create({ messages: [{ role: 'user', content: 'Persona' }], userId: 'actor', specializedAgent: 'people_scoring', specializedAgentParams: { linkedinNetwork: {} } })).rejects.toThrow('deep_people_search')
    expect(post).not.toHaveBeenCalled()
  })

  it('lets automatic lane selection discard the manual source before actor validation', async () => {
    const post = vi.fn().mockResolvedValue({ responseId: 'response' })
    const responses = new ResponsesResource({ post } as unknown as Http)
    await responses.create({ messages: [{ role: 'user', content: 'Persona' }], specializedAgent: 'quick_people_search', specializedAgentParams: { linkedinNetwork: {}, autoSelectLane: true } })
    expect(post).toHaveBeenCalledOnce()
  })

  it('recognizes legacy nested automatic selection but preserves network for automatic signals', async () => {
    const post = vi.fn().mockResolvedValue({ responseId: 'response' })
    const responses = new ResponsesResource({ post } as unknown as Http)
    await responses.create({ messages: [{ role: 'user', content: 'Persona' }], specializedAgent: 'deep_people_search', specializedAgentParams: { linkedinNetwork: {} }, options: { specialized_agent_params: { auto_select_lane: true } } })
    expect(post).toHaveBeenCalledOnce()
    await expect(responses.create({ messages: [{ role: 'user', content: 'Persona' }], specializedAgent: 'deep_people_search', specializedAgentParams: { linkedinNetwork: {}, autoSelectSignals: true } })).rejects.toThrow('userId')
    expect(post).toHaveBeenCalledOnce()
  })

  it('accepts own-network degree 1, connectionsOf and target accounts in either spelling', async () => {
    const post = vi.fn().mockResolvedValue({ responseId: 'response' })
    const responses = new ResponsesResource({ post } as unknown as Http)
    await responses.create({ messages: [{ role: 'user', content: 'Persona' }], userId: 'actor', specializedAgent: 'deep_people_search', specializedAgentParams: { linkedinNetwork: { networkDistance: [1, 2], connectionsOf: ['https://linkedin.com/in/ari'], targetAccounts: ['microsoft.com'], api: 'auto' } } })
    await responses.create({ messages: [{ role: 'user', content: 'Persona' }], userId: 'actor', specializedAgent: 'deep_people_search', specializedAgentParams: { linkedinNetwork: { network_distance: [2, 2], target_accounts: ['Trustpilot'] } } as any })
    await responses.create({ messages: [{ role: 'user', content: 'Persona' }], userId: 'actor', specializedAgent: 'deep_people_search', specializedAgentParams: { linkedinNetwork: { networkDistance: [1] } } })
    expect(post).toHaveBeenCalledTimes(3)
  })
})
