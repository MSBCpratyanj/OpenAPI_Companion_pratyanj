/** Collections domain types */

import type { Result } from '@/types'
import type { EndpointInfo } from '@/adapters'

export interface Collection {
  id: string
  name: string
  /** List of endpointIds that belong to this collection */
  endpointIds: string[]
  createdAt: number
  updatedAt: number
}

export interface TagGroup {
  name: string
  endpointIds: string[]
}

export interface TagImportResult {
  created: number
  updated: number
}

/** Surface CollectionsPanel needs from CollectionsService (eases testing). */
export interface CollectionsPanelService {
  listCollections(): Promise<Result<Collection[]>>
  createCollection(name: string): Promise<Result<Collection>>
  updateCollection(
    id: string,
    updates: Partial<Pick<Collection, 'name' | 'endpointIds'>>,
  ): Promise<Result<Collection>>
  deleteCollection(id: string): Promise<Result<void>>
  addEndpointToCollection(collectionId: string, endpointId: string): Promise<Result<void>>
  removeEndpointFromCollection(collectionId: string, endpointId: string): Promise<Result<void>>
  /** Sync read of all endpoints currently visible in Swagger (from adapter mirror). */
  listEndpoints(): EndpointInfo[]
  /** Scroll Swagger to the given endpoint and expand it. */
  openEndpoint(endpointId: string): void
  /** Execute/replay the endpoint in Swagger, optionally with a specific request body. */
  replayEndpoint(endpointId: string, body?: string): Promise<Result<void>>
  /** Auto-generate / populate collections from Swagger tags. */
  importTags(tagGroups: TagGroup[]): Promise<Result<TagImportResult>>
  /** Check if a stored or draft request body already exists for this endpoint. */
  getStoredRequestBody(endpointId: string): string | null
}
