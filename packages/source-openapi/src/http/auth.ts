export type AuthType = "bearer" | "apiKey" | "basic" | "headers" | "none"

export interface AuthConfig {
  type:        AuthType
  value?:      string
  headerName?: string
  headers?:    Record<string, string>
}

export function buildAuthHeaders(auth: AuthConfig): Record<string, string> {
  switch (auth.type) {
    case "bearer":
      return { Authorization: `Bearer ${auth.value ?? ""}` }
    case "apiKey":
      return { [auth.headerName ?? "X-API-Key"]: auth.value ?? "" }
    case "basic":
      return { Authorization: `Basic ${Buffer.from(auth.value ?? "").toString("base64")}` }
    case "headers":
      return auth.headers ?? {}
    default:
      return {}
  }
}
