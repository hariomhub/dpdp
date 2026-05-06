import React from 'react'
import { Navigate } from 'react-router'
import { apiClient } from '../../lib/api-client'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = apiClient.getToken()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}