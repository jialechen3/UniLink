import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { AuthResponse, User } from '../types'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  selectUniversity: (universityId: number, password?: string) => Promise<void>
  refreshUser: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('unilink.token'))
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setUser(null)
      return
    }
    let active = true
    setLoading(true)
    api<User>('/me')
      .then((profile) => { if (active) setUser(profile) })
      .catch(() => {
        localStorage.removeItem('unilink.token')
        if (active) {
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  async function acceptAuth(payload: AuthResponse) {
    localStorage.setItem('unilink.token', payload.access_token)
    setToken(payload.access_token)
    setUser(payload.user)
  }

  async function login(email: string, password: string) {
    await acceptAuth(await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }))
  }

  async function register(name: string, email: string, password: string) {
    await acceptAuth(await api<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }))
  }

  async function selectUniversity(universityId: number, password?: string) {
    const updated = await api<User>('/me/university', {
      method: 'PUT',
      body: JSON.stringify({ university_id: universityId, password }),
    })
    setUser(updated)
  }

  async function refreshUser() {
    setUser(await api<User>('/me'))
  }

  function logout() {
    localStorage.removeItem('unilink.token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, selectUniversity, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}