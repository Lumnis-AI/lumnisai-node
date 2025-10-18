// Files API resource
import type { Http } from '../core/http'
import type {
  BulkDeleteRequest,
  BulkDeleteResponse,
  BulkUploadResponse,
  FileContentResponse,
  FileListResponse,
  FileMetadata,
  FileScope,
  FileScopeUpdateRequest,
  FileSearchRequest,
  FileSearchResponse,
  FileStatisticsResponse,
  FileUploadResponse,
  ProcessingStatus,
  ProcessingStatusResponse,
} from '../types/files'

export class FilesResource {
  constructor(private readonly http: Http) {}

  /**
   * Upload a new file for processing
   * @param file - The file to upload (File or Blob)
   * @param options - Upload options
   * @param options.scope - File access scope (user or tenant)
   * @param options.userId - User ID or email (required for user-scoped files)
   * @param options.tags - Comma-separated tags for categorization
   * @param options.duplicateHandling - How to handle duplicate filenames
   */
  async upload(
    file: File | Blob,
    options: {
      scope: FileScope
      userId?: string
      tags?: string
      duplicateHandling?: 'error' | 'skip' | 'replace' | 'suffix'
    },
  ): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('scope', options.scope)
    if (options.userId)
      formData.append('user_id', options.userId)
    if (options.tags)
      formData.append('tags', options.tags)
    if (options.duplicateHandling)
      formData.append('duplicate_handling', options.duplicateHandling)

    return this.http.post<FileUploadResponse>('/files/upload', formData)
  }

  /**
   * Upload multiple files at once
   */
  async bulkUpload(
    files: Array<File | Blob>,
    options: {
      scope: FileScope
      userId?: string
      tags?: string
    },
  ): Promise<BulkUploadResponse> {
    const formData = new FormData()
    for (const file of files)
      formData.append('files', file)
    formData.append('scope', options.scope)
    if (options.userId)
      formData.append('user_id', options.userId)
    if (options.tags)
      formData.append('tags', options.tags)

    return this.http.post<BulkUploadResponse>('/files/bulk-upload', formData)
  }

  /**
   * Get file metadata by ID
   */
  async get(fileId: string, userId?: string): Promise<FileMetadata> {
    const params = userId ? { user_id: userId } : undefined
    return this.http.get<FileMetadata>(`/files/${fileId}`, { params })
  }

  /**
   * List files with optional filters
   */
  async list(params?: {
    userId?: string
    scope?: FileScope
    fileType?: string
    status?: ProcessingStatus
    tags?: string
    page?: number
    limit?: number
  }): Promise<FileListResponse> {
    return this.http.get<FileListResponse>('/files', { params })
  }

  /**
   * Get file content
   */
  async getContent(
    fileId: string,
    options?: {
      contentType?: 'text' | 'transcript' | 'summary' | 'structured'
      startLine?: number
      endLine?: number
      userId?: string
    },
  ): Promise<FileContentResponse> {
    const params = {
      content_type: options?.contentType,
      start_line: options?.startLine,
      end_line: options?.endLine,
      user_id: options?.userId,
    }
    return this.http.get<FileContentResponse>(`/files/${fileId}/content`, { params })
  }

  /**
   * Download original file
   * Returns a redirect URL for blob storage or file content directly
   */
  async download(fileId: string, userId?: string): Promise<any> {
    const params = userId ? { user_id: userId } : undefined
    return this.http.request(`/files/${fileId}/download`, {
      method: 'GET',
      params,
    })
  }

  /**
   * Update file access scope
   */
  async updateScope(
    fileId: string,
    data: FileScopeUpdateRequest,
  ): Promise<FileMetadata> {
    return this.http.patch<FileMetadata>(`/files/${fileId}/scope`, data)
  }

  /**
   * Delete a file
   */
  async delete(
    fileId: string,
    options?: {
      hardDelete?: boolean
      userId?: string
    },
  ): Promise<{ message: string, fileId: string, hardDelete: boolean }> {
    const params = {
      hard_delete: options?.hardDelete ?? true,
      user_id: options?.userId,
    }
    return this.http.delete(`/files/${fileId}`, { params })
  }

  /**
   * Delete multiple files at once
   */
  async bulkDelete(
    data: BulkDeleteRequest,
    options?: {
      hardDelete?: boolean
      userId?: string
    },
  ): Promise<BulkDeleteResponse> {
    const params = {
      hard_delete: options?.hardDelete ?? true,
      user_id: options?.userId,
    }
    return this.http.request<BulkDeleteResponse>('/files/bulk', {
      method: 'DELETE',
      body: data,
      params,
    })
  }

  /**
   * Get file processing status
   */
  async getStatus(fileId: string, userId?: string): Promise<ProcessingStatusResponse> {
    const params = userId ? { user_id: userId } : undefined
    return this.http.get<ProcessingStatusResponse>(`/files/${fileId}/status`, { params })
  }

  /**
   * Semantic search across files
   */
  async search(request: FileSearchRequest): Promise<FileSearchResponse> {
    return this.http.post<FileSearchResponse>('/files/search', request)
  }

  /**
   * Get file statistics for the tenant
   */
  async getStatistics(): Promise<FileStatisticsResponse> {
    return this.http.get<FileStatisticsResponse>('/files/statistics')
  }
}
