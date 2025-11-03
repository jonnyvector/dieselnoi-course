'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '@/lib/api'

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
  const [loading, setLoading] = useState(true)

  const checkAuth = async () => {
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
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth check timed out, setting loading to false')
        setLoading(false)
      }
    }, 5000)

    checkAuth()

    return () => clearTimeout(timeout)
  }, [])

  const login = async (username: string, password: string) => {
    const response = await api.post('/auth/login/', { username, password })
    setUser(response.data.user)
  }

  const register = async (userData: RegisterData) => {
    const response = await api.post('/auth/register/', userData)
    setUser(response.data.user)
  }

  const logout = async () => {
    await api.post('/auth/logout/')
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
