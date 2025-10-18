// Pagination utility functions and classes
import type { PaginationParams } from '../types/common'

export interface PagedResult<T> {
  data: T[]
  total: number
  page?: number
  pageSize?: number
  hasNext: boolean
  hasPrev: boolean
}

export interface AsyncIteratorOptions {
  pageSize?: number
  maxPages?: number
}

/**
 * Create an async iterator for paginated results
 */
export async function* paginatedIterator<T>(
  fetcher: (params: PaginationParams) => Promise<PagedResult<T>>,
  options: AsyncIteratorOptions = {},
): AsyncGenerator<T, void, unknown> {
  const { pageSize = 50, maxPages } = options
  let page = 1
  let hasMore = true

  // eslint-disable-next-line no-unmodified-loop-condition
  while (hasMore && (!maxPages || page <= maxPages)) {
    const result = await fetcher({ page, pageSize })

    for (const item of result.data) {
      yield item
    }

    hasMore = result.hasNext
    page++
  }
}

/**
 * Collect all pages into a single array
 */
export async function collectAllPages<T>(
  fetcher: (params: PaginationParams) => Promise<PagedResult<T>>,
  options: AsyncIteratorOptions = {},
): Promise<T[]> {
  const items: T[] = []

  for await (const item of paginatedIterator(fetcher, options)) {
    items.push(item)
  }

  return items
}

/**
 * Parse Link headers for pagination (GitHub style)
 */
export function parseLinkHeader(linkHeader: string | null): Record<string, string> {
  if (!linkHeader)
    return {}

  const links: Record<string, string> = {}
  const parts = linkHeader.split(',')

  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/)
    if (match) {
      links[match[2]] = match[1]
    }
  }

  return links
}
