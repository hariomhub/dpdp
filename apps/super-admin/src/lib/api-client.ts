import { appConfig } from '../config/env'

const BASE_URL = appConfig.apiUrl

function getToken(): string | null {
  return localStorage.getItem('admin_access_token')
}

function getRefreshToken(): string | null {
  return localStorage.getItem('admin_refresh_token')
}

function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem('admin_access_token', accessToken)
  if (refreshToken) {
    localStorage.setItem('admin_refresh_token', refreshToken)
  }
}

function clearTokens() {
  localStorage.removeItem('admin_access_token')
  localStorage.removeItem('admin_refresh_token')
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      clearTokens()
      window.location.href = '/login'
      return null
    }

    const data = await response.json()
    setTokens(data.data.accessToken)
    return data.data.accessToken
  } catch {
    clearTokens()
    window.location.href = '/login'
    return null
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getToken()

  const makeRequest = async (accessToken: string | null) => {
    return fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    })
  }

  let response = await makeRequest(token)

  if (response.status === 401 && token) {
    token = await refreshAccessToken()
    if (token) {
      response = await makeRequest(token)
    }
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

export const apiClient = {
  get: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  setTokens,
  clearTokens,
  getToken,
}