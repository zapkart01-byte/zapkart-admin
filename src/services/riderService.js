import { supabase } from './supabase'
import { authenticatedFetch } from './authService'
import { queryWithTimeout } from '../utils/queryWithTimeout'

/**
 * ZapKart Rider Management Service
 * All rider CRUD operations and admin actions for the admin dashboard.
 */

// Fetches paginated riders with optional status and search filters
export async function getRiders({ status, search, page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('riders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    if (status === 'online') {
      query = query.eq('is_online', true)
    } else {
      query = query.eq('status', status)
    }
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,vehicle_number.ilike.%${search}%`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await queryWithTimeout(query)
  if (error) throw new Error(`Failed to fetch riders: ${error.message}`)
  return { riders: data, total: count, page, pageSize }
}

// Fetches a single rider by ID with associated documents
export async function getRiderById(id) {
  const { data, error } = await supabase
    .from('riders')
    .select('*, rider_documents(*)')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch rider: ${error.message}`)
  return data
}

// Updates rider status and records the action in the audit log
export async function updateRiderStatus(id, status, adminId) {
  const { data: rider, error: fetchError } = await supabase
    .from('riders')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError) throw new Error(`Failed to fetch rider: ${fetchError.message}`)

  const oldStatus = rider.status

  const { data, error } = await supabase
    .from('riders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update rider status: ${error.message}`)

  // Determines the audit action based on the new status
  const actionMap = {
    active: 'APPROVE_RIDER_KYC',
    suspended: 'SUSPEND_RIDER',
    pending_kyc: 'REJECT_RIDER_KYC',
  }

  await supabase.from('audit_log').insert({
    admin_id: adminId,
    action: actionMap[status] || `UPDATE_RIDER_STATUS_${status.toUpperCase()}`,
    target_type: 'rider',
    target_id: id,
    old_value: { status: oldStatus },
    new_value: { status },
  })

  return data
}

// Fetches aggregated delivery statistics for a specific rider
export async function getRiderStats(id) {
  const { data: rider, error } = await supabase
    .from('riders')
    .select('total_deliveries, total_earnings, cod_balance, weekly_delivery_earnings, rating')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch rider stats: ${error.message}`)
  return rider
}

// Fetches all KYC documents for a specific rider
export async function getRiderDocuments(riderId) {
  const { data, error } = await supabase
    .from('rider_documents')
    .select('*')
    .eq('rider_id', riderId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch rider documents: ${error.message}`)
  return data
}

// Updates the verification status of a rider document
export async function verifyRiderDocument(docId, verified) {
  const { data, error } = await supabase
    .from('rider_documents')
    .update({ verified })
    .eq('id', docId)
    .select()
    .single()

  if (error) throw new Error(`Failed to verify document: ${error.message}`)
  return data
}

// Updates rider fields (e.g., vehicle_type, vehicle_number)
export async function updateRider(id, updates) {
  const { data, error } = await supabase
    .from('riders')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update rider: ${error.message}`)
  return data
}

// Reconciles (settles) rider COD balance by collecting cash
export async function reconcileRiderCOD(riderId, amountCollected, adminId) {
  // 1. Fetch current rider COD balance
  const { data: rider, error: fetchError } = await supabase
    .from('riders')
    .select('cod_balance')
    .eq('id', riderId)
    .single()

  if (fetchError) throw new Error(`Failed to fetch rider balance: ${fetchError.message}`)

  const oldBalance = rider.cod_balance || 0
  const newBalance = Math.max(0, oldBalance - amountCollected)

  // 2. Fetch platform settings for COD limit
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('max_cod_balance_per_rider')
    .limit(1)
    .single()

  const maxLimit = settings?.max_cod_balance_per_rider || 2000
  const limitReached = newBalance >= maxLimit

  // 3. Update rider COD balance and status flag
  const { data, error } = await supabase
    .from('riders')
    .update({
      cod_balance: newBalance,
      cod_limit_reached: limitReached
    })
    .eq('id', riderId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update rider COD: ${error.message}`)

  // 4. Record action in audit log
  await supabase.from('audit_log').insert({
    admin_id: adminId,
    action: 'RECONCILE_RIDER_COD',
    target_type: 'rider',
    target_id: riderId,
    old_value: { cod_balance: oldBalance },
    new_value: { cod_balance: newBalance, amount_reconciled: amountCollected }
  })

  return data
}

// Creates a new rider record from the admin panel via the secure backend API
export async function createRider(riderData) {
  const response = await authenticatedFetch('/riders', {
    method: 'POST',
    body: JSON.stringify({
      name: riderData.name?.trim(),
      phone: riderData.phone?.trim(),
      vehicle_type: riderData.vehicle_type || 'motorcycle',
      vehicle_number: riderData.vehicle_number?.trim() || undefined,
    }),
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.message || 'Failed to create rider')
  }
  return json
}
