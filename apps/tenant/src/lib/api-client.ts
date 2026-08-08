import { appConfig } from '../config/env'

const BASE = appConfig.apiUrl
// Uploaded file/evidence URLs come back as root-relative paths (e.g. "/uploads/…"),
// served outside the /api/v1 prefix — strip it to get the API server's origin.
export const apiOrigin = BASE.replace(/\/api\/v1\/?$/, '')

// ─── Token management (localStorage) ─────────────────────────────────────────

const ACCESS_KEY  = 'tenant_access_token'
const REFRESH_KEY = 'tenant_refresh_token'

export const tokens = {
  getAccess:  (): string | null => localStorage.getItem(ACCESS_KEY),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

// ─── Silent token refresh ─────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokens.getRefresh()
  if (!refresh) return null

  try {
    const res  = await fetch(`${BASE}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) { tokens.clear(); window.location.href = '/login'; return null }
    const data = await res.json()
    tokens.set(data.data.accessToken)
    return data.data.accessToken
  } catch {
    tokens.clear()
    window.location.href = '/login'
    return null
  }
}

// ─── Core request ─────────────────────────────────────────────────────────────

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    console.error('[api-client] Request failed:', data)
    let msg = data.message || 'Request failed'
    if (data.errors && Array.isArray(data.errors)) {
      const details = data.errors.map((e: any) => `${e.field || 'field'}: ${e.message || 'invalid'}`).join(' | ')
      msg = `${msg} (${details})`
    } else if (data.error) {
      msg = `${msg} (${data.error})`
    }
    throw new Error(msg)
  }
  return data
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = tokens.getAccess()

  const makeReq = (t: string | null) =>
    fetch(`${BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...options.headers,
      },
    })

  let res = await makeReq(token)

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    token = await refreshAccessToken()
    if (token) res = await makeReq(token)
  }

  return parseResponse<T>(res)
}

// Multipart upload — deliberately omits Content-Type so the browser sets the
// multipart boundary itself; JSON.stringify-based request() can't be reused here.
async function uploadRequest<T>(endpoint: string, formData: FormData, method = 'POST'): Promise<T> {
  let token = tokens.getAccess()

  const makeReq = (t: string | null) =>
    fetch(`${BASE}${endpoint}`, {
      method,
      headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: formData,
    })

  let res = await makeReq(token)

  if (res.status === 401 && token) {
    token = await refreshAccessToken()
    if (token) res = await makeReq(token)
  }

  return parseResponse<T>(res)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const apiClient = {
  get:    <T>(endpoint: string)                    => request<T>(endpoint, { method: 'GET' }),
  post:   <T>(endpoint: string, body?: unknown)    => request<T>(endpoint, { method: 'POST',  body: body ? JSON.stringify(body) : undefined }),
  patch:  <T>(endpoint: string, body?: unknown)    => request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string)                    => request<T>(endpoint, { method: 'DELETE' }),
  upload: <T>(endpoint: string, formData: FormData, method = 'POST') => uploadRequest<T>(endpoint, formData, method),
  tokens,
}