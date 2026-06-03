import { supabase } from './supabase'
import { authenticatedFetch } from './authService'

/**
 * ZapKart Finance & Payout Service
 * Manages weekly settlements, payout records, and COD reconciliation.
 */

// Fetches paginated payouts with optional recipient type and status filters
export async function getPayouts({ recipientType, status, page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('payouts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (recipientType && recipientType !== 'all') {
    query = query.eq('recipient_type', recipientType)
  }

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to fetch payouts: ${error.message}`)
  return { payouts: data, total: count, page, pageSize }
}

// Fetches a single payout record by its ID
export async function getPayoutById(id) {
  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch payout: ${error.message}`)
  return data
}

// Triggers the weekly settlement process via the backend API
export async function initiateSettlement(adminId) {
  const response = await authenticatedFetch('/finance/settlement/run', {
    method: 'POST',
    body: JSON.stringify({ adminId }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to initiate settlement')
  }

  return response.json()
}

// Updates a payout's status and bank reference after processing
export async function updatePayoutStatus(id, status, bankRef) {
  const updateData = { status }

  if (bankRef) {
    updateData.bank_reference = bankRef
  }

  if (status === 'processed') {
    updateData.processed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('payouts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update payout status: ${error.message}`)
  return data
}

// Fetches COD balance summary across all active riders for reconciliation
export async function getCODReconciliation() {
  const { data, error } = await supabase
    .from('riders')
    .select('id, name, phone, cod_balance, cod_limit_reached, weekly_delivery_earnings')
    .eq('status', 'active')
    .gt('cod_balance', 0)
    .order('cod_balance', { ascending: false })

  if (error) throw new Error(`Failed to fetch COD reconciliation: ${error.message}`)
  return data
}

// Fetches aggregated finance summary including totals and pending amounts
export async function getFinanceSummary() {
  const [payoutsResult, ridersResult] = await Promise.all([
    supabase.from('payouts').select('net_amount, status, recipient_type'),
    supabase.from('riders').select('cod_balance').eq('status', 'active'),
  ])

  if (payoutsResult.error) throw new Error(`Failed to fetch finance summary: ${payoutsResult.error.message}`)
  if (ridersResult.error) throw new Error(`Failed to fetch rider COD data: ${ridersResult.error.message}`)

  const payouts = payoutsResult.data
  const totalPaidOut = payouts
    .filter((p) => p.status === 'processed')
    .reduce((sum, p) => sum + (p.net_amount || 0), 0)
  const totalPending = payouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + (p.net_amount || 0), 0)
  const totalCODBalance = ridersResult.data.reduce((sum, r) => sum + (r.cod_balance || 0), 0)

  return {
    totalPaidOut,
    totalPending,
    totalCODBalance,
    totalPayouts: payouts.length,
    storePayouts: payouts.filter((p) => p.recipient_type === 'store').length,
    riderPayouts: payouts.filter((p) => p.recipient_type === 'rider').length,
  }
}
