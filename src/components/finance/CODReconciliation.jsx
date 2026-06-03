import React, { useState, useEffect } from 'react'
import { Landmark, Check, AlertTriangle, ArrowRight, DollarSign, RefreshCw, UserCheck } from 'lucide-react'
import { getCODReconciliation } from '../../services/financeService'
import { reconcileRiderCOD } from '../../services/riderService'
import { formatCurrency } from '../../utils/formatters'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'
import ConfirmDialog from '../ui/ConfirmDialog'
import toast from 'react-hot-toast'

/**
 * CODReconciliation Component
 * Manages Cash-on-Hand reconciliation list and processes rider payments handover.
 */
export default function CODReconciliation() {
  const { adminProfile } = useAuth()
  const [riders, setRiders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Handover form state
  const [collectAmount, setCollectAmount] = useState({}) // riderId -> input value
  const [settlingRider, setSettlingRider] = useState(null) // rider being settled
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmSettle, setConfirmSettle] = useState(null) // { rider, amount }

  const fetchCODData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCODReconciliation()
      setRiders(data || [])
      
      // Pre-fill input amounts with the actual cod_balance for convenience
      const defaultAmounts = {}
      data.forEach((r) => {
        defaultAmounts[r.id] = String(r.cod_balance || '')
      })
      setCollectAmount(defaultAmounts)
    } catch (err) {
      setError(err.message || 'Failed to fetch COD balance details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCODData()
  }, [])

  const handleAmountChange = (riderId, value) => {
    setCollectAmount((prev) => ({
      ...prev,
      [riderId]: value,
    }))
  }

  const triggerSettle = (rider) => {
    const rawAmt = collectAmount[rider.id]
    const amount = Number(rawAmt)
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount to reconcile')
      return
    }
    
    if (amount > (rider.cod_balance || 0)) {
      toast.error('Collected cash cannot exceed rider\'s current cash held')
      return
    }

    setConfirmSettle({ rider, amount })
  }

  const executeSettle = async () => {
    if (!confirmSettle) return
    const { rider, amount } = confirmSettle
    setIsSubmitting(true)
    try {
      const adminId = adminProfile?.id || 'admin'
      await reconcileRiderCOD(rider.id, amount, adminId)
      toast.success(`Successfully reconciled ${formatCurrency(amount)} cash from ${rider.name}`)
      setConfirmSettle(null)
      fetchCODData()
    } catch (err) {
      toast.error(err.message || 'COD reconciliation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const COD_LIMIT = 2000 // Statutory cash limit in INR

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-on-surface">Cash on Hand Reconciliation</h3>
          <p className="text-xs text-secondary mt-0.5">
            Collect and settle cash handovers from riders. Limit is set to {formatCurrency(COD_LIMIT)}.
          </p>
        </div>
        <button
          onClick={fetchCODData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-secondary hover:bg-surface text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600 font-medium">
          <p>{error}</p>
          <button onClick={fetchCODData} className="mt-2 text-sm text-brand underline font-semibold">
            Retry
          </button>
        </div>
      ) : riders.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="All Cash Reconciled"
          description="There are currently no active riders with outstanding Cash-on-Hand balances."
          className="py-12"
        />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[1.5fr_2fr_1fr_1.5fr] gap-4 px-5 py-3 bg-surface border-b border-border text-xs font-semibold text-secondary uppercase tracking-wide">
            <span>Rider Info</span>
            <span>COD Balance Limit Progress</span>
            <span>Collection Amount (₹)</span>
            <span className="text-right">Action</span>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border">
            {riders.map((rider) => {
              const balance = rider.cod_balance || 0
              const progressPercent = Math.min(100, (balance / COD_LIMIT) * 100)
              const isOverLimit = balance >= COD_LIMIT
              
              let progressColor = 'bg-green-500'
              if (progressPercent > 85) progressColor = 'bg-red-500'
              else if (progressPercent > 60) progressColor = 'bg-amber-500'

              return (
                <div key={rider.id} className={`grid grid-cols-1 md:grid-cols-[1.5fr_2fr_1fr_1.5fr] gap-4 px-5 py-4 items-center ${isOverLimit ? 'bg-red-50/40' : ''}`}>
                  {/* Info */}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface">{rider.name}</p>
                    <p className="text-xs text-secondary">{rider.phone}</p>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-on-surface">
                        {formatCurrency(balance)} Held
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isOverLimit ? 'bg-red-100 text-red-700' : 'text-secondary'}`}>
                        {isOverLimit ? 'BREACHED!' : `${Math.round(progressPercent)}% of limit`}
                      </span>
                    </div>
                    <div className="w-full bg-surface-container rounded-full h-2 border border-border overflow-hidden">
                      <div
                        className={`h-full ${progressColor} transition-all duration-300`}
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Input collection */}
                  <div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-secondary">₹</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={collectAmount[rider.id] || ''}
                        onChange={(e) => handleAmountChange(rider.id, e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 text-xs font-semibold border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-brand outline-none"
                      />
                    </div>
                  </div>

                  {/* Submit buttons */}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleAmountChange(rider.id, String(balance))}
                      disabled={Number(collectAmount[rider.id]) === balance}
                      className="text-xs py-1 px-2.5 min-h-[30px]"
                    >
                      Clear / Reset
                    </Button>
                    <Button
                      variant={isOverLimit ? 'danger' : 'primary'}
                      onClick={() => triggerSettle(rider)}
                      className="text-xs py-1 px-3 min-h-[30px] flex items-center gap-1"
                    >
                      Settle Cash
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmSettle}
        onClose={() => setConfirmSettle(null)}
        onConfirm={executeSettle}
        loading={isSubmitting}
        title="Confirm Cash Settlement Handover"
        description={
          confirmSettle
            ? `Confirm receipt of ${formatCurrency(confirmSettle.amount)} cash from rider ${confirmSettle.rider.name}. This will reduce their Cash-on-Hand balance immediately and log this event in the system audit records.`
            : ''
        }
        confirmLabel="Record Receipt"
        variant={confirmSettle?.rider?.cod_balance >= COD_LIMIT ? 'danger' : 'primary'}
      />
    </div>
  )
}
