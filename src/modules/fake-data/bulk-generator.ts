import {
  generateFromSchema,
  synthesizeFromJsonSample,
  type OpenAPISchema,
  type SchemaGeneratorOptions,
} from './schema-generator'

export type BulkFormat = 'json' | 'csv'

export interface BulkDatasetOptions extends SchemaGeneratorOptions {
  count?: number
  format?: BulkFormat
}

export interface BulkDatasetResult {
  format: BulkFormat
  count: number
  text: string
  records: unknown[]
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey))
    } else if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value)
    } else {
      result[fullKey] = value
    }
  }
  return result
}

function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Converts an array of objects to CSV string format.
 */
export function convertToCsv(records: Record<string, unknown>[]): string {
  if (!records || records.length === 0) return ''

  // Collect all unique column keys
  const flattenedList = records.map((r) => flattenObject(r))
  const headersSet = new Set<string>()
  for (const flat of flattenedList) {
    for (const key of Object.keys(flat)) {
      headersSet.add(key)
    }
  }

  const headers = Array.from(headersSet)
  const rows: string[] = [headers.map((h) => escapeCsvValue(h)).join(',')]

  for (const flat of flattenedList) {
    const row = headers.map((h) => escapeCsvValue(flat[h] ?? ''))
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

/**
 * Generate a bulk dataset from an OpenAPI Schema or JSON Sample object.
 */
export function generateBulkDataset(
  source: OpenAPISchema | Record<string, unknown>,
  options: BulkDatasetOptions = {},
): BulkDatasetResult {
  const count = Math.max(1, Math.min(100, options.count ?? 10))
  const format = options.format ?? 'json'
  const isSchema = 'type' in source || 'properties' in source

  const records: Record<string, unknown>[] = []
  for (let i = 0; i < count; i++) {
    const item = isSchema
      ? generateFromSchema(source as OpenAPISchema, '', options)
      : synthesizeFromJsonSample(source, options)

    if (item && typeof item === 'object' && !Array.isArray(item)) {
      records.push(item as Record<string, unknown>)
    } else {
      records.push({ value: item })
    }
  }

  const text = format === 'csv' ? convertToCsv(records) : JSON.stringify(records, null, 2)

  return {
    format,
    count,
    text,
    records,
  }
}
