import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { apiClient } from '../lib/api-client'


interface LoginInput {
  email: string
  password: string
}

interface LoginResponse {
  success: boolean
  data: {
    accessToken: string
    refreshToken: string
    admin: {
      id: string
      name: string
      email: string
    }
  }
}

export function useLogin() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: LoginInput) =>
      apiClient.post<LoginResponse>('/auth/login', data),
    onSuccess: (response) => {
      apiClient.setTokens(
        response.data.accessToken,
        response.data.refreshToken
      )
      navigate('/admin/dashboard')
    },
  })
}

export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () =>
      apiClient
        .get<{
          success: boolean
          data: { id: string; name: string; email: string }
        }>('/auth/me')
        .then(res => res.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogout() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => apiClient.post('/auth/logout'),
    onSuccess: () => {
      apiClient.clearTokens()
      navigate('/login')
    },
    onError: () => {
      apiClient.clearTokens()
      navigate('/login')
    },
  })
}