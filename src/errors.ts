// Custom error classes for the Lumnis AI SDK

export interface LumnisErrorOptions {
  code?: string
  statusCode?: number
  details?: any
  requestId?: string | null
}

export class LumnisError extends Error {
  public code: string
  public statusCode?: number
  public details?: any
  public requestId?: string | null

  constructor(message: string, options: LumnisErrorOptions = {}) {
    super(message)
    this.name = 'LumnisError'
    this.code = options.code || 'UNKNOWN_ERROR'
    this.statusCode = options.statusCode
    this.details = options.details
    this.requestId = options.requestId
    Error.captureStackTrace(this, this.constructor)
  }
}

export interface RateLimitErrorOptions extends LumnisErrorOptions {
  retryAfter?: string | number | null
}

export class AuthenticationError extends LumnisError {
  constructor(message: string, options: LumnisErrorOptions = {}) {
    super(message, { ...options, statusCode: options.statusCode || 401 })
    this.name = 'AuthenticationError'
  }
}

export class ValidationError extends LumnisError {
  constructor(message: string, options: LumnisErrorOptions = {}) {
    super(message, { ...options, statusCode: options.statusCode || 400 })
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends LumnisError {
  constructor(message: string, options: LumnisErrorOptions = {}) {
    super(message, { ...options, statusCode: 404 })
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends LumnisError {
  public retryAfter?: string | number | null

  constructor(options: RateLimitErrorOptions = {}) {
    super('Rate limit exceeded', { ...options, statusCode: 429 })
    this.name = 'RateLimitError'
    this.retryAfter = options.retryAfter
  }
}

export class InternalServerError extends LumnisError {
  constructor(message: string, options: LumnisErrorOptions = {}) {
    super(message, { ...options, statusCode: 500 })
    this.name = 'InternalServerError'
  }
}

export class LocalFileNotSupportedError extends ValidationError {
  constructor(filePath: string) {
    super(
      `Local file paths are not supported yet: ${filePath}. Please wait for the artifact upload API or use artifact IDs.`,
      { code: 'LOCAL_FILE_NOT_SUPPORTED' },
    )
    this.name = 'LocalFileNotSupportedError'
  }
}
