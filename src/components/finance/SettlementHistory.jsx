import React, { useState, useEffect, useCallback } from 'react'
import { Landmark, Calendar, Download, RefreshCw, FileSpreadsheet } from 'lucide-react'
import { getPayouts } from '../../services/financeService'
import { formatCurrency, formatDate } from '../../utils/formatters'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'
import Pagination from '../ui/Pagination'
import toast from 'react-hot-toast'

/**
 * SettlementHistory Component
 * Paginated table of settled payouts with export option and date-range filters.
 */
export default function SettlementHistory() {
  const [payouts, setPayouts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filters
  const [recipientType, setRecipientType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getPayouts({
        recipientType,
        status: 'processed', // processed settlements
        page,
        pageSize,
      })
      
      let filtered = res.payouts || []
      
      // Date filtering client-side for precise calendar bounds
      if (startDate) {
        filtered = filtered.filter((p) => new Date(p.processed_at || p.created_at) >= new Date(startDate))
      }
      if (endDate) {
        // Set end date boundary to 23:59:59
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        filtered = filtered.filter((p) => new Date(p.processed_at || p.created_at) <= end)
      }

      setPayouts(filtered)
      setTotal(startDate || endDate ? filtered.length : (res.total || 0))
    } catch (err) {
      setError(err.message || 'Failed to fetch payout history.')
    } finally {
      setLoading(false)
    }
  }, [recipientType, startDate, endDate, page, pageSize])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [recipientType, startDate, endDate])

  const exportCSV = () => {
    if (payouts.length === 0) {
      toast.error('No records available to export')
      return
    }

    const headers = ['Payout ID', 'Recipient Name', 'Type', 'Gross Amount', 'Net Amount', 'Bank Reference', 'Processed Date']
    const rows = payouts.map((p) => [
      p.id,
      p.recipient_name || 'N/A',
      p.recipient_type,
      p.gross_amount,
      p.net_amount,
      p.bank_reference || 'N/A',
      p.processed_at ? new Date(p.processed_at).toLocaleString() : 'N/A',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')
      
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Zapkart_Payout_History_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Payout history CSV downloaded')
  }

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-on-surface">Settlement Logs & History</h3>
          <p className="text-xs text-secondary mt-0.5">
            Audit and export complete records of previous payouts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto justify-end">
          <button
            onClick={fetchHistory}
            className="p-2 rounded-lg border border-border bg-white text-secondary hover:bg-surface transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-surface border border-surface-variant rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-sm">
        {/* Recipient Type */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-xs font-semibold text-secondary">Recipient Type</label>
          <select
            value={recipientType}
            onChange={(e) => setRecipientType(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-white outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="all">All Types</option>
            <option value="store">Store Payouts Only</option>
            <option value="rider">Rider Payouts Only</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-xs font-semibold text-secondary">Start Date</label>
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-white outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-xs font-semibold text-secondary">End Date</label>
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary pointer-events-none" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-white outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* Reset */}
        {(startDate || endDate || recipientType !== 'all') && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); setRecipientType('all') }}
            className="text-xs text-brand hover:underline font-semibold pb-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Grid details */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600 font-medium">
          <p>{error}</p>
          <button onClick={fetchHistory} className="mt-2 text-sm text-brand underline font-semibold">
            Retry
          </button>
        </div>
      ) : payouts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No history found"
          description="There are no past settlement records matching your current filter selections."
          className="py-12"
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
            {/* Desktop columns */}
            <div className="hidden lg:grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.5fr_1fr] gap-4 px-5 py-3 bg-surface border-b border-border text-xs font-semibold text-secondary uppercase tracking-wide">
              <span>Payout ID</span>
              <span>Recipient</span>
              <span>Recipient Type</span>
              <span>Gross Amount</span>
              <span>Net Payout</span>
              <span>UTR / Bank Ref</span>
              <span>Processed Date</span>
            </div>

            {/* List entries */}
            <div className="divide-y divide-border">
              {payouts.map((p) => (
                <div key={p.id} className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.5fr_1fr] gap-4 px-5 py-3.5 items-center hover:bg-surface-container-low/20 transition-colors">
                  <span className="text-xs font-mono font-semibold text-on-surface truncate" title={p.id}>
                    {p.id?.slice(0, 12)?.toUpperCase()}...
                  </span>
                  <div>
                    <p className="text-xs font-bold text-on-surface">{p.recipient_name || '—'}</p>
                    <p className="text-[10px] text-secondary font-mono">{p.recipient_id?.slice(0, 8)}</p>
                  </div>
                  <span className="text-xs capitalize font-medium text-secondary">
                    {p.recipient_type}
                  </span>
                  <span className="text-xs text-secondary">
                    {formatCurrency(p.gross_amount || 0)}
                  </span>
                  <span className="text-xs font-bold text-primary">
                    {formatCurrency(p.net_amount || 0)}
                  </span>
                  <span className="text-xs font-mono font-bold text-on-surface">
                    {p.bank_reference || '—'}
                  </span>
                  <span className="text-xs text-secondary">
                    {p.processed_at ? formatDate(p.processed_at) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Pagination
            currentPage={page}
            totalItems={total}
            itemsPerPage={pageSize}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
