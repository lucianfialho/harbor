/** executeRequest — internalized from spec2cli/src/executor/http.ts */
import type { AuthConfig } from "./auth.js"
import { buildAuthHeaders } from "./auth.js"

export interface PageParams {
  offset?: number
  limit?:  number
  page?:   number
  cursor?: string
  after?:  string
  [key: string]: unknown
}

export interface HttpResult {
  status:  number
  data:    unknown
  headers: Record<string, string>
}

export async function executeRequest(
  method:  string,
  baseUrl: string,
  path:    string,
  params:  PageParams,
  auth:    AuthConfig
): Promise<HttpResult> {
  const url = buildUrl(baseUrl, path, params)
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...buildAuthHeaders(auth),
  }

  const res = await fetch(url, { method, headers })

  const resHeaders: Record<string, string> = {}
  res.headers.forEach((v, k) => { resHeaders[k] = v })

  let data: unknown
  const ct = res.headers.get("content-type") ?? ""
  const text = await res.text()
  try { data = JSON.parse(text) } catch { data = text }

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
  return { status: res.status, data, headers: resHeaders }
}

function buildUrl(baseUrl: string, path: string, params: PageParams): string {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const url  = new URL(base + path)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  }
  return url.toString()
}
