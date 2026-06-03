import React from 'react'
import Spinner from './Spinner'

/**
 * Button Component
 * Reusable design system button supporting micro-animations, styling variants, sizes, and active loading indicators.
 */
export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  // Styles for background and borders color variants
  const variantClasses = {
    primary: 'bg-primary-container text-on-primary-container border-transparent hover:bg-brand-dark hover:shadow-md active:scale-[0.98]',
    secondary: 'bg-secondary-container text-on-secondary-container border-transparent hover:bg-secondary-fixed-dim hover:text-on-secondary-fixed active:scale-[0.98]',
    outline: 'bg-transparent text-secondary border border-outline hover:bg-surface-container hover:text-on-surface active:scale-[0.98]',
    danger: 'bg-error text-on-error border-transparent hover:bg-danger hover:shadow-md active:scale-[0.98]',
    ghost: 'bg-transparent text-secondary border-transparent hover:bg-surface-container hover:text-on-surface active:bg-surface-container-high',
  }

  // Styles for heights and spacing variants
  const sizeClasses = {
    sm: 'h-9 px-sm py-xs text-label-md rounded-lg gap-xs',
    md: 'h-11 px-md py-sm text-label-lg rounded-xl gap-sm',
    lg: 'h-12 px-lg py-md text-headline-sm rounded-2xl gap-sm',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-semibold transition-all select-none border disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading && (
        <Spinner
          size="sm"
          variant={variant === 'primary' || variant === 'danger' ? 'white' : 'primary'}
          className="shrink-0"
        />
      )}
      <span className={isLoading ? 'opacity-85' : ''}>{children}</span>
    </button>
  )
}
