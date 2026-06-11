import React, { useState, useEffect } from 'react'
import { Landmark, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { supabase } from '../../services/supabase'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Input from '../ui/Input'

/**
 * PayoutCard Component
 * Displays a detailed card for store and rider payouts with options to process/mark as paid.
 */
export default function PayoutCard({ payout, onProcess }) {
  const [bankRef, setBankRef] = useState('')
  const [showProcessForm, setShowProcessForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Live query states for compliance analytics
  const [offerCost, setOfferCost] = useState(0)
  const [eventBonus, setEventBonus] = useState(0)
  const [loadingStats, setLoadingStats] = useState(false)

  const isStore = payout.recipient_type === 'store'
  const isPending = payout.status === 'pending'
  const isProcessed = payout.status === 'processed'
  const isFailed = payout.status === 'failed'

  useEffect(() => {
    if (!payout.recipient_id || !payout.period_start || !payout.period_end) return
    
    async function fetchpayoutStats() {
      setLoadingStats(true)
      try {
        if (isStore) {
          // Fetch absorbed discount amount for this store during the period
          const { data, error } = await supabase
            .from('orders')
            .select('discount_amount')
            .eq('store_id', payout.recipient_id)
            .eq('status', 'delivered')
            .gte('created_at', payout.period_start)
            .lte('created_at', payout.period_end)

          if (!error && data) {
            const total = data.reduce((sum, o) => sum + Number(o.discount_amount || 0), 0)
            setOfferCost(total)
          }
        } else {
          // Fetch rider event bonus incentives during the period
          const { data, error } = await supabase
            .from('orders')
            .select('rider_event_bonus')
            .eq('rider_id', payout.recipient_id)
            .eq('status', 'delivered')
            .gte('created_at', payout.period_start)
            .lte('created_at', payout.period_end)

          if (!error && data) {
            const total = data.reduce((sum, o) => sum + Number(o.rider_event_bonus || 0), 0)
            setEventBonus(total)
          }
        }
      } catch (err) {
        console.error('Failed to fetch payout card metrics:', err)
      } finally {
        setLoadingStats(false)
      }
    }

    fetchpayoutStats()
  }, [isStore, payout.recipient_id, payout.period_start, payout.period_end])

  const handleProcessSubmit = async (e) => {
    e.preventDefault()
    if (!bankRef.trim()) return
    setIsSubmitting(true)
    try {
      await onProcess(payout.id, bankRef)
      setShowProcessForm(false)
      setBankRef('')
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Determine net flow direction: To Recipient or Rider owes Zapkart
  // net_amount > 0: zapkart pays store/rider
  // net_amount < 0 (can happen for rider COD reconciliation overlaps): recipient owes zapkart
  const netAmount = payout.net_amount || 0
  const isToRecipient = netAmount >= 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isStore ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info'}`}>
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-label-lg font-bold text-on-surface truncate max-w-[180px]">
                {payout.recipient_name || `${isStore ? 'Store' : 'Rider'} #${payout.recipient_id?.slice(0, 8)}`}
              </h4>
              <span className="text-xs text-secondary capitalize font-medium">
                {payout.recipient_type} Payout
              </span>
            </div>
          </div>
          <Badge
            variant={
              isProcessed ? 'success' : isPending ? 'warning' : 'danger'
            }
          >
            {payout.status}
          </Badge>
        </div>

        {/* Amount Section */}
        <div className="bg-surface p-3 rounded-lg border border-surface-variant flex items-center justify-between">
          <div>
            <p className="text-xs text-secondary font-medium">Net Amount</p>
            <p className="text-headline-md font-bold text-on-surface">
              {formatCurrency(Math.abs(netAmount))}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                isToRecipient
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {isToRecipient ? (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5" /> To Recipient
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Rider Owes Zapkart
                </>
              )}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
          <div>
            <p className="text-secondary">Gross Earnings</p>
            <p className="font-semibold text-on-surface">{formatCurrency(payout.gross_amount || 0)}</p>
          </div>
          {isStore ? (
            <div>
              <p className="text-secondary">Commission</p>
              <p className="font-semibold text-danger">-{formatCurrency(payout.commission_amount || 0)}</p>
            </div>
          ) : (
            <div>
              <p className="text-secondary">COD Handover Deduct</p>
              <p className="font-semibold text-secondary">{formatCurrency(payout.cod_deduction || 0)}</p>
            </div>
          )}
          {isStore ? (
            <div>
              <p className="text-secondary">Offer Cost (Absorbed)</p>
              <p className="font-semibold text-green-600">
                {loadingStats ? '...' : formatCurrency(offerCost)}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-secondary">Rider Event Bonus</p>
              <p className="font-semibold text-green-600 flex items-center gap-1">
                {loadingStats ? '...' : formatCurrency(eventBonus)}
                {eventBonus > 0 && <Sparkles className="w-3 h-3 text-orange-500 fill-orange-500" />}
              </p>
            </div>
          )}
          <div>
            <p className="text-secondary">Period</p>
            <p className="font-semibold text-on-surface truncate">
              {payout.period_start ? `${formatDate(payout.period_start)} - ${formatDate(payout.period_end)}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-secondary">Requested At</p>
            <p className="font-semibold text-on-surface">{formatDate(payout.created_at)}</p>
          </div>
        </div>

        {/* Bank details if available */}
        {payout.bank_details && (
          <div className="border-t border-surface-variant pt-2.5 text-xs text-secondary space-y-1">
            <p className="font-semibold text-on-surface text-[11px] uppercase tracking-wider">Bank Details</p>
            <div className="grid grid-cols-2 gap-1">
              <p>Bank Name: <span className="font-medium text-on-surface">{payout.bank_details.bank_name || '—'}</span></p>
              <p>A/C: <span className="font-medium text-on-surface">{payout.bank_details.account_number || '—'}</span></p>
              <p className="col-span-2">IFSC: <span className="font-medium text-on-surface">{payout.bank_details.ifsc_code || '—'}</span></p>
            </div>
          </div>
        )}

        {/* Bank Reference after processing */}
        {payout.bank_reference && (
          <div className="border-t border-surface-variant pt-2.5 text-xs text-secondary flex items-center justify-between">
            <span>UTR / Ref No:</span>
            <span className="font-mono text-on-surface font-semibold text-[13px]">{payout.bank_reference}</span>
          </div>
        )}

        {/* Mark as processed CTA */}
        {isPending && !showProcessForm && (
          <Button
            variant="primary"
            onClick={() => setShowProcessForm(true)}
            className="w-full mt-2"
          >
            Process Payout
          </Button>
        )}

        {/* Process input form */}
        {showProcessForm && (
          <form onSubmit={handleProcessSubmit} className="border-t border-surface-variant pt-3 space-y-3">
            <Input
              label="Enter Bank Reference (UTR) ID"
              placeholder="e.g. UTR1234567890"
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              required
              className="text-xs"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => { setShowProcessForm(false); setBankRef('') }}
                disabled={isSubmitting}
                className="flex-1 text-xs py-1.5 min-h-[36px]"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isSubmitting}
                disabled={!bankRef.trim()}
                className="flex-1 text-xs py-1.5 min-h-[36px]"
              >
                Complete
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  )
}
