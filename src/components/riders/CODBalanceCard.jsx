import React, { useState } from 'react'
import { Wallet, AlertTriangle, CheckCircle, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '../../utils/formatters'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { reconcileRiderCOD } from '../../services/riderService'

/**
 * ZapKart Admin — Rider COD Balance Reconciliation Card
 * Shows cash on hand, progress against statutory limit, warnings, and quick-settlement modal action.
 */
export default function CODBalanceCard({ rider, onReconcileSuccess }) {
  const [isSettling, setIsSettling] = useState(false)
  const [settleAmount, setSettleAmount] = useState('')
  const [loading, setLoading] = useState(false)

  // Current balance & limits
  const codBalance = rider?.cod_balance || 0
  const maxLimit = 2000 // Statutory default limit (max_cod_balance_per_rider)
  const isLimitReached = codBalance >= maxLimit
  const percent = Math.min(100, (codBalance / maxLimit) * 100)

  // Determine progress bar and alert styles
  let barColor = 'bg-primary'
  if (percent >= 90) {
    barColor = 'bg-danger'
  } else if (percent >= 70) {
    barColor = 'bg-warning'
  }

  const handleSettleSubmit = async (e) => {
    e.preventDefault()
    const amount = parseFloat(settleAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive settlement amount.')
      return
    }
    if (amount > codBalance) {
      toast.error('Settlement amount cannot exceed the rider\'s current COD balance.')
      return
    }

    setLoading(true)
    try {
      await reconcileRiderCOD(rider.id, amount, 'admin')
      toast.success(`Successfully reconciled ${formatCurrency(amount)} cash from rider`)
      setSettleAmount('')
      setIsSettling(false)
      if (onReconcileSuccess) onReconcileSuccess()
    } catch (err) {
      toast.error(`Reconciliation failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }


  return (
    <Card className="p-5 flex flex-col gap-4 border border-surface-variant relative overflow-hidden shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-headline-sm text-on-surface font-bold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" /> Cash on Hand (COD)
        </h3>
        {isLimitReached ? (
          <span className="bg-danger/10 text-danger border border-danger/20 text-label-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 pulse-dot">
            <AlertTriangle className="w-3.5 h-3.5" /> Limit Exceeded
          </span>
        ) : (
          <span className="bg-success/10 text-success border border-success/20 text-label-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Within Limits
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-[32px] font-extrabold text-on-surface tracking-tight">
          {formatCurrency(codBalance)}
        </span>
        <span className="text-body-sm text-secondary font-medium">
          held by rider
        </span>
      </div>

      {/* Progress limit bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-body-sm font-semibold text-secondary">
          <span>COD Accumulation Progress</span>
          <span>{Math.round(percent)}% of {formatCurrency(maxLimit)} limit</span>
        </div>
        <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden border border-outline-variant/30">
          <div
            className={`h-full ${barColor} transition-all duration-500 rounded-full`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Compliance Warning block */}
      {isLimitReached && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-xl text-body-sm text-on-surface-variant flex gap-2">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-danger">Statutory Action Required</p>
            <p className="text-secondary text-[12px] mt-0.5">
              This rider has exceeded the permissible cash-on-hand limit. Further order assignments are blocked until a cash reconciliation handover is completed.
            </p>
          </div>
        </div>
      )}

      {/* Settle quick form / button */}
      {!isSettling ? (
        <Button
          onClick={() => {
            setSettleAmount(codBalance.toString()) // default to full balance
            setIsSettling(true)
          }}
          disabled={codBalance === 0}
          variant={isLimitReached ? 'primary' : 'outline'}
          className={`w-full min-h-[44px] flex items-center justify-center gap-1.5 ${
            isLimitReached ? 'bg-primary text-white' : ''
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" /> Reconcile Cash Handover
        </Button>
      ) : (
        <form onSubmit={handleSettleSubmit} className="bg-surface-container-low p-4 rounded-xl border border-surface-variant space-y-3 animate-fade-in">
          <p className="text-body-sm font-bold text-on-surface">Record Cash Handover</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="settle-amount-input"
                type="number"
                step="0.01"
                placeholder="Enter amount collected"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                required
                className="py-1.5 h-10 text-body-sm"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSettleAmount(codBalance.toString())
              }}
              className="h-10 px-3 font-semibold text-body-sm whitespace-nowrap"
            >
              Full Amt
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSettling(false)}
              className="h-9 font-semibold text-body-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="h-9 bg-primary text-white font-semibold text-body-sm"
            >
              {loading ? 'Processing...' : 'Confirm Handover'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
