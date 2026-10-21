import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LumnisClient, NoDataSourcesError } from '../src'

const people = [{ name: 'Example Person', company: 'Example Company', title: 'CEO' }]
function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

describe('linkedin lookup transport', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let client: LumnisClient

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    client = new LumnisClient({
      apiKey: 'test-key',
      baseUrl: 'https://api.example.test',
      maxRetries: 3,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('preserves row outcomes, supplied title and provider candidate order', async () => {
    fetchMock.mockResolvedValue(json({
      results: [{
        input_index: 0,
        input_title: 'CEO',
        status: 'matched',
        reason: null,
        candidates: [{
          linkedin_url: 'https://linkedin.com/in/example',
          full_name: 'Example Person',
          headline: null,
          current_title: 'Chief Executive Officer',
          current_company: 'Example Company',
          location: null,
          relevance_score: 0.9,
        }, {
          linkedin_url: 'https://linkedin.com/in/another-example',
          full_name: 'Another Example',
          headline: null,
          current_title: 'CEO',
          current_company: 'Example Company',
          location: null,
          relevance_score: null,
        }],
      }, {
        input_index: 1,
        input_title: null,
        status: 'not_found',
        reason: 'no_current_employee_match',
        candidates: [],
      }, {
        input_index: 2,
        input_title: null,
        status: 'error',
        reason: 'timeout',
        candidates: [],
      }],
    }))

    const rows = [...people, { name: 'Missing', company: 'Example' }, { name: 'Slow', company: 'Example' }]
    const result = await client.people.findLinkedInProfiles({ people: rows })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.example.test/v1/people/find-linkedin-profiles')
    expect(JSON.parse(init.body)).toEqual({ people: rows })
    expect(init).not.toHaveProperty('maxRetries')
    expect(init).not.toHaveProperty('timeoutMs')
    expect(result.results.map(row => row.status)).toEqual(['matched', 'not_found', 'error'])
    expect(result.results[0].inputTitle).toBe('CEO')
    expect(result.results[0].candidates.map(candidate => candidate.linkedinUrl)).toEqual([
      'https://linkedin.com/in/example',
      'https://linkedin.com/in/another-example',
    ])
    expect(result.results[0].candidates[0].currentTitle).toBe('Chief Executive Officer')
    expect(result.results[1].reason).toBe('no_current_employee_match')
  })

  it.each([0, 51])('rejects %i rows without dispatch', async (count) => {
    await expect(client.people.findLinkedInProfiles({ people: Array.from({ length: count }, () => people[0]) }))
      .rejects
      .toMatchObject({ code: 'INVALID_PEOPLE_COUNT' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allows the full 50-row backend batch', async () => {
    fetchMock.mockResolvedValue(json({ results: [] }))
    await client.people.findLinkedInProfiles({ people: Array.from({ length: 50 }, () => people[0]) })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).people).toHaveLength(50)
  })

  it('maps missing tenant data sources from HTTP 503 without losing status', async () => {
    fetchMock.mockResolvedValue(json({
      detail: { error: { code: 'NO_DATA_SOURCES', message: 'Fiber is unavailable' } },
    }, 503, { 'x-request-id': 'req-123' }))
    const error = await client.people.findLinkedInProfiles({ people }).catch(error => error)
    expect(error).toBeInstanceOf(NoDataSourcesError)
    expect(error).toMatchObject({ statusCode: 503, requestId: 'req-123', code: 'NO_DATA_SOURCES' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([429, 500, 503])('does not retry or wait for backoff after HTTP %i', async (status) => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(json({ message: 'Unavailable' }, status, { 'Retry-After': '60' }))
    await expect(client.people.findLinkedInProfiles({ people })).rejects.toMatchObject({ statusCode: status })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not retry a transport failure despite the client retry default', async () => {
    fetchMock.mockRejectedValue(new TypeError('Connection closed'))
    await expect(client.people.findLinkedInProfiles({ people })).rejects.toThrow('Connection closed')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('allows the backend batch deadline and aborts once at the 90-second default', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      signal = init.signal
      signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const rejected = expect(client.people.findLinkedInProfiles({ people }))
      .rejects
      .toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(30_000)
    await rejected
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('honors an explicit shorter lookup timeout without enabling retries', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const rejected = expect(client.people.findLinkedInProfiles({ people }, { timeoutMs: 10 }))
      .rejects
      .toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(10)
    await rejected
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('keeps client retries for existing operations after a failed lookup', async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValueOnce(json({}, 500))
    await expect(client.people.findLinkedInProfiles({ people })).rejects.toMatchObject({ statusCode: 500 })
    fetchMock.mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json({ candidates: [] }))
    const search = client.people.quickSearch({ query: 'Engineers' })
    await vi.runAllTimersAsync()
    await expect(search).resolves.toEqual({ candidates: [] })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
