// Threads API resource
import type { Http } from '../core/http'
import type { ResponseObject } from '../types/responses'
import type {
  CreateThreadRequest,
  ThreadListResponse,
  ThreadObject,
  ThreadResponsesParams,
  UpdateThreadRequest,
} from '../types/threads'

export class ThreadsResource {
  constructor(private readonly http: Http) {}

  /**
   * Create a new thread
   */
  async create(params?: CreateThreadRequest): Promise<ThreadObject> {
    return this.http.post<ThreadObject>('/threads', params)
  }

  /**
   * List threads for the authenticated tenant
   */
  async list(params?: {
    userId?: string
    limit?: number
    offset?: number
  }): Promise<ThreadListResponse> {
    return this.http.get<ThreadListResponse>('/threads', { params })
  }

  /**
   * Get detailed information about a specific thread
   */
  async get(threadId: string): Promise<ThreadObject> {
    return this.http.get<ThreadObject>(`/threads/${encodeURIComponent(threadId)}`)
  }

  /**
   * Get all responses associated with a specific thread
   */
  async getResponses(threadId: string, params?: ThreadResponsesParams): Promise<ResponseObject[]> {
    return this.http.get<ResponseObject[]>(`/threads/${encodeURIComponent(threadId)}/responses`, { params })
  }

  /**
   * Update thread metadata
   */
  async update(threadId: string, data: UpdateThreadRequest): Promise<ThreadObject> {
    return this.http.patch<ThreadObject>(`/threads/${encodeURIComponent(threadId)}`, data)
  }

  /**
   * Delete a thread and all its associated responses
   */
  async delete(threadId: string): Promise<void> {
    await this.http.delete(`/threads/${encodeURIComponent(threadId)}`)
  }
}
