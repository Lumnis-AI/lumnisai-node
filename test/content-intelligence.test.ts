import type { Http } from '../src/core/http'
import type { ContentIntelligenceOutput } from '../src/types/content-intelligence'
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

  it('forwards audience, competitor, steering, reuse, and output controls', async () => {
    await responses.contentIntelligence('Original audience prompt', {
      limit: 40,
      postsDateRange: 'past-quarter',
      postsEnableFiltering: false,
      exaResultsPerQuery: 25,
      companyContext: 'We sell cloud containment to security teams.',
      contentDirection: 'Practitioner how-tos; no hiring posts.',
      reusePackageFrom: '4eebf64e-66aa-45f6-9abe-0be82a141097',
      outputs: ['top_posts', 'post_ideas', 'engagement_analysis'],
      competitors: ['Acme', 'beta.example'],
      company: 'ourco.example',
      includeCompanyPosts: false,
      includeExecPosts: true,
      execTitles: ['Founder', 'CMO'],
      maxExecsPerTarget: 4,
    })

    expect(postMock).toHaveBeenCalledWith('/responses', expect.objectContaining({
      specializedAgent: 'content_intelligence',
      specializedAgentParams: {
        limit: 40,
        postsDateRange: 'past-quarter',
        postsEnableFiltering: false,
        exaResultsPerQuery: 25,
        companyContext: 'We sell cloud containment to security teams.',
        contentDirection: 'Practitioner how-tos; no hiring posts.',
        reusePackageFrom: '4eebf64e-66aa-45f6-9abe-0be82a141097',
        outputs: ['top_posts', 'post_ideas', 'engagement_analysis'],
        competitors: ['Acme', 'beta.example'],
        company: 'ourco.example',
        includeCompanyPosts: false,
        includeExecPosts: true,
        execTitles: ['Founder', 'CMO'],
        maxExecsPerTarget: 4,
      },
    }))
  })

  it('validates competitor inputs and source policy before sending', async () => {
    await expect(responses.contentIntelligence('Audience', {
      competitors: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'],
    })).rejects.toThrow('competitors must contain at most 5 distinct values')

    await expect(responses.contentIntelligence('Audience', {
      competitors: ['Acme'],
      includeCompanyPosts: false,
      includeExecPosts: false,
    })).rejects.toThrow('includeCompanyPosts and includeExecPosts are both false')

    await expect(responses.contentIntelligence('Audience', {
      competitors: ['Acme'],
      maxExecsPerTarget: 21,
    })).rejects.toThrow('maxExecsPerTarget must be an integer between 1 and 20')

    await expect(responses.contentIntelligence('Audience', {
      competitors: ['x'.repeat(201)],
    })).rejects.toThrow('each competitor must be at most 200 characters')

    await expect(responses.contentIntelligence('Audience', {
      competitors: ['Acme'],
      company: 'acme',
    })).rejects.toThrow('is also listed in competitors')

    await expect(responses.contentIntelligence('Audience', {
      competitors: ['Acme'],
      company: 'x'.repeat(201),
    })).rejects.toThrow('company must be at most 200 characters')

    await responses.contentIntelligence('Audience', {
      competitors: [' Acme ', 'acme', 'Beta', '', 'beta '],
    })
    expect(postMock).toHaveBeenCalledTimes(1)
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
          post_ideas: {
            artifact: 'post_ideas',
            all_supported: true,
            drafts_with_company: 1,
            company_drafts_supported: 1,
            steered_by: ['company_context', 'content_direction'],
            ideas: [{
              cited_posts: [{ key: 'post-1', url: 'https://linkedin.com/posts/1' }],
              draft_with_company: 'The company-aware version.',
              supported_with_company: true,
              grounding_reason_with_company: 'Supported by both sources.',
            }],
          },
          engagement_analysis: { artifact: 'engagement_analysis', theme_stats: [] },
          competitor_analysis: {
            artifact: 'competitor_analysis',
            status: 'partial',
            scope: {
              window_preset: 'past-month',
              requested_days: 30,
              window_start: '2026-08-02T09:00:00Z',
              window_end: '2026-09-01T09:00:00Z',
              bucket: 'week',
              posts: 1,
              dated_posts: 1,
              undated_posts: 0,
              observed_window_start: '2026-08-20T09:00:00Z',
              observed_window_end: '2026-08-20T09:00:00Z',
              curated_posts: 1,
              competitors_requested: 2,
              competitors_resolved: 1,
            },
            periods: [{
              start: '2026-08-17T00:00:00Z',
              end: '2026-08-24T00:00:00Z',
              duration_days: 7,
              is_partial: false,
              posts: 1,
              company_posts: 1,
              exec_posts: 0,
              active_authors: 1,
              reactions_known_sum: 12,
              comments_known_sum: 2,
              reactions_known_posts: 1,
              own_posts: 1,
              own_reactions_known_sum: 3,
              per_competitor: { Acme: 1 },
              themes: [{ theme: 'Launches', posts: 1, share: 1 }],
            }],
            deltas: { adjacent: [], first_to_last: null },
            theme_stats: [{
              theme: 'Launches',
              posts: 2,
              share: 1,
              own_posts: 1,
              own_share: 1,
              competitor_posts: 1,
              competitor_share: 1,
              reactions_known_sum: 15,
              per_period: [{ period: 0, posts: 2, share: 1 }],
              example_post_keys: ['competitor-post-1', 'own-post-1'],
            }],
            competitors: [{
              name: 'OurCo',
              input: 'ourco.example',
              role: 'self',
              posts: 1,
              company_posts: 1,
              exec_posts: 0,
              reactions_known_sum: 3,
              comments_known_sum: 0,
              top_themes: ['Launches'],
              example_post_key: 'own-post-1',
            }],
            comparison: {
              own_resolved: true,
              own_name: 'OurCo',
              shared_themes: ['Launches'],
              own_only_themes: [],
              competitor_only_themes: [],
              own: {
                posts: 1,
                company_posts: 1,
                exec_posts: 0,
                reactions_known_sum: 3,
                comments_known_sum: 0,
              },
              competitors: {
                posts: 1,
                company_posts: 1,
                exec_posts: 0,
                reactions_known_sum: 12,
                comments_known_sum: 2,
              },
            },
            highlights: [],
            takeaways: [],
            summary: 'Acme is publishing about launches.',
            invalid_citations: 0,
          },
        },
        package: { posts: [{ key: 'post-1', has_video: true }] },
        competitor_package: {
          posts: [{
            key: 'competitor-post-1',
            ids: ['competitor-post-1'],
            published_at: '2026-08-20T09:00:00Z',
            sources: ['competitor_company'],
            total_reactions: 12,
            total_comments: 2,
            competitor_sources: [{
              competitor: 'acme.com',
              competitor_name: 'Acme',
              role: 'competitor',
              post_author_type: 'company',
              post_author_name: 'Acme',
            }],
            missing: [],
          }],
          uncopied_fields: {},
        },
        competitor_coverage: {
          requested: ['acme.com', 'missing.example'],
          resolved: [{ input: 'acme.com', name: 'Acme', domain: 'acme.com' }],
          unresolved: [{ input: 'missing.example', reason: 'not_resolved' }],
          targets: [{
            input: 'acme.com',
            name: 'Acme',
            company_posts: 1,
            exec_posts: 0,
            execs_considered: 0,
            execs_fetched: 0,
            pages_fiber: 1,
            pages_crust: 0,
            stop_reason: 'fetched',
          }],
          own: {
            input: 'ourco.example',
            resolved: {
              input: 'ourco.example',
              name: 'OurCo',
              domain: 'ourco.example',
              linkedin_url: null,
            },
            reason: null,
            target: {
              input: 'ourco.example',
              name: 'OurCo',
              company_posts: 1,
              exec_posts: 0,
              execs_considered: 0,
              execs_fetched: 0,
              pages_fiber: 1,
              pages_crust: 0,
              stop_reason: 'fetched',
            },
          },
          requested_window: 'past-month',
          requested_days: 30,
          dated_posts: 1,
          undated_posts: 0,
          observed_start: '2026-08-20T09:00:00Z',
          observed_end: '2026-08-20T09:00:00Z',
          status: 'partial',
        },
        summary: {
          competitors: {
            requested: 2,
            resolved: 1,
            posts: 2,
            status: 'partial',
            own: 'OurCo',
          },
        },
        agent_params: {
          company: 'ourco.example',
        },
      },
    })

    const structured = response.structuredResponse as Partial<ContentIntelligenceOutput>

    expect(response.structuredResponse.outputs).toEqual({
      outputsRequested: ['top_posts', 'post_ideas', 'engagement_analysis'],
      topPosts: { artifact: 'top_posts', n: 1 },
      postIdeas: {
        artifact: 'post_ideas',
        allSupported: true,
        draftsWithCompany: 1,
        companyDraftsSupported: 1,
        steeredBy: ['company_context', 'content_direction'],
        ideas: [{
          citedPosts: [{ key: 'post-1', url: 'https://linkedin.com/posts/1' }],
          draftWithCompany: 'The company-aware version.',
          supportedWithCompany: true,
          groundingReasonWithCompany: 'Supported by both sources.',
        }],
      },
      engagementAnalysis: { artifact: 'engagement_analysis', themeStats: [] },
      competitorAnalysis: expect.objectContaining({
        artifact: 'competitor_analysis',
        status: 'partial',
        invalidCitations: 0,
        scope: expect.objectContaining({
          observedWindowStart: '2026-08-20T09:00:00Z',
          curatedPosts: 1,
        }),
        comparison: expect.objectContaining({
          ownResolved: true,
          ownName: 'OurCo',
          sharedThemes: ['Launches'],
        }),
      }),
    })
    expect(response.structuredResponse.package.posts[0]).toEqual({
      key: 'post-1',
      hasVideo: true,
    })
    expect(structured.competitorPackage?.posts[0]).toMatchObject({
      publishedAt: '2026-08-20T09:00:00Z',
      totalReactions: 12,
      competitorSources: [{
        competitor: 'acme.com',
        competitorName: 'Acme',
        role: 'competitor',
        postAuthorType: 'company',
        postAuthorName: 'Acme',
      }],
    })
    expect(structured.competitorCoverage).toMatchObject({
      requestedWindow: 'past-month',
      observedStart: '2026-08-20T09:00:00Z',
      status: 'partial',
      own: {
        input: 'ourco.example',
        resolved: { name: 'OurCo', linkedinUrl: null },
        reason: null,
        target: { companyPosts: 1, stopReason: 'fetched' },
      },
    })
    expect(structured.outputs?.competitorAnalysis?.periods[0]).toMatchObject({
      ownPosts: 1,
      ownReactionsKnownSum: 3,
    })
    expect(structured.outputs?.competitorAnalysis?.themeStats[0]).toMatchObject({
      ownPosts: 1,
      ownShare: 1,
      competitorPosts: 1,
      competitorShare: 1,
    })
    expect(structured.outputs?.competitorAnalysis?.competitors[0]).toMatchObject({
      name: 'OurCo',
      role: 'self',
    })
    expect(structured.summary?.competitors).toMatchObject({ own: 'OurCo' })
    expect(structured.agentParams).toMatchObject({ company: 'ourco.example' })
  })
})
