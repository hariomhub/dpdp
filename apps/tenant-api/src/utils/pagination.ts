export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(String(query.page || 1)))
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 20))))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

export function buildMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}