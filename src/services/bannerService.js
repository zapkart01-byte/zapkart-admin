import { supabase } from './supabase'
import { queryWithTimeout } from '../utils/queryWithTimeout'

/**
 * ZapKart Banner Management Service
 * CRUD operations for promotional banners displayed in the customer app.
 */

// Fetches all banners sorted by their display order
export async function getBanners() {
  const { data, error } = await queryWithTimeout(
    supabase
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true })
  )

  if (error) throw new Error(`Failed to fetch banners: ${error.message}`)
  return data
}

// Fetches a single banner by its ID
export async function getBannerById(id) {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch banner: ${error.message}`)
  return data
}

// Creates a new promotional banner
export async function createBanner(bannerData) {
  const { data, error } = await supabase
    .from('banners')
    .insert(bannerData)
    .select()
    .single()

  if (error) throw new Error(`Failed to create banner: ${error.message}`)
  return data
}

// Updates an existing banner's fields
export async function updateBanner(id, bannerData) {
  const { data, error } = await supabase
    .from('banners')
    .update(bannerData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update banner: ${error.message}`)
  return data
}

// Deletes a banner permanently from the database
export async function deleteBanner(id) {
  const { error } = await supabase
    .from('banners')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete banner: ${error.message}`)
  return true
}

// Updates the sort order of all banners for drag-and-drop reordering
export async function reorderBanners(orderedIds) {
  const updates = orderedIds.map((id, index) => ({
    id,
    sort_order: index + 1,
  }))

  for (const update of updates) {
    const { error } = await supabase
      .from('banners')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id)

    if (error) throw new Error(`Failed to reorder banners: ${error.message}`)
  }

  return true
}
