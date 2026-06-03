import { supabase } from './supabase'
import { queryWithTimeout } from '../utils/queryWithTimeout'

/**
 * ZapKart Store Management Service
 * All store CRUD operations and admin actions for the admin dashboard.
 */

// Fetches paginated stores with optional status and search filters
export async function getStores({ status, search, page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('stores')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(`store_name.ilike.%${search}%,owner_name.ilike.%${search}%,owner_phone.ilike.%${search}%`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await queryWithTimeout(query)
  if (error) throw new Error(`Failed to fetch stores: ${error.message}`)
  return { stores: data, total: count, page, pageSize }
}

// Fetches a single store by ID with its associated documents
export async function getStoreById(id) {
  const { data, error } = await supabase
    .from('stores')
    .select('*, store_documents(*)')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch store: ${error.message}`)
  return data
}

// Updates store status and records the action in the audit log
export async function updateStoreStatus(id, status, adminId) {
  const { data: store, error: fetchError } = await supabase
    .from('stores')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError) throw new Error(`Failed to fetch store: ${fetchError.message}`)

  const oldStatus = store.status

  const { data, error } = await supabase
    .from('stores')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update store status: ${error.message}`)

  // Determines the audit action based on the new status
  const actionMap = {
    active: 'APPROVE_STORE',
    suspended: 'SUSPEND_STORE',
    closed: 'REJECT_STORE',
  }

  await supabase.from('audit_log').insert({
    admin_id: adminId,
    action: actionMap[status] || `UPDATE_STORE_STATUS_${status.toUpperCase()}`,
    target_type: 'store',
    target_id: id,
    old_value: { status: oldStatus },
    new_value: { status },
  })

  return data
}

// Fetches aggregated statistics for a specific store
export async function getStoreStats(id) {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('subtotal, status')
    .eq('store_id', id)

  if (error) throw new Error(`Failed to fetch store stats: ${error.message}`)

  const totalOrders = orders.length
  const deliveredOrders = orders.filter((o) => o.status === 'delivered')
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0)

  return { totalOrders, deliveredOrders: deliveredOrders.length, totalRevenue }
}

// Fetches all KYC documents for a specific store
export async function getStoreDocuments(storeId) {
  const { data, error } = await supabase
    .from('store_documents')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch store documents: ${error.message}`)
  return data
}

// Updates the verification status of a store document
export async function verifyStoreDocument(docId, verified) {
  const { data, error } = await supabase
    .from('store_documents')
    .update({ verified })
    .eq('id', docId)
    .select()
    .single()

  if (error) throw new Error(`Failed to verify document: ${error.message}`)
  return data
}

// Updates store fields (e.g., commission_rate, delivery_radius)
export async function updateStore(id, updates) {
  const { data, error } = await supabase
    .from('stores')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update store: ${error.message}`)
  return data
}

// Creates a new store record from the admin panel
export async function createStore(storeData) {
  const payload = {
    owner_name: storeData.owner_name?.trim(),
    owner_phone: storeData.owner_phone?.trim(),
    store_name: storeData.store_name?.trim(),
    store_type: storeData.store_type || 'grocery',
    address: storeData.address?.trim() || '',
    lat: storeData.lat ?? 12.9716,
    lng: storeData.lng ?? 77.5946,
    delivery_radius_km: storeData.delivery_radius_km ?? 2,
    gstin: storeData.gstin?.trim() || null,
    bank_account: storeData.bank_account?.trim() || null,
    bank_ifsc: storeData.bank_ifsc?.trim() || 'SBIN0000000',
    status: storeData.status || 'pending',
    rating: 5.0,
    total_orders: 0,
    commission_rate: storeData.commission_rate ?? 0.18,
    is_open: false,
    cancellation_count: 0,
  }

  const { data, error } = await supabase
    .from('stores')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`Failed to create store: ${error.message}`)
  return data
}

