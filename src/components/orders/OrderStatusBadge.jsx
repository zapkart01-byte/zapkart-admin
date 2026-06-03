import React from 'react'
import { ORDER_STATUSES } from '../../constants/orderStatuses'

/**
 * OrderStatusBadge — renders a pill badge with the exact PRD color for each order status.
 */
export default function OrderStatusBadge({ status, className = '' }) {
  // Look up the status config; fall back gracefully for unknown values
  const config = ORDER_STATUSES[status] || {
    label: status || 'Unknown',
    bg: '#F3F4F6',
    text: '#6B7280',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize shrink-0 ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderColor: `${config.text}30`,
      }}
    >
      {config.label}
    </span>
  )
}
