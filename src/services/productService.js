import { supabase } from './supabase'
import { queryWithTimeout } from '../utils/queryWithTimeout'
import { sendUserNotification } from './notificationService'

/**
 * ZapKart Product Management Service
 * Product queries and admin moderation actions for the admin dashboard.
 */

// Fetches paginated products with optional store, category, flagged, and search filters
export async function getProducts({ storeId, categoryId, isFlagged, search, page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('products')
    .select('*, stores:store_id(store_name), categories:category_id(name)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (isFlagged !== undefined && isFlagged !== null) {
    query = query.eq('is_flagged', isFlagged)
  }

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await queryWithTimeout(query)
  if (error) throw new Error(`Failed to fetch products: ${error.message}`)
  return { products: data, total: count, page, pageSize }
}

// Fetches a single product by ID with joined store information
export async function getProductById(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*, stores:store_id(*), categories:category_id(*)')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch product: ${error.message}`)
  return data
}

// Flags a product for review and records the action in the audit log
export async function flagProduct(id, reason, adminId) {
  const { data, error } = await supabase
    .from('products')
    .update({ is_flagged: true })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to flag product: ${error.message}`)

  await supabase.from('audit_log').insert({
    admin_id: adminId,
    action: 'FLAG_PRODUCT',
    target_type: 'product',
    target_id: id,
    old_value: { is_flagged: false },
    new_value: { is_flagged: true, reason },
  })

  return data
}

// Deactivates a product listing and records the action in the audit log
export async function removeProduct(id, adminId) {
  const { data, error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to remove product: ${error.message}`)

  await supabase.from('audit_log').insert({
    admin_id: adminId,
    action: 'REMOVE_PRODUCT',
    target_type: 'product',
    target_id: id,
    old_value: { is_active: true },
    new_value: { is_active: false },
  })

  return data
}

// Fetches all products that have been flagged for admin review
export async function getFlaggedProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, stores:store_id(store_name)')
    .eq('is_flagged', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch flagged products: ${error.message}`)
  return data
}

// Creates a new product listing for a store
export async function createProduct(productData) {
  const payload = {
    store_id: productData.store_id,
    category_id: productData.category_id || null,
    name: productData.name?.trim(),
    unit: productData.unit?.trim() || '1 pc',
    platform_mrp: Number(productData.platform_mrp) || 0,
    store_price: Number(productData.store_price) || 0,
    stock: Number(productData.stock) || 0,
    description: productData.description?.trim() || null,
    image_urls: productData.image_urls || [],
    cost_price: Number(productData.cost_price) || 0,
    is_active: true,
    is_flagged: false,
    units_sold_total: 0,
  }

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select('*, stores:store_id(store_name), categories:category_id(name)')
    .single()

  if (error) throw new Error(`Failed to create product: ${error.message}`)
  return data
}

// Fetches products where store price exceeds platform MRP (illegal under Indian law)
export async function getProductsAboveMRP() {
  const { data, error } = await supabase
    .from('products')
    .select('*, stores:store_id(store_name)')
    .filter('store_price', 'gt', 'platform_mrp')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch products above MRP: ${error.message}`)
  return data
}

// Logs an audit entry for product image approval
export async function approveProductImage(id, adminId) {
  const { error } = await supabase.from('audit_log').insert({
    admin_id: adminId,
    action: 'APPROVE_PRODUCT_IMAGE',
    target_type: 'product',
    target_id: id,
    old_value: null,
    new_value: { approved: true },
  })

  if (error) throw new Error(`Failed to log product image approval: ${error.message}`)
  return true
}

// Rejects a product image, clears it, flags the product, and notifies the store owner
export async function rejectProductImage(id, storeId, productName, adminId) {
  const { data, error } = await supabase
    .from('products')
    .update({
      image_url: null,
      image_urls: [],
      is_flagged: true
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to reject product image: ${error.message}`)

  await supabase.from('audit_log').insert({
    admin_id: adminId,
    action: 'REJECT_PRODUCT_IMAGE',
    target_type: 'product',
    target_id: id,
    old_value: null,
    new_value: { image_url: null, is_flagged: true },
  })

  try {
    await sendUserNotification(
      storeId,
      {
        title: 'Product Image Rejected',
        body: `The image for your product "${productName}" has been rejected because it does not comply with quality guidelines. Please upload a new image.`,
        type: 'product_image_rejection',
      },
      adminId
    )
  } catch (err) {
    console.error('Failed to send rejection push notification:', err)
  }

  return data
}
