import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  loginWithEmail,
  logout as authLogout,
  onAuthChange,
  fetchAdminProfile,
} from '../services/authService'
import { ROUTES } from '../constants/routes'

/**
 * ZapKart Admin Authentication Context
 * Provides auth state, login/logout, and admin profile to the entire app.
 */

// Creates the authentication context with default null value
const AuthContext = createContext(null)

// Custom hook to access authentication context from any component
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// AuthProvider component that wraps the app and manages authentication state
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [adminProfile, setAdminProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Subscribes to Supabase auth state changes on mount
  useEffect(() => {
    const unsubscribe = onAuthChange(async (supabaseUser) => {
      try {
        if (supabaseUser) {
          // Fetches admin profile when Supabase user is authenticated
          const profile = await fetchAdminProfile(supabaseUser.email)
          setUser(supabaseUser)
          setAdminProfile(profile)
          setError(null)
        } else {
          // Clears state when no Supabase user is present
          setUser(null)
          setAdminProfile(null)
        }
      } catch (err) {
        // Signs out if admin profile verification fails
        setUser(null)
        setAdminProfile(null)
        setError(err.message)
        await authLogout()
      } finally {
        setLoading(false)
      }
    })

    // Cleans up auth state listener on unmount
    return () => unsubscribe()
  }, [])

  // Authenticates admin with email and password
  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { user: supabaseUser, adminProfile: profile } =
        await loginWithEmail(email, password)
      setUser(supabaseUser)
      setAdminProfile(profile)
      return { user: supabaseUser, adminProfile: profile }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Signs out the current admin and clears state
  const logout = useCallback(async () => {
    try {
      await authLogout()
      setUser(null)
      setAdminProfile(null)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  // Clears any authentication error messages
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Memoized context value to prevent unnecessary re-renders
  const value = {
    user,
    adminProfile,
    loading,
    error,
    login,
    logout,
    clearError,
    isAuthenticated: !!user && !!adminProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ProtectedRoute component that redirects to login if not authenticated
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  // Redirects to login page when user is not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  // Shows loading spinner while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-md">
          <div className="w-10 h-10 border-4 border-surface-container-high border-t-primary-container rounded-full animate-spin" />
          <p className="text-body-md text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  // Returns null while redirecting to prevent flash of protected content
  if (!isAuthenticated) return null

  return children
}

// PublicRoute component that redirects authenticated users to dashboard
export function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  // Redirects to dashboard if user is already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(ROUTES.DASHBOARD, { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  // Shows loading spinner while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-md">
          <div className="w-10 h-10 border-4 border-surface-container-high border-t-primary-container rounded-full animate-spin" />
          <p className="text-body-md text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) return null

  return children
}

export default AuthContext
