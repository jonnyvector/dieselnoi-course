'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api, { clearCSRFToken } from '@/lib/api'

interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

interface RegisterData {
  username: string
  email: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false) // Start false so pages render immediately

  const checkAuth = async () => {
    setLoading(true)
    try {
      const response = await api.get('/auth/user/')
      setUser(response.data)
    } catch (error) {
      // User not authenticated, which is fine
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check auth in background without blocking page render
    checkAuth()
  }, [])

  const login = async (username: string, password: string) => {
    const response = await api.post('/auth/login/', { username, password })
    // Clear cached CSRF token after login so next request gets a fresh one
    clearCSRFToken()
    setUser(response.data.user)
  }

  const register = async (userData: RegisterData) => {
    const response = await api.post('/auth/register/', userData)
    // Clear cached CSRF token after register so next request gets a fresh one
    clearCSRFToken()
    setUser(response.data.user)
  }

  const logout = async () => {
    await api.post('/auth/logout/')
    // Clear cached CSRF token after logout
    clearCSRFToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
