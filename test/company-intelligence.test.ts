import type { Http } from '../src/core/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResponsesResource } from '../src/resources/responses'
import { toCamelCase, toSnakeCase } from '../src/utils/case-conversion'

describe('companyIntelligence', () => {
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

  it('sends only the company and a default prompt when no options are given', async () => {
    await responses.companyIntelligence('acme.com')

    expect(postMock).toHaveBeenCalledWith('/responses', {
      messages: [{ role: 'user', content: 'Company intelligence report for acme.com' }],
      specializedAgent: 'company_intelligence',
      specializedAgentParams: { company: 'acme.com' },
    })
  })

  it('leaves sinceDays, reader and allowSpend unset so the backend owns the defaults', async () => {
    await responses.companyIntelligence('acme.com')

    const params = postMock.mock.calls[0][1].specializedAgentParams
    expect(params).not.toHaveProperty('sinceDays')
    expect(params).not.toHaveProperty('reader')
    expect(params).not.toHaveProperty('allowSpend')
  })

  it('forwards context, register, posting window and spend control', async () => {
    await responses.companyIntelligence('  acme.com  ', {
      prompt: 'Focus on their platform-team hiring',
      companyContext: 'We sell observability tooling to platform teams',
      reader: 'vendor',
      sinceDays: 90,
      allowSpend: true,
    })

    expect(postMock).toHaveBeenCalledWith('/responses', {
      messages: [{ role: 'user', content: 'Focus on their platform-team hiring' }],
      specializedAgent: 'company_intelligence',
      specializedAgentParams: {
        company: 'acme.com',
        companyContext: 'We sell observability tooling to platform teams',
        reader: 'vendor',
        sinceDays: 90,
        allowSpend: true,
      },
    })
  })

  it('keeps allowSpend: false rather than dropping it', async () => {
    await responses.companyIntelligence('acme.com', { allowSpend: false })

    expect(postMock.mock.calls[0][1].specializedAgentParams).toEqual({
      company: 'acme.com',
      allowSpend: false,
    })
  })

  it('rejects a blank company', async () => {
    await expect(responses.companyIntelligence('   ')).rejects.toThrow(
      'companyIntelligence requires a non-empty company domain',
    )
  })

  it('validates company_intelligence params through low-level create', async () => {
    await expect(responses.create({
      messages: [{ role: 'user', content: 'Report' }],
      specializedAgent: 'company_intelligence',
      specializedAgentParams: { companyContext: 'no target given' },
    })).rejects.toThrow('`company` is required for company_intelligence')

    await expect(responses.create({
      messages: [{ role: 'user', content: 'Report' }],
      specializedAgent: 'company_intelligence',
      specializedAgentParams: { company: 'acme.com', since_days: 5000 },
    })).rejects.toThrow('sinceDays must be an integer between 1 and 3650')

    await expect(responses.create({
      messages: [{ role: 'user', content: 'Report' }],
      specializedAgent: 'company_intelligence',
      specializedAgentParams: { company: 'acme.com', allowSpend: 'yes' as any },
    })).rejects.toThrow('allowSpend must be a boolean')
  })

  it('accepts a company at both ends of the sinceDays range', async () => {
    await expect(responses.companyIntelligence('acme.com', { sinceDays: 1 })).resolves.toBeDefined()
    await expect(responses.companyIntelligence('acme.com', { sinceDays: 3650 })).resolves.toBeDefined()
    await expect(responses.companyIntelligence('acme.com', { sinceDays: 0 })).rejects.toThrow(
      'sinceDays must be an integer between 1 and 3650',
    )
  })

  it('snake-cases the new params on the wire', () => {
    expect(toSnakeCase<any>({
      company: 'acme.com',
      companyContext: 'ctx',
      sinceDays: 90,
      allowSpend: true,
      reader: 'investor',
      linkedinUrl: 'https://linkedin.com/in/dan',
      personName: 'Dan Chen',
    })).toEqual({
      company: 'acme.com',
      company_context: 'ctx',
      since_days: 90,
      allow_spend: true,
      reader: 'investor',
      linkedin_url: 'https://linkedin.com/in/dan',
      person_name: 'Dan Chen',
    })
  })
})

describe('personIntelligence', () => {
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

  it('routes a LinkedIn URL through the URL door, with no name', async () => {
    await responses.personIntelligence('https://www.linkedin.com/in/danteran/')

    expect(postMock).toHaveBeenCalledWith('/responses', {
      messages: [{
        role: 'user',
        content: 'Person intelligence report for https://www.linkedin.com/in/danteran/',
      }],
      specializedAgent: 'person_intelligence',
      specializedAgentParams: { linkedinUrl: 'https://www.linkedin.com/in/danteran/' },
    })
  })

  it('treats a scheme-less linkedin.com target as the URL door', async () => {
    await responses.personIntelligence('linkedin.com/in/danteran')

    expect(postMock.mock.calls[0][1].specializedAgentParams).toEqual({
      linkedinUrl: 'linkedin.com/in/danteran',
    })
  })

  it('routes a name through the name door with the employer domain', async () => {
    await responses.personIntelligence('Dan Chen', {
      company: 'acme.com',
      companyContext: 'We sell CRMs to zoos',
    })

    expect(postMock.mock.calls[0][1].specializedAgentParams).toEqual({
      personName: 'Dan Chen',
      company: 'acme.com',
      companyContext: 'We sell CRMs to zoos',
    })
  })

  it('keeps company as employer context on the URL door', async () => {
    await responses.personIntelligence('https://linkedin.com/in/dan', { company: 'acme.com' })

    expect(postMock.mock.calls[0][1].specializedAgentParams).toEqual({
      linkedinUrl: 'https://linkedin.com/in/dan',
      company: 'acme.com',
    })
  })

  it('refuses a bare name with no employer domain', async () => {
    await expect(responses.personIntelligence('Dan Chen')).rejects.toThrow(
      /needs `company` \(the employer's domain\) to resolve "Dan Chen"/,
    )
    await expect(responses.personIntelligence('Dan Chen', { company: '  ' })).rejects.toThrow(
      /needs `company`/,
    )
  })

  it('rejects a blank target', async () => {
    await expect(responses.personIntelligence('  ')).rejects.toThrow(
      'personIntelligence requires a LinkedIn profile URL or a person name',
    )
  })

  it('validates person_intelligence params through low-level create', async () => {
    await expect(responses.create({
      messages: [{ role: 'user', content: 'Report' }],
      specializedAgent: 'person_intelligence',
      specializedAgentParams: { person_name: 'Dan Chen' },
    })).rejects.toThrow('`personName` needs `company`')

    await expect(responses.create({
      messages: [{ role: 'user', content: 'Report' }],
      specializedAgent: 'person_intelligence',
      specializedAgentParams: { company: 'acme.com' },
    })).rejects.toThrow('Give a person for person_intelligence')

    // personName + linkedinUrl needs no company — the URL already identifies them.
    await expect(responses.create({
      messages: [{ role: 'user', content: 'Report' }],
      specializedAgent: 'person_intelligence',
      specializedAgentParams: {
        person_name: 'Dan Chen',
        linkedin_url: 'https://linkedin.com/in/dan',
      },
    })).resolves.toBeDefined()
  })
})

describe('intelligence report structured response', () => {
  it('camel-cases envelope keys while preserving section, chart and block selectors', () => {
    const response = toCamelCase<any>({
      structured_response: {
        report_markdown: '# Acme\n\n## 1. Executive summary\nBody text.',
        richness: null,
        stats: {
          raw_postings: 412,
          requisitions_after_clustering: 388,
          date_range: '2024-02-01 to 2026-08-19',
          velocity_series: {
            '30d': { all: 4, no_reposts: 3 },
            'all_time': { all: 412, no_reposts: 300 },
          },
          live_board_open_roles: null,
        },
        credits: {
          total: 74.5,
          entries: [{
            endpoint: '/job/search page',
            results: 1000,
            credits: 30,
            credits_source: 'estimate',
            note: 'full payload',
          }],
        },
        summary: {
          mode: 'company',
          subject: { type: 'company', domain: 'acme.com', not_indexed: false },
          report_chars: 40823,
          complete: true,
          credits_total: 74.5,
          leg_counts: {},
          errors: 0,
        },
        agent_params: { company: 'acme.com', since_days: null, allow_spend: false },
        envelope: {
          subject: { type: 'company', domain: 'acme.com' },
          generated_at: '2026-08-19T12:00:00+00:00',
          translator_model: 'openai:gpt-5.4',
          sections: [
            { id: '1_executive_summary', title: '1. Executive summary' },
            { id: 'overview', title: 'Overview' },
            { id: 'overview_2', title: 'Overview' },
          ],
          blocks: [{
            type: 'prose',
            section_id: '1_executive_summary',
            title: '1. Executive summary',
            prose: 'Body text.',
            tables: [{ columns: ['Number', 'Value'], rows: [['Headcount now', '59']] }],
            overlays: {
              weighted_calls: [{
                about: 'verdict',
                options: [{ label: 'Bull', pct: 65, excerpt: 'Bull (65%)' }],
              }],
              quotes: [{ quote: 'slow-dried, not cooked', speaker: null, date: null, url: null }],
              watchlist_items: ['East Grocery results by mid-2027'],
              chart_takeaway: 'Headcount has compounded without interruption',
            },
          }],
          charts: [
            { type: 'line_chart', id: 'headcount_weekly', points: [{ date: '2026-01-05', value: 42 }] },
            { type: 'bar_chart', id: 'function_mix', bars: [{ label: 'Sales', value: 10 }] },
          ],
          overlay_drops: 2,
          report_markdown: '# Acme\n\n## 1. Executive summary\nBody text.',
        },
      },
    })

    const output = response.structuredResponse

    expect(output.reportMarkdown).toContain('# Acme')
    expect(output.richness).toBeNull()
    expect(output.summary).toEqual({
      mode: 'company',
      subject: { type: 'company', domain: 'acme.com', notIndexed: false },
      reportChars: 40823,
      complete: true,
      creditsTotal: 74.5,
      legCounts: {},
      errors: 0,
    })
    expect(output.credits.entries[0]).toEqual({
      endpoint: '/job/search page',
      results: 1000,
      credits: 30,
      creditsSource: 'estimate',
      note: 'full payload',
    })
    expect(output.agentParams).toEqual({
      company: 'acme.com',
      sinceDays: null,
      allowSpend: false,
    })

    // Window keys of the velocity series are object keys, so they camel-case too.
    expect(output.stats.velocitySeries).toEqual({
      '30d': { all: 4, noReposts: 3 },
      'allTime': { all: 412, noReposts: 300 },
    })
    expect(output.stats.dateRange).toBe('2024-02-01 to 2026-08-19')
    expect(output.stats.liveBoardOpenRoles).toBeNull()

    // Envelope: keys convert, selector VALUES (section ids, chart ids, types) do not.
    expect(output.envelope.generatedAt).toBe('2026-08-19T12:00:00+00:00')
    expect(output.envelope.translatorModel).toBe('openai:gpt-5.4')
    expect(output.envelope.overlayDrops).toBe(2)
    expect(output.envelope.sections[0].id).toBe('1_executive_summary')
    // Repeated headings get a numeric suffix so by-id joins stay 1:1.
    expect(output.envelope.sections.map((s: any) => s.id)).toEqual([
      '1_executive_summary',
      'overview',
      'overview_2',
    ])
    expect(output.envelope.charts.map((c: any) => [c.type, c.id])).toEqual([
      ['line_chart', 'headcount_weekly'],
      ['bar_chart', 'function_mix'],
    ])

    const block = output.envelope.blocks[0]
    expect(block.type).toBe('prose')
    expect(block.sectionId).toBe('1_executive_summary')
    expect(block.tables[0]).toEqual({ columns: ['Number', 'Value'], rows: [['Headcount now', '59']] })
    expect(block.overlays.weightedCalls[0].options[0]).toEqual({
      label: 'Bull',
      pct: 65,
      excerpt: 'Bull (65%)',
    })
    expect(block.overlays.watchlistItems).toEqual(['East Grocery results by mid-2027'])
    expect(block.overlays.chartTakeaway).toBe('Headcount has compounded without interruption')
  })

  it('camel-cases the person lane richness grades', () => {
    const response = toCamelCase<any>({
      structured_response: {
        report_markdown: '# Dan Chen',
        stats: {},
        richness: {
          reasoning: 'Dense post history, no other platforms found.',
          identity: 'rich',
          voice_posts: 'rich',
          engagement: 'fair',
          other_platforms: 'poor',
          web_presence: 'fair',
          employer_context: 'rich',
          overall: 'fair',
          scored_by: 'openai:gpt-5.4',
        },
        summary: {
          mode: 'person',
          subject: {
            type: 'person',
            name: 'Dan Chen',
            linkedin_url: 'https://linkedin.com/in/dan',
            company_domain: 'acme.com',
          },
          report_chars: 18000,
          leg_counts: {
            posts: 42,
            comments: 12,
            reactions: 88,
            tweets: 0,
            ig_posts: 0,
            web_results: 7,
            employer_brief: true,
          },
          errors: 0,
        },
      },
    })

    expect(response.structuredResponse.richness).toEqual({
      reasoning: 'Dense post history, no other platforms found.',
      identity: 'rich',
      voicePosts: 'rich',
      engagement: 'fair',
      otherPlatforms: 'poor',
      webPresence: 'fair',
      employerContext: 'rich',
      overall: 'fair',
      scoredBy: 'openai:gpt-5.4',
    })
    expect(response.structuredResponse.summary.subject).toEqual({
      type: 'person',
      name: 'Dan Chen',
      linkedinUrl: 'https://linkedin.com/in/dan',
      companyDomain: 'acme.com',
    })
    // Per-leg evidence sizes ride on summary.legCounts, not on `stats`.
    expect(response.structuredResponse.summary.legCounts).toEqual({
      posts: 42,
      comments: 12,
      reactions: 88,
      tweets: 0,
      igPosts: 0,
      webResults: 7,
      employerBrief: true,
    })
  })

  it('keeps the report when the translator failed (envelope null, error counted)', () => {
    const response = toCamelCase<any>({
      structured_response: {
        envelope: null,
        report_markdown: '# Acme\n\nBody.',
        summary: { mode: 'company', report_chars: 13, errors: 1 },
      },
    })

    expect(response.structuredResponse.envelope).toBeNull()
    expect(response.structuredResponse.reportMarkdown).toBe('# Acme\n\nBody.')
    expect(response.structuredResponse.summary.errors).toBe(1)
  })
})
