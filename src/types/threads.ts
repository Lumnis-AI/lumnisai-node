// Thread API types
import type { UUID } from './common'

export interface ThreadObject {
  threadId: UUID
  tenantId: UUID
  userId?: UUID | null
  title?: string | null
  createdAt: string
  updatedAt?: string | null
  responseCount: number
  lastResponseAt?: string | null
}

export interface ThreadListResponse {
  threads: ThreadObject[]
  total: number
  limit: number
  offset: number
}

export interface UpdateThreadRequest {
  title?: string | null
}

export interface CreateThreadRequest {
  userId?: string | null
  title?: string | null
}

export interface ThreadResponsesParams {
  limit?: number
  offset?: number
}
