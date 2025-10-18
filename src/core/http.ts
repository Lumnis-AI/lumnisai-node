// HTTP client implementation with fetch
import {
  DEFAULT_BACKOFF_FACTOR,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
} from '../constants'
import {
  AuthenticationError,
  LumnisError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '../errors'
import { toCamelCase, toSnakeCase } from '../utils/case-conversion'

export interface HttpOptions {
  baseUrl: string
  apiPrefix?: string
  headers?: Record<string, string>
  timeoutMs?: number
  maxRetries?: number
  backoffFactor?: number
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  idempotencyKey?: string
  params?: Record<string, any>
}

export class Http {
  private readonly options: Required<HttpOptions>

  constructor(options: HttpOptions) {
    this.options = {
      baseUrl: options.baseUrl.replace(/\/$/, ''),
      apiPrefix: options.apiPrefix || '',
      headers: options.headers || {},
      timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      backoffFactor: options.backoffFactor || DEFAULT_BACKOFF_FACTOR,
    }
  }

  private async _handleResponse<T>(response: Response): Promise<T> {
    const requestId = response.headers.get('x-request-id')

    if (response.ok) {
      if (response.status === 204)
        return null as T
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const json = await response.json()
        return toCamelCase<T>(json)
      }
      return (await response.text()) as T
    }

    let detail: any = { raw: await response.text() }
    try {
      if (response.headers.get('content-type')?.includes('application/json'))
        detail = JSON.parse(detail.raw)
    }
    catch {}

    const errorMsg = detail?.error?.message || `Server error: ${response.status}`

    switch (response.status) {
      case 401:
        throw new AuthenticationError('Invalid or missing API key', { requestId, statusCode: 401, details: detail })
      case 403:
        throw new AuthenticationError('Forbidden - insufficient permissions', { requestId, statusCode: 403, details: detail })
      case 404:
        throw new NotFoundError('Resource not found', { requestId, statusCode: 404, details: detail })
      case 429: {
        const retryAfter = response.headers.get('Retry-After')
        throw new RateLimitError({ requestId, statusCode: 429, details: detail, retryAfter })
      }
      default:
        if (response.status >= 400 && response.status < 500)
          throw new ValidationError(errorMsg, { requestId, statusCode: response.status, details: detail })
        throw new LumnisError(`Server error: ${response.status}`, { requestId, statusCode: response.status, details: detail })
    }
  }

  async request<T = unknown>(
    path: string,
    init: RequestOptions = {},
  ): Promise<T> {
    const { body, params, idempotencyKey: idempotencyKeyOption, ...fetchOptions } = init
    const method = fetchOptions.method || 'GET'

    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const fullPath = this.options.apiPrefix ? `${this.options.apiPrefix}${normalizedPath}` : normalizedPath
    const url = new URL(this.options.baseUrl + fullPath)

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null)
          url.searchParams.append(key, String(value))
      }
    }

    const idempotencyKey = idempotencyKeyOption || (method !== 'GET' ? crypto.randomUUID() : undefined)

    const headers = {
      'content-type': 'application/json',
      ...this.options.headers,
      ...fetchOptions.headers,
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    }

    const isIdempotent = method === 'GET' || method === 'DELETE' || !!idempotencyKey
    const maxAttempts = isIdempotent ? this.options.maxRetries + 1 : 1
    let lastError: Error | undefined

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs)

      try {
        const response = await fetch(url.toString(), {
          ...fetchOptions,
          method,
          headers,
          body: body ? JSON.stringify(toSnakeCase(body)) : undefined,
          signal: controller.signal,
        })
        return await this._handleResponse<T>(response)
      }
      catch (error) {
        lastError = error as Error

        if (error instanceof RateLimitError) {
          const backoff = backoffMs(attempt, error.retryAfter)
          await sleep(backoff)
          continue
        }

        // Don't retry client errors
        if (error instanceof LumnisError && (error.statusCode ?? 0) < 500)
          throw error

        if (attempt < maxAttempts - 1) {
          const backoff = backoffMs(attempt)
          await sleep(backoff)
        }
      }
      finally {
        clearTimeout(timeout)
      }
    }
    throw lastError || new LumnisError('Request failed after all retries', {})
  }

  get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body })
  }

  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body })
  }

  patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body })
  }

  delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }

  async warnTenantScope(): Promise<void> {
    console.warn(
      'Using TENANT scope bypasses user isolation. '
      + 'Ensure this is intentional and follows security best practices.',
    )
  }
}

// Helper functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function backoffMs(attempt: number, retryAfter: string | number | undefined | null = null): number {
  if (retryAfter) {
    const retryAfterMs = Number(retryAfter) * 1000
    if (!Number.isNaN(retryAfterMs))
      return retryAfterMs
  }
  // Add jitter to the backoff
  const jitter = Math.random() * 500
  return Math.min(1000 * 2 ** attempt, 10000) + jitter
}
