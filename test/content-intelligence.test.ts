import type { Http } from '../src/core/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResponsesResource } from '../src/resources/responses'
import { toCamelCase } from '../src/utils/case-conversion'

describe('contentIntelligence', () => {
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

  it('leaves outputs unset so the backend owns the default set', async () => {
    await responses.contentIntelligence('VP Engineering leaders at AI startups')

    expect(postMock).toHaveBeenCalledWith('/responses', {
      messages: [{ role: 'user', content: 'VP Engineering leaders at AI startups' }],
      specializedAgent: 'content_intelligence',
      specializedAgentParams: {},
    })
    expect(postMock.mock.calls[0][1].specializedAgentParams).not.toHaveProperty('outputs')
  })

  it('forwards collection, reuse, and output controls', async () => {
    await responses.contentIntelligence('Original audience prompt', {
      limit: 40,
      postsDateRange: 'past-quarter',
      postsEnableFiltering: false,
      exaResultsPerQuery: 25,
      reusePackageFrom: '4eebf64e-66aa-45f6-9abe-0be82a141097',
      outputs: ['top_posts', 'post_ideas', 'engagement_analysis'],
    })

    expect(postMock).toHaveBeenCalledWith('/responses', expect.objectContaining({
      specializedAgent: 'content_intelligence',
      specializedAgentParams: {
        limit: 40,
        postsDateRange: 'past-quarter',
        postsEnableFiltering: false,
        exaResultsPerQuery: 25,
        reusePackageFrom: '4eebf64e-66aa-45f6-9abe-0be82a141097',
        outputs: ['top_posts', 'post_ideas', 'engagement_analysis'],
      },
    }))
  })

  it('validates content intelligence params through low-level create', async () => {
    await expect(responses.create({
      messages: [{ role: 'user', content: 'Audience' }],
      specializedAgent: 'content_intelligence',
      specializedAgentParams: { outputs: [] },
    })).rejects.toThrow('outputs must contain at least one value')

    await expect(responses.create({
      messages: [{ role: 'user', content: 'Audience' }],
      specializedAgent: 'content_intelligence',
      specializedAgentParams: { exa_results_per_query: 0 },
    })).rejects.toThrow('exaResultsPerQuery must be a positive integer')
  })

  it('rejects unsupported outputs and blank audience prompts', async () => {
    await expect(responses.contentIntelligence('Audience', {
      outputs: ['voice_of_customer' as any],
    })).rejects.toThrow('Invalid content_intelligence output')

    await expect(responses.contentIntelligence('   ')).rejects.toThrow(
      'contentIntelligence requires a non-empty audience query',
    )
  })

  it('camel-cases structured output keys but preserves selector values', () => {
    const response = toCamelCase<any>({
      structured_response: {
        outputs: {
          outputs_requested: ['top_posts', 'post_ideas', 'engagement_analysis'],
          top_posts: { artifact: 'top_posts', n: 1 },
          post_ideas: { artifact: 'post_ideas', all_supported: true },
          engagement_analysis: { artifact: 'engagement_analysis', theme_stats: [] },
        },
      },
    })

    expect(response.structuredResponse.outputs).toEqual({
      outputsRequested: ['top_posts', 'post_ideas', 'engagement_analysis'],
      topPosts: { artifact: 'top_posts', n: 1 },
      postIdeas: { artifact: 'post_ideas', allSupported: true },
      engagementAnalysis: { artifact: 'engagement_analysis', themeStats: [] },
    })
  })
})
