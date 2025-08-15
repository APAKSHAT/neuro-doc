"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  created_at: string
  user_metadata?: any
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('supabase_token')
    const userId = localStorage.getItem('user_id')
    const userEmail = localStorage.getItem('user_email')

    if (token && userId && userEmail) {
      // Verify token is still valid
      fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.user) {
          setUser(data.user)
        } else {
          // Token invalid, clear storage
          localStorage.removeItem('supabase_token')
          localStorage.removeItem('user_id')
          localStorage.removeItem('user_email')
        }
      })
      .catch(() => {
        // Error verifying token, clear storage
        localStorage.removeItem('supabase_token')
        localStorage.removeItem('user_id')
        localStorage.removeItem('user_email')
      })
      .finally(() => {
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const login = (token: string, userData: User) => {
    localStorage.setItem('supabase_token', token)
    localStorage.setItem('user_id', userData.id)
    localStorage.setItem('user_email', userData.email)
    setUser(userData)
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('supabase_token')
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('supabase_token')
      localStorage.removeItem('user_id')
      localStorage.removeItem('user_email')
      setUser(null)
    }
  }

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated
    }}>
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
