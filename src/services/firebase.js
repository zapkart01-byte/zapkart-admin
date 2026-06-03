import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Collects all missing Firebase environment variables for error reporting
const missingVars = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

// Throws descriptive error if any Firebase config values are missing
if (missingVars.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingVars.join(', ')}. Please check your .env file.`
  )
}

// Initializes the Firebase app instance
const app = initializeApp(firebaseConfig)

// Exports the Firebase auth instance configured for email/password authentication
export const auth = getAuth(app)

export default app
