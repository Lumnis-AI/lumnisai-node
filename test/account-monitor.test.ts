import type { AccountMonitorOutput } from '../src'
import type { Http } from '../src/core/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResponsesResource } from '../src/resources/responses'
import { toCamelCase, toSnakeCase } from '../src/utils/case-conversion'

describe('accountMonitor', () => {
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

  it('forwards the account, its period, and every explicit scope', async () => {
    await responses.accountMonitor('Are they re-evaluating their warehouse?', {
      account: 'acme.com',
      depth: 'deep',
      days: 14,
      committee: {
        people: ['https://www.linkedin.com/in/cto'],
        groups: { 'data platform': ['https://www.linkedin.com/in/staff-engineer'] },
      },
      competitors: [
        'rival.com',
        { company: 'other-rival.com', employeeTitles: ['Account Executive'] },
      ],
      maxEmployeesPerCompetitor: 25,
      ourCompany: { company: 'lumnis.ai', people: ['https://www.linkedin.com/in/our-ae'] },
      signalDefinitions: [{ name: 'company_hiring' }, { name: 'committee_activity' }],
      intentScoringInstructions: 'Weight platform migrations above hiring volume.',
      history: { previousOutputs: [{ score: 4 }] },
      tier: 'strategic',
    })

    expect(postMock).toHaveBeenCalledWith('/responses', {
      messages: [{ role: 'user', content: 'Are they re-evaluating their warehouse?' }],
      specializedAgent: 'account_monitor',
      specializedAgentParams: {
        account: 'acme.com',
        depth: 'deep',
        days: 14,
        committee: {
          people: ['https://www.linkedin.com/in/cto'],
          groups: { 'data platform': ['https://www.linkedin.com/in/staff-engineer'] },
        },
        competitors: [
          'rival.com',
          { company: 'other-rival.com', employeeTitles: ['Account Executive'] },
        ],
        maxEmployeesPerCompetitor: 25,
        ourCompany: { company: 'lumnis.ai', people: ['https://www.linkedin.com/in/our-ae'] },
        signalDefinitions: [{ name: 'company_hiring' }, { name: 'committee_activity' }],
        intentScoringInstructions: 'Weight platform migrations above hiring volume.',
        history: { previousOutputs: [{ score: 4 }] },
        tier: 'strategic',
      },
    })
  })

  it('leaves the period and the preset unset so the backend owns defaults', async () => {
    await responses.accountMonitor('What changed this week?', { account: 'acme.com' })

    expect(postMock.mock.calls[0][1].specializedAgentParams).toEqual({ account: 'acme.com' })
  })

  it('accepts an explicit window and the committee shorthands', async () => {
    await responses.accountMonitor('What changed?', {
      account: 'https://www.linkedin.com/company/acme',
      window: { startAt: '2026-09-01T00:00:00Z', endAt: '2026-09-08T00:00:00Z' },
      committee: ['https://www.linkedin.com/in/cto'],
    })

    await responses.create({
      messages: [{ role: 'user', content: 'What changed?' }],
      specializedAgent: 'account_monitor',
      specializedAgentParams: {
        account: 'acme.com',
        committee: { 'security team': ['https://www.linkedin.com/in/ciso'] },
      },
    })

    expect(postMock).toHaveBeenCalledTimes(2)
  })

  it('runs without a steering prompt and names the account instead', async () => {
    await responses.accountMonitor('   ', { account: 'acme.com' })

    expect(postMock.mock.calls[0][1].messages).toEqual([
      { role: 'user', content: 'Account monitor report for acme.com' },
    ])
  })

  it('requires a resolvable account', async () => {
    await expect(responses.accountMonitor('What changed?', { account: '  ' }))
      .rejects
      .toThrow('`account` is required for account_monitor')

    await expect(responses.create({
      messages: [{ role: 'user', content: 'What changed?' }],
      specializedAgent: 'account_monitor',
    })).rejects.toThrow('`account` is required for account_monitor')

    expect(postMock).not.toHaveBeenCalled()
  })

  it('reads the account out of flat options the way the backend merges them', async () => {
    await responses.create({
      messages: [{ role: 'user', content: 'What changed?' }],
      specializedAgent: 'account_monitor',
      options: { account: 'acme.com', days: 30, temperature: 0.2 },
    })

    expect(postMock).toHaveBeenCalledTimes(1)
  })

  it('rejects parameters the closed monitor request does not declare', async () => {
    await expect(responses.create({
      messages: [{ role: 'user', content: 'What changed?' }],
      specializedAgent: 'account_monitor',
      specializedAgentParams: { account: 'acme.com', limit: 50 },
    })).rejects.toThrow(`Unknown account_monitor parameter 'limit'`)

    await expect(responses.create({
      messages: [{ role: 'user', content: 'What changed?' }],
      specializedAgent: 'account_monitor',
      options: {
        specializedAgentParams: { account: 'acme.com', seedProfiles: [] },
      },
    })).rejects.toThrow(`Unknown account_monitor parameter 'seedProfiles'`)
  })

  it('sends the CRM owner as a parameter and the requester as the request user', async () => {
    await responses.accountMonitor('What changed?', {
      account: 'acme.com',
      crmUserId: 'owner@example.com',
      userId: 'requester@example.com',
    })

    expect(postMock).toHaveBeenCalledWith('/responses', {
      messages: [{ role: 'user', content: 'What changed?' }],
      specializedAgent: 'account_monitor',
      specializedAgentParams: { account: 'acme.com', crmUserId: 'owner@example.com' },
      userId: 'requester@example.com',
    })
  })

  it('refuses a CRM read that does not name a requester or an owner', async () => {
    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      crmUserId: 'owner@example.com',
    })).rejects.toThrow('userId is required when crmUserId is provided')

    await expect(responses.create({
      messages: [{ role: 'user', content: 'What changed?' }],
      specializedAgent: 'account_monitor',
      specializedAgentParams: { account: 'acme.com', crmUserId: '   ' },
      userId: 'requester@example.com',
    })).rejects.toThrow('crmUserId must be the UUID or email of a CRM owner')

    expect(postMock).not.toHaveBeenCalled()
  })

  it('validates the period, the preset, and the signal vocabulary', async () => {
    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      days: 7,
      window: { startAt: '2026-09-01T00:00:00Z', endAt: '2026-09-08T00:00:00Z' },
    })).rejects.toThrow('Supply days or window for account_monitor, not both')

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      days: 0,
    })).rejects.toThrow('days must be a positive integer')

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      window: { startAt: '2026-09-01T00:00:00Z' } as any,
    })).rejects.toThrow('window.endAt must be a timezone-aware ISO 8601 timestamp')

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      depth: 'exhaustive' as any,
    })).rejects.toThrow(`depth must be 'light' or 'deep'`)

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      signalDefinitions: [{ name: 'hiring' as any }],
    })).rejects.toThrow(`'hiring' is not an account_monitor signal`)

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      signalDefinitions: [{ name: 'our_company_to_account' as any }],
    })).rejects.toThrow(`The 'our_company_to_account' monitor check was retired`)

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      signalDefinitions: [{ name: 'company_news' }, { name: 'company_news' }],
    })).rejects.toThrow(`The 'company_news' signal appears more than once`)

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      signalDefinitions: [{ name: 'company_news', settings: { dateRange: 'past-week' } } as any],
    })).rejects.toThrow(`Unknown signalDefinitions field 'settings'`)

    expect(postMock).not.toHaveBeenCalled()
  })

  it('caps competitor collection with a positive whole number of employees', async () => {
    await responses.accountMonitor('What changed?', {
      account: 'acme.com',
      maxEmployeesPerCompetitor: 1,
    })

    expect(postMock.mock.calls[0][1].specializedAgentParams.maxEmployeesPerCompetitor).toBe(1)

    for (const value of [0, -1, 2.5, '10']) {
      await expect(responses.accountMonitor('What changed?', {
        account: 'acme.com',
        maxEmployeesPerCompetitor: value as any,
      })).rejects.toThrow('maxEmployeesPerCompetitor must be a positive integer')
    }

    expect(postMock).toHaveBeenCalledTimes(1)
  })

  it('validates committee people and group names', async () => {
    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      committee: ['   '],
    })).rejects.toThrow('committee must be an array of LinkedIn profile URLs')

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      committee: { groups: { '  ': ['https://www.linkedin.com/in/cto'] } },
    })).rejects.toThrow('committee.groups group names must not be blank')

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      committee: { people: 'https://www.linkedin.com/in/cto' as any },
    })).rejects.toThrow('committee.people must be an array of LinkedIn profile URLs')
  })

  it('keeps employee scopes explicit on competitors and our company', async () => {
    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      competitors: [{ company: '  ' }],
    })).rejects.toThrow('competitors[0].company is required')

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      competitors: [{ company: 'rival.com', employeeTitles: [] }],
    })).rejects.toThrow('competitors[0].employeeTitles must contain at least one non-blank')

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      ourCompany: { company: 'lumnis.ai', titles: ['AE'] } as any,
    })).rejects.toThrow(`Unknown ourCompany field 'titles'`)
  })

  it('forwards supplied matching people as URLs or as named identities', async () => {
    await responses.accountMonitor('What changed?', {
      account: 'acme.com',
      competitors: [
        {
          company: 'rival.com',
          matchingPeople: [
            'https://www.linkedin.com/in/their-ae',
            {
              linkedinUrl: 'https://www.linkedin.com/in/their-vp',
              name: 'Dana Lee',
              title: 'VP Sales',
            },
          ],
        },
        // [] is a scope, not an omission: it replaces employee discovery.
        { company: 'other-rival.com', matchingPeople: [] },
      ],
      ourCompany: {
        company: 'lumnis.ai',
        matchingPeople: ['https://www.linkedin.com/in/our-ae'],
      },
    })

    const params = postMock.mock.calls[0][1].specializedAgentParams
    expect(params.competitors).toEqual([
      {
        company: 'rival.com',
        matchingPeople: [
          'https://www.linkedin.com/in/their-ae',
          {
            linkedinUrl: 'https://www.linkedin.com/in/their-vp',
            name: 'Dana Lee',
            title: 'VP Sales',
          },
        ],
      },
      { company: 'other-rival.com', matchingPeople: [] },
    ])
    expect(params.ourCompany.matchingPeople).toEqual(['https://www.linkedin.com/in/our-ae'])
  })

  it('validates matching people without rejecting an empty list', async () => {
    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      competitors: [{ company: 'rival.com', matchingPeople: 'https://www.linkedin.com/in/ae' as any }],
    })).rejects.toThrow('competitors[0].matchingPeople must be an array of LinkedIn profile URLs')

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      competitors: [{ company: 'rival.com', matchingPeople: ['  '] }],
    })).rejects.toThrow('competitors[0].matchingPeople[0] must be a non-blank LinkedIn profile URL')

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      competitors: [{ company: 'rival.com', matchingPeople: [{ name: 'Dana Lee' } as any] }],
    })).rejects.toThrow('competitors[0].matchingPeople[0].linkedinUrl is required')

    await expect(responses.accountMonitor('What changed?', {
      account: 'acme.com',
      ourCompany: {
        company: 'lumnis.ai',
        matchingPeople: [
          { linkedinUrl: 'https://www.linkedin.com/in/our-ae', headline: 'AE' } as any,
        ],
      },
    })).rejects.toThrow(`Unknown ourCompany.matchingPeople[0] field 'headline'`)

    expect(postMock).not.toHaveBeenCalled()
  })

  it('sends monitor fields as snake_case while leaving committee labels alone', () => {
    const body = toSnakeCase<Record<string, any>>({
      specializedAgent: 'account_monitor',
      specializedAgentParams: {
        account: 'acme.com',
        ourCompany: { company: 'lumnis.ai', employeeTitles: ['Account Executive'] },
        competitors: [{
          company: 'rival.com',
          matchingPeople: [{ linkedinUrl: 'https://www.linkedin.com/in/their-vp', title: 'VP Sales' }],
        }],
        signalDefinitions: [{ name: 'company_hiring' }],
        window: { startAt: '2026-09-01T00:00:00Z', endAt: '2026-09-08T00:00:00Z' },
        committee: { groups: { 'Security Team': ['https://www.linkedin.com/in/ciso'] } },
      },
    })

    expect(body.specialized_agent).toBe('account_monitor')
    expect(body.specialized_agent_params.our_company.employee_titles).toEqual(['Account Executive'])
    expect(body.specialized_agent_params.competitors).toEqual([{
      company: 'rival.com',
      matching_people: [{ linkedin_url: 'https://www.linkedin.com/in/their-vp', title: 'VP Sales' }],
    }])
    expect(body.specialized_agent_params.signal_definitions).toEqual([{ name: 'company_hiring' }])
    expect(body.specialized_agent_params.window).toEqual({
      start_at: '2026-09-01T00:00:00Z',
      end_at: '2026-09-08T00:00:00Z',
    })
    // Group names are the customer's own labels, not API field names.
    expect(body.specialized_agent_params.committee).toEqual({
      groups: { 'Security Team': ['https://www.linkedin.com/in/ciso'] },
    })
  })

  it('camel-cases the card, the analyses, and the coverage ledger', () => {
    const response = toCamelCase<{ structuredResponse: AccountMonitorOutput }>({
      structured_response: {
        account: 'acme.com',
        window: { start_at: '2026-09-01T00:00:00Z', end_at: '2026-09-08T00:00:00Z' },
        depth: 'deep',
        selected_signals: ['company_hiring', 'committee_activity'],
        card: {
          account: 'acme.com',
          tier: 'strategic',
          level: 'look_into_it',
          owner: null,
          score: 6,
          reasons: ['Two platform roles opened this week.'],
          coverage: ['Company mentions were not requested.'],
          signals_found: 2,
          signals_checked: 3,
          validation: 'warnings',
          assessment_status: 'limited',
          assessment_reason: 'Current findings support attention, but some requested checks or dates are incomplete.',
          sections: [{ title: 'Data platform hiring', body: '- Evidence: two roles.', evidence_ids: ['abc'] }],
          recommendation: {
            action: 'Review the platform roles before reaching out.',
            reasoning: 'Two roles name the warehouse migration.',
            evidence_ids: ['abc'],
            suggested_timing: 'this week',
          },
        },
        account_analysis: {
          score: {
            score: 6,
            level: 'look_into_it',
            reasoning: ['They are staffing a data platform team.'],
            signals: [{
              signal_type: 'company_hiring',
              subject: 'acme.com',
              status: 'found',
              relevant: true,
              score: 6,
              evidence_ids: ['abc'],
              evidence_url: 'https://example.com/job',
            }],
            coverage: ['Only supplied records were analysed.'],
            sections: [{
              title: 'Committee activity as a group',
              body: '- Evidence: two members touched the same subject.',
              evidence_ids: ['abc'],
            }],
            recommendation: {
              action: 'Review the platform roles before reaching out.',
              reasoning: 'Two roles name the warehouse migration.',
              evidence_ids: ['abc'],
              suggested_timing: 'this week',
            },
            uncertainty: ['The posting date is indexed, not stated.'],
          },
          assessment: {
            status: 'limited',
            reason: 'Current findings support attention, but some requested checks or dates are incomplete.',
            requested_signal_types: ['company_hiring', 'committee_activity'],
            incomplete_signal_types: ['committee_activity'],
          },
          comparison: {
            status: 'compared',
            meaning: 'New means newly observed in the supplied comparison, not newly occurred.',
            unresolved_previous: [{ signal_type: 'company_news', status: 'unknown' }],
          },
          validation: {
            status: 'warnings',
            mismatched_evidence_ids: ['def'],
            raw_evidence_ids_in_reasoning: ['abc'],
            missing_signals: [{ signal_type: 'company_funding', subject: 'acme.com' }],
            unsupported_positive_signals: [{ signal_type: 'company_news', subject: null }],
          },
          cited_evidence: [{
            evidence_id: 'abc',
            source: 'jobs',
            subject: 'acme.com',
            kind: 'job',
            record: { job_id: 42, title: 'Staff Data Engineer', date_posted: '2026-09-03' },
            post_ids: [],
            actor: {
              basis: 'provider',
              aliases: [{ kind: 'company', namespace: 'linkedin_url', value: 'https://linkedin.com/company/acme' }],
              raw: { name: 'Acme' },
            },
            action_time: { precision: 'day', earliest: '2026-09-03T00:00:00Z', latest: '2026-09-04T00:00:00Z', latest_exclusive: true, field: 'date_posted' },
            post_time: { precision: 'unknown', value: null },
            window_status: 'in_window',
            provenance: [{ page_index: 0, row_index: 3, raw_artifact_ids: ['evidence-raw:abc'], window_basis: 'date_posted' }],
          }],
          collected_signals: [{
            signal_type: 'company_hiring',
            subject: 'acme.com',
            status: 'found',
            in_window_observations: 2,
            collected_observations: 5,
            feeds: [{ feed: 'jobs', stop_reason: 'no_more_pages', error: null }],
          }],
          usage: { input_tokens: 1200, output_tokens: 300, duration_ms: 4200.5 },
        },
        validation: { status: 'warnings' },
        person_reports: [{
          subject: 'https://www.linkedin.com/in/cto',
          report: {
            nothing_in_window: false,
            activity_summary: 'Commented on two warehouse migration posts.',
            professional_developments: [{
              statement: 'Owns the migration workstream.',
              evidence_ids: ['abc'],
              recency: [{ window_status: 'in_window' }],
            }],
            coverage_statement: 'Two feeds were checked.',
          },
          validation: { status: 'validated' },
        }],
        person_report_failures: [{
          subject: 'https://www.linkedin.com/in/vp-eng',
          validation: { status: 'error', error_type: 'TimeoutError' },
        }],
        company_source_reports: [{
          kind: 'hiring',
          report: { reasoning: 'Two roles name the warehouse.', findings: [] },
          validation: { status: 'validated' },
        }],
        company_source_report_failures: [],
        committee_synthesis: {
          report: {
            committee_patterns: [{ statement: 'Both members follow the same vendor.' }],
            questions: ['Is a budget approved?'],
          },
          validation: { status: 'validated' },
        },
        committee_synthesis_failure: null,
        source_coverage: [{
          request: {
            source: 'jobs',
            subject: 'acme.com',
            window: { start_at: '2026-09-01T00:00:00Z', end_at: '2026-09-08T00:00:00Z' },
            parameters: { company_id: 42 },
            groups: [],
          },
          coverage: {
            complete: false,
            complete_meaning: 'requested_source_traversal_not_all_public_activity',
            stop_reason: 'lookback_window',
            source_records: 5,
            observations: 5,
            window_statuses: { in_window: 2, outside: 3, uncertain: 0, undated: 0 },
            credits: 6,
          },
          evidence_ids: ['abc'],
        }],
        report_markdown: '# acme.com\n\nScore: 6/10',
        artifact_refs: {
          input: 'evidence-monitor-input',
          person_reports: ['evidence-monitor-person:1'],
          committee_synthesis: 'evidence-monitor-committee-synthesis:1',
        },
      },
    })

    const output = response.structuredResponse
    expect(output.card.signalsFound).toBe(2)
    expect(output.card.assessmentStatus).toBe('limited')
    expect(output.card.recommendation?.suggestedTiming).toBe('this week')
    expect(output.card.sections?.[0].body).toContain('Evidence')
    expect(output.selectedSignals).toEqual(['company_hiring', 'committee_activity'])
    expect(output.accountAnalysis.score?.signals?.[0].signalType).toBe('company_hiring')
    expect(output.accountAnalysis.validation?.mismatchedEvidenceIds).toEqual(['def'])
    expect(output.accountAnalysis.validation?.rawEvidenceIdsInReasoning).toEqual(['abc'])
    expect(output.accountAnalysis.assessment?.incompleteSignalTypes).toEqual(['committee_activity'])
    expect(output.accountAnalysis.comparison?.unresolvedPrevious?.[0].signalType)
      .toBe('company_news')
    expect(output.personReports[0].report?.nothingInWindow).toBe(false)
    expect(output.personReports[0].report?.professionalDevelopments?.[0].evidenceIds).toEqual(['abc'])
    expect(output.personReportFailures[0].validation?.errorType).toBe('TimeoutError')
    expect(output.companySourceReports[0].kind).toBe('hiring')
    expect(output.committeeSynthesis?.report?.questions).toEqual(['Is a budget approved?'])
    expect(output.sourceCoverage[0].coverage.stopReason).toBe('lookback_window')
    expect(output.artifactRefs.personReports).toEqual(['evidence-monitor-person:1'])
    expect(output.reportMarkdown).toContain('Score: 6/10')

    // Nested keys are camel-cased too, including the bucket names inside
    // windowStatuses and the signal references inside validation.
    const coverage = output.sourceCoverage[0]
    expect(coverage.request.window.startAt).toBe('2026-09-01T00:00:00Z')
    expect(coverage.request.parameters?.companyId).toBe(42)
    expect(coverage.coverage.windowStatuses?.inWindow).toBe(2)
    expect(coverage.coverage.completeMeaning)
      .toBe('requested_source_traversal_not_all_public_activity')
    expect(output.accountAnalysis.validation?.missingSignals?.[0].signalType)
      .toBe('company_funding')
    expect(output.accountAnalysis.validation?.unsupportedPositiveSignals?.[0].signalType)
      .toBe('company_news')

    const row = output.accountAnalysis.citedEvidence?.[0]
    expect(row?.windowStatus).toBe('in_window')
    expect(row?.actionTime?.latestExclusive).toBe(true)
    expect(row?.actor?.aliases?.[0].namespace).toBe('linkedin_url')
    expect(row?.provenance?.[0].rawArtifactIds).toEqual(['evidence-raw:abc'])
    // The source's own row survives under `record`, with its keys
    // camel-cased like every other key in a response.
    expect(row?.record.jobId).toBe(42)
    expect(row?.record.datePosted).toBe('2026-09-03')
    expect(row?.record.title).toBe('Staff Data Engineer')

    expect(output.accountAnalysis.collectedSignals?.[0].inWindowObservations).toBe(2)
    expect(output.accountAnalysis.collectedSignals?.[0].feeds?.[0].stopReason)
      .toBe('no_more_pages')
    expect(output.accountAnalysis.usage?.durationMs).toBe(4200.5)
  })

  it('camel-cases the CRM coverage a crmUserId run adds', () => {
    const response = toCamelCase<{ structuredResponse: AccountMonitorOutput }>({
      structured_response: {
        crm_context: {
          status: 'ok',
          provider_coverage: [{
            provider: 'hubspot',
            account_source: 'complete',
            person_source: 'degraded',
            deal_source: 'complete',
          }],
          history_coverage: [
            { provider: 'hubspot', status: 'partial', checks: 12, incomplete_checks: 2 },
            { provider: 'attio', status: 'unsupported', checks: 0, incomplete_checks: 0 },
          ],
        },
        artifact_refs: { crm_context: 'evidence-internal:crm-context' },
      },
    })

    const crm = response.structuredResponse.crmContext
    expect(crm?.status).toBe('ok')
    expect(crm?.providerCoverage?.[0].accountSource).toBe('complete')
    expect(crm?.providerCoverage?.[0].personSource).toBe('degraded')
    expect(crm?.historyCoverage?.[0].status).toBe('partial')
    expect(crm?.historyCoverage?.[0].incompleteChecks).toBe(2)
    expect(crm?.historyCoverage?.[1].status).toBe('unsupported')
    // Coverage only: the CRM records stay in the run's private evidence.
    expect(crm?.response).toBeUndefined()
    expect(crm?.history).toBeUndefined()
    expect(response.structuredResponse.artifactRefs.crmContext)
      .toBe('evidence-internal:crm-context')
  })
})
