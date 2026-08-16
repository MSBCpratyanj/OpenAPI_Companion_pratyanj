import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Result } from '@/types'
import type { EventBus } from '@/core/events'
import { useEventBus } from '@/hooks'
import {
  Button,
  CloseIcon,
  DeleteIcon,
  Dialog,
  EditIcon,
  EmptyState,
  GenerateIcon,
  IconButton,
  Input,
  CollectionsIcon,
  LocateIcon,
  ReplayIcon,
  SearchIcon,
  Spinner,
} from '@/components'
import type { CollectionsPanelService, Collection } from './types'

// Method badge colours matching the rest of the app's convention
const METHOD_COLORS: Record<string, string> = {
  get: 'text-[#61affe]',
  post: 'text-[#49cc90]',
  put: 'text-[#fca130]',
  delete: 'text-[#f93e3e]',
  patch: 'text-[#50e3c2]',
  head: 'text-muted',
  options: 'text-muted',
}

function methodClass(method: string) {
  return METHOD_COLORS[method.toLowerCase()] ?? 'text-muted'
}

interface BodyPromptState {
  endpointId: string
  method: string
  path: string
  body: string
}

interface CollectionsPanelProps {
  service: CollectionsPanelService
  bus: EventBus
}

export function CollectionsPanel({ service, bus }: CollectionsPanelProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingCollectionId, setAddingCollectionId] = useState<string | null>(null)
  const [endpointQuery, setEndpointQuery] = useState('')
  const [showTagModal, setShowTagModal] = useState(false)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [importingTags, setImportingTags] = useState(false)
  const [bodyPrompt, setBodyPrompt] = useState<BodyPromptState | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await service.listCollections()
    setCollections(result.ok ? result.value : [])
    setLoading(false)
  }, [service])

  useEffect(() => {
    void load()
  }, [load])

  useEventBus(bus, 'COLLECTION_CREATED', () => void load())
  useEventBus(bus, 'COLLECTION_UPDATED', () => void load())
  useEventBus(bus, 'COLLECTION_DELETED', () => void load())
  useEventBus(bus, 'COLLECTION_ENDPOINT_ADDED', () => void load())
  useEventBus(bus, 'COLLECTION_ENDPOINT_REMOVED', () => void load())

  // Endpoints available — live from the adapter mirror
  const allEndpoints = service.listEndpoints()

  // Group endpoints by Swagger tag for 1-click import
  const availableTags = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const ep of allEndpoints) {
      const tag = ep.tag?.trim()
      if (tag) {
        const list = map.get(tag) ?? []
        list.push(ep.endpointId)
        map.set(tag, list)
      }
    }
    return Array.from(map.entries()).map(([name, endpointIds]) => ({ name, endpointIds }))
  }, [allEndpoints])

  const toastErr = (r: Result<unknown>) => {
    if (!r.ok) bus.publish('NOTIFY', { kind: 'error', message: r.error.message })
  }

  const createCollection = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const result = await service.createCollection(trimmed)
    if (!result.ok) {
      toastErr(result)
      return
    }
    setNewName('')
    setIsCreating(false)
    // Auto-expand the new collection and open its add-endpoint picker
    setExpandedId(result.value.id)
    setAddingCollectionId(result.value.id)
  }

  const saveRename = async (id: string) => {
    const trimmed = editingName.trim()
    if (!trimmed) return
    const result = await service.updateCollection(id, { name: trimmed })
    if (!result.ok) {
      toastErr(result)
      return
    }
    setEditingId(null)
    setEditingName('')
  }

  const deleteCollection = async (id: string) => {
    const result = await service.deleteCollection(id)
    toastErr(result)
    if (expandedId === id) {
      setExpandedId(null)
      setAddingCollectionId(null)
    }
  }

  const addEndpoint = async (collectionId: string, endpointId: string) => {
    const result = await service.addEndpointToCollection(collectionId, endpointId)
    toastErr(result)
    // Close the picker and clear search text once an endpoint is selected
    setAddingCollectionId(null)
    setEndpointQuery('')
  }

  const removeEndpoint = async (collectionId: string, endpointId: string) => {
    const result = await service.removeEndpointFromCollection(collectionId, endpointId)
    toastErr(result)
  }

  const execute = async (endpointId: string, method?: string, path?: string) => {
    const m = (method ?? endpointId.split(' ')[0] ?? '').toLowerCase()
    const isMutation = ['post', 'put', 'patch'].includes(m)
    const existingBody = service.getStoredRequestBody(endpointId)

    // For POST/PUT/PATCH, if no request body is currently stored/open, prompt the user
    if (isMutation && !existingBody) {
      setBodyPrompt({
        endpointId,
        method: m.toUpperCase(),
        path: path ?? endpointId.split(' ').slice(1).join(' '),
        body: '{\n  \n}',
      })
      return
    }

    toastErr(await service.replayEndpoint(endpointId, existingBody || undefined))
  }

  const locate = (endpointId: string) => {
    service.openEndpoint(endpointId)
  }

  const openTagModal = () => {
    // Pre-select all available tags by default
    setSelectedTags(new Set(availableTags.map((t) => t.name)))
    setShowTagModal(true)
  }

  const handleImportSelectedTags = async () => {
    const tagsToImport = availableTags.filter((t) => selectedTags.has(t.name))
    if (tagsToImport.length === 0) return
    setShowTagModal(false)
    setImportingTags(true)
    const result = await service.importTags(tagsToImport)
    setImportingTags(false)
    if (result.ok) {
      bus.publish('NOTIFY', {
        kind: 'success',
        message: `Imported ${result.value.created} collections from tags (${result.value.updated} updated).`,
      })
    } else {
      toastErr(result)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* ── Top actions: Create collection & Import from tags ── */}
      {isCreating ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface/30 p-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text" htmlFor="oac-col-name">
              New Collection
            </label>
            <button
              type="button"
              className="text-[11px] text-muted hover:text-text hover:underline"
              onClick={() => {
                setIsCreating(false)
                setNewName('')
              }}
            >
              Cancel
            </button>
          </div>
          <div className="flex gap-2">
            <Input
              id="oac-col-name"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void createCollection()
              }}
              placeholder="Collection name…"
            />
            <Button
              variant="primary"
              onClick={() => void createCollection()}
              disabled={!newName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="flex-1 text-xs"
            onClick={() => setIsCreating(true)}
          >
            + New collection
          </Button>
          {availableTags.length > 0 ? (
            <Button
              variant="secondary"
              className="text-xs shrink-0"
              onClick={openTagModal}
              disabled={importingTags}
              title={`Select and import collections from ${availableTags.length} Swagger tags`}
            >
              {importingTags ? (
                <Spinner className="h-3 w-3" />
              ) : (
                <GenerateIcon className="h-3.5 w-3.5 text-primary" />
              )}
              <span>Import Tags ({availableTags.length})</span>
            </Button>
          ) : null}
        </div>
      )}

      <hr className="border-border" />

      {/* ── Collection list ── */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={<CollectionsIcon className="h-8 w-8 text-muted" />}
          title="No collections yet"
          message="Create a collection or import from Swagger tags to group endpoints."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {collections.map((col) => {
            const isExpanded = expandedId === col.id
            const isEditing = editingId === col.id
            const isAdding = addingCollectionId === col.id
            const colEndpointIds = col.endpointIds ?? []

            // Endpoints already in this collection (resolved to EndpointInfo)
            const membersResolved = colEndpointIds.flatMap((id) => {
              const info = allEndpoints.find((e) => e.endpointId === id)
              return info ? [info] : [{ endpointId: id, method: '?', path: id }]
            })

            // Endpoints NOT yet in this collection, filtered by search
            const q = endpointQuery.toLowerCase()
            const available = allEndpoints.filter(
              (e) =>
                !colEndpointIds.includes(e.endpointId) &&
                (!q ||
                  e.endpointId.toLowerCase().includes(q) ||
                  (e.summary ?? '').toLowerCase().includes(q) ||
                  (e.tag ?? '').toLowerCase().includes(q)),
            )

            return (
              <div key={col.id} className="rounded-md border border-border">
                {/* Collection header row */}
                <div
                  className={[
                    'flex cursor-pointer items-center gap-2 px-2 py-1.5',
                    isExpanded ? 'bg-primary/10' : 'hover:bg-surface',
                  ].join(' ')}
                  onClick={() => {
                    if (isEditing) return
                    const nextExpanded = isExpanded ? null : col.id
                    setExpandedId(nextExpanded)
                    if (!nextExpanded) setAddingCollectionId(null)
                    setEndpointQuery('')
                  }}
                >
                  {/* Chevron */}
                  <span className="text-[10px] text-muted">{isExpanded ? '▾' : '▸'}</span>

                  {isEditing ? (
                    <div
                      className="flex min-w-0 flex-1 items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveRename(col.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="min-w-0 flex-1 rounded border border-border bg-bg px-1.5 py-0.5 text-xs font-medium text-text focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Collection name…"
                      />
                      <Button
                        variant="primary"
                        className="px-2 py-0.5 text-[11px]"
                        onClick={() => void saveRename(col.id)}
                        disabled={!editingName.trim() || editingName.trim() === col.name}
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        className="px-1.5 py-0.5 text-[11px]"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-text">{col.name}</div>
                        <div className="font-mono text-[10px] text-muted">
                          {colEndpointIds.length} endpoint{colEndpointIds.length === 1 ? '' : 's'}
                        </div>
                      </div>
                      <IconButton
                        label={`Rename collection ${col.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingId(col.id)
                          setEditingName(col.name)
                        }}
                      >
                        <EditIcon className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label={`Delete collection ${col.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          void deleteCollection(col.id)
                        }}
                      >
                        <DeleteIcon className="h-3.5 w-3.5" />
                      </IconButton>
                    </>
                  )}
                </div>

                {/* Expanded: members + add endpoint section */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Current members */}
                    {membersResolved.length > 0 ? (
                      <ul className="flex flex-col divide-y divide-border">
                        {membersResolved.map((ep) => (
                          <li
                            key={ep.endpointId}
                            className="flex items-center gap-1.5 px-2 py-1 hover:bg-surface/50"
                          >
                            <span
                              className={`w-12 shrink-0 text-right font-mono text-[10px] font-bold uppercase ${methodClass(ep.method)}`}
                            >
                              {ep.method}
                            </span>
                            <span
                              className="min-w-0 flex-1 truncate font-mono text-[11px] text-text"
                              title={ep.path}
                            >
                              {ep.path}
                            </span>
                            {/* Action 1: Execute/Play */}
                            <IconButton
                              label={`Execute ${ep.endpointId} in Swagger`}
                              onClick={() => void execute(ep.endpointId, ep.method, ep.path)}
                            >
                              <ReplayIcon className="h-3.5 w-3.5 text-primary" />
                            </IconButton>
                            {/* Action 2: Locate/Crosshair */}
                            <IconButton
                              label={`Locate ${ep.endpointId} in Swagger`}
                              onClick={() => locate(ep.endpointId)}
                            >
                              <LocateIcon className="h-3.5 w-3.5" />
                            </IconButton>
                            {/* Action 3: Remove from collection */}
                            <IconButton
                              label={`Remove ${ep.endpointId} from collection`}
                              onClick={() => void removeEndpoint(col.id, ep.endpointId)}
                            >
                              <CloseIcon className="h-3.5 w-3.5 text-muted hover:text-danger" />
                            </IconButton>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-3 py-2 text-[11px] italic text-muted">
                        No endpoints in this collection yet.
                      </p>
                    )}

                    {/* Add endpoint section */}
                    {isAdding ? (
                      <div className="border-t border-border p-2 bg-surface/30">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Select endpoint to add
                          </span>
                          <button
                            type="button"
                            className="text-[11px] text-muted hover:text-text hover:underline"
                            onClick={() => {
                              setAddingCollectionId(null)
                              setEndpointQuery('')
                            }}
                          >
                            Cancel
                          </button>
                        </div>

                        {allEndpoints.length === 0 ? (
                          <p className="py-1 text-[11px] italic text-muted">
                            No endpoints found on this page.
                          </p>
                        ) : (
                          <>
                            <div className="relative mb-1.5">
                              <SearchIcon className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" />
                              <input
                                id={`oac-col-search-${col.id}`}
                                autoFocus
                                value={endpointQuery}
                                onChange={(e) => setEndpointQuery(e.target.value)}
                                placeholder="Filter endpoints…"
                                className="w-full rounded border border-border bg-bg pl-6 pr-2 py-1 text-[11px] text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            {available.length === 0 ? (
                              <p className="py-1 text-[11px] italic text-muted">
                                {endpointQuery ? 'No matching endpoints.' : 'All endpoints already added.'}
                              </p>
                            ) : (
                              <ul className="max-h-44 overflow-y-auto rounded border border-border bg-bg">
                                {available.map((ep) => (
                                  <li key={ep.endpointId} className="border-b border-border/50 last:border-b-0">
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left hover:bg-primary/10 focus:bg-primary/10 focus:outline-none"
                                      onClick={() => void addEndpoint(col.id, ep.endpointId)}
                                      title={ep.summary ? `${ep.endpointId} — ${ep.summary}` : ep.endpointId}
                                    >
                                      <span
                                        className={`w-12 shrink-0 text-right font-mono text-[10px] font-bold uppercase ${methodClass(ep.method)}`}
                                      >
                                        {ep.method}
                                      </span>
                                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-text">
                                        {ep.path}
                                      </span>
                                      {ep.summary ? (
                                        <span className="hidden max-w-[6rem] truncate text-[10px] text-muted lg:block">
                                          {ep.summary}
                                        </span>
                                      ) : null}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="border-t border-border p-2">
                        <Button
                          variant="secondary"
                          className="w-full text-xs"
                          onClick={() => {
                            setAddingCollectionId(col.id)
                            setEndpointQuery('')
                          }}
                        >
                          + Add endpoint
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Multi-select Tag Import Dialog ── */}
      {showTagModal && (
        <Dialog
          title="Import Collections from Swagger Tags"
          onClose={() => setShowTagModal(false)}
        >
          <div className="flex flex-col gap-3 p-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">
                Select which tags to import as collections:
              </p>
              <button
                type="button"
                className="text-[11px] text-primary hover:underline font-medium"
                onClick={() => {
                  if (selectedTags.size === availableTags.length) {
                    setSelectedTags(new Set())
                  } else {
                    setSelectedTags(new Set(availableTags.map((t) => t.name)))
                  }
                }}
              >
                {selectedTags.size === availableTags.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-md border border-border bg-bg divide-y divide-border">
              {availableTags.map((tag) => {
                const isChecked = selectedTags.has(tag.name)
                return (
                  <label
                    key={tag.name}
                    className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface select-none transition"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = new Set(selectedTags)
                        if (isChecked) {
                          next.delete(tag.name)
                        } else {
                          next.add(tag.name)
                        }
                        setSelectedTags(next)
                      }}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                    />
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <span className="text-xs font-medium text-text">{tag.name}</span>
                      <span className="font-mono text-[11px] text-muted">
                        {tag.endpointIds.length} endpoint{tag.endpointIds.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-2">
              <Button variant="secondary" onClick={() => setShowTagModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleImportSelectedTags()}
                disabled={selectedTags.size === 0 || importingTags}
              >
                {importingTags ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <GenerateIcon className="h-3.5 w-3.5" />
                )}
                <span>Import Selected ({selectedTags.size})</span>
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── Request body modal for mutation endpoints when no stored body exists ── */}
      {bodyPrompt && (
        <Dialog
          title={`Request Body Required — ${bodyPrompt.method} ${bodyPrompt.path}`}
          onClose={() => setBodyPrompt(null)}
        >
          <div className="flex flex-col gap-3 p-1">
            <p className="text-xs text-muted">
              <span className="font-semibold text-text">{bodyPrompt.method}</span> endpoints require
              a JSON request body. Enter the body below to execute in Swagger:
            </p>
            <textarea
              autoFocus
              value={bodyPrompt.body}
              onChange={(e) => setBodyPrompt({ ...bodyPrompt, body: e.target.value })}
              rows={8}
              placeholder="{\n  &quot;key&quot;: &quot;value&quot;\n}"
              className="w-full rounded-md border border-border bg-bg p-2 font-mono text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex justify-end gap-2 border-t border-border pt-2">
              <Button variant="secondary" onClick={() => setBodyPrompt(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  const bodyToSend = bodyPrompt.body.trim()
                  const targetId = bodyPrompt.endpointId
                  setBodyPrompt(null)
                  toastErr(await service.replayEndpoint(targetId, bodyToSend || undefined))
                }}
                disabled={!bodyPrompt.body.trim()}
              >
                <ReplayIcon className="h-3.5 w-3.5" />
                <span>Execute in Swagger</span>
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}