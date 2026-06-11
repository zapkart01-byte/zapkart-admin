import React, { useState, useEffect, useCallback } from 'react'
import { Landmark, LandmarkIcon, Clock, BadgeAlert, Plus, CheckCircle, RefreshCw, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react'
import { getPayouts, updatePayoutStatus, initiateSettlement, getFinanceSummary } from '../services/financeService'
import { formatCurrency } from '../utils/formatters'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import PayoutCard from '../components/finance/PayoutCard'
import CODReconciliation from '../components/finance/CODReconciliation'
import SettlementHistory from '../components/finance/SettlementHistory'
import PageLayout from '../components/layout/PageLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

/**
 * ZapKart Admin Finance Page
 * Complete settlement hub providing store/rider payouts, COD cash reconciliations, and payout histories.
 */
export default function FinancePage() {
  const { adminProfile } = useAuth()
  
  // Tabs: 'stores' | 'riders' | 'cod' | 'history'
  const [activeTab, setActiveTab] = useState('stores')
  
  // KPI state
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [weeklyDiscount, setWeeklyDiscount] = useState(0)

  // Payouts listing state (for Tab 1 & Tab 2)
  const [payouts, setPayouts] = useState([])
  const [payoutsTotal, setPayoutsTotal] = useState(0)
  const [payoutsPage, setPayoutsPage] = useState(1)
  const [payoutsLoading, setPayoutsLoading] = useState(false)
  const [payoutsError, setPayoutsError] = useState(null)
  const [payoutsStatusFilter, setPayoutsStatusFilter] = useState('all')

  // Run Settlement Dialog
  const [showRunSettlement, setShowRunSettlement] = useState(false)
  const [isSettling, setIsSettling] = useState(false)

  // Fetch finance aggregated overview stats
  const fetchSummary = async () => {
    setSummaryLoading(true)
    try {
      const data = await getFinanceSummary()
      setSummary(data)

      // Calculate total weekly discount absorbed by platform
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      weekStart.setHours(0, 0, 0, 0)
      
      const { data: discountOrders, error: discountError } = await supabase
        .from('orders')
        .select('discount_amount')
        .eq('status', 'delivered')
        .gte('created_at', weekStart.toISOString())

      if (!discountError && discountOrders) {
        const total = discountOrders.reduce((sum, o) => sum + Number(o.discount_amount || 0), 0)
        setWeeklyDiscount(total)
      }
    } catch (err) {
      console.error('Failed to load finance summary:', err)
      toast.error('Failed to update financial KPI balances.')
    } finally {
      setSummaryLoading(false)
    }
  }

  // Fetch payouts for Store or Rider tab
  const fetchPayouts = useCallback(async () => {
    if (activeTab !== 'stores' && activeTab !== 'riders') return
    
    setPayoutsLoading(true)
    setPayoutsError(null)
    try {
      const type = activeTab === 'stores' ? 'store' : 'rider'
      const res = await getPayouts({
        recipientType: type,
        status: payoutsStatusFilter === 'all' ? undefined : payoutsStatusFilter,
        page: payoutsPage,
        pageSize: 6, // 6 cards per page fits layout perfectly
      })
      setPayouts(res.payouts || [])
      setPayoutsTotal(res.total || 0)
    } catch (err) {
      setPayoutsError(err.message || 'Failed to fetch payout records.')
    } finally {
      setPayoutsLoading(false)
    }
  }, [activeTab, payoutsStatusFilter, payoutsPage])

  // Initial loads
  useEffect(() => {
    fetchSummary()
  }, [])

  useEffect(() => {
    fetchPayouts()
  }, [fetchPayouts])

  // Reset tab-specific filters
  useEffect(() => {
    setPayoutsPage(1)
    setPayoutsStatusFilter('all')
  }, [activeTab])

  // Marks a payout as processed after inputting UTR reference number
  const handleProcessPayout = async (payoutId, bankRef) => {
    try {
      await updatePayoutStatus(payoutId, 'processed', bankRef)
      toast.success('Payout completed and status marked as processed.')
      fetchPayouts()
      fetchSummary()
    } catch (err) {
      toast.error(`Action failed: ${err.message}`)
      throw err
    }
  }

  // Triggers the background settlement run via backend
  const handleInitiateSettlement = async () => {
    setIsSettling(true)
    try {
      const adminId = adminProfile?.id || 'admin'
      await initiateSettlement(adminId)
      toast.success('Payout calculation batch finished. Check pending status list.')
      setShowRunSettlement(false)
      fetchPayouts()
      fetchSummary()
    } catch (err) {
      // Graceful fallback for local development if endpoint doesn't exist
      console.error(err)
      toast.error(`Settlement run error: ${err.message}`)
    } finally {
      setIsSettling(false)
    }
  }

  const handleRefreshAll = () => {
    fetchSummary()
    fetchPayouts()
  }

  const payoutsPageSize = 6
  const totalPayoutPages = Math.ceil(payoutsTotal / payoutsPageSize)

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Finance & Settlements Hub</h2>
          <p className="text-sm text-secondary mt-0.5">
            Manage weekly merchant payouts, rider deliveries earnings, and Cash-on-Hand handovers.
          </p>
        </div>
        <div className="flex gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-border bg-white text-secondary hover:bg-surface text-sm font-semibold transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Button
            variant="primary"
            onClick={() => setShowRunSettlement(true)}
            className="flex items-center gap-1.5"
          >
            <LandmarkIcon className="w-4 h-4" /> Run Settlement
          </Button>
        </div>
      </div>

      {/* ─── Financial KPI Row ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Paid Out */}
        <Card className="border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary font-semibold uppercase tracking-wide">Processed Payouts</p>
              {summaryLoading ? (
                <Skeleton className="h-8 w-28 mt-2" />
              ) : (
                <h3 className="text-2xl font-bold text-on-surface mt-1">
                  {formatCurrency(summary?.totalPaidOut || 0)}
                </h3>
              )}
            </div>
            <div className="p-3 bg-green-50 rounded-full text-green-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Pending Payouts */}
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary font-semibold uppercase tracking-wide">Pending Settlements</p>
              {summaryLoading ? (
                <Skeleton className="h-8 w-28 mt-2" />
              ) : (
                <h3 className="text-2xl font-bold text-on-surface mt-1">
                  {formatCurrency(summary?.totalPending || 0)}
                </h3>
              )}
            </div>
            <div className="p-3 bg-amber-50 rounded-full text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Cash Held by Riders */}
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary font-semibold uppercase tracking-wide">Cash held by Riders</p>
              {summaryLoading ? (
                <Skeleton className="h-8 w-28 mt-2" />
              ) : (
                <h3 className="text-2xl font-bold text-on-surface mt-1">
                  {formatCurrency(summary?.totalCODBalance || 0)}
                </h3>
              )}
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
              <Landmark className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Offer Cost Absorbed (Weekly) */}
        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary font-semibold uppercase tracking-wide">Weekly Offer Cost</p>
              {summaryLoading ? (
                <Skeleton className="h-8 w-28 mt-2" />
              ) : (
                <h3 className="text-2xl font-bold text-on-surface mt-1">
                  {formatCurrency(weeklyDiscount)}
                </h3>
              )}
            </div>
            <div className="p-3 bg-red-50 rounded-full text-red-600">
              <BadgeAlert className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Tabs Navigation ─── */}
      <div className="border-b border-border bg-white rounded-t-xl p-1 flex gap-2">
        <button
          onClick={() => setActiveTab('stores')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'stores'
              ? 'bg-primary-container text-on-primary-container shadow-sm'
              : 'text-secondary hover:text-on-surface hover:bg-surface'
          }`}
        >
          Store Payouts
        </button>
        <button
          onClick={() => setActiveTab('riders')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'riders'
              ? 'bg-primary-container text-on-primary-container shadow-sm'
              : 'text-secondary hover:text-on-surface hover:bg-surface'
          }`}
        >
          Rider Payouts
        </button>
        <button
          onClick={() => setActiveTab('cod')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'cod'
              ? 'bg-primary-container text-on-primary-container shadow-sm'
              : 'text-secondary hover:text-on-surface hover:bg-surface'
          }`}
        >
          COD Reconciliation
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-primary-container text-on-primary-container shadow-sm'
              : 'text-secondary hover:text-on-surface hover:bg-surface'
          }`}
        >
          Settlement History
        </button>
      </div>

      {/* ─── Tab Content Workspace ─── */}
      <div className="bg-white rounded-b-xl border border-t-0 border-border p-5 min-h-[400px]">
        {/* TAB 1 & TAB 2: Payout Card Lists */}
        {(activeTab === 'stores' || activeTab === 'riders') && (
          <div className="space-y-5">
            {/* Status Filter Bar */}
            <div className="flex justify-between items-center bg-surface p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-secondary">Status Filter:</span>
                <select
                  value={payoutsStatusFilter}
                  onChange={(e) => {
                    setPayoutsStatusFilter(e.target.value)
                    setPayoutsPage(1)
                  }}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg bg-white outline-none focus:ring-1 focus:ring-brand font-medium"
                >
                  <option value="all">All Payouts</option>
                  <option value="pending">Pending Only</option>
                  <option value="processed">Processed Only</option>
                  <option value="failed">Failed Only</option>
                </select>
              </div>
              <span className="text-xs font-bold text-secondary">
                Total Found: {payoutsTotal}
              </span>
            </div>

            {/* Screen State Loading */}
            {payoutsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : payoutsError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600 font-medium">
                <p>{payoutsError}</p>
                <button onClick={fetchPayouts} className="mt-2 text-sm text-brand underline font-semibold">
                  Retry
                </button>
              </div>
            ) : payouts.length === 0 ? (
              <EmptyState
                icon={Landmark}
                title={`No payouts found`}
                description={`There are no ${payoutsStatusFilter !== 'all' ? payoutsStatusFilter : ''} payout requests for ${
                  activeTab === 'stores' ? 'stores' : 'riders'
                } right now.`}
                className="py-12"
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {payouts.map((payout) => (
                    <PayoutCard
                      key={payout.id}
                      payout={payout}
                      onProcess={handleProcessPayout}
                    />
                  ))}
                </div>

                {totalPayoutPages > 1 && (
                  <div className="pt-4">
                    <Pagination
                      currentPage={payoutsPage}
                      totalItems={payoutsTotal}
                      itemsPerPage={payoutsPageSize}
                      onPageChange={setPayoutsPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: Rider COD Reconciliation */}
        {activeTab === 'cod' && <CODReconciliation />}

        {/* TAB 4: Settlement Logs History */}
        {activeTab === 'history' && <SettlementHistory />}
      </div>

      {/* ─── Confirm Run Settlement Dialog ─── */}
      <ConfirmDialog
        isOpen={showRunSettlement}
        onClose={() => setShowRunSettlement(false)}
        onConfirm={handleInitiateSettlement}
        loading={isSettling}
        title="Trigger Settlement Calculation Run?"
        description="This will compile all un-settled completed orders from active stores and riders for the current period, calculate platform commissions and net payout balances, and generate corresponding pending payout vouchers. This action should typically be triggered once a week."
        confirmLabel="Initiate Payouts"
        variant="primary"
      />
    </div>
  )
}
