const env = {
  VITE_API_URL: (import.meta as any).env?.VITE_API_URL as string | undefined,
}

function requireEnv(key: keyof typeof env): string {
  const value = env[key]
  if (!value) {
    console.warn(`Environment variable ${key} is not set. Using default.`)
  }
  return value ?? ''
}

export const appConfig = {
  apiUrl: requireEnv('VITE_API_URL') || (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:3001/api/v1'),
} as const