import type { Http } from '../src/core/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
