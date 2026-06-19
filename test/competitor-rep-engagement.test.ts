import type { Http } from '../src/core/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ValidationError } from '../src/errors'
import { ResponsesResource } from '../src/resources/responses'

describe('competitorRepEngagement', () => {
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
    await responses.competitorRepEngagement(
      'VP Eng or Heads of Data at AI-native startups',
      {
        company: 'lumnis.ai',
        companyContext: 'AI-powered outbound automation for B2B sales',
        repTitles: ['Account Executive', 'SDR'],
        maxRepsPerCompetitor: 15,
        limit: 50,
      },
    )

    expect(postMock).toHaveBeenCalledWith('/responses', expect.objectContaining({
      specializedAgent: 'competitor_rep_engagement',
      specializedAgentParams: expect.objectContaining({
        company: 'lumnis.ai',
        companyContext: 'AI-powered outbound automation for B2B sales',
        repTitles: ['Account Executive', 'SDR'],
        maxRepsPerCompetitor: 15,
        limit: 50,
      }),
      messages: [{ role: 'user', content: 'VP Eng or Heads of Data at AI-native startups' }],
    }))
  })

  it('creates an explicit-competitors request', async () => {
    await responses.competitorRepEngagement(
      'Prospects competitor reps are working',
      {
        competitors: ['outreach.io', 'apollo.io'],
        engagementTypes: ['commenter'],
        postsDateRange: 'past-2-years',
        maxEngagementsPerRep: 250,
        restrictEngagementToTenure: false,
      },
    )

    expect(postMock).toHaveBeenCalledWith('/responses', expect.objectContaining({
      specializedAgentParams: expect.objectContaining({
        competitors: ['outreach.io', 'apollo.io'],
        engagementTypes: ['commenter'],
        postsDateRange: 'past-2-years',
        maxEngagementsPerRep: 250,
        restrictEngagementToTenure: false,
      }),
    }))
  })

  it('rejects when neither company nor competitors is provided', async () => {
    await expect(
      responses.competitorRepEngagement('Find prospects', {} as { company: string }),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects when both company and competitors are provided', async () => {
    await expect(
      responses.competitorRepEngagement('Find prospects', {
        company: 'lumnis.ai',
        competitors: ['outreach.io'],
      }),
    ).rejects.toThrow(ValidationError)
  })

  it('validates engagementTypes on create()', async () => {
    await expect(
      responses.create({
        messages: [{ role: 'user', content: 'Find prospects' }],
        specializedAgent: 'competitor_rep_engagement',
        specializedAgentParams: {
          competitors: ['outreach.io'],
          engagementTypes: [],
        },
      }),
    ).rejects.toThrow('engagementTypes must contain at least one value')
  })

  it('validates maxRepsPerCompetitor upper bound on create()', async () => {
    await expect(
      responses.create({
        messages: [{ role: 'user', content: 'Find prospects' }],
        specializedAgent: 'competitor_rep_engagement',
        specializedAgentParams: {
          competitors: ['outreach.io'],
          maxRepsPerCompetitor: 200,
        },
      }),
    ).rejects.toThrow('maxRepsPerCompetitor must be between 1 and 100')
  })

  it('validates maxEngagementsPerRep upper bound on create()', async () => {
    await expect(
      responses.create({
        messages: [{ role: 'user', content: 'Find prospects' }],
        specializedAgent: 'competitor_rep_engagement',
        specializedAgentParams: {
          competitors: ['outreach.io'],
          maxEngagementsPerRep: 5000,
        },
      }),
    ).rejects.toThrow('maxEngagementsPerRep must be between 1 and 1000')
  })
})
