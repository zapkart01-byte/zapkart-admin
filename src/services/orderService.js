import { supabase } from './supabase'
import { authenticatedFetch } from './authService'

/**
 * ZapKart Order Management Service
 * Order queries go to Supabase directly, status updates go via backend API.
 */

// Fetches paginated orders with optional status, date, store, and search filters
export async function getOrders({ status, storeId, dateFrom, dateTo, search, page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('orders')
    .select('*, stores:store_id(store_name), customers:customer_id(name, phone), riders:rider_id(name, phone)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  if (search) {
    query = query.or(`id.ilike.%${search}%`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to fetch orders: ${error.message}`)
  return { orders: data, total: count, page, pageSize }
}

// Fetches a single order by ID with joined customer, store, and rider data
export async function getOrderById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, stores:store_id(*), customers:customer_id(*), riders:rider_id(*)')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch order: ${error.message}`)
  return data
}

// Updates order status via the backend API (never directly in Supabase)
export async function updateOrderStatus(id, status) {
  const response = await authenticatedFetch(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to update order status')
  }

  return response.json()
}

// Assigns a rider to an order via the backend API
export async function assignRider(orderId, riderId) {
  const response = await authenticatedFetch(`/orders/${orderId}/assign-rider`, {
    method: 'POST',
    body: JSON.stringify({ riderId }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to assign rider')
  }

  return response.json()
}

// Retrieves the timestamp history for each status change of an order
export async function getOrderTimeline(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('created_at, store_confirmed_at, rider_accepted_at, picked_up_at, delivered_at, status, cancellation_reason')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch order timeline: ${error.message}`)

  return {
    placed: data.created_at,
    confirmed: data.store_confirmed_at,
    picked: data.rider_accepted_at,
    out_for_delivery: data.picked_up_at,
    delivered: data.delivered_at,
    status: data.status,
    cancellationReason: data.cancellation_reason,
  }
}

// Fetches the most recent orders for the dashboard live feed
export async function getRecentOrders(limit = 10) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, stores:store_id(store_name), customers:customer_id(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch recent orders: ${error.message}`)
  return data
}
