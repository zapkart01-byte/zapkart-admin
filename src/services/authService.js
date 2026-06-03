import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from './firebase'
import { supabase } from './supabase'

/**
 * ZapKart Admin Authentication Service
 * Uses Firebase email/password auth + Supabase admin profile verification.
 */

// Signs in admin with email and password, verifies admin role in Supabase
export async function loginWithEmail(email, password) {
  const normalizedEmail = email.toLowerCase().trim()
  const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password)
  const user = userCredential.user

  // Fetches admin profile from Supabase to verify admin role
  const { data: adminProfile, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', normalizedEmail)
    .single()

  if (error || !adminProfile) {
    await signOut(auth)
    throw new Error('Access denied. This email is not registered as an admin.')
  }

  return { user, adminProfile }
}

// Signs out the current admin user from Firebase
export async function logout() {
  await signOut(auth)
}

// Returns the currently authenticated Firebase user or null
export function getCurrentUser() {
  return auth.currentUser
}

// Retrieves a fresh Firebase ID token for backend API authorization
export async function getIdToken() {
  const user = auth.currentUser
  if (!user) throw new Error('No authenticated user')
  return user.getIdToken(true)
}

// Subscribes to Firebase auth state changes and invokes callback with user
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
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

// Creates an authenticated fetch wrapper that includes Firebase JWT token
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
