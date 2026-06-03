import { authenticatedFetch } from './authService'
import { supabase } from './supabase'

/**
 * ZapKart Notification Service
 * Broadcasts push notifications to users via the backend API.
 */

// Sends a broadcast notification to all users of a specific type via backend API
export async function broadcastNotification(data, adminId) {
  const response = await authenticatedFetch('/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify({ ...data, adminId }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to broadcast notification')
  }

  const result = await response.json()

  // Records the broadcast action in the audit log
  await supabase.from('audit_log').insert({
    admin_id: adminId,
    action: 'SEND_BROADCAST_NOTIFICATION',
    target_type: 'notification',
    target_id: result.id || null,
    old_value: null,
    new_value: { title: data.title, audience: data.audience },
  })

  return result
}

// Fetches the history of all past broadcast notifications
export async function getNotificationHistory() {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('action', 'SEND_BROADCAST_NOTIFICATION')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch notification history: ${error.message}`)
  return data
}

// Fetches a single notification record by its audit log ID
export async function getNotificationById(id) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch notification: ${error.message}`)
  return data
}
