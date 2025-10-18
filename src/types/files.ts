// File System API types
import type { UUID } from './common'

export type ProcessingStatus = 'pending' | 'parsing' | 'embedding' | 'completed' | 'partial_success' | 'error'
export type FileScope = 'user' | 'tenant'
export type ContentType = 'text' | 'transcript' | 'summary' | 'structured'
export type DuplicateHandling = 'error' | 'skip' | 'replace' | 'suffix'
export type ChunkingStrategy = 'sentence' | 'paragraph' | 'code' | 'markdown' | 'table'

export interface FileMetadata {
  id: UUID
  tenantId: UUID
  userId?: UUID | null
  fileName: string
  originalFileName: string
  fileType: string
  mimeType: string
  fileSize: number
  fileScope: FileScope
  tags?: string[] | null
  blobUrl?: string | null
  processingStatus: ProcessingStatus
  errorMessage?: string | null
  totalChunks: number
  chunksEmbedded: number
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface FileUploadResponse {
  fileId: UUID
  fileName: string
  status: ProcessingStatus
  message: string
}

export interface FileContentResponse {
  fileId: UUID
  contentType: ContentType
  text: string
  metadata?: Record<string, any> | null
  startLine?: number | null
  endLine?: number | null
  totalLines?: number | null
}

export interface FileChunk {
  id: UUID
  chunkIndex: number
  chunkText: string
  startLine?: number | null
  endLine?: number | null
  tokenCount?: number | null
  metadata?: Record<string, any> | null
  similarityScore?: number | null
}

export interface FileSearchResult {
  file: FileMetadata
  chunks: FileChunk[]
  overallScore: number
}

export interface FileSearchRequest {
  query: string
  limit?: number
  minScore?: number
  fileTypes?: string[]
  tags?: string[]
  userId?: string
}

export interface FileSearchResponse {
  results: FileSearchResult[]
  totalCount: number
  query: string
  processingTimeMs?: number | null
}

export interface ProcessingStatusResponse {
  status: ProcessingStatus
  progressPercentage: number
  chunksEmbedded: number
  totalChunks: number
  estimatedTimeRemainingSeconds?: number | null
  errorMessage?: string | null
  jobs?: Array<Record<string, any>> | null
}

export interface FileListResponse {
  files: FileMetadata[]
  totalCount: number
  page: number
  limit: number
  hasMore: boolean
}

export interface BulkDeleteRequest {
  fileIds: UUID[]
}

export interface BulkDeleteResponse {
  deleted: UUID[]
  failed: UUID[]
  hardDelete: boolean
  totalRequested: number
}

export interface FileScopeUpdateRequest {
  scope: FileScope
  userId?: UUID
}

export interface FileStatisticsResponse {
  totalFiles: number
  totalSizeBytes: number
  filesByType: Record<string, number>
  filesByStatus: Record<ProcessingStatus, number>
  filesByScope: Record<FileScope, number>
  averageFileSizeBytes: number
  averageProcessingTimeSeconds?: number | null
  storageUsagePercentage?: number | null
}

export interface BulkUploadResponse {
  uploaded: FileUploadResponse[]
  failed: Array<{ filename: string, error: string }>
  totalUploaded: number
  totalFailed: number
}
