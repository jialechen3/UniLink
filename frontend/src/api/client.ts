const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  const token = localStorage.getItem('unilink.token')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('The UniLink service could not be reached. Check your connection and try again.', 0)
  }

  if (response.status === 204) return undefined as T
  const payload = await response.json().catch(() => null) as { detail?: string } | null
  if (!response.ok) {
    throw new ApiError(payload?.detail ?? 'Something went wrong. Please try again.', response.status)
  }
  return payload as T
}