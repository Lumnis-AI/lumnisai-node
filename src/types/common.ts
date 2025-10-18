// Common types used across the SDK

export interface PaginationParams {
  page?: number
  pageSize?: number
  limit?: number
  offset?: number
  skip?: number
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, any>
  }
}

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type Scope = 'user' | 'tenant'

export type UUID = string
export type Email = string
export type UserIdentifier = UUID | Email

export interface BaseResource {
  createdAt: string
  updatedAt?: string
}
