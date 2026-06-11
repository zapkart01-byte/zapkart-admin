import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, User, Store, Bike, MapPin,
  CreditCard, Calendar, Hash, Phone, Package, Tag,
  ChevronRight, Loader, AlertCircle, UserCheck,
} from 'lucide-react'
import { supabase } from '../services/supabase'
import { getOrderById, getOrderTimeline, assignRider, updateOrderStatus } from '../services/orderService'
import { formatCurrency, formatDateTime, formatPhone } from '../utils/formatters'
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../constants/orderStatuses'
import OrderStatusBadge from '../components/orders/OrderStatusBadge'
import OrderTimeline from '../components/orders/OrderTimeline'
import RiderAssignDropdown from '../components/orders/RiderAssignDropdown'
import Skeleton from '../components/ui/Skeleton'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'

/**
 * OrderDetailPage — full order view with financial breakdown, status timeline,
 * delivery address, and admin actions (assign rider, cancel order).
 */
export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Core order data
  const [order, setOrder] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // UI state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignError, setAssignError] = useState(null)
  const [assignSuccess, setAssignSuccess] = useState(false)

  // Loads full order data and timeline together
  const fetchOrder = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [orderData, timelineData] = await Promise.all([
        getOrderById(id),
        getOrderTimeline(id),
      ])
      setOrder(orderData)
      setTimeline(timelineData)
    } catch (err) {
      setError(err.message || 'Failed to load order details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  // Supabase realtime — auto-refresh if this specific order is updated
  useEffect(() => {
    const channel = supabase
      .channel(`order-detail-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        () => fetchOrder()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, fetchOrder])

  // Assigns a rider to this order via the order service
  async function handleAssignRider(riderId) {
    setAssignError(null)
    try {
      await assignRider(id, riderId)
      setAssignSuccess(true)
      setShowAssignModal(false)
      fetchOrder()
    } catch (err) {
      setAssignError(err.message || 'Failed to assign rider.')
    }
  }

  // Interactive Order Workflow states
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Triggers order status transition
  async function handleStatusUpdate(nextStatus) {
    setUpdatingStatus(true)
    try {
      await updateOrderStatus(id, nextStatus)
      toast.success(`Order moved to status: ${nextStatus.toUpperCase()}`)
      fetchOrder()
    } catch (err) {
      toast.error(`Failed to update status: ${err.message}`)
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Cancels the order with a reason
  async function handleCancelOrder() {
    if (!cancelReason.trim()) {
      toast.error('Cancellation reason is required')
      return
    }
    setUpdatingStatus(true)
    try {
      await updateOrderStatus(id, 'cancelled')
      // Update cancellation reason in Supabase
      await supabase
        .from('orders')
        .update({ cancellation_reason: cancelReason })
        .eq('id', id)
      
      toast.success('Order cancelled successfully')
      setShowCancelModal(false)
      fetchOrder()
    } catch (err) {
      toast.error(`Cancellation failed: ${err.message}`)
    } finally {
      setUpdatingStatus(false)
      setCancelReason('')
    }
  }

  // ─── LOADING ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="w-48 h-7 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // ─── ERROR ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-lg font-semibold text-on-surface">Failed to load order</p>
        <p className="text-sm text-secondary">{error}</p>
        <button
          onClick={fetchOrder}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  if (!order) return null

  // ─── DERIVED DATA ─────────────────────────────────────────────────────────

  const customerName = order.customers?.name || 'Guest Customer'
  const customerPhone = order.customers?.phone || '—'
  const storeName = order.stores?.store_name || '—'
  const storePhone = order.stores?.owner_phone || '—'
  const riderName = order.riders?.name || null
  const riderPhone = order.riders?.phone || null
  const address = order.delivery_address || {}
  const paymentMethodLabel = PAYMENT_METHODS[order.payment_method]?.label || order.payment_method
  const paymentStatusConfig = PAYMENT_STATUSES[order.payment_status] || {}
  const isCancellable = !['delivered', 'cancelled'].includes(order.status)
  const canAssignRider = ['placed', 'confirmed', 'packed'].includes(order.status) && !order.rider_id

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Back + header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 rounded-lg border border-border bg-white text-secondary hover:bg-surface transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-on-surface font-mono">
                #{order.id.slice(-8).toUpperCase()}
              </h1>
              <OrderStatusBadge status={order.status} />
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: paymentStatusConfig.bg || '#F3F4F6',
                  color: paymentStatusConfig.text || '#6B7280',
                  borderColor: `${paymentStatusConfig.text || '#6B7280'}30`,
                }}
              >
                {paymentStatusConfig.label || order.payment_status}
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Placed on {formatDateTime(order.created_at)}
            </p>
          </div>
        </div>

        {/* Refresh */}
        <button
          onClick={fetchOrder}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white text-secondary hover:bg-surface text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Success feedback */}
      {assignSuccess && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm font-medium">
          <UserCheck className="w-4 h-4 shrink-0" />
          Rider assigned successfully!
          <button
            onClick={() => setAssignSuccess(false)}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Order Items */}
          <section className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Package className="w-4 h-4 text-brand" />
              <h2 className="font-semibold text-on-surface">Order Items</h2>
            </div>
            <OrderItemsSection orderId={order.id} />
          </section>

          {/* Financial breakdown */}
          <section className="bg-white rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <CreditCard className="w-4 h-4 text-brand" />
              <h2 className="font-semibold text-on-surface">Financial Breakdown</h2>
            </div>
            <div className="p-5 space-y-3">
              <PricingRow label="Cart Subtotal" value={formatCurrency(order.subtotal)} />
              <PricingRow label="Delivery Fee" value={formatCurrency(order.delivery_fee)} />
              {order.discount_amount > 0 && (
                <PricingRow
                  label="Discount"
                  value={`-${formatCurrency(order.discount_amount)}`}
                  valueClass="text-green-600"
                />
              )}
              <div className="border-t border-border pt-3">
                <PricingRow
                  label="Customer Pays"
                  value={formatCurrency(order.total)}
                  labelClass="font-bold text-on-surface"
                  valueClass="font-bold text-on-surface text-base"
                />
              </div>
              <div className="bg-surface rounded-lg p-3 mt-2 space-y-2">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">
                  Platform Earnings
                </p>
                <PricingRow
                  label="Commission (18%)"
                  value={formatCurrency(order.commission_amount)}
                  labelClass="text-sm text-secondary"
                  valueClass="text-sm text-on-surface"
                />
                <PricingRow
                  label="Rider Payout"
                  value={`-${formatCurrency(order.rider_payout)}`}
                  labelClass="text-sm text-secondary"
                  valueClass="text-sm text-red-600"
                />
                <PricingRow
                  label="Store Receives"
                  value={`-${formatCurrency(order.subtotal - order.commission_amount)}`}
                  labelClass="text-sm text-secondary"
                  valueClass="text-sm text-secondary"
                />
                <div className="border-t border-border pt-2">
                  <PricingRow
                    label="ZapKart Net Profit"
                    value={formatCurrency(order.zapkart_net_profit)}
                    labelClass="text-sm font-semibold text-brand"
                    valueClass="text-sm font-bold text-brand"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Delivery address */}
          <section className="bg-white rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <MapPin className="w-4 h-4 text-brand" />
              <h2 className="font-semibold text-on-surface">Delivery Address</h2>
            </div>
            <div className="p-5">
              {address.label && (
                <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-1">
                  {address.label}
                </p>
              )}
              <p className="text-sm text-on-surface font-medium">
                {address.line1 || address.address || '—'}
              </p>
              {address.line2 && <p className="text-sm text-secondary">{address.line2}</p>}
              <p className="text-sm text-secondary">
                {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
              </p>
              {(address.lat && address.lng) && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${address.lat}&mlon=${address.lng}#map=17/${address.lat}/${address.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-brand hover:underline"
                >
                  <MapPin className="w-3.5 h-3.5" /> View on Map
                </a>
              )}
            </div>
          </section>

          {/* People cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Customer */}
            <PersonCard
              icon={User}
              label="Customer"
              name={customerName}
              phone={customerPhone}
              linkTo={null}
            />
            {/* Store */}
            <PersonCard
              icon={Store}
              label="Store"
              name={storeName}
              phone={storePhone}
              linkTo={order.store_id ? `/stores/${order.store_id}` : null}
            />
            {/* Rider */}
            {riderName ? (
              <PersonCard
                icon={Bike}
                label="Rider"
                name={riderName}
                phone={riderPhone || '—'}
                linkTo={order.rider_id ? `/riders/${order.rider_id}` : null}
              />
            ) : (
              <div className="bg-white rounded-xl border border-border p-4 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                  <Bike className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Rider</p>
                  <p className="text-sm text-secondary mt-0.5">No rider assigned yet</p>
                </div>
                {canAssignRider && (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="text-xs font-semibold text-brand border border-brand/30 rounded-lg px-3 py-1.5 hover:bg-brand/10 transition-colors"
                  >
                    Assign Rider
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT COLUMN ────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Order Timeline */}
          <section className="bg-white rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Calendar className="w-4 h-4 text-brand" />
              <h2 className="font-semibold text-on-surface">Status Timeline</h2>
            </div>
            <div className="p-5">
              <OrderTimeline timeline={timeline} currentStatus={order.status} />
            </div>
          </section>

          {/* Order meta */}
          <section className="bg-white rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Hash className="w-4 h-4 text-brand" />
              <h2 className="font-semibold text-on-surface">Order Info</h2>
            </div>
            <div className="p-5 space-y-3">
              <MetaRow label="Order ID" value={order.id.toUpperCase()} mono />
              <MetaRow label="Payment Method" value={paymentMethodLabel} />
              <MetaRow
                label="Payment Status"
                value={paymentStatusConfig.label || order.payment_status}
              />
              <MetaRow
                label="COD Submitted"
                value={order.cod_submitted ? 'Yes' : 'No'}
              />
              {order.cancellation_reason && (
                <div>
                  <p className="text-xs text-secondary mb-1">Cancellation Reason</p>
                  <p className="text-sm text-red-600 font-medium">{order.cancellation_reason}</p>
                </div>
              )}
            </div>
          </section>

          {/* Admin actions */}
          <section className="bg-white rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Tag className="w-4 h-4 text-brand" />
              <h2 className="font-semibold text-on-surface">Order Workflow Simulator</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-border">
                <p className="text-xs text-secondary font-semibold uppercase tracking-wider">Current Lifecycle Stage</p>
                <p className="text-sm font-bold text-on-surface mt-1 uppercase">{order.status}</p>
              </div>

              <div className="flex flex-col gap-2">
                {/* 1. Placed -> Confirmed */}
                {order.status === 'placed' && (
                  <Button
                    variant="primary"
                    onClick={() => handleStatusUpdate('confirmed')}
                    isLoading={updatingStatus}
                    className="w-full flex items-center justify-center gap-2 h-11 text-sm font-semibold"
                  >
                    Confirm & Accept Order
                  </Button>
                )}

                {/* 2. Confirmed -> Packed */}
                {order.status === 'confirmed' && (
                  <Button
                    variant="primary"
                    onClick={() => handleStatusUpdate('packed')}
                    isLoading={updatingStatus}
                    className="w-full flex items-center justify-center gap-2 h-11 text-sm font-semibold"
                  >
                    Mark as Packed & Ready
                  </Button>
                )}

                {/* 3. Packed -> Assign Rider OR Picked */}
                {order.status === 'packed' && (
                  <>
                    {!order.rider_id ? (
                      <Button
                        variant="primary"
                        onClick={() => setShowAssignModal(true)}
                        className="w-full flex items-center justify-center gap-2 h-11 text-sm font-semibold"
                      >
                        <UserCheck className="w-4 h-4" /> Assign Rider to Dispatch
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => handleStatusUpdate('picked')}
                        isLoading={updatingStatus}
                        className="w-full flex items-center justify-center gap-2 h-11 text-sm font-semibold"
                      >
                        Confirm Rider Picked Up
                      </Button>
                    )}
                  </>
                )}

                {/* 4. Picked -> Out for Delivery */}
                {order.status === 'picked' && (
                  <Button
                    variant="primary"
                    onClick={() => handleStatusUpdate('out_for_delivery')}
                    isLoading={updatingStatus}
                    className="w-full flex items-center justify-center gap-2 h-11 text-sm font-semibold"
                  >
                    Set as Out for Delivery
                  </Button>
                )}

                {/* 5. Out for Delivery -> Delivered */}
                {order.status === 'out_for_delivery' && (
                  <Button
                    variant="primary"
                    onClick={() => handleStatusUpdate('delivered')}
                    isLoading={updatingStatus}
                    className="w-full flex items-center justify-center gap-2 h-11 text-sm font-semibold"
                  >
                    Mark as Successfully Delivered
                  </Button>
                )}

                {/* Re-assign rider option if already assigned but not delivered */}
                {['packed', 'picked', 'out_for_delivery'].includes(order.status) && order.rider_id && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAssignModal(true)}
                    className="w-full flex items-center justify-center gap-2 h-10 text-xs font-semibold"
                  >
                    Re-assign Rider
                  </Button>
                )}

                {/* Status completion screen info */}
                {order.status === 'delivered' && (
                  <div className="bg-green-50 text-green-800 text-xs font-medium p-3 rounded-lg border border-green-200 text-center">
                    🎉 This order is completed and successfully delivered. Payouts have been calculated!
                  </div>
                )}
                {order.status === 'cancelled' && (
                  <div className="bg-red-50 text-red-800 text-xs font-medium p-3 rounded-lg border border-red-200 text-center">
                    ❌ This order is cancelled. Check cancellation reason details.
                  </div>
                )}

                {/* Cancellation trigger */}
                {isCancellable && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelModal(true)}
                    className="w-full flex items-center justify-center gap-2 h-10 text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Rider assign modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setAssignError(null) }}
        title="Assign Rider"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Select an active rider to assign to order{' '}
            <span className="font-mono font-semibold text-on-surface">
              #{order.id.slice(-8).toUpperCase()}
            </span>
          </p>
          {assignError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {assignError}
            </div>
          )}
          <RiderAssignDropdown
            currentRiderId={order.rider_id}
            onAssign={handleAssignRider}
          />
        </div>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setCancelReason('') }}
        title="Cancel Order"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Are you sure you want to cancel order{' '}
            <span className="font-mono font-semibold text-on-surface">
              #{order.id.slice(-8).toUpperCase()}
            </span>? This action is permanent.
          </p>
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1">Reason for Cancellation</label>
            <textarea
              className="w-full border border-border rounded-lg p-2.5 text-body-md outline-none focus:ring-1 focus:ring-red-500 min-h-[80px]"
              placeholder="e.g. Store out of stock, customer requested, no riders available..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <div className="flex gap-md pt-md">
            <Button
              variant="outline"
              onClick={() => { setShowCancelModal(false); setCancelReason('') }}
              className="flex-1 font-semibold"
            >
              Back
            </Button>
            <Button
              variant="danger"
              onClick={handleCancelOrder}
              isLoading={updatingStatus}
              className="flex-1 font-semibold"
            >
              Cancel Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

// Fetches and displays the order line items from supabase (orders don't store items inline — fetched separately)
function OrderItemsSection({ orderId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadItems() {
      try {
        const { data, error: fetchError } = await supabase
          .from('order_items')
          .select('*, products:product_id(name, unit, image_url)')
          .eq('order_id', orderId)

        if (fetchError) throw fetchError
        setItems(data || [])
      } catch (err) {
        // order_items table may not exist in schema yet — show graceful fallback
        setError('Order items not available.')
      } finally {
        setLoading(false)
      }
    }
    loadItems()
  }, [orderId])

  if (loading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error || items.length === 0) {
    return (
      <div className="p-5 text-center text-secondary text-sm">
        {error || 'No item details stored for this order.'}
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 px-5 py-3">
          {item.products?.image_url ? (
            <img
              src={item.products.image_url}
              alt={item.products?.name}
              className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-secondary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-surface truncate">
              {item.products?.name || 'Product'}
            </p>
            <p className="text-xs text-secondary">
              {item.products?.unit} × {item.quantity}
            </p>
          </div>
          <p className="text-sm font-semibold text-on-surface shrink-0">
            {formatCurrency(item.price * item.quantity)}
          </p>
        </div>
      ))}
    </div>
  )
}

// Renders a label/value row in the pricing or meta sections
function PricingRow({ label, value, labelClass = '', valueClass = '' }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className={`text-sm text-secondary ${labelClass}`}>{label}</p>
      <p className={`text-sm font-semibold text-on-surface ${valueClass}`}>{value}</p>
    </div>
  )
}

// Renders a single meta key/value row in Order Info
function MetaRow({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs text-secondary">{label}</p>
      <p className={`text-sm text-on-surface mt-0.5 ${mono ? 'font-mono text-xs break-all' : 'font-medium'}`}>
        {value || '—'}
      </p>
    </div>
  )
}

// Renders a person card (customer, store, rider) with optional link
function PersonCard({ icon: Icon, label, name, phone, linkTo }) {
  const Wrapper = linkTo ? Link : 'div'
  const wrapperProps = linkTo ? { to: linkTo } : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={`bg-white rounded-xl border border-border p-4 shadow-sm flex items-start gap-3 ${
        linkTo ? 'hover:border-brand/30 hover:shadow-md transition-all cursor-pointer group' : ''
      }`}
    >
      <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{label}</p>
        <p className="text-sm font-semibold text-on-surface mt-0.5 truncate">{name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Phone className="w-3 h-3 text-secondary" />
          <p className="text-xs text-secondary">{formatPhone(phone)}</p>
        </div>
      </div>
      {linkTo && (
        <ChevronRight className="w-4 h-4 text-secondary group-hover:text-brand transition-colors shrink-0 mt-0.5" />
      )}
    </Wrapper>
  )
}
