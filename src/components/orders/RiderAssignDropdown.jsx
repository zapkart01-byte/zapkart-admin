import React, { useState, useEffect } from 'react'
import { UserCheck, Loader } from 'lucide-react'
import { supabase } from '../../services/supabase'

/**
 * RiderAssignDropdown — searchable dropdown that lets the admin pick an active online rider for an order.
 * Fetches active riders from Supabase and emits the selected rider ID to the parent via onAssign.
 */
export default function RiderAssignDropdown({ currentRiderId, onAssign, disabled = false }) {
  const [riders, setRiders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [selectedId, setSelectedId] = useState(currentRiderId || '')

  // Loads active riders from Supabase on mount
  useEffect(() => {
    async function loadRiders() {
      try {
        const { data, error: fetchError } = await supabase
          .from('riders')
          .select('id, name, phone, vehicle_type, rating, is_online, cod_limit_reached')
          .eq('status', 'active')
          .order('is_online', { ascending: false })
          .order('rating', { ascending: false })

        if (fetchError) throw fetchError
        setRiders(data || [])
      } catch (err) {
        setError('Could not load riders. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadRiders()
  }, [])

  // Filters riders by name/phone against the search query
  const filteredRiders = riders.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.name?.toLowerCase().includes(q) || r.phone?.toLowerCase().includes(q)
  })

  // Triggers parent assignment callback with the chosen rider ID
  async function handleAssign() {
    if (!selectedId || assigning) return
    setAssigning(true)
    try {
      await onAssign(selectedId)
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-secondary text-sm py-2">
        <Loader className="w-4 h-4 animate-spin" /> Loading riders…
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>
  }

  return (
    <div className="space-y-2">
      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search rider by name or phone…"
        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
      />

      {/* Scrollable rider list */}
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {filteredRiders.length === 0 ? (
          <p className="text-sm text-secondary text-center py-4">No active riders found.</p>
        ) : (
          filteredRiders.map((rider) => (
            <button
              key={rider.id}
              onClick={() => setSelectedId(rider.id)}
              disabled={rider.cod_limit_reached}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                ${selectedId === rider.id ? 'bg-brand/10 border-l-2 border-brand' : 'hover:bg-surface'}
                ${rider.cod_limit_reached ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {/* Online indicator */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  rider.is_online ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">{rider.name}</p>
                <p className="text-xs text-secondary truncate">
                  {rider.phone} · {rider.vehicle_type} · ★ {Number(rider.rating).toFixed(1)}
                  {rider.cod_limit_reached ? ' · COD limit reached' : ''}
                </p>
              </div>
              {selectedId === rider.id && (
                <UserCheck className="w-4 h-4 text-brand shrink-0" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Assign button */}
      <button
        onClick={handleAssign}
        disabled={!selectedId || assigning || disabled}
        className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {assigning ? (
          <>
            <Loader className="w-4 h-4 animate-spin" /> Assigning…
          </>
        ) : (
          <>
            <UserCheck className="w-4 h-4" /> Assign Rider
          </>
        )}
      </button>
    </div>
  )
}
