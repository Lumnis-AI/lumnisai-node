import type { Http } from '../src/core/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalFileNotSupportedError } from '../src/errors'
import { ResponsesResource } from '../src/resources/responses'

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

  it('still requires existing criteria when adding a criterion during deep search', async () => {
    await expect(responses.deepPeopleSearch('Find relevant people', {
      addAndRunCriterion: 'Has relevant experience',
    })).rejects.toThrow('requires existing criteria outside people_scoring')
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
