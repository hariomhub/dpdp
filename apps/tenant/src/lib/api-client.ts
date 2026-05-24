import { appConfig } from '../config/env'

const BASE = appConfig.apiUrl

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

// ─── Public API ───────────────────────────────────────────────────────────────

export const apiClient = {
  get:    <T>(endpoint: string)                    => request<T>(endpoint, { method: 'GET' }),
  post:   <T>(endpoint: string, body?: unknown)    => request<T>(endpoint, { method: 'POST',  body: body ? JSON.stringify(body) : undefined }),
  patch:  <T>(endpoint: string, body?: unknown)    => request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string)                    => request<T>(endpoint, { method: 'DELETE' }),
  tokens,
}