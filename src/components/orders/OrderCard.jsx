import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, User, Store, Bike } from 'lucide-react'
import OrderStatusBadge from './OrderStatusBadge'
import { formatCurrency, formatRelativeTime, truncateText } from '../../utils/formatters'
import { PAYMENT_METHODS } from '../../constants/orderStatuses'

/**
 * OrderCard — compact card used in the kanban view to represent a single order.
 * Clicking navigates to the order detail page.
 */
export default function OrderCard({ order }) {
  const navigate = useNavigate()

  // Derives customer display name from joined data
  const customerName = order.customers?.name || 'Guest Customer'
  const storeName = order.stores?.store_name || '—'
  const riderName = order.riders?.name || null
  const paymentLabel = PAYMENT_METHODS[order.payment_method]?.shortLabel || order.payment_method

  return (
    <div
      onClick={() => navigate(`/orders/${order.id}`)}
      className="bg-white rounded-xl border border-border p-3 shadow-sm hover:shadow-md hover:border-brand/30 transition-all cursor-pointer group"
    >
      {/* Top row: order ID + payment badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-mono text-secondary group-hover:text-brand transition-colors truncate">
          #{order.id.slice(-8).toUpperCase()}
        </p>
        <span className="text-xs font-semibold bg-surface text-secondary px-2 py-0.5 rounded-full border border-border shrink-0">
          {paymentLabel}
        </span>
      </div>

      {/* Customer */}
      <div className="flex items-center gap-1.5 mb-1">
        <User className="w-3.5 h-3.5 text-secondary shrink-0" />
        <p className="text-sm font-semibold text-on-surface truncate">{truncateText(customerName, 22)}</p>
      </div>

      {/* Store */}
      <div className="flex items-center gap-1.5 mb-2">
        <Store className="w-3.5 h-3.5 text-secondary shrink-0" />
        <p className="text-xs text-secondary truncate">{truncateText(storeName, 24)}</p>
      </div>

      {/* Rider (if assigned) */}
      {riderName && (
        <div className="flex items-center gap-1.5 mb-2">
          <Bike className="w-3.5 h-3.5 text-brand shrink-0" />
          <p className="text-xs text-brand font-medium truncate">{truncateText(riderName, 22)}</p>
        </div>
      )}

      {/* Bottom row: total amount + relative time */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
        <p className="text-sm font-bold text-on-surface">{formatCurrency(order.total)}</p>
        <div className="flex items-center gap-1 text-secondary">
          <Clock className="w-3 h-3" />
          <span className="text-xs">{formatRelativeTime(order.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
