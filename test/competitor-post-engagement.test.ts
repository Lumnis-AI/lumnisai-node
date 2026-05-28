import type { Http } from '../src/core/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ValidationError } from '../src/errors'
import { ResponsesResource } from '../src/resources/responses'

describe('competitorPostEngagement', () => {
  let responses: ResponsesResource
  let postMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    postMock = vi.fn().mockResolvedValue({
      responseId: 'resp-1',
      threadId: 'thread-1',
      status: 'queued',
      tenantId: 'tenant-1',
      createdAt: '2024-01-01T00:00:00Z',
    })
    responses = new ResponsesResource({ post: postMock } as unknown as Http)
  })

  it('creates a discovery-mode request with company seed', async () => {
    await responses.competitorPostEngagement(
      'VP Sales at mid-market SaaS companies evaluating outbound tools',
      {
        company: 'lumnis.ai',
        companyContext: 'AI-powered outbound automation for B2B sales',
        companyExamples: ['outreach.io', 'apollo.io'],
        limit: 50,
      },
    )

    expect(postMock).toHaveBeenCalledWith('/responses', expect.objectContaining({
      specializedAgent: 'competitor_post_engagement',
      specializedAgentParams: expect.objectContaining({
        company: 'lumnis.ai',
        companyContext: 'AI-powered outbound automation for B2B sales',
        companyExamples: ['outreach.io', 'apollo.io'],
        limit: 50,
      }),
      messages: [{ role: 'user', content: 'VP Sales at mid-market SaaS companies evaluating outbound tools' }],
    }))
  })

  it('creates an explicit-competitors request', async () => {
    await responses.competitorPostEngagement(
      'Revenue leaders interested in sales automation',
      {
        competitors: ['outreach.io', 'apollo.io'],
        engagementTypes: ['reactor'],
        maxPostsPerTarget: 3,
      },
    )

    expect(postMock).toHaveBeenCalledWith('/responses', expect.objectContaining({
      specializedAgentParams: expect.objectContaining({
        competitors: ['outreach.io', 'apollo.io'],
        engagementTypes: ['reactor'],
        maxPostsPerTarget: 3,
      }),
    }))
  })

  it('rejects when neither company nor competitors is provided', async () => {
    await expect(
      responses.competitorPostEngagement('Find buyers', {} as { company: string }),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects when both company and competitors are provided', async () => {
    await expect(
      responses.competitorPostEngagement('Find buyers', {
        company: 'lumnis.ai',
        competitors: ['outreach.io'],
      }),
    ).rejects.toThrow(ValidationError)
  })

  it('validates engagementTypes on create()', async () => {
    await expect(
      responses.create({
        messages: [{ role: 'user', content: 'Find buyers' }],
        specializedAgent: 'competitor_post_engagement',
        specializedAgentParams: {
          competitors: ['outreach.io'],
          engagementTypes: [],
        },
      }),
    ).rejects.toThrow('engagementTypes must contain at least one value')
  })

  it('validates maxCommentsPerPost upper bound on create()', async () => {
    await expect(
      responses.create({
        messages: [{ role: 'user', content: 'Find buyers' }],
        specializedAgent: 'competitor_post_engagement',
        specializedAgentParams: {
          competitors: ['outreach.io'],
          maxCommentsPerPost: 200,
        },
      }),
    ).rejects.toThrow('maxCommentsPerPost must be between 1 and 100')
  })
})
