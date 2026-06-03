import React from 'react'

/**
 * Badge Component
 * Visual tag indicating status labels, using the exact order-status HSL colors from tailwind.config.js.
 */
export default function Badge({ children, variant = 'secondary', className = '' }) {
  // Styles for standard semantic color variants
  const semanticClasses = {
    success: 'bg-success/10 text-success border-success/30',
    danger: 'bg-danger/10 text-danger border-danger/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
    info: 'bg-info/10 text-info border-info/30',
    secondary: 'bg-surface-container-high text-secondary border-outline-variant',
  }

  // Styles mapping to specific order statuses defined in tailwind.config.js
  const orderStatusClasses = {
    placed: 'bg-status-placed-bg text-status-placed-text border-status-placed-text/20',
    confirmed: 'bg-status-confirmed-bg text-status-confirmed-text border-status-confirmed-text/20',
    packed: 'bg-status-packed-bg text-status-packed-text border-status-packed-text/20',
    picked: 'bg-status-picked-bg text-status-picked-text border-status-picked-text/20',
    delivered: 'bg-status-delivered-bg text-status-delivered-text border-status-delivered-text/20',
    cancelled: 'bg-status-cancelled-bg text-status-cancelled-text border-status-cancelled-text/20',
  }

  // Choose stylesheet depending on variant key
  const finalBadgeClasses =
    orderStatusClasses[variant.toLowerCase()] ||
    semanticClasses[variant.toLowerCase()] ||
    semanticClasses.secondary

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-label-sm font-semibold tracking-wide capitalize shrink-0 ${finalBadgeClasses} ${className}`}
    >
      {children}
    </span>
  )
}
