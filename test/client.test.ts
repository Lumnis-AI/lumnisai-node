import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LumnisClient as LumnisAI } from '../src/index'

// Mock fetch
globalThis.fetch = vi.fn() as any

describe('lumnisAI', () => {
  let client: LumnisAI

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any env vars
    delete process.env.LUMNISAI_API_KEY
    delete process.env.LUMNISAI_TENANT_ID
    delete process.env.LUMNISAI_BASE_URL

    client = new LumnisAI({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com',
      maxRetries: 0, // Disable retries for tests
    })
  })

  describe('initialization', () => {
    it('should initialize with provided options', () => {
      expect(client).toBeDefined()
      expect(client.threads).toBeDefined()
      expect(client.responses).toBeDefined()
      expect(client.users).toBeDefined()
      expect(client.files).toBeDefined()
      expect(client.tenantInfo).toBeDefined()
      expect(client.externalApiKeys).toBeDefined()
      expect(client.integrations).toBeDefined()
      expect(client.modelPreferences).toBeDefined()
      expect(client.mcpServers).toBeDefined()
    })

    it('should use default base URL when not provided', () => {
      const defaultClient = new LumnisAI({
        apiKey: 'test-api-key',
      })
      expect(defaultClient).toBeDefined()
    })

    it('should read API key from environment variable', () => {
      process.env.LUMNISAI_API_KEY = 'env-api-key'
      const envClient = new LumnisAI()
      expect(envClient).toBeDefined()
    })

    it('should read tenant ID from environment variable', () => {
      process.env.LUMNISAI_API_KEY = 'env-api-key'
      process.env.LUMNISAI_TENANT_ID = 'env-tenant-id'
      const envClient = new LumnisAI()
      expect(envClient.tenantId).toBe('env-tenant-id')
    })

    it('should prefer options over environment variables', () => {
      process.env.LUMNISAI_API_KEY = 'env-api-key'
      process.env.LUMNISAI_TENANT_ID = 'env-tenant-id'
      const mixedClient = new LumnisAI({
        apiKey: 'option-api-key',
        tenantId: 'option-tenant-id',
      })
      expect(mixedClient.tenantId).toBe('option-tenant-id')
    })

    it('should throw error when no API key is provided', () => {
      expect(() => new LumnisAI()).toThrow('API key is required')
    })
  })

  describe('invoke', () => {
    it('should create a response with a simple message', async () => {
      const mockResponse = {
        responseId: '123',
        status: 'queued',
        threadId: '456',
        tenantId: '789',
        createdAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => mockResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ ...mockResponse, status: 'succeeded', outputText: 'Response text' }),
        } as Response)

      const response = await client.invoke('Hello', { stream: false })

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        'https://api.test.com/v1/responses',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'content-type': 'application/json',
            'X-API-Key': 'test-api-key',
          }),
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello' }],
          }),
        }),
      )

      expect(response.status).toBe('succeeded')
      expect(response.outputText).toBe('Response text')
    })

    it('should create a response with message array', async () => {
      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
      ]

      const mockResponse = {
        responseId: '123',
        status: 'queued',
        threadId: '456',
        tenantId: '789',
        createdAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => mockResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ ...mockResponse, status: 'succeeded' }),
        } as Response)

      await client.invoke(messages, { stream: false })

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        'https://api.test.com/v1/responses',
        expect.objectContaining({
          body: JSON.stringify({ messages }),
        }),
      )
    })

    it('should stream progress entries', async () => {
      const mockResponse = {
        responseId: '123',
        status: 'queued',
        threadId: '456',
        tenantId: '789',
        createdAt: '2024-01-01T00:00:00Z',
      }

      const progress1 = { ts: new Date().toISOString(), state: 'working', message: 'Thinking...' }
      const progress2 = { ts: new Date().toISOString(), state: 'working', message: 'Still thinking...' }

      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce({ // create
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => mockResponse,
        } as Response)
        .mockResolvedValueOnce({ // get poll 1
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ ...mockResponse, status: 'in_progress', progress: [progress1] }),
        } as Response)
        .mockResolvedValueOnce({ // get poll 2
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ ...mockResponse, status: 'in_progress', progress: [progress1, progress2] }),
        } as Response)
        .mockResolvedValueOnce({ // get poll 3
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ ...mockResponse, status: 'succeeded', outputText: 'Done' }),
        } as Response)

      const stream = await client.invoke('Hello', { stream: true })

      const receivedEntries = []
      for await (const entry of stream)
        receivedEntries.push(entry)

      expect(receivedEntries.length).toBe(3) // p1, p2, final 'completed' entry
      expect(receivedEntries[0]).toEqual(progress1)
      expect(receivedEntries[1]).toEqual(progress2)
      expect(receivedEntries[2].state).toBe('completed')
    })
  })

  describe('error handling', () => {
    it('should throw AuthenticationError for 401 status', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key',
          },
        }),
        text: async () => JSON.stringify({
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key',
          },
        }),
      } as Response)

      await expect(client.invoke('Hello', { stream: false })).rejects.toThrow('Invalid or missing API key')
    })

    it('should throw RateLimitError for 429 status', async () => {
      // Mock fetch to return 429 multiple times (for retries)
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'content-type': 'application/json',
          'retry-after': '1',
        }),
        json: async () => ({
          error: {
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded',
          },
        }),
        text: async () => JSON.stringify({
          error: {
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded',
          },
        }),
      } as Response)

      await expect(client.invoke('Hello', { stream: false })).rejects.toMatchObject({
        message: 'Rate limit exceeded',
        retryAfter: '1',
      })
    })
  })
})
