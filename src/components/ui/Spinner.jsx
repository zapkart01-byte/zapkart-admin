import React from 'react'

/**
 * Spinner Component
 * Reusable animated circular loading indicator.
 */
export default function Spinner({ size = 'md', variant = 'primary', className = '' }) {
  // Styles for size variants
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-4',
  }

  // Styles for color variants
  const variantClasses = {
    primary: 'border-surface-container-high border-t-primary-container',
    secondary: 'border-surface-container-high border-t-secondary',
    white: 'border-white/30 border-t-white',
  }

  return (
    <div
      className={`rounded-full animate-spin ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      role="status"
      aria-label="loading"
    />
  )
}
