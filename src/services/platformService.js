import { supabase } from './supabase'

/**
 * ZapKart Platform Settings Service
 * Manages the single-row platform_settings table and the audit log.
 */

// Fetches the platform configuration from the single-row platform_settings table
export async function getPlatformSettings() {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) throw new Error(`Failed to fetch platform settings: ${error.message}`)
  return data
}

// Updates platform settings and records the change in the audit log
export async function updatePlatformSettings(settingsData, adminId) {
  // Fetches current settings to record old values in audit log
  const currentSettings = await getPlatformSettings()

  const { data, error } = await supabase
    .from('platform_settings')
    .update(settingsData)
    .eq('id', currentSettings.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update platform settings: ${error.message}`)

  // Records the settings change in the audit log with before/after values
  await supabase.from('audit_log').insert({
    admin_id: adminId,
    action: 'UPDATE_PLATFORM_SETTINGS',
    target_type: 'platform_settings',
    target_id: currentSettings.id,
    old_value: currentSettings,
    new_value: data,
  })

  return data
}

// Fetches paginated audit log entries with optional action and date filters
export async function getAuditLog({ action, dateFrom, dateTo, page = 1, pageSize = 50 } = {}) {
  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (action && action !== 'all') {
    query = query.eq('action', action)
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to fetch audit log: ${error.message}`)
  return { entries: data, total: count, page, pageSize }
}
