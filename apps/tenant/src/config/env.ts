const env = {
  VITE_TENANT_API_URL: (import.meta as any).env?.VITE_TENANT_API_URL as string | undefined,
}

export const appConfig = {
  apiUrl: env.VITE_TENANT_API_URL || 'http://localhost:3000/api/v1',
} as const