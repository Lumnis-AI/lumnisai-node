import type { Http } from '../src/core/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResponsesResource } from '../src/resources/responses'
import { toCamelCase } from '../src/utils/case-conversion'

describe('engagementExpansion', () => {
  let responses: ResponsesResource
  let postMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    postMock = vi.fn().mockResolvedValue({
      responseId: 'resp-1',
      threadId: 'thread-1',
      status: 'queued',
      tenantId: 'tenant-1',
    })
    responses = new ResponsesResource({ post: postMock } as unknown as Http)
  })

  it('forwards the source response and expansion controls', async () => {
    await responses.engagementExpansion('VP Sales at enterprise software companies', {
      expandFromResponse: 'source-response-id',
      hops: 2,
      postsPerHop: 30,
      peoplePerNextHop: 15,
      limit: 75,
      excludeUrls: ['https://www.linkedin.com/in/existing-customer'],
      deepValidationUseRelevanceReranker: false,
    })

    expect(postMock).toHaveBeenCalledWith('/responses', {
      messages: [{ role: 'user', content: 'VP Sales at enterprise software companies' }],
      specializedAgent: 'engagement_expansion',
      specializedAgentParams: {
        expandFromResponse: 'source-response-id',
        hops: 2,
        postsPerHop: 30,
        peoplePerNextHop: 15,
        limit: 75,
        excludeUrls: ['https://www.linkedin.com/in/existing-customer'],
        deepValidationUseRelevanceReranker: false,
      },
    })
  })

  it('leaves optional controls unset so the backend owns defaults and derivation', async () => {
    await responses.engagementExpansion('Revenue leaders', {
      expandFromResponse: 'source-response-id',
    })

    expect(postMock.mock.calls[0][1].specializedAgentParams).toEqual({
      expandFromResponse: 'source-response-id',
    })
  })

  it('validates the required source and positive-integer controls', async () => {
    await expect(responses.engagementExpansion('Revenue leaders', {
      expandFromResponse: '   ',
    })).rejects.toThrow('expandFromResponse is required')

    await expect(responses.engagementExpansion('Revenue leaders', {
      expandFromResponse: 'source-response-id',
      hops: 0,
    })).rejects.toThrow('hops must be a positive integer')

    await expect(responses.create({
      messages: [{ role: 'user', content: 'Revenue leaders' }],
      specializedAgent: 'engagement_expansion',
      specializedAgentParams: {
        expand_from_response: 'source-response-id',
        people_per_next_hop: 1.5,
      },
    })).rejects.toThrow('peoplePerNextHop must be a positive integer')
  })

  it('camel-cases expansion stats and candidate evidence', () => {
    const response = toCamelCase<any>({
      structured_response: {
        expansion_stats: {
          hops_run: 1,
          posts_per_hop_source: 'derived',
          finalist_history_credits: 8,
          per_hop: [{ posts_pulled: 12, new_people: 40 }],
        },
        candidates: [{
          criteria_judged: 9,
          geo_ok: false,
          rank_tier: 2,
          primary_location: 'Barcelona, Spain',
          location_reasoning: 'The profile names Barcelona.',
          location_source: 'inferred:validation',
          llm_region_match: false,
          llm_region_match_reasoning: 'The search requires New York City.',
          engagement_history: [{ reaction_type: 'LIKE', post_author: 'Lumnis' }],
          refound_on_new_post: true,
        }],
      },
    })

    expect(response.structuredResponse.expansionStats).toEqual({
      hopsRun: 1,
      postsPerHopSource: 'derived',
      finalistHistoryCredits: 8,
      perHop: [{ postsPulled: 12, newPeople: 40 }],
    })
    expect(response.structuredResponse.candidates[0]).toEqual({
      criteriaJudged: 9,
      geoOk: false,
      rankTier: 2,
      primaryLocation: 'Barcelona, Spain',
      locationReasoning: 'The profile names Barcelona.',
      locationSource: 'inferred:validation',
      llmRegionMatch: false,
      llmRegionMatchReasoning: 'The search requires New York City.',
      engagementHistory: [{ reactionType: 'LIKE', postAuthor: 'Lumnis' }],
      refoundOnNewPost: true,
    })
  })
})
