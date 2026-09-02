import type { Http } from '../src/core/http'
import type {
  DeepPeopleSearchOutput,
  SignalDefinition,
} from '../src/types/responses'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ValidationError } from '../src/errors'
import { ResponsesResource } from '../src/resources/responses'
import { toCamelCase } from '../src/utils/case-conversion'

describe('signal enrichment request contract', () => {
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

  it('forwards signal definitions, auto selection, and intent direction', async () => {
    const signalDefinitions: SignalDefinition[] = [
      {
        name: 'hiring',
        settings: { dateRange: 'past-quarter' },
        context: 'Count revenue-team roles and ignore engineering backfills.',
      },
      { name: 'funding', settings: { dateRange: 'past-year' } },
      { name: 'recently_joined', settings: { dateRange: 'past-2-weeks' } },
      {
        name: 'engagement',
        settings: {
          dateRange: 'past-month',
          activities: ['reactions', 'comments', 'authored_posts'],
          targetCompanies: ['OpenAI', 'anthropic.com'],
        },
      },
    ]

    await responses.deepPeopleSearch('Account Executives at AI companies', {
      requestedCandidates: 25,
      signalDefinitions,
      jobSignalDateRange: 'past-3-weeks',
      intentScoringInstructions: 'Prioritize direct engagement over company evidence.',
    })

    expect(postMock).toHaveBeenCalledWith('/responses', expect.objectContaining({
      specializedAgent: 'deep_people_search',
      specializedAgentParams: expect.objectContaining({
        signalDefinitions,
        jobSignalDateRange: 'past-3-weeks',
        intentScoringInstructions: 'Prioritize direct engagement over company evidence.',
      }),
    }))
  })

  it('preserves an explicit empty list and omits the field otherwise', async () => {
    await responses.deepPeopleSearch('Heads of Data', { signalDefinitions: [] })
    expect(postMock.mock.calls[0][1].specializedAgentParams.signalDefinitions).toEqual([])

    await responses.deepPeopleSearch('Heads of Data')
    expect(postMock.mock.calls[1][1].specializedAgentParams)
      .not
      .toHaveProperty('signalDefinitions')
  })

  it('forwards both automatic switches independently', async () => {
    await responses.deepPeopleSearch('Find people worth calling this week', {
      autoSelectLane: true,
      autoSelectSignals: true,
    })

    expect(postMock).toHaveBeenCalledWith('/responses', expect.objectContaining({
      specializedAgentParams: expect.objectContaining({
        autoSelectLane: true,
        autoSelectSignals: true,
      }),
    }))
  })

  it('rejects a signal name the API does not accept', async () => {
    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'buying_intent' as any }],
    })).rejects.toThrow(/'buying_intent' is not a signal we know/)
  })

  it('explains the temporarily disabled company-record signals', async () => {
    for (const name of ['competitor_tools', 'web_traffic']) {
      await expect(responses.deepPeopleSearch('VPs of Sales', {
        signalDefinitions: [{ name: name as any }],
      })).rejects.toThrow(/temporarily disabled because of company-record cost/)
    }
  })

  it('rejects duplicate signals, bare strings, and unknown entry fields', async () => {
    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'hiring' }, { name: 'hiring' }],
    })).rejects.toThrow(/appears more than once/)

    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: ['hiring' as any],
    })).rejects.toThrow(/must be an object/)

    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'hiring', weight: 0.5 } as any],
    })).rejects.toThrow(/Unknown signalDefinitions field 'weight'/)
  })

  it('validates signal context briefs', async () => {
    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'hiring', context: { note: 'not text' } as any }],
    })).rejects.toThrow(/context must be plain text/)

    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'hiring', context: 'x'.repeat(4001) }],
    })).rejects.toThrow(/context must be at most 4000 characters/)
  })

  it('rejects unknown settings instead of ignoring them', async () => {
    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'funding', settings: { dateRange: 'past-year', minimumStage: 'series-b' } as any }],
    })).rejects.toThrow(/Unknown setting 'minimumStage' for the 'funding' signal/)

    // Engagement-only settings stay engagement-only.
    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'hiring', settings: { activities: ['reactions'] } as any }],
    })).rejects.toThrow(/Unknown setting 'activities' for the 'hiring' signal/)
  })

  it('rejects an unsupported date range on a signal', async () => {
    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'events', settings: { dateRange: 'past-5-weeks' as any } }],
    })).rejects.toThrow(
      /Invalid signalDefinitions 'events' settings\.dateRange value: past-5-weeks/,
    )
  })

  it('validates the engagement activity list', async () => {
    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'engagement', settings: { activities: [] } }],
    })).rejects.toThrow(/activities cannot be empty/)

    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'engagement', settings: { activities: ['reactions', 'reactions'] } }],
    })).rejects.toThrow(/activities must not contain duplicates/)

    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'engagement', settings: { activities: ['likes' as any] } }],
    })).rejects.toThrow(/Invalid engagement activity: likes/)
  })

  it('validates engagement target companies the way the backend compares them', async () => {
    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'engagement', settings: { targetCompanies: [] } }],
    })).rejects.toThrow(/targetCompanies must contain at least one non-empty/)

    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{ name: 'engagement', settings: { targetCompanies: ['  '] } }],
    })).rejects.toThrow(/targetCompanies must contain at least one non-empty/)

    await expect(responses.deepPeopleSearch('VPs of Sales', {
      signalDefinitions: [{
        name: 'engagement',
        settings: {
          targetCompanies: [
            'https://www.linkedin.com/company/openai/',
            'https://www.linkedin.com/company/OpenAI',
          ],
        },
      }],
    })).rejects.toThrow(/targetCompanies must not contain duplicates/)
  })

  it('accepts snake_case entries from callers that mirror the wire shape', async () => {
    await responses.create({
      messages: [{ role: 'user', content: 'VPs of Sales' }],
      specializedAgent: 'deep_people_search',
      specializedAgentParams: {
        signal_definitions: [
          { name: 'engagement', settings: { date_range: 'past-week', target_companies: ['OpenAI'] } },
        ],
        auto_select_signals: false,
        job_signal_date_range: 'past-2-weeks',
      } as any,
    })

    expect(postMock).toHaveBeenCalledTimes(1)

    await expect(responses.create({
      messages: [{ role: 'user', content: 'VPs of Sales' }],
      specializedAgent: 'deep_people_search',
      specializedAgentParams: {
        signal_definitions: [{ name: 'engagement', settings: { date_range: 'past-decade' } }],
      } as any,
    })).rejects.toThrow(/settings\.dateRange value: past-decade/)
  })

  it('validates params nested in options as well as the dedicated field', async () => {
    await expect(responses.create({
      messages: [{ role: 'user', content: 'VPs of Sales' }],
      specializedAgent: 'deep_people_search',
      options: {
        specializedAgentParams: { signalDefinitions: [{ name: 'web_traffic' }] },
      },
    })).rejects.toThrow(ValidationError)
  })

  it('rejects malformed automatic switches and intent direction', async () => {
    await expect(responses.deepPeopleSearch('VPs of Sales', {
      autoSelectLane: 'yes' as any,
    })).rejects.toThrow(/autoSelectLane must be true or false/)

    await expect(responses.deepPeopleSearch('VPs of Sales', {
      intentScoringInstructions: { weightEngagement: 1 } as any,
    })).rejects.toThrow(/intentScoringInstructions must be a string/)
  })

  it('accepts the exact two- and three-week post windows', async () => {
    await responses.deepPeopleSearch('People posting about agents', {
      searchPosts: true,
      postsDateRange: 'past-2-weeks',
    })
    expect(postMock.mock.calls[0][1].specializedAgentParams.postsDateRange)
      .toBe('past-2-weeks')

    await responses.influencerEngagement('Revenue leaders', {
      seedProfiles: ['https://www.linkedin.com/in/influencer-one'],
      postsDateRange: 'past-3-weeks',
    })
    expect(postMock.mock.calls[1][1].specializedAgentParams.postsDateRange)
      .toBe('past-3-weeks')
  })

  it('lets automatic lane selection stand in for the Sales Navigator user gate', async () => {
    await expect(responses.deepPeopleSearch('VPs of Sales', {
      salesNavigatorUrl: 'https://www.linkedin.com/sales/search/people?query=test',
    })).rejects.toThrow(/userId is required/)

    await responses.deepPeopleSearch('VPs of Sales', {
      salesNavigatorUrl: 'https://www.linkedin.com/sales/search/people?query=test',
      autoSelectLane: true,
    })

    const params = postMock.mock.calls[0][1].specializedAgentParams
    expect(params.autoSelectLane).toBe(true)
    // The fixed Sales Navigator overrides would misdescribe an auto-selected lane.
    expect(params.searchProfiles).toBeUndefined()
    expect(params.deepValidationUseRelevanceReranker).toBe(true)
  })

  it('keeps the Sales Navigator overrides when the lane is manual', async () => {
    await responses.deepPeopleSearch('VPs of Sales', {
      salesNavigatorUrl: 'https://www.linkedin.com/sales/search/people?query=test',
      userId: 'user-1',
    })

    expect(postMock.mock.calls[0][1].specializedAgentParams).toMatchObject({
      searchProfiles: false,
      searchJobSignal: false,
      deepValidationUseRelevanceReranker: false,
      enrichEngagementHistory: false,
    })
  })

  it('forwards signals from the standalone people lanes', async () => {
    const signalDefinitions: SignalDefinition[] = [{ name: 'funding' }]

    await responses.competitorPostEngagement('VP Sales at mid-market SaaS', {
      competitors: ['outreach.io'],
      signalDefinitions,
      intentScoringInstructions: 'Weight recent funding highest.',
    })
    await responses.competitorRepEngagement('VP Eng at AI startups', {
      competitors: ['outreach.io'],
      signalDefinitions,
    })
    await responses.engagementExpansion('Revenue leaders', {
      expandFromResponse: 'resp-0',
      signalDefinitions,
    })
    await responses.influencerEngagement('Revenue leaders', {
      seedProfiles: ['https://www.linkedin.com/in/influencer-one'],
      signalDefinitions,
    })
    await responses.peopleScoring('Rank these buyers', [
      { linkedinUrl: 'https://www.linkedin.com/in/example' },
    ], { intentScoringInstructions: 'Weight recent funding highest.' })

    expect(postMock.mock.calls[0][1].specializedAgentParams).toMatchObject({
      signalDefinitions,
      intentScoringInstructions: 'Weight recent funding highest.',
    })
    for (const call of postMock.mock.calls.slice(1, 4))
      expect(call[1].specializedAgentParams.signalDefinitions).toEqual(signalDefinitions)
    expect(postMock.mock.calls[4][1].specializedAgentParams.intentScoringInstructions)
      .toBe('Weight recent funding highest.')
  })
})

describe('signal evidence response contract', () => {
  it('reads the signal rows, funnel, and auto selection off a response', () => {
    const wire = {
      signal_contract_version: 1,
      signal_definitions: [
        {
          name: 'recently_joined',
          settings: { date_range: 'past-quarter' },
          context: 'Treat a role change as relevant only when it created budget ownership.',
        },
      ],
      intent_scoring_instructions: 'Prioritize direct engagement.',
      auto_search_selection: {
        reasoning: 'Hiring defines the company pool.',
        planner_failed: false,
        auto_selected_lane: true,
        auto_selected_signals: true,
        primary_lane: 'job_signal',
        secondary_lane: null,
        signal_definitions: [{
          name: 'hiring',
          settings: { date_range: 'past-quarter' },
          context: 'Count revenue hiring and ignore unrelated technical roles.',
        }],
      },
      candidates: [{
        candidate_id: 'c1',
        name: 'Ada Chen',
        overall_score: 8,
        overall_confidence: 0.9,
        summary: 'Strong fit.',
        intent_signals: [{
          signal_type: 'person_authored_post',
          source: 'Ada Chen authored a relevant post',
          score: 8,
          weight: 0.9,
          recency: '3d ago',
          reasoning: 'Recent first-party discussion signals active evaluation.',
          post_url: 'https://linkedin.com/posts/intent-1',
          post_text: 'We are evaluating agent tooling.',
        }],
        signal_evidence: [
          {
            signal_type: 'hiring',
            verdict: 'evidence_found',
            strength: 0.3333,
            detected_at: '2026-08-20',
            source: 'crustdata_job_search',
            reason: 'Acme posted 4 of 12 relevant roles.',
            scope: 'company',
            entity: { name: 'Acme', domain: 'acme.com' },
            settings: { date_range: 'past-quarter' },
            context: 'Count revenue hiring and ignore unrelated technical roles.',
            presentation: {
              summary: 'Acme is adding quota capacity.',
              facts: [{ label: 'Relevant hiring', value: '4 of 12 recent postings' }],
              links: [{ label: 'Enterprise AE, AI', url: 'https://jobs.acme.com/ae', date: '2026-08-20' }],
            },
            evidence: [{ matching_postings: 4, total_postings: 12 }],
          },
          {
            signal_type: 'engagement',
            verdict: 'evidence_found',
            reason: 'relevant engagement evidence found in: reactions',
            scope: 'person',
            presentation: { summary: 'Reacted to agent-tooling posts.', facts: [], links: [] },
            evidence: [],
            outputs: {
              reactions: { verdict: 'evidence_found', evidence: [{ post_url: 'https://linkedin.com/posts/1' }] },
              authored_posts: { verdict: 'unknown', evidence: [], reason: 'no coverage' },
              company_rollup: { verdict: 'evidence_found', strength: 0.5, evidence: [] },
            },
          },
        ],
      }],
      search_stats: {
        fast_filter_passed: 100,
        enrichment: {
          signal_enrichment_pool: {
            requested: 2,
            available_after_fast_filter: 100,
            limit: 3,
            selected: 3,
            skipped: 97,
          },
        },
        signal_funnel: {
          hiring: { candidates_checked: 3, candidates_evidence_found: 1, credits_spent: 0.33 },
          recently_joined: { candidates_checked: 3, credits_spent: 0 },
        },
      },
    }

    const output = toCamelCase<DeepPeopleSearchOutput>(wire)

    expect(output.signalContractVersion).toBe(1)
    // Signal NAMES are values, so they keep their wire spelling…
    expect(output.signalDefinitions?.[0].name).toBe('recently_joined')
    // …while the funnel's keys are camelCased like every other response key.
    expect(output.searchStats?.signalFunnel?.recentlyJoined?.creditsSpent).toBe(0)
    expect(output.searchStats?.signalFunnel?.hiring?.candidatesEvidenceFound).toBe(1)
    expect(output.searchStats?.enrichment?.signalEnrichmentPool).toEqual({
      requested: 2,
      availableAfterFastFilter: 100,
      limit: 3,
      selected: 3,
      skipped: 97,
    })

    expect(output.autoSearchSelection?.primaryLane).toBe('job_signal')
    expect(output.autoSearchSelection?.plannerFailed).toBe(false)
    expect(output.autoSearchSelection?.autoSelectedSignals).toBe(true)

    expect(output.candidates[0].intentSignals?.[0]).toMatchObject({
      signalType: 'person_authored_post',
      postUrl: 'https://linkedin.com/posts/intent-1',
      postText: 'We are evaluating agent tooling.',
    })

    const [hiring, engagement] = output.candidates[0].signalEvidence!
    expect(hiring.verdict).toBe('evidence_found')
    expect(hiring.scope).toBe('company')
    expect(hiring.entity?.domain).toBe('acme.com')
    expect(hiring.context).toBe('Count revenue hiring and ignore unrelated technical roles.')
    expect(hiring.presentation.links[0].url).toBe('https://jobs.acme.com/ae')

    // Engagement keeps its proof once, under outputs.
    expect(engagement.evidence).toEqual([])
    expect(engagement.outputs?.reactions?.verdict).toBe('evidence_found')
    expect(engagement.outputs?.authoredPosts?.verdict).toBe('unknown')
    expect(engagement.outputs?.companyRollup?.strength).toBe(0.5)
  })
})
