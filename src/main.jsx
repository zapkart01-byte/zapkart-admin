import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// List of all required environment variables for the admin app
const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_API_URL',
  'VITE_MAPTILER_KEY',
]

// Checks all required environment variables and collects missing ones
const missingVars = REQUIRED_ENV_VARS.filter(
  (varName) => !import.meta.env[varName]
)

const root = createRoot(document.getElementById('root'))

// Renders error screen if any environment variables are missing
if (missingVars.length > 0) {
  root.render(
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FEE2E2',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        border: '2px solid #EF4444',
      }}>
        <h1 style={{
          color: '#EF4444',
          fontSize: '20px',
          fontWeight: '700',
          marginBottom: '8px',
          marginTop: 0,
        }}>
          ⚠️ ZapKart Admin — Configuration Error
        </h1>
        <p style={{
          color: '#6B7280',
          fontSize: '14px',
          marginBottom: '20px',
        }}>
          The following environment variables are missing from your <code>.env</code> file.
          Copy <code>.env.example</code> to <code>.env</code> and fill in all values.
        </p>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}>
          {missingVars.map((varName) => (
            <li key={varName} style={{
              padding: '8px 12px',
              marginBottom: '6px',
              backgroundColor: '#FEE2E2',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#991B1B',
            }}>
              {varName}
            </li>
          ))}
        </ul>
        <p style={{
          color: '#6B7280',
          fontSize: '12px',
          marginTop: '20px',
          marginBottom: 0,
        }}>
          Total missing: {missingVars.length} of {REQUIRED_ENV_VARS.length} required variables
        </p>
      </div>
    </div>
  )
} else {
  // Renders the app only when all environment variables are present
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
