/**
 * @harbor/source-rdstation
 *
 * Two modes:
 * 1. CSV (recommended): export from RD Station UI → use CsvSource
 *    RD Station has no paginated list API — CSV export covers all contacts
 * 2. API (small volumes): GET /platform/segmentations/{id}/contacts via source-openapi
 *
 * Usage (CSV — recommended):
 *   const source = RDStationCsvSource({ path: "./leads_export.csv" })
 *
 * Usage (API):
 *   const source = RDStationApiSource({ accessToken: "...", segmentationId: 123 })
 */
import { Schema } from "effect"
import { CsvSource }      from "@harbor/source-csv"
import { OpenApiSource, type OpenApiSourceResult } from "@harbor/source-openapi"

export const RDContactSchema = Schema.Struct({
  email:           Schema.String,
  name:            Schema.optional(Schema.String),
  job_title:       Schema.optional(Schema.String),
  company:         Schema.optional(Schema.String),
  personal_phone:  Schema.optional(Schema.String),
  mobile_phone:    Schema.optional(Schema.String),
  city:            Schema.optional(Schema.String),
  state:           Schema.optional(Schema.String),
  country:         Schema.optional(Schema.String),
  lifecycle_stage: Schema.optional(Schema.String),
  tags:            Schema.optional(Schema.String),  // "tag1,tag2" in CSV
})

export type RDContact = typeof RDContactSchema.Type

/** Mode 1 — CSV export (recommended for any volume) */
export function RDStationCsvSource(config: { path: string }) {
  return CsvSource({ path: config.path, schema: RDContactSchema })
}

export interface RDStationApiConfig {
  accessToken:     string
  refreshToken?:   string
  segmentationId?: number
  pageSize?:       number
  specUrl?:        string
}

const RD_SPEC = "https://api.rd.services/openapi.json"

/** Mode 2 — API (small volumes, requires OAuth token) */
export function RDStationApiSource(config: RDStationApiConfig): OpenApiSourceResult {
  const path = config.segmentationId
    ? `/platform/segmentations/${config.segmentationId}/contacts`
    : "/platform/contacts"

  return OpenApiSource({
    spec:     config.specUrl ?? RD_SPEC,
    auth:     { type: "bearer", value: config.accessToken },
    baseUrl:  "https://api.rd.services",
    tag:      "contacts",
    pageSize: config.pageSize,
  })
}

export type { OpenApiSourceResult } from "@harbor/source-openapi"
