import { supabase } from './supabase'

/**
 * ZapKart Platform Audit Log Service
 * Fetches historical admin logs from the audit_log table.
 * All functions have one-line comments above them.
 */

// Queries and returns paginated records from the database audit_log table with optional action and date filter boundaries
export async function getAuditLogs({ action, targetType, dateFrom, dateTo, page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  // Filters by specific action category if supplied
  if (action && action !== 'all') {
    query = query.eq('action', action)
  }

  // Filters by specific target type if supplied
  if (targetType && targetType !== 'all') {
    query = query.eq('target_type', targetType)
  }

  // Filters records created after date boundary
  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }

  // Filters records created before date boundary
  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to fetch audit log entries: ${error.message}`)

  return {
    entries: data || [],
    total: count || 0,
    page,
    pageSize,
  }
}
