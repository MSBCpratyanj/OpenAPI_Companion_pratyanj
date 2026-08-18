// Fake Data Generator & Mock Dataset Studio (FDD-005, EPIC-07)
export { FakeDataService } from './fake-data-service'
export type { FakeDataServiceOptions } from './fake-data-service'
export { FakeDataPanel } from './FakeDataPanel'
export {
  GENERATORS,
  GENERATOR_KEYS,
  GENERATOR_CATALOG,
  generate,
  isGeneratorKey,
} from './generators'
export type { GeneratorKey, GeneratorCategory, GeneratorMeta, FakeValue, Rng } from './generators'
export { detectGenerator } from './detect'
export { generateFromSchema, synthesizeFromJsonSample } from './schema-generator'
export type { GenerationMode, SchemaGeneratorOptions, OpenAPISchema } from './schema-generator'
export { generateBulkDataset, convertToCsv } from './bulk-generator'
export type { BulkFormat, BulkDatasetOptions, BulkDatasetResult } from './bulk-generator'
export type {
  FakeDataPanelService,
  FakeDataPreview,
  FieldInfo,
  GenerateOptions,
  GenerateResult,
  EndpointInfo,
} from './types'
