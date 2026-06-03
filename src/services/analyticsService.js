import { supabase } from './supabase'

/**
 * ZapKart Analytics Service
 * Fetches aggregated data for the admin dashboard and analytics pages.
 * Categories follow PRD: Dairy, Snacks, Vegetables, Beverages, Staples, Others.
 */

// Fetches key performance indicator data for dashboard summary cards
export async function getDashboardSummary() {
  const [ordersResult, storesResult, ridersResult] = await Promise.all([
    supabase.from('orders').select('subtotal, delivery_fee, status, created_at'),
    supabase.from('stores').select('id, status').eq('status', 'active'),
    supabase.from('riders').select('id, status').eq('status', 'active'),
  ])

  if (ordersResult.error) throw new Error(`Failed to fetch order data: ${ordersResult.error.message}`)
  if (storesResult.error) throw new Error(`Failed to fetch store data: ${storesResult.error.message}`)
  if (ridersResult.error) throw new Error(`Failed to fetch rider data: ${ridersResult.error.message}`)

  const orders = ordersResult.data
  const deliveredOrders = orders.filter((o) => o.status === 'delivered')
  const grossSales = deliveredOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0)
  const avgOrderValue = deliveredOrders.length > 0 ? Math.round(grossSales / deliveredOrders.length) : 0

  return {
    grossSales,
    totalOrders: orders.length,
    deliveredOrders: deliveredOrders.length,
    activeStores: storesResult.data.length,
    activeRiders: ridersResult.data.length,
    avgOrderValue,
  }
}

// Fetches revenue data grouped by period for chart rendering
export async function getRevenueChart(period = 'daily') {
  const { data, error } = await supabase
    .from('orders')
    .select('subtotal, delivery_fee, commission_amount, created_at')
    .eq('status', 'delivered')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch revenue data: ${error.message}`)

  // Groups orders by the specified time period for chart rendering
  const grouped = groupByPeriod(data, period)
  return grouped
}

// Fetches order count trends grouped by period for chart rendering
export async function getOrderTrends(period = 'daily') {
  const { data, error } = await supabase
    .from('orders')
    .select('status, created_at')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch order trends: ${error.message}`)

  const grouped = groupByPeriod(data, period, 'count')
  return grouped
}

// Fetches order breakdown by product category (Dairy, Snacks, Vegetables, Beverages, Staples, Others)
export async function getCategoryBreakdown() {
  const { data, error } = await supabase
    .from('orders')
    .select('subtotal, stores:store_id(store_type)')
    .eq('status', 'delivered')

  if (error) throw new Error(`Failed to fetch category breakdown: ${error.message}`)

  // Aggregates revenue by store category with Indian grocery categories
  const categories = {}
  const validCategories = ['Dairy', 'Snacks', 'Vegetables', 'Beverages', 'Staples']

  for (const order of data) {
    const category = order.stores?.store_type || 'Others'
    const normalizedCategory = validCategories.includes(category) ? category : 'Others'
    categories[normalizedCategory] = (categories[normalizedCategory] || 0) + (order.subtotal || 0)
  }

  return Object.entries(categories).map(([name, value]) => ({ name, value }))
}

// Fetches top performing stores ranked by delivered order count
export async function getTopStores(limit = 5) {
  const { data, error } = await supabase
    .from('stores')
    .select('id, store_name, total_orders, rating')
    .eq('status', 'active')
    .order('total_orders', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch top stores: ${error.message}`)
  return data
}

// Fetches top selling products ranked by total units sold
export async function getTopProducts(limit = 5) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, units_sold_total, store_price, stores:store_id(store_name)')
    .eq('is_active', true)
    .order('units_sold_total', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch top products: ${error.message}`)
  return data
}

// Groups order data by day, week, or month for chart rendering
function groupByPeriod(data, period, mode = 'revenue') {
  const groups = {}

  for (const item of data) {
    const date = new Date(item.created_at)
    let key

    if (period === 'daily') {
      key = date.toISOString().split('T')[0]
    } else if (period === 'weekly') {
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      key = weekStart.toISOString().split('T')[0]
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    }

    if (!groups[key]) {
      groups[key] = { date: key, revenue: 0, orders: 0 }
    }

    groups[key].revenue += (item.subtotal || 0) + (item.delivery_fee || 0)
    groups[key].orders += 1
  }

  return Object.values(groups)
}

const CATEGORY_LABELS = ['Dairy', 'Snacks', 'Vegetables', 'Beverages', 'Staples', 'Others']

// Builds zero-value chart series so charts render when no orders exist yet
export function buildEmptyChartSeries(period = 'daily', pointCount = 7) {
  const groups = []
  const today = new Date()

  for (let i = pointCount - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)

    let key
    if (period === 'monthly') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    } else if (period === 'weekly') {
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      key = weekStart.toISOString().split('T')[0]
    } else {
      key = date.toISOString().split('T')[0]
    }

    groups.push({ date: key, revenue: 0, orders: 0 })
  }

  return groups
}

// Returns zero-value category breakdown for empty analytics state
export function buildEmptyCategoryBreakdown() {
  return CATEGORY_LABELS.map((name) => ({ name, value: 0 }))
}
