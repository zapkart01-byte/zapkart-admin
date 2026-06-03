import { supabase } from './supabase'
import { queryWithTimeout } from '../utils/queryWithTimeout'

/**
 * ZapKart Offer Management Service
 * CRUD operations for coupons and event sales managed by the admin.
 */

// Fetches all offers with optional type filter and pagination
export async function getOffers({ type, isActive, search, page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('offers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (type && type !== 'all') {
    query = query.eq('type', type)
  }

  if (isActive !== undefined && isActive !== null) {
    query = query.eq('is_active', isActive)
  }

  if (search) {
    query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await queryWithTimeout(query)
  if (error) throw new Error(`Failed to fetch offers: ${error.message}`)
  return { offers: data, total: count, page, pageSize }
}

// Fetches a single offer by its ID
export async function getOfferById(id) {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch offer: ${error.message}`)
  return data
}

// Creates a new coupon or event sale offer
export async function createOffer(offerData) {
  const { data, error } = await supabase
    .from('offers')
    .insert(offerData)
    .select()
    .single()

  if (error) throw new Error(`Failed to create offer: ${error.message}`)
  return data
}

// Updates an existing offer's fields
export async function updateOffer(id, offerData) {
  const { data, error } = await supabase
    .from('offers')
    .update(offerData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update offer: ${error.message}`)
  return data
}

// Toggles an offer's active status on or off
export async function toggleOfferStatus(id, isActive) {
  const { data, error } = await supabase
    .from('offers')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to toggle offer status: ${error.message}`)
  return data
}

// Soft-deletes an offer by deactivating it
export async function deleteOffer(id) {
  const { data, error } = await supabase
    .from('offers')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to delete offer: ${error.message}`)
  return data
}
