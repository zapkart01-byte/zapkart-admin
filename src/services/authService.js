import { supabase } from './supabase'

/**
 * ZapKart Admin Authentication Service
 * Uses Supabase email/password auth + Supabase admin profile verification.
 */

// Signs in admin with email and password, verifies admin role in Supabase
export async function loginWithEmail(email, password) {
  const normalizedEmail = email.toLowerCase().trim()
  
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (authError) throw authError
  const user = data.user

  // Fetches admin profile from Supabase to verify admin role
  const { data: adminProfile, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', normalizedEmail)
    .single()

  if (error || !adminProfile) {
    await supabase.auth.signOut()
    throw new Error('Access denied. This email is not registered as an admin.')
  }

  return { user, adminProfile }
}

// Signs out the current admin user from Supabase
export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Returns the currently authenticated Supabase user or null
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Retrieves a fresh Supabase access token for backend API authorization
export async function getIdToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No authenticated user')
  return session.access_token
}

// Subscribes to Supabase auth state changes and invokes callback with user
export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      callback(session?.user || null)
    }
  )
  
  return () => {
    subscription.unsubscribe()
  }
}

// Fetches the admin profile from Supabase by email address
export async function fetchAdminProfile(email) {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error) throw new Error('Failed to fetch admin profile')
  return data
}

// Creates an authenticated fetch wrapper that includes Supabase JWT token
export async function authenticatedFetch(url, options = {}) {
  const token = await getIdToken()
  const apiUrl = import.meta.env.VITE_API_URL

  return fetch(`${apiUrl}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
}

