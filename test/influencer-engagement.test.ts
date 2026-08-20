import type { InfluencerEngagementOutput } from '../src'
import type { Http } from '../src/core/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResponsesResource } from '../src/resources/responses'
import { toCamelCase } from '../src/utils/case-conversion'

describe('influencerEngagement', () => {
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

  it('forwards seed profiles and collection controls', async () => {
    await responses.influencerEngagement('Revenue leaders at B2B software companies', {
      seedProfiles: [
        'https://www.linkedin.com/in/influencer-one',
        'https://www.linkedin.com/in/influencer-two',
      ],
      postsDateRange: 'past-quarter',
      engagementTypes: ['commenter'],
      postsEnableFiltering: false,
      thoroughEnrichment: true,
      deepValidationUseRelevanceReranker: false,
      maxReactorsPerPost: 1200,
      maxCommentsPerPost: 5000,
      excludeUrls: ['https://www.linkedin.com/in/customer'],
      limit: 75,
    })

    expect(postMock).toHaveBeenCalledWith('/responses', {
      messages: [{ role: 'user', content: 'Revenue leaders at B2B software companies' }],
      specializedAgent: 'influencer_engagement',
      specializedAgentParams: {
        seedProfiles: [
          'https://www.linkedin.com/in/influencer-one',
          'https://www.linkedin.com/in/influencer-two',
        ],
        postsDateRange: 'past-quarter',
        engagementTypes: ['commenter'],
        postsEnableFiltering: false,
        thoroughEnrichment: true,
        deepValidationUseRelevanceReranker: false,
        maxReactorsPerPost: 1200,
        maxCommentsPerPost: 5000,
        excludeUrls: ['https://www.linkedin.com/in/customer'],
        limit: 75,
      },
    })
  })

  it('leaves optional controls unset so the backend owns defaults', async () => {
    await responses.influencerEngagement('Revenue leaders', {
      seedProfiles: ['https://www.linkedin.com/in/influencer'],
    })

    expect(postMock.mock.calls[0][1].specializedAgentParams).toEqual({
      seedProfiles: ['https://www.linkedin.com/in/influencer'],
    })
  })

  it('requires a persona prompt and at least one non-empty seed', async () => {
    await expect(responses.influencerEngagement('   ', {
      seedProfiles: ['https://www.linkedin.com/in/influencer'],
    })).rejects.toThrow('influencerEngagement requires a non-empty persona query')

    await expect(responses.influencerEngagement('Revenue leaders', {
      seedProfiles: [],
    })).rejects.toThrow('seedProfiles is required for influencer_engagement')

    await expect(responses.create({
      messages: [{ role: 'user', content: 'Revenue leaders' }],
      specializedAgent: 'influencer_engagement',
      specializedAgentParams: { seed_profiles: ['   '] },
    })).rejects.toThrow('seedProfiles is required for influencer_engagement')
  })

  it('validates engagement, window, boolean, and integer controls', async () => {
    const base = {
      messages: [{ role: 'user' as const, content: 'Revenue leaders' }],
      specializedAgent: 'influencer_engagement' as const,
    }

    await expect(responses.create({
      ...base,
      specializedAgentParams: {
        seed_profiles: ['https://www.linkedin.com/in/influencer'],
        engagement_types: [],
      },
    })).rejects.toThrow('engagementTypes must contain at least one value')

    await expect(responses.create({
      ...base,
      specializedAgentParams: {
        seedProfiles: ['https://www.linkedin.com/in/influencer'],
        postsDateRange: 'past-decade' as any,
      },
    })).rejects.toThrow('Invalid postsDateRange value')

    await expect(responses.create({
      ...base,
      specializedAgentParams: {
        seedProfiles: ['https://www.linkedin.com/in/influencer'],
        postsEnableFiltering: 'yes' as any,
      },
    })).rejects.toThrow('postsEnableFiltering must be a boolean')

    await expect(responses.create({
      ...base,
      specializedAgentParams: {
        seed_profiles: ['https://www.linkedin.com/in/influencer'],
        max_comments_per_post: 5001,
      },
    })).rejects.toThrow('maxCommentsPerPost must be an integer between 1 and 5000')

    await expect(responses.create({
      ...base,
      specializedAgentParams: {
        seedProfiles: ['https://www.linkedin.com/in/influencer'],
        limit: 1.5,
      },
    })).rejects.toThrow('limit must be an integer between 1 and 1000')
  })

  it('camel-cases coverage, selected posts, and resolved parameters', () => {
    const response = toCamelCase<{ structuredResponse: InfluencerEngagementOutput }>({
      structured_response: {
        candidates: [{
          engagement_data: [{
            post_url: 'https://www.linkedin.com/posts/123',
            role: 'commenter',
            comment_text: 'This is the problem our team is solving now.',
          }],
        }],
        excluded_candidates: [],
        total_excluded: 2,
        criteria: {
          version: 1,
          created_at: '2026-08-19T12:00:00Z',
          source: 'generated',
          source_response_id: null,
          criteria_definitions: [],
          criteria_classification: {
            universal_criteria: [],
            varying_criteria: [],
            validation_only_criteria: [],
          },
        },
        seed_coverage: [{
          seed: 'https://www.linkedin.com/in/influencer',
          authored_posts: 3,
          reacted_posts: 7,
          posts_selected: 4,
          reaction_credits: 2,
          dropped_no_url: 1,
          stop_reason: 'window_exhausted',
        }],
        seed_posts: [{
          key: 'activity:123',
          url: 'https://www.linkedin.com/posts/123',
          author: { name: 'Example Author', url: null },
          sources: ['reacted'],
          seeds: ['https://www.linkedin.com/in/influencer'],
          engagement: null,
          intent: 0.8,
        }],
        agent_params: {
          seed_profiles: ['https://www.linkedin.com/in/influencer'],
          posts_date_range: 'past-month',
          engagement_types: ['reactor', 'commenter'],
          posts_enable_filtering: true,
          thorough_enrichment: false,
          max_reactors_per_post: null,
          max_comments_per_post: null,
          exclude_urls: null,
          limit: 50,
        },
      },
    })

    expect(response.structuredResponse.seedCoverage[0]).toEqual(expect.objectContaining({
      authoredPosts: 3,
      reactedPosts: 7,
      postsSelected: 4,
      reactionCredits: 2,
      droppedNoUrl: 1,
      stopReason: 'window_exhausted',
    }))
    expect(response.structuredResponse.seedPosts[0].intent).toBe(0.8)
    expect(response.structuredResponse.candidates[0].engagementData?.[0].commentText)
      .toBe('This is the problem our team is solving now.')
    expect(response.structuredResponse.agentParams.postsEnableFiltering).toBe(true)
    expect(response.structuredResponse.totalExcluded).toBe(2)
  })
})
