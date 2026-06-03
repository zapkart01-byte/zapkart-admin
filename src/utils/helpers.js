/**
 * ZapKart General Helper Utilities
 */

// Extracts initials from a full name (e.g., "Rahul Sharma" → "RS")
export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

// Returns the background and text color for an order status badge
export function getStatusColor(status) {
  const colors = {
    placed: { bg: '#DBEAFE', text: '#1D4ED8' },
    confirmed: { bg: '#F5F3FF', text: '#7C3AED' },
    packed: { bg: '#FEF3C7', text: '#D97706' },
    picked: { bg: '#FFF0E6', text: '#FF6B00' },
    out_for_delivery: { bg: '#FFF0E6', text: '#FF6B00' },
    delivered: { bg: '#DCFCE7', text: '#16A34A' },
    cancelled: { bg: '#FEE2E2', text: '#EF4444' },
  }
  return colors[status] || { bg: '#F3F4F5', text: '#6B7280' }
}

// Returns the background and text color for a store/rider status badge
export function getEntityStatusColor(status) {
  const colors = {
    pending: { bg: '#FEF3C7', text: '#D97706' },
    pending_kyc: { bg: '#FEF3C7', text: '#D97706' },
    active: { bg: '#DCFCE7', text: '#16A34A' },
    suspended: { bg: '#FEE2E2', text: '#EF4444' },
    closed: { bg: '#F3F4F5', text: '#6B7280' },
  }
  return colors[status] || { bg: '#F3F4F5', text: '#6B7280' }
}

// Creates a debounced version of a function that delays invocation
export function debounce(fn, delay = 300) {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Generates a short unique identifier for client-side use
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// Determines the distance band label for rider payout calculation
export function getDistanceBand(distanceKm) {
  if (distanceKm < 2) return 'under_2km'
  if (distanceKm < 4) return '2_to_4km'
  return 'above_4km'
}

// Formats a status string from snake_case to Title Case for display
export function formatStatusLabel(status) {
  if (!status) return '—'
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Builds a query string from an object of filter parameters
export function buildQueryParams(params) {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== null && value !== undefined && value !== ''
  )
  if (entries.length === 0) return ''
  return '?' + new URLSearchParams(entries).toString()
}

// Safely parses a JSON string, returning a fallback value on failure
export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

// Clamps a number between a minimum and maximum value
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
