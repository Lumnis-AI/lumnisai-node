import type { Http } from '../src/core/http'
import type { DeepPeopleSearchOutput } from '../src/types/responses'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalFileNotSupportedError } from '../src/errors'
import { ResponsesResource } from '../src/resources/responses'
import { toCamelCase } from '../src/utils/case-conversion'

describe('responses AI columns', () => {
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

  it('bootstraps the first extraction column without existing criteria', async () => {
    await responses.peopleScoring(
      'Add an HQ column',
      [{ linkedinUrl: 'https://www.linkedin.com/in/example' }],
      {
        addAndRunCriterion: {
          criterionText: 'Where is the current company headquartered?',
          suggestedColumnName: 'company_hq',
          answerFormat: 'Full state or country name',
          columnKind: 'extraction',
          webVerify: true,
        },
      },
    )

    expect(postMock).toHaveBeenCalledWith('/responses', expect.objectContaining({
      specializedAgent: 'people_scoring',
      specializedAgentParams: expect.objectContaining({
        addAndRunCriterion: {
          criterionText: 'Where is the current company headquartered?',
          suggestedColumnName: 'company_hq',
          answerFormat: 'Full state or country name',
          columnKind: 'extraction',
          webVerify: true,
        },
      }),
    }))
  })

  it('forwards topic-post extraction controls', async () => {
    await responses.deepPeopleSearch('Find relevant authors', {
      searchPosts: true,
      postsExtractAuthor: true,
      postsExtractReactors: false,
      postsExtractCommenters: false,
    })

    expect(postMock).toHaveBeenCalledWith('/responses', expect.objectContaining({
      specializedAgentParams: expect.objectContaining({
        postsExtractAuthor: true,
        postsExtractReactors: false,
        postsExtractCommenters: false,
      }),
    }))
  })

  it('forwards a Sales Navigator source with its acting user', async () => {
    const salesNavigatorUrl
      = 'https://www.linkedin.com/sales/search/people?query=finance-leaders'

    await responses.deepPeopleSearch('Find finance leaders', {
      salesNavigatorUrl,
      userId: 'person@example.com',
      requestedCandidates: 10,
      searchProfiles: true,
      searchPosts: true,
      searchJobSignal: true,
      deepValidationUseRelevanceReranker: true,
      deepValidationBackfillBelowCriteria: true,
      enrichEngagementHistory: true,
    })

    expect(postMock).toHaveBeenCalledWith('/responses', expect.objectContaining({
      userId: 'person@example.com',
      specializedAgent: 'deep_people_search',
      specializedAgentParams: expect.objectContaining({
        salesNavigatorUrl,
        requestedCandidates: 10,
        searchProfiles: false,
        searchPosts: false,
        searchConnections: false,
        searchJobSignal: false,
        includeEngagementInScore: false,
        postsEnableEnrichment: false,
        postsEnableFiltering: false,
        deepValidationUseRelevanceReranker: false,
        deepValidationBackfillBelowCriteria: false,
        enrichEngagementHistory: false,
      }),
    }))
  })

  it('requires an acting user for a Sales Navigator source', async () => {
    await expect(responses.deepPeopleSearch('Find finance leaders', {
      salesNavigatorUrl: 'https://www.linkedin.com/sales/lists/people/7361316386964402177',
    })).rejects.toThrow('userId is required when salesNavigatorUrl is provided')

    expect(postMock).not.toHaveBeenCalled()
  })

  it('enforces the Sales Navigator user guard for nested legacy params', async () => {
    await expect(responses.create({
      messages: [{ role: 'user', content: 'Find finance leaders' }],
      options: {
        specialized_agent_params: {
          sales_navigator_url:
            'https://www.linkedin.com/sales/search/people?query=finance-leaders',
        },
      },
    })).rejects.toThrow('userId is required when salesNavigatorUrl is provided')

    expect(postMock).not.toHaveBeenCalled()
  })

  it('enforces the Sales Navigator user guard for top-level legacy options', async () => {
    await expect(responses.create({
      messages: [{ role: 'user', content: 'Find finance leaders' }],
      options: {
        sales_navigator_url:
          'https://www.linkedin.com/sales/search/people?query=finance-leaders',
      },
    })).rejects.toThrow('userId is required when salesNavigatorUrl is provided')

    expect(postMock).not.toHaveBeenCalled()
  })

  it('rejects an empty Sales Navigator URL before sending the request', async () => {
    await expect(responses.create({
      messages: [{ role: 'user', content: 'Find finance leaders' }],
      userId: 'person@example.com',
      specializedAgent: 'deep_people_search',
      specializedAgentParams: { salesNavigatorUrl: '   ' },
    })).rejects.toThrow('salesNavigatorUrl must be a non-empty string')

    expect(postMock).not.toHaveBeenCalled()
  })

  it.each([
    'http://www.linkedin.com/sales/search/people?query=x',
    'https://linkedin.com/sales/search/people?query=x',
    'https://user@www.linkedin.com/sales/search/people?query=x',
    'https://www.linkedin.com:443/sales/search/people?query=x',
    'https://www.linkedin.com/sales/search/people?query=x#fragment',
    'https://www.linkedin.com/sales/lists/people/not-a-number',
    'https://www.linkedin.com/in/example',
  ])('rejects invalid Sales Navigator URL %s', async (salesNavigatorUrl) => {
    await expect(responses.create({
      messages: [{ role: 'user', content: 'Find finance leaders' }],
      userId: 'person@example.com',
      specializedAgent: 'deep_people_search',
      specializedAgentParams: { salesNavigatorUrl },
    })).rejects.toThrow()

    expect(postMock).not.toHaveBeenCalled()
  })

  it('rejects Sales Navigator company searches with people-only guidance', async () => {
    await expect(responses.create({
      messages: [{ role: 'user', content: 'Find companies' }],
      userId: 'person@example.com',
      specializedAgent: 'deep_people_search',
      specializedAgentParams: {
        salesNavigatorUrl: 'https://www.linkedin.com/sales/search/company?query=x',
      },
    })).rejects.toThrow('Company Sales Navigator searches are not supported yet')

    expect(postMock).not.toHaveBeenCalled()
  })

  it('still requires existing criteria when adding a criterion during deep search', async () => {
    await expect(responses.deepPeopleSearch('Find relevant people', {
      addAndRunCriterion: 'Has relevant experience',
    })).rejects.toThrow('requires existing criteria outside people_scoring')
  })

  it('accepts hard and soft post-retrieval criteria together', async () => {
    const postHard = {
      criterionId: 'post_hard_0',
      columnName: 'commercial_sales',
      criterionText: 'Must sell to commercial accounts',
      criterionType: 'post_hard' as const,
      weight: 1,
    }
    const postSoft = {
      criterionId: 'post_soft_0',
      columnName: 'first_role_holder',
      criterionText: 'Preferably the first person to hold this role',
      criterionType: 'post_soft' as const,
      weight: 1,
      sourceClauseQuote: 'Preferably the first person to hold this role',
    }

    await responses.deepPeopleSearch('Find commercial sellers', {
      criteriaDefinitions: [postHard, postSoft],
      criteriaClassification: {
        universalCriteria: [],
        postHardCriteria: [postHard],
        varyingCriteria: [],
        postSoftCriteria: [postSoft],
        validationOnlyCriteria: [],
      },
    })

    expect(postMock).toHaveBeenCalledWith('/responses', expect.objectContaining({
      specializedAgentParams: expect.objectContaining({
        criteriaDefinitions: [postHard, postSoft],
        criteriaClassification: expect.objectContaining({
          postHardCriteria: [postHard],
          postSoftCriteria: [postSoft],
        }),
      }),
    }))
  })

  it('keeps legacy criteria responses valid when post-retrieval buckets are absent', () => {
    const output = toCamelCase<DeepPeopleSearchOutput>({
      candidates: [{
        candidate_id: 'candidate-1',
        name: 'Legacy Candidate',
        overall_score: 8.5,
        overall_confidence: 0.9,
        summary: 'Legacy response',
        any_universal_failed: false,
      }],
      criteria: {
        version: 1,
        created_at: '2026-08-20T00:00:00Z',
        source: 'generated',
        criteria_definitions: [{
          criterion_id: 'universal_0',
          column_name: 'current_employer',
          criterion_text: 'Currently works at Acme',
          criterion_type: 'universal',
          weight: 1,
        }],
        criteria_classification: {
          universal_criteria: [],
          varying_criteria: [],
          validation_only_criteria: [],
        },
      },
    })

    expect(output.criteria?.criteriaClassification.postHardCriteria).toBeUndefined()
    expect(output.criteria?.criteriaClassification.postSoftCriteria).toBeUndefined()
    expect(output.candidates[0].anyUniversalFailed).toBe(false)
  })

  it('camel-cases new criteria audit, uncertainty, and job-evidence fields', () => {
    const output = toCamelCase<DeepPeopleSearchOutput>({
      candidates: [{
        candidate_id: 'candidate-2',
        name: 'Current Candidate',
        overall_score: 7.5,
        overall_confidence: 0.8,
        summary: 'Needs review',
        any_universal_failed: false,
        any_universal_uncertain: true,
        any_hard_uncertain: true,
        job_signal_metadata: {
          sample_job_listings: [{
            job_id: 'job-1',
            title: 'Revenue Operations Manager',
            date_added: '2026-08-20',
            date_updated: '2026-08-23',
            checked_at: '2026-08-24T12:00:00Z',
            url: 'https://jobs.example.com/job-1',
            source: 'linkedin',
          }],
        },
      }],
      criteria: {
        version: 2,
        created_at: '2026-08-24T00:00:00Z',
        source: 'generated',
        criteria_definitions: [{
          criterion_id: 'post_soft_0',
          column_name: 'first_role_holder',
          criterion_text: 'Preferably first in role',
          criterion_type: 'post_soft',
          weight: 1,
          source_clause_quote: 'Preferably first in role',
          audit_mutated: 'edited+retyped',
          strength_guard_mutated: true,
          strength_guard_reason: 'explicit_soft_source_clause',
        }],
        criteria_classification: {
          universal_criteria: [],
          post_hard_criteria: [],
          varying_criteria: [],
          post_soft_criteria: [],
          validation_only_criteria: [],
        },
      },
    })

    const definition = output.criteria?.criteriaDefinitions[0]
    const listing = output.candidates[0].jobSignalMetadata?.sampleJobListings?.[0]
    expect(definition).toEqual(expect.objectContaining({
      criterionType: 'post_soft',
      sourceClauseQuote: 'Preferably first in role',
      auditMutated: 'edited+retyped',
      strengthGuardMutated: true,
      strengthGuardReason: 'explicit_soft_source_clause',
    }))
    expect(output.candidates[0]).toEqual(expect.objectContaining({
      anyUniversalUncertain: true,
      anyHardUncertain: true,
    }))
    expect(listing).toEqual(expect.objectContaining({
      jobId: 'job-1',
      dateAdded: '2026-08-20',
      dateUpdated: '2026-08-23',
      checkedAt: '2026-08-24T12:00:00Z',
      url: 'https://jobs.example.com/job-1',
    }))
  })

  it('rejects an invalid AI column kind passed through create', async () => {
    await expect(responses.create({
      messages: [{ role: 'user', content: 'Add a column' }],
      specializedAgent: 'people_scoring',
      specializedAgentParams: {
        candidateProfiles: [{ email: 'person@example.com' }],
        addAndRunCriterion: {
          criterionText: 'Where are they based?',
          columnKind: 'category',
        } as any,
      },
    })).rejects.toThrow('column_kind must be extraction or verdict')
  })

  it('rejects blank criterion text in an AI column object', async () => {
    await expect(responses.peopleScoring(
      'Add a column',
      [{ email: 'person@example.com' }],
      { addAndRunCriterion: { criterionText: '   ' } },
    )).rejects.toThrow('requires criterion_text')
  })
})

describe('file reference validation', () => {
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

  const create = (uri: string) => responses.create({
    messages: [{ role: 'user', content: 'Read this' }],
    files: [{ name: 'doc', uri }],
  })

  it.each([
    'http://example.com/report.pdf',
    'https://example.com/report.pdf',
    'https://example.com',
  ])('accepts remote %s', async (uri) => {
    await expect(create(uri)).resolves.toBeDefined()
    expect(postMock).toHaveBeenCalled()
  })

  it('accepts the other allowed schemes and artifact ids', async () => {
    for (const uri of ['s3://bucket/key', 'gs://bucket/key', 'ftp://host/file', 'artifact_abc123'])
      await expect(create(uri)).resolves.toBeDefined()
  })

  it('treats an extra-slash http(s) URI as remote, not as a local path', async () => {
    // WHATWG URL collapses the extra slash, so these parse with hostname
    // 'etc' and are accepted. Pinned because it reads like a local-path
    // escape but is not one — and because the hostname guard in
    // _validateFileReference is unreachable for http/https as a result.
    for (const uri of ['http:///etc/passwd', 'https:///etc/passwd']) {
      await expect(create(uri)).resolves.toBeDefined()
      expect(new URL(uri).hostname).toBe('etc')
    }
  })

  it('rejects disallowed schemes and local paths', async () => {
    for (const uri of [
      'mailto:someone@example.com',
      '/Users/me/report.pdf',
      './report.pdf',
      '../report.pdf',
      'C:\\Users\\me\\report.pdf',
      'report.pdf',
    ])
      await expect(create(uri)).rejects.toThrow(LocalFileNotSupportedError)
  })

  it('does not send the request when a file reference is rejected', async () => {
    await expect(create('/Users/me/report.pdf')).rejects.toThrow(LocalFileNotSupportedError)
    expect(postMock).not.toHaveBeenCalled()
  })
})
