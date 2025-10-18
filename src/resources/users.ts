// Users API resource
import type { Http } from '../core/http'
import type { ResponseObject } from '../types/responses'
import type { ThreadObject } from '../types/threads'
import type {
  UserCreateRequest,
  UserDeleteResponse,
  UserListResponse,
  UserResponse,
  UserUpdateRequest,
} from '../types/users'

export class UsersResource {
  constructor(private readonly http: Http) {}

  /**
   * Create a new user within the tenant
   * Returns existing user with 200 OK if user with same email already exists
   */
  async create(data: UserCreateRequest): Promise<UserResponse> {
    return this.http.post<UserResponse>('/users', data)
  }

  /**
   * List all users in the tenant with pagination
   */
  async list(params?: {
    page?: number
    pageSize?: number
  }): Promise<UserListResponse> {
    const queryParams = new URLSearchParams()

    if (params?.page)
      queryParams.append('page', params.page.toString())
    if (params?.pageSize)
      queryParams.append('page_size', params.pageSize.toString())

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.http.get<UserListResponse>(`/users${query}`)
  }

  /**
   * Get user details by ID or email
   */
  async get(userIdentifier: string): Promise<UserResponse> {
    return this.http.get<UserResponse>(`/users/${encodeURIComponent(userIdentifier)}`)
  }

  /**
   * Update user information by ID or email
   */
  async update(userIdentifier: string, data: UserUpdateRequest): Promise<UserResponse> {
    return this.http.put<UserResponse>(`/users/${encodeURIComponent(userIdentifier)}`, data)
  }

  /**
   * Delete (deactivate) a user by ID or email
   */
  async delete(userIdentifier: string): Promise<UserDeleteResponse> {
    return this.http.delete<UserDeleteResponse>(`/users/${encodeURIComponent(userIdentifier)}`)
  }

  /**
   * Get all AI responses generated for a specific user
   */
  async getResponses(userIdentifier: string, params?: {
    page?: number
    pageSize?: number
  }): Promise<ResponseObject[]> {
    const queryParams = new URLSearchParams()

    if (params?.page)
      queryParams.append('page', params.page.toString())
    if (params?.pageSize)
      queryParams.append('page_size', params.pageSize.toString())

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.http.get<ResponseObject[]>(`/users/${encodeURIComponent(userIdentifier)}/responses${query}`)
  }

  /**
   * Get all conversation threads for a specific user
   */
  async getThreads(userIdentifier: string, params?: {
    page?: number
    pageSize?: number
  }): Promise<ThreadObject[]> {
    const queryParams = new URLSearchParams()

    if (params?.page)
      queryParams.append('page', params.page.toString())
    if (params?.pageSize)
      queryParams.append('page_size', params.pageSize.toString())

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.http.get<ThreadObject[]>(`/users/${encodeURIComponent(userIdentifier)}/threads${query}`)
  }
}
