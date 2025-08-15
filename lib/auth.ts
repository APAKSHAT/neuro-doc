import { NextRequest } from 'next/server'
import { supabase } from './supabase'

export interface AuthenticatedUser {
  id: string
  email: string
  role?: string
}

// Get user from request headers (JWT token)
export async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return null
    }
    
    return {
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role
    }
  } catch (error) {
    console.error('Error getting user from request:', error)
    return null
  }
}

// Middleware function to require authentication
export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await getUserFromRequest(request)
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}

// Check if user has required role
export function hasRole(user: AuthenticatedUser, requiredRole: string): boolean {
  return user.role === requiredRole || user.role === 'admin'
}

// Generate API key for external access (if needed)
export function generateApiKey(): string {
  return 'ndk_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
}
