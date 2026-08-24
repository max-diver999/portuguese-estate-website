export interface DatasetOrganization {
  id: string
  name: string
  url: string
  sameAs?: string[]
}

export interface DatasetSchemaInput {
  name: string
  description: string
  url: string | URL
  language?: string
  organization?: DatasetOrganization
  license?: string
  temporalCoverage?: string
  spatialCoverage?: string
  keywords?: string[]
  downloadUrl?: string
  encodingFormat?: string
}

export function isRealDownloadUrl(value: unknown): boolean
export function buildDatasetSchema(
  props: DatasetSchemaInput,
): Record<string, unknown>
