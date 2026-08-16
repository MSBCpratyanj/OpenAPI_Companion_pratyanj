import { ok, err, type Result, type AppError } from '@/types'
import { projectKey, type StorageService } from '@/core/storage'
import { stableId } from '@/utils'
import type { EventBus } from '@/core/events'
import type { Collection } from './types'

export interface CollectionsServiceOptions {
  storage: StorageService
  projectId: string
  bus?: EventBus
}

const collectionsWriteError = (cause?: unknown): AppError => ({
  code: 'COLLECTIONS_WRITE',
  message: 'Failed to persist collections',
  recoverable: true,
  cause,
})

/**
 * Manages collections of endpoints for a project.
 * Collections are stored as an array under the project's storage key.
 */
export class CollectionsService {
  private readonly storage: StorageService
  private readonly projectId: string
  private readonly bus: EventBus | undefined

  constructor(options: CollectionsServiceOptions) {
    this.storage = options.storage
    this.projectId = options.projectId
    this.bus = options.bus
  }

  private collectionsKey(): string {
    return projectKey(this.projectId, 'collections')
  }

  /** Get all collections for the project */
  async listCollections(): Promise<Result<Collection[]>> {
    const got = await this.storage.getData<Collection[]>(this.collectionsKey())
    if (!got.ok) {
      if (got.error.code === 'STORAGE_CORRUPT') {
        return ok([])
      }
      return got
    }
    return ok(got.value ?? [])
  }

  /** Create a new collection */
  async createCollection(name: string): Promise<Result<Collection>> {
    const trimmed = name.trim()
    if (!trimmed) {
      return err(collectionsWriteError(new Error('Collection name is required')))
    }

    const collections = await this.listCollections()
    if (!collections.ok) return collections

    // Check for duplicate names (case-insensitive)
    const exists = collections.value.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      return err(collectionsWriteError(new Error('A collection with this name already exists')))
    }

    const now = Date.now()
    const collection: Collection = {
      id: stableId('col', this.projectId, trimmed),
      name: trimmed,
      endpointIds: [],
      createdAt: now,
      updatedAt: now,
    }

    const updated = [...collections.value, collection]
    const written = await this.storage.set(this.collectionsKey(), updated, { immediate: true })
    if (!written.ok) return written

    this.bus?.publish('COLLECTION_CREATED', {
      projectId: this.projectId,
      collectionId: collection.id,
    })
    return ok(collection)
  }

  /** Update a collection */
  async updateCollection(
    id: string,
    updates: Partial<Pick<Collection, 'name' | 'endpointIds'>>,
  ): Promise<Result<Collection>> {
    const collections = await this.listCollections()
    if (!collections.ok) return collections

    const index = collections.value.findIndex((c) => c.id === id)
    if (index === -1) {
      return err(collectionsWriteError(new Error(`Collection ${id} not found`)))
    }

    const collection: Collection = { ...collections.value[index]! }

    if (updates.name !== undefined) {
      const trimmed = updates.name.trim()
      if (!trimmed) {
        return err(collectionsWriteError(new Error('Collection name is required')))
      }
      // Check for duplicate names (excluding current collection)
      const duplicateExists = collections.value.some(
        (c, i) => i !== index && c.name.toLowerCase() === trimmed.toLowerCase(),
      )
      if (duplicateExists) {
        return err(collectionsWriteError(new Error('A collection with this name already exists')))
      }
      collection.name = trimmed
    }

    if (updates.endpointIds !== undefined) {
      // We could validate that endpointIds exist, but for now we'll just store them
      collection.endpointIds = updates.endpointIds
    }

    collection.updatedAt = Date.now()

    const updated = [
      ...collections.value.slice(0, index),
      collection,
      ...collections.value.slice(index + 1),
    ]
    const written = await this.storage.set(this.collectionsKey(), updated, { immediate: true })
    if (!written.ok) return written

    this.bus?.publish('COLLECTION_UPDATED', { projectId: this.projectId, collectionId: id })
    return ok(collection)
  }

  /** Delete a collection */
  async deleteCollection(id: string): Promise<Result<void>> {
    const collections = await this.listCollections()
    if (!collections.ok) return collections

    const index = collections.value.findIndex((c) => c.id === id)
    if (index === -1) {
      return err(collectionsWriteError(new Error(`Collection ${id} not found`)))
    }

    const updated = [...collections.value.slice(0, index), ...collections.value.slice(index + 1)]
    const written = await this.storage.set(this.collectionsKey(), updated, { immediate: true })
    if (!written.ok) return written

    this.bus?.publish('COLLECTION_DELETED', { projectId: this.projectId, collectionId: id })
    return ok(undefined)
  }

  /** Add an endpoint to a collection */
  async addEndpointToCollection(collectionId: string, endpointId: string): Promise<Result<void>> {
    const collections = await this.listCollections()
    if (!collections.ok) return collections

    const index = collections.value.findIndex((c) => c.id === collectionId)
    if (index === -1) {
      return err(collectionsWriteError(new Error(`Collection ${collectionId} not found`)))
    }

    const collection: Collection = { ...collections.value[index]! }
    const existingIds = collection.endpointIds ?? []
    if (!existingIds.includes(endpointId)) {
      collection.endpointIds = [...existingIds, endpointId]
      collection.updatedAt = Date.now()

      const updated = [
        ...collections.value.slice(0, index),
        collection,
        ...collections.value.slice(index + 1),
      ]
      const written = await this.storage.set(this.collectionsKey(), updated, { immediate: true })
      if (!written.ok) return written

      this.bus?.publish('COLLECTION_ENDPOINT_ADDED', {
        projectId: this.projectId,
        collectionId,
        endpointId,
      })
    }
    return ok(undefined)
  }

  /** Remove an endpoint from a collection */
  async removeEndpointFromCollection(
    collectionId: string,
    endpointId: string,
  ): Promise<Result<void>> {
    const collections = await this.listCollections()
    if (!collections.ok) return collections

    const index = collections.value.findIndex((c) => c.id === collectionId)
    if (index === -1) {
      return err(collectionsWriteError(new Error(`Collection ${collectionId} not found`)))
    }

    const collection: Collection = { ...collections.value[index]! }
    const existingIds = collection.endpointIds ?? []
    const endpointIndex = existingIds.indexOf(endpointId)
    if (endpointIndex !== -1) {
      collection.endpointIds = existingIds.filter((_id, i) => i !== endpointIndex)
      collection.updatedAt = Date.now()

      const updated = [
        ...collections.value.slice(0, index),
        collection,
        ...collections.value.slice(index + 1),
      ]
      const written = await this.storage.set(this.collectionsKey(), updated, { immediate: true })
      if (!written.ok) return written

      this.bus?.publish('COLLECTION_ENDPOINT_REMOVED', {
        projectId: this.projectId,
        collectionId,
        endpointId,
      })
    }
    return ok(undefined)
  }

  /** Get collections that contain a specific endpoint */
  async getCollectionsForEndpoint(endpointId: string): Promise<Result<Collection[]>> {
    const collections = await this.listCollections()
    if (!collections.ok) return collections

    const matched = collections.value.filter((c) => (c.endpointIds ?? []).includes(endpointId))
    return ok(matched)
  }

  /** Import / generate collections from Swagger tags */
  async importTags(
    tagGroups: Array<{ name: string; endpointIds: string[] }>,
  ): Promise<Result<{ created: number; updated: number }>> {
    const list = await this.listCollections()
    if (!list.ok) return list

    const current = [...list.value]
    let created = 0
    let updated = 0
    const now = Date.now()

    for (const group of tagGroups) {
      const name = group.name.trim()
      if (!name) continue

      const existingIndex = current.findIndex((c) => c.name.toLowerCase() === name.toLowerCase())

      if (existingIndex >= 0) {
        const existing = current[existingIndex]!
        const existingIds = existing.endpointIds ?? []
        const mergedIds = Array.from(new Set([...existingIds, ...group.endpointIds]))
        if (mergedIds.length !== existingIds.length) {
          current[existingIndex] = {
            ...existing,
            endpointIds: mergedIds,
            updatedAt: now,
          }
          updated++
        }
      } else {
        const newCol: Collection = {
          id: stableId('col', this.projectId, name),
          name,
          endpointIds: [...group.endpointIds],
          createdAt: now,
          updatedAt: now,
        }
        current.push(newCol)
        created++
      }
    }

    if (created > 0 || updated > 0) {
      const written = await this.storage.set(this.collectionsKey(), current, { immediate: true })
      if (!written.ok) return written

      this.bus?.publish('COLLECTION_CREATED', { projectId: this.projectId, collectionId: 'batch' })
    }

    return ok({ created, updated })
  }
}
