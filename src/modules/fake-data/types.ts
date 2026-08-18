/** Fake Data Generator domain types (FDD-005, EPIC-07). */
import type { Result } from '@/types'
import type { EndpointInfo } from '@/adapters'
import type { GeneratorKey, GeneratorCategory, GeneratorMeta, FakeValue } from './generators'
import type { GenerationMode, SchemaGeneratorOptions } from './schema-generator'
import type { BulkFormat, BulkDatasetOptions, BulkDatasetResult } from './bulk-generator'

export type {
  EndpointInfo,
  GeneratorKey,
  GeneratorCategory,
  GeneratorMeta,
  FakeValue,
  GenerationMode,
  SchemaGeneratorOptions,
  BulkFormat,
  BulkDatasetOptions,
  BulkDatasetResult,
}

/** One top-level field of the open request, as shown in the panel. */
export interface FieldInfo {
  key: string
  /** Current value rendered for display (primitives stringified by the UI). */
  value: unknown
  /** Detected generator, or null when the field is unsupported (left as-is). */
  generator: GeneratorKey | null
}

export interface FakeDataPreview {
  endpointId: string
  method: string
  fields: FieldInfo[]
}

export interface GenerateResult {
  endpointId: string
  /** How many fields were actually filled. */
  fieldCount: number
}

export interface GenerateOptions {
  /** Replace existing (non-placeholder) values too. Default false — preserve edits. */
  overwrite?: boolean
}

/** Service contract consumed by the UI */
export interface FakeDataPanelService {
  previewOpenRequest(): FakeDataPreview | null
  generateAll(options?: GenerateOptions): Promise<Result<GenerateResult>>
  regenerateField(key: string): Promise<Result<GenerateResult>>
  listEndpoints(): EndpointInfo[]
  generateMockPayload(
    endpointId: string,
    mode: GenerationMode,
    arrayCount?: number,
  ): Promise<Result<string>>
  generateBulk(
    endpointId: string,
    count: number,
    format: BulkFormat,
    mode: GenerationMode,
  ): Promise<Result<BulkDatasetResult>>
  injectPayload(endpointId: string, bodyText: string): Promise<Result<void>>
}
