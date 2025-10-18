// User API types
import type { PaginationInfo, UUID } from './common'

export interface UserResponse {
  id: UUID
  email: string
  tenantId: UUID
  firstName?: string | null
  lastName?: string | null
  createdAt: string
  updatedAt: string
}

export interface UserCreateRequest {
  email: string
  firstName?: string
  lastName?: string
}

export interface UserUpdateRequest {
  firstName?: string
  lastName?: string
}

export interface UserListResponse {
  users: UserResponse[]
  pagination: PaginationInfo
}

export interface UserDeleteResponse {
  message: string
}
