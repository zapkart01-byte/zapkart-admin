import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Store, TrendingUp, Shield, Mail, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../constants/routes'

/**
 * ZapKart Super Admin Login Page
 * Full Stitch dual-pane design with interactive elements and complete security logging.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, error, clearError } = useAuth()
  const navigate = useNavigate()

  // Clear any existing auth errors when the login page mounts
  useEffect(() => {
    clearError()
  }, [clearError])

  // Handles form submission, triggers authentication, redirects to dashboard on success
  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch {
      // Error is stored and handled in AuthContext
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col md:flex-row w-full overflow-x-hidden">
      {/* Brand Panel (Left on Desktop, Top on Mobile) */}
      <div className="bg-primary-container text-on-primary w-full md:w-[45%] flex flex-col justify-between p-lg md:p-xl relative overflow-hidden min-h-[40vh] md:min-h-screen shrink-0">
        {/* Abstract geometric background decoration */}
        <div
          className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.4) 0%, transparent 20%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.4) 0%, transparent 20%)',
          }}
        />

        {/* Brand Logo and Name */}
        <div className="flex items-center gap-sm mb-lg md:mb-0 z-10">
          <Zap className="w-9 h-9 fill-on-primary text-on-primary" />
          <span className="font-headline-lg text-headline-lg text-on-primary tracking-tight font-bold">
            ZapKart
          </span>
        </div>

        {/* Key Features bullet points list */}
        <div className="z-10 md:mt-auto md:mb-auto flex-1 flex flex-col justify-center">
          <h1 className="font-headline-lg text-headline-lg md:text-4xl md:leading-tight font-bold mb-lg text-on-primary">
            Complete Platform Control.
          </h1>
          <div className="space-y-md">
            {/* Feature 1 */}
            <div className="flex items-start gap-sm">
              <div className="bg-primary text-on-primary p-sm rounded-full flex items-center justify-center shrink-0 mt-xs">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-primary">
                  Multi-Store Management
                </h3>
                <p className="font-body-md text-body-md opacity-80 text-on-primary">
                  Oversee inventory and operations across all locations instantly.
                </p>
              </div>
            </div>
            {/* Feature 2 */}
            <div className="flex items-start gap-sm">
              <div className="bg-primary text-on-primary p-sm rounded-full flex items-center justify-center shrink-0 mt-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-primary">
                  Real-Time Analytics
                </h3>
                <p className="font-body-md text-body-md opacity-80 text-on-primary">
                  Live data feeds on sales, traffic, and platform performance.
                </p>
              </div>
            </div>
            {/* Feature 3 */}
            <div className="flex items-start gap-sm">
              <div className="bg-primary text-on-primary p-sm rounded-full flex items-center justify-center shrink-0 mt-xs">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-primary">
                  Advanced Security
                </h3>
                <p className="font-body-md text-body-md opacity-80 text-on-primary">
                  Enterprise-grade access controls and audit logging.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom panel copyright footer */}
        <div className="z-10 mt-lg md:mt-0 font-body-sm text-body-sm opacity-70">
          © 2026 ZapKart Inc. All rights reserved.
        </div>
      </div>

      {/* Login Form Area (Right on Desktop, Bottom on Mobile) */}
      <div className="bg-surface flex-1 flex flex-col items-center justify-center p-margin-mobile md:p-xl relative w-full min-h-[60vh] md:min-h-screen">
        {/* Subtle decorative grid overlay */}
        <div
          className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Login form Card block */}
        <div className="w-full max-w-md bg-surface-container-lowest p-lg rounded-xl shadow-card border border-surface-variant relative z-10 mx-auto animate-fade-in">
          <div className="mb-lg text-center md:text-left">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
              Welcome back
            </h2>
            <p className="font-body-md text-body-md text-secondary">
              Sign in to the Super Admin console.
            </p>
          </div>

          {/* Authentication context error warning card */}
          {error && (
            <div
              className="mb-md p-md rounded-lg bg-danger/10 border border-danger text-danger flex items-start gap-sm text-body-sm"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Sign in failed: </span>
                {error}
                <button
                  type="button"
                  onClick={clearError}
                  className="block mt-xs text-label-sm font-semibold underline decoration-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-lg"
            data-testid="login-form"
            aria-label="Super admin sign in"
          >
            {/* Email field */}
            <div className="space-y-sm">
              <label
                className="block font-label-md text-label-md text-on-surface-variant"
                htmlFor="login-email"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-sm flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-secondary" />
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  data-testid="login-email"
                  aria-label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@zapkart.com"
                  required
                  disabled={isSubmitting}
                  className="block w-full pl-xl pr-sm py-sm font-body-md text-body-md bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-colors outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-sm">
              <div className="flex items-center justify-between">
                <label
                  className="block font-label-md text-label-md text-on-surface-variant"
                  htmlFor="login-password"
                >
                  Password
                </label>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-sm flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-secondary" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  data-testid="login-password"
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting}
                  className="block w-full pl-xl pr-sm py-sm font-body-md text-body-md bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-colors outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-sm">
              <button
                type="submit"
                data-testid="login-submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-md px-lg border border-transparent rounded-full shadow-sm font-label-lg text-label-lg text-on-primary bg-primary-container hover:bg-brand-dark hover:shadow-md transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </div>

            {/* Security disclaimer footer */}
            <div className="mt-lg flex items-center justify-center gap-xs font-body-sm text-body-sm text-secondary">
              <Shield className="w-4 h-4 text-secondary" />
              <span>Secure encrypted connection</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
