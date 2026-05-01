/** OpenAPI / Swagger type definitions — internalized from spec2cli */

export interface OpenAPISpec {
  openapi: string
  info: { title: string; version: string; description?: string }
  servers?: Array<{ url: string; description?: string }>
  paths: Record<string, PathItem>
  tags?: Array<{ name: string; description?: string }>
  components?: {
    schemas?: Record<string, SchemaObject>
    securitySchemes?: Record<string, SecurityScheme>
  }
  security?: SecurityRequirement[]
}

export interface PathItem {
  get?: OperationObject
  post?: OperationObject
  put?: OperationObject
  patch?: OperationObject
  delete?: OperationObject
  parameters?: ParameterObject[]
}

export interface OperationObject {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: ParameterObject[]
  requestBody?: { required?: boolean; content?: Record<string, { schema?: SchemaObject }> }
  responses?: Record<string, ResponseObject>
  security?: SecurityRequirement[]
}

export interface ParameterObject {
  name: string
  in: "path" | "query" | "header" | "cookie"
  required?: boolean
  description?: string
  schema?: SchemaObject
}

export interface ResponseObject {
  description?: string
  content?: Record<string, { schema?: SchemaObject }>
}

export interface SchemaObject {
  type?: string
  format?: string
  description?: string
  enum?: string[]
  items?: SchemaObject
  properties?: Record<string, SchemaObject>
  required?: string[]
  default?: unknown
  $ref?: string
}

export interface SecurityScheme {
  type: "http" | "apiKey" | "oauth2" | "openIdConnect"
  scheme?: string
  name?: string
  in?: "header" | "query" | "cookie"
}

export type SecurityRequirement = Record<string, string[]>

/** Internal representation — one list endpoint extracted from the spec */
export interface ListOperation {
  tag:        string
  path:       string
  method:     "GET"
  summary:    string
  params:     ParameterObject[]
  responseSchema: SchemaObject | null
}

/** A single discovered field */
export interface FieldInfo {
  name:     string
  type:     string
  required: boolean
}
