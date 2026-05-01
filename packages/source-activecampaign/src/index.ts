/**
 * @harbor/source-activecampaign
 *
 * Thin wrapper over @harbor/source-openapi.
 * ActiveCampaign API: https://{account}.api-us1.com/api/3
 *
 * Usage:
 *   const source = ActiveCampaignSource({ account: "minhaempresa", token: "API_KEY" })
 *   // source.stream → Stream<Record, OpenApiError>
 */
import { OpenApiSource, type OpenApiSourceResult } from "@harbor/source-openapi"

export interface ActiveCampaignConfig {
  account:   string
  token:     string
  tag?:      string
  pageSize?: number
  /** Custom OpenAPI spec URL (default: bundled AC spec) */
  specUrl?:  string
}

const DEFAULT_SPEC = "https://developers.activecampaign.com/openapi.json"

export function ActiveCampaignSource(config: ActiveCampaignConfig): OpenApiSourceResult {
  return OpenApiSource({
    spec:     config.specUrl ?? DEFAULT_SPEC,
    auth:     { type: "apiKey", headerName: "Api-Token", value: config.token },
    baseUrl:  `https://${config.account}.api-us1.com/api/3`,
    tag:      config.tag ?? "contacts",
    pageSize: config.pageSize,
  })
}

export type { OpenApiSourceResult } from "@harbor/source-openapi"
