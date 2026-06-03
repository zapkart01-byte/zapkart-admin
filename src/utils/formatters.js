/**
 * ZapKart Formatting Utilities
 * All currency formatting uses INR (₹) — NEVER use $ dollar signs.
 */

// Formats a number as Indian Rupee currency with ₹ symbol
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Formats a number using the Indian numbering system (1,23,456)
export function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  return new Intl.NumberFormat('en-IN').format(num)
}

// Formats a date string into a localized Indian date (e.g., 29 May 2026)
export function formatDate(dateString) {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString))
}

// Formats a date string into a localized Indian time (e.g., 6:30 PM)
export function formatTime(dateString) {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(dateString))
}

// Formats a date string into both date and time (e.g., 29 May 2026, 6:30 PM)
export function formatDateTime(dateString) {
  if (!dateString) return '—'
  return `${formatDate(dateString)}, ${formatTime(dateString)}`
}

// Formats a phone number with Indian country code (e.g., +91 98765 43210)
export function formatPhone(phone) {
  if (!phone) return '—'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`
  }
  return phone
}

// Formats a date into relative time (e.g., "2 min ago", "1 hour ago")
export function formatRelativeTime(date) {
  if (!date) return '—'
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  return formatDate(date)
}

// Formats a large number with K/M/L/Cr suffixes for compact display
export function formatCompactNumber(num) {
  if (num === null || num === undefined) return '0'
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`
  return `₹${num}`
}

// Truncates a string to a maximum length with ellipsis
export function truncateText(text, maxLength = 30) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
