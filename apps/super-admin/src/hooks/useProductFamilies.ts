import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

const KEYS = {
  families: ['product-families']         as const,
  products: ['product-families', 'all']  as const,
}

export interface Product {
  id: string; name: string; description: string | null
  vendor: string | null; website: string | null; logoUrl: string | null
  category: string | null; productFamilyId: string | null
  productFamily: { id: string; name: string; category: string | null } | null
  _count?: { actions: number }
}

export interface ProductFamily {
  id: string; name: string; description: string | null; category: string | null
  _count: { products: number }
  products: Product[]
}

export function useProductFamilies() {
  return useQuery({
    queryKey: KEYS.families,
    queryFn:  () => apiClient.get<{ success: boolean; data: ProductFamily[] }>('/product-families').then(r => r.data),
    staleTime: 60_000,
  })
}

export function useAllProducts() {
  return useQuery({
    queryKey: KEYS.products,
    queryFn:  () => apiClient.get<{ success: boolean; data: Product[] }>('/product-families/products').then(r => r.data),
    staleTime: 60_000,
  })
}

export function useCreateProductFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; category?: string }) =>
      apiClient.post('/product-families', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.families }); toast.success('Product family created') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useUpdateProductFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; category?: string }) =>
      apiClient.patch(`/product-families/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.families }); toast.success('Updated') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useDeleteProductFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/product-families/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.families }); toast.success('Deleted') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; vendor?: string; website?: string; logoUrl?: string; category?: string; productFamilyId?: string }) =>
      apiClient.post('/product-families/products', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.families })
      qc.invalidateQueries({ queryKey: KEYS.products })
      toast.success('Product created')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [k: string]: unknown }) =>
      apiClient.patch(`/product-families/products/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.families })
      qc.invalidateQueries({ queryKey: KEYS.products })
      toast.success('Product updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/product-families/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.families })
      qc.invalidateQueries({ queryKey: KEYS.products })
      toast.success('Product deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useSetActionProducts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ actionId, productIds }: { actionId: string; productIds: string[] }) =>
      apiClient.post(`/product-families/actions/${actionId}/products`, { productIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['controls'] })
      toast.success('Products updated for action')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}