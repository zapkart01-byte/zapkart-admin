import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  List, LayoutGrid, Search, RefreshCw, Filter,
  ShoppingBag, ChevronRight, User, Store, Bike, CreditCard, Clock,
} from 'lucide-react'
import { supabase } from '../services/supabase'
import { getOrders } from '../services/orderService'
import { ORDER_STATUSES, PAYMENT_METHODS } from '../constants/orderStatuses'
import { formatCurrency, formatDateTime, formatRelativeTime, truncateText } from '../utils/formatters'
import OrderStatusBadge from '../components/orders/OrderStatusBadge'
import OrderCard from '../components/orders/OrderCard'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'

/**
 * OrdersPage — full order management with togglable list and kanban views,
 * live status filters, search, date range, and Supabase realtime updates.
 */

// Kanban columns — the statuses to show as board columns (excludes delivered/cancelled to keep board lean)
const KANBAN_COLS = ['placed', 'confirmed', 'packed', 'picked', 'out_for_delivery']

// Rows shown per page in list view
const PAGE_SIZE = 20

export default function OrdersPage() {
  const navigate = useNavigate()

  // View mode: 'list' or 'kanban'
  const [viewMode, setViewMode] = useState('list')

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  // Data state
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Kanban orders grouped by status
  const [kanbanOrders, setKanbanOrders] = useState({})
  const [kanbanLoading, setKanbanLoading] = useState(false)
  const [kanbanError, setKanbanError] = useState(null)

  // Debounce ref for search
  const searchDebounce = useRef(null)

  // Fetches paginated orders for list view
  const fetchListOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getOrders({
        status: statusFilter,
        search: searchQuery,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      setOrders(result.orders || [])
      setTotal(result.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery, dateFrom, dateTo, page])

  // Fetches active orders for kanban view (no pagination; only active statuses)
  const fetchKanbanOrders = useCallback(async () => {
    setKanbanLoading(true)
    setKanbanError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(
          'id, status, total, payment_method, created_at, ' +
          'customers:customer_id(name), stores:store_id(store_name), riders:rider_id(name)'
        )
        .in('status', KANBAN_COLS)
        .order('created_at', { ascending: false })
        .limit(200)

      if (fetchError) throw fetchError

      // Group orders by status for column rendering
      const grouped = {}
      KANBAN_COLS.forEach((col) => { grouped[col] = [] })
      ;(data || []).forEach((o) => {
        if (grouped[o.status]) grouped[o.status].push(o)
      })
      setKanbanOrders(grouped)
    } catch (err) {
      setKanbanError(err.message || 'Failed to load kanban board.')
    } finally {
      setKanbanLoading(false)
    }
  }, [])

  // Load data when view mode or filters change
  useEffect(() => {
    if (viewMode === 'list') fetchListOrders()
    else fetchKanbanOrders()
  }, [viewMode, fetchListOrders, fetchKanbanOrders])

  // Reset page to 1 when filters change
  useEffect(() => { setPage(1) }, [statusFilter, searchQuery, dateFrom, dateTo])

  // Supabase realtime — refresh active view when orders table changes
  useEffect(() => {
    const channel = supabase
      .channel('orders-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (viewMode === 'list') fetchListOrders()
        else fetchKanbanOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [viewMode, fetchListOrders, fetchKanbanOrders])

  // Debounced search handler
  function handleSearchChange(e) {
    const val = e.target.value
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => setSearchQuery(val), 350)
  }

  // Total page count for pagination
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Orders</h1>
          <p className="text-sm text-secondary mt-0.5">
            {total > 0 ? `${total.toLocaleString('en-IN')} orders found` : 'All platform orders'}
          </p>
        </div>

        {/* View toggle + refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setViewMode('list'); setPage(1) }}
            className={`p-2 rounded-lg border transition-colors ${
              viewMode === 'list'
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-secondary border-border hover:bg-surface'
            }`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-lg border transition-colors ${
              viewMode === 'kanban'
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-secondary border-border hover:bg-surface'
            }`}
            title="Kanban view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => viewMode === 'list' ? fetchListOrders() : fetchKanbanOrders()}
            className="p-2 rounded-lg border border-border bg-white text-secondary hover:bg-surface transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-border p-4 space-y-3">
        {/* Search + date range */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
            <input
              type="text"
              defaultValue={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by order ID…"
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 bg-surface"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-secondary shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 bg-surface"
            />
            <span className="text-secondary text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 bg-surface"
            />
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              statusFilter === 'all'
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-secondary border-border hover:bg-surface'
            }`}
          >
            All
          </button>
          {Object.values(ORDER_STATUSES).map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
              style={
                statusFilter === s.key
                  ? { backgroundColor: s.text, color: '#fff', borderColor: s.text }
                  : { backgroundColor: s.bg, color: s.text, borderColor: `${s.text}40` }
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={fetchListOrders}
                className="mt-3 text-sm font-semibold text-brand underline"
              >
                Retry
              </button>
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No orders found"
              description="No orders match the current filters. Try adjusting the date range or status."
            />
          ) : (
            <>
              {/* Orders table */}
              <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
                {/* Desktop table header */}
                <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_0.7fr_1fr_40px] gap-4 px-5 py-3 bg-surface border-b border-border text-xs font-semibold text-secondary uppercase tracking-wide">
                  <span>Order</span>
                  <span>Customer</span>
                  <span>Store</span>
                  <span>Amount</span>
                  <span>Payment</span>
                  <span>Status</span>
                  <span>Time</span>
                  <span />
                </div>

                {/* Order rows */}
                <div className="divide-y divide-border">
                  {orders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      onClick={() => navigate(`/orders/${order.id}`)}
                    />
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </>
      )}

      {/* ── KANBAN VIEW ───────────────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <>
          {kanbanLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {KANBAN_COLS.map((col) => (
                <div key={col} className="space-y-3">
                  <Skeleton className="h-8 rounded-lg" />
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              ))}
            </div>
          ) : kanbanError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-600 font-medium">{kanbanError}</p>
              <button
                onClick={fetchKanbanOrders}
                className="mt-3 text-sm font-semibold text-brand underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 min-h-[60vh] items-start">
              {KANBAN_COLS.map((colKey) => {
                const config = ORDER_STATUSES[colKey]
                const colOrders = kanbanOrders[colKey] || []
                return (
                  <KanbanColumn
                    key={colKey}
                    config={config}
                    orders={colOrders}
                  />
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Order Row (List View) ─────────────────────────────────────────────────────

// Renders a single row in the list view table
function OrderRow({ order, onClick }) {
  const customerName = order.customers?.name || 'Guest Customer'
  const storeName = order.stores?.store_name || '—'
  const paymentLabel = PAYMENT_METHODS[order.payment_method]?.shortLabel || order.payment_method

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer hover:bg-surface transition-colors"
    >
      {/* Desktop row */}
      <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_0.7fr_1fr_40px] gap-4 px-5 py-3.5 items-center">
        <div>
          <p className="text-sm font-mono font-semibold text-on-surface group-hover:text-brand transition-colors">
            #{order.id.slice(-8).toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-3.5 h-3.5 text-secondary shrink-0" />
          <p className="text-sm text-on-surface truncate">{truncateText(customerName, 18)}</p>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Store className="w-3.5 h-3.5 text-secondary shrink-0" />
          <p className="text-sm text-secondary truncate">{truncateText(storeName, 18)}</p>
        </div>
        <p className="text-sm font-bold text-on-surface">{formatCurrency(order.total)}</p>
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-secondary" />
          <span className="text-xs text-secondary font-medium">{paymentLabel}</span>
        </div>
        <OrderStatusBadge status={order.status} />
        <div className="flex items-center gap-1.5 text-secondary">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs">{formatRelativeTime(order.created_at)}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-secondary group-hover:text-brand transition-colors" />
      </div>

      {/* Mobile card */}
      <div className="md:hidden px-4 py-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-mono font-semibold text-on-surface group-hover:text-brand transition-colors">
            #{order.id.slice(-8).toUpperCase()}
          </p>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-secondary">{truncateText(customerName, 22)}</p>
          <p className="text-sm font-bold text-on-surface">{formatCurrency(order.total)}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-secondary">{truncateText(storeName, 24)}</p>
          <p className="text-xs text-secondary">{formatRelativeTime(order.created_at)}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

// Renders a single kanban status column with its header and order cards
function KanbanColumn({ config, orders }) {
  return (
    <div className="space-y-3">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-lg"
        style={{ backgroundColor: config.bg }}
      >
        <span
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: config.text }}
        >
          {config.label}
        </span>
        <span
          className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: config.text, color: '#fff' }}
        >
          {orders.length}
        </span>
      </div>

      {/* Order cards */}
      <div className="space-y-2">
        {orders.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-secondary">No orders</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </div>
    </div>
  )
}
