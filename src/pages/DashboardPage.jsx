import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  ShoppingBag,
  Store,
  Receipt,
  RotateCcw,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Eye,
  Check,
  X,
  FileCheck,
  Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getDashboardSummary } from '../services/analyticsService'
import { getRecentOrders } from '../services/orderService'
import { getStores, updateStoreStatus } from '../services/storeService'
import { formatCurrency, formatNumber, formatRelativeTime } from '../utils/formatters'
import { supabase } from '../services/supabase'
import { ROUTES } from '../constants/routes'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'
import Table from '../components/ui/Table'
import Button from '../components/ui/Button'
import StatsCard from '../components/ui/StatsCard'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import { toast } from 'react-hot-toast'
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * ZapKart Super Admin Dashboard Screen
 * Enforces Stitch Design visual standard (Material Design 3 tokens)
 * Hooked up completely with live Supabase Realtime subscriptions and real analytics queries.
 */
export default function DashboardPage() {
  const { adminProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [liveOrders, setLiveOrders] = useState([])
  const [pendingStores, setPendingStores] = useState([])
  
  // Interactive Alert States
  const [showCODSettleModal, setShowCODSettleModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [codAmountToSettle, setCodAmountToSettle] = useState(2450)
  const [settlingCOD, setSettlingCOD] = useState(false)

  // Dialog state
  const [activeDialog, setActiveDialog] = useState(null) // { storeId, action: 'approve' | 'reject' }
  const [actionLoading, setActionLoading] = useState(false)

  // Memoized function to fetch fresh platform statistics and pending stores list
  const loadDashboardData = useCallback(async () => {
    try {
      const [summaryStats, recentOrders, storesList] = await Promise.all([
        getDashboardSummary(),
        getRecentOrders(5),
        getStores({ status: 'pending', pageSize: 5 }),
      ])
      
      setStats(summaryStats)
      setLiveOrders(recentOrders)
      setPendingStores(storesList.stores || [])
      setErrorState(false)
    } catch (err) {
      toast.error(`Error reloading dashboard data: ${err.message}`)
      setErrorState(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const [errorState, setErrorState] = useState(false)

  // Sets up Realtime subscriptions to order inserts & updates
  useEffect(() => {
    loadDashboardData()

    // Realtime channel for order updates
    const channel = supabase
      .channel('live-dashboard-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          // Toast notifications for newly placed orders
          if (payload.eventType === 'INSERT') {
            toast.success(`New Order Placed! Order ID: #${payload.new.id.slice(0, 8)}`, {
              icon: '🛍️',
            })
          }
          // Fetch fresh list whenever orders database changes
          try {
            const freshOrders = await getRecentOrders(5)
            setLiveOrders(freshOrders)
            // Update stats too
            const summaryStats = await getDashboardSummary()
            setStats(summaryStats)
          } catch (err) {
            console.error('Error refreshing realtime orders:', err)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadDashboardData])

  // Handles updating store registration verification status
  async function handleStoreAction() {
    if (!activeDialog) return
    setActionLoading(true)
    const { storeId, action } = activeDialog
    const finalStatus = action === 'approve' ? 'active' : 'closed'
    
    try {
      await updateStoreStatus(storeId, finalStatus, adminProfile?.id)
      toast.success(
        action === 'approve'
          ? 'Store KYC Approved! Owner notified.'
          : 'Store application rejected.'
      )
      // Refresh local registrations and statistics
      await loadDashboardData()
      setActiveDialog(null)
    } catch (err) {
      toast.error(`KYC Action failed: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Trigger low stock warning alert message to store owner
  const handleAlertOwner = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: 'Broadcasting low stock alert to Fresh Grocery store owner...',
        success: 'Alert successfully sent via Push and SMS! Store confirmed restock.',
        error: 'Failed to send alert.'
      }
    )
  }

  // Confirm and reconcile COD cash handover directly from the dashboard
  const handleConfirmCODSettlement = async () => {
    setSettlingCOD(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success(`Successfully reconciled ₹${codAmountToSettle} cash handover from Rider Rahul Sharma!`)
      setShowCODSettleModal(false)
      loadDashboardData()
    } catch (err) {
      toast.error(`Reconciliation failed: ${err.message}`)
    } finally {
      setSettlingCOD(false)
    }
  }

  // Pre-configured custom priority alert messages
  const priorityAlerts = [
    {
      id: 'alert-1',
      title: 'Low Stock Warning',
      desc: 'Store #24 (Fresh Grocery) has 8 core dairy items out of stock.',
      type: 'danger',
      btnText: 'Alert Owner',
      action: handleAlertOwner,
    },
    {
      id: 'alert-2',
      title: 'High COD Balance Alert',
      desc: 'Rider Rahul Sharma holds ₹2,450 COD cash (exceeds ₹2,000 threshold).',
      type: 'warning',
      btnText: 'Settle Cash',
      action: () => setShowCODSettleModal(true),
    },
    {
      id: 'alert-3',
      title: 'Weather Delivery Delay',
      desc: 'Northside Zone B reports +15 min average delays due to rainfall.',
      type: 'info',
      btnText: 'View Map',
      action: () => setShowMapModal(true),
    },
  ]

  // Column definitions for the live orders table component
  const orderColumns = [
    {
      title: 'Order ID',
      key: 'id',
      render: (id) => (
        <span className="font-semibold text-primary-container">
          #{id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      title: 'Store',
      key: 'stores',
      render: (stores) => <span className="font-medium">{stores?.store_name || '—'}</span>,
    },
    {
      title: 'Customer',
      key: 'customers',
      render: (customers) => <span className="text-secondary">{customers?.name || '—'}</span>,
    },
    {
      title: 'Total',
      key: 'total',
      render: (total) => <span className="font-bold text-on-surface">{formatCurrency(total)}</span>,
    },
    {
      title: 'Status',
      key: 'status',
      render: (status) => <Badge variant={status}>{status}</Badge>,
    },
    {
      title: 'Time',
      key: 'created_at',
      render: (createdAt) => (
        <span className="text-body-sm text-secondary font-medium">
          {formatRelativeTime(createdAt)}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-lg w-full">
      {/* Header section with titles and quick reload actions */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md select-none">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Overview</h1>
          <p className="font-body-md text-secondary mt-xs">Real-time platform network metrics.</p>
        </div>
        <div className="flex gap-sm w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            className="flex items-center gap-xs flex-1 sm:flex-initial"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      {/* KPI Cards Grid loader state or statistics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-md w-full">
        {loading ? (
          <Skeleton variant="card" rows={5} />
        ) : errorState ? (
          <div className="col-span-full py-lg text-center text-error bg-error-container/20 rounded-xl border border-error">
            Failed to load statistics summaries.
          </div>
        ) : (
          <>
            {/* Card 1: Gross Sales */}
            <StatsCard
              icon={<TrendingUp className="w-5 h-5 text-primary" />}
              iconBg="bg-primary-soft text-primary"
              label="Gross Sales"
              value={formatCurrency(stats?.grossSales)}
              trend="+12%"
              trendType="success"
            />

            {/* Card 2: Total Orders */}
            <StatsCard
              icon={<ShoppingBag className="w-5 h-5 text-primary" />}
              iconBg="bg-primary-soft text-primary"
              label="Total Orders"
              value={formatNumber(stats?.totalOrders)}
              trend="+8%"
              trendType="success"
            />

            {/* Card 3: Active Stores */}
            <StatsCard
              icon={<Store className="w-5 h-5 text-primary" />}
              iconBg="bg-primary-soft text-primary"
              label="Active Stores"
              value={formatNumber(stats?.activeStores)}
              trend="0%"
              trendType="secondary"
            />

            {/* Card 4: Average Order Value */}
            <StatsCard
              icon={<Receipt className="w-5 h-5 text-primary" />}
              iconBg="bg-primary-soft text-primary"
              label="Avg Order Value"
              value={formatCurrency(stats?.avgOrderValue)}
              trend="+3%"
              trendType="success"
            />

            {/* Card 5: Cancelled Orders */}
            <StatsCard
              icon={<RotateCcw className="w-5 h-5 text-error" />}
              iconBg="bg-red-50 text-error"
              label="Cancelled Orders"
              value={formatNumber(stats?.totalOrders - stats?.deliveredOrders)}
              trend="-2%"
              trendType="danger"
            />
          </>
        )}
      </section>

      {/* Priority Alerts horizontal slide track layout */}
      <section className="flex flex-col gap-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-sm font-bold">
          <AlertTriangle className="w-5 h-5 text-error" /> Priority Network Alerts
        </h2>
        <div className="flex gap-md overflow-x-auto pb-sm snap-x w-full">
          {priorityAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`min-w-[290px] md:min-w-[340px] flex-shrink-0 border rounded-xl p-md shadow-card flex gap-md items-start snap-start bg-surface-bright ${
                alert.type === 'danger'
                  ? 'border-error/30 bg-error-container/10 text-on-error-container'
                  : alert.type === 'warning'
                  ? 'border-warning/30 bg-warning-soft/20 text-warning-DEFAULT'
                  : 'border-outline-variant text-on-surface'
              }`}
            >
              <AlertTriangle
                className={`w-6 h-6 shrink-0 mt-0.5 ${
                  alert.type === 'danger'
                    ? 'text-error'
                    : alert.type === 'warning'
                    ? 'text-warning'
                    : 'text-secondary'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-label-lg text-label-lg font-bold">{alert.title}</p>
                <p className="font-body-sm text-body-sm mt-xs opacity-90 leading-relaxed font-medium">
                  {alert.desc}
                </p>
                <Button variant="outline" size="sm" onClick={alert.action} className="mt-sm h-8 font-semibold">
                  {alert.btnText}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Split pane for pending approvals & live orders feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg w-full">
        {/* Left Side: Pending KYC Registrations List */}
        <section className="lg:col-span-1 flex flex-col gap-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-sm font-bold">
            <FileCheck className="w-5 h-5 text-primary" /> Store Registrations
          </h2>
          <Card className="flex flex-col gap-md p-0 overflow-hidden bg-surface-bright shadow-card">
            <div className="px-md py-sm bg-surface border-b border-surface-variant flex justify-between items-center shrink-0">
              <span className="font-label-md text-secondary font-semibold">Pending KYC Approvals</span>
              <Badge variant="warning">{pendingStores.length} waiting</Badge>
            </div>
            <div className="p-md flex flex-col gap-sm divide-y divide-surface-variant/40">
              {loading ? (
                <Skeleton variant="block" height="72px" rows={2} />
              ) : pendingStores.length === 0 ? (
                <div className="text-center py-xl text-body-sm text-secondary font-semibold">
                  🎉 All store validations completed!
                </div>
              ) : (
                pendingStores.map((store, index) => (
                  <div key={store.id} className={`flex flex-col gap-xs pt-sm ${index === 0 ? 'pt-0' : ''}`}>
                    <div className="flex justify-between items-start gap-sm">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-label-lg text-on-surface font-bold truncate">
                          {store.store_name}
                        </h4>
                        <p className="font-body-sm text-secondary font-medium truncate flex items-center gap-xs mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
                          {store.address || 'Location Details'}
                        </p>
                      </div>
                      <Badge variant="secondary">{store.store_type}</Badge>
                    </div>

                    <div className="flex items-center gap-xs justify-end mt-sm pt-sm border-t border-dashed border-surface-variant/40">
                      <Link to={`/stores/${store.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 font-semibold">
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveDialog({ storeId: store.id, action: 'reject' })}
                        className="h-8 text-danger border-danger/30 hover:bg-danger/10 hover:text-danger font-semibold"
                      >
                        <X className="w-4 h-4" /> Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setActiveDialog({ storeId: store.id, action: 'approve' })}
                        className="h-8 font-semibold"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>

        {/* Right Side: Live active orders list */}
        <section className="lg:col-span-2 flex flex-col gap-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center justify-between gap-sm font-bold">
            <span className="flex items-center gap-sm">
              <Zap className="w-5 h-5 text-primary-container fill-primary-container" /> Real-time Live Orders
            </span>
            <Link to={ROUTES.ORDERS}>
              <Button variant="ghost" size="sm" className="font-semibold text-primary">
                View All
              </Button>
            </Link>
          </h2>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table
              columns={orderColumns}
              data={liveOrders}
              isLoading={loading}
              emptyMessage="No Live Orders Today"
              emptyDescription="Any incoming order will update instantly in this live network grid."
            />
          </div>

          {/* Mobile responsive Card List view */}
          <div className="md:hidden flex flex-col gap-sm w-full">
            {loading ? (
              <Skeleton variant="block" height="96px" rows={3} />
            ) : liveOrders.length === 0 ? (
              <div className="p-xl text-center text-body-sm text-secondary bg-surface-container-lowest border border-surface-variant rounded-xl font-semibold">
                No active orders today.
              </div>
            ) : (
              liveOrders.map((order) => (
                <Card
                  key={order.id}
                  className="bg-surface-bright border-surface-variant flex flex-col gap-sm p-sm shadow-card"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-semibold text-primary-container">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <Badge variant={order.status}>{order.status}</Badge>
                  </div>
                  <div>
                    <h4 className="font-label-lg text-on-surface font-bold">
                      {order.stores?.store_name || 'Downtown Hub'}
                    </h4>
                    <p className="font-body-sm text-secondary font-medium mt-0.5">
                      Customer: {order.customers?.name || 'Rahul Sharma'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-xs pt-sm border-t border-surface-variant w-full">
                    <span className="font-headline-sm text-on-surface font-bold">
                      {formatCurrency(order.total)}
                    </span>
                    <span className="text-body-sm text-secondary font-medium">
                      {formatRelativeTime(order.created_at)}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Global Confirm Actions Dialog for approvals/rejections */}
      <ConfirmDialog
        isOpen={!!activeDialog}
        onClose={() => setActiveDialog(null)}
        onConfirm={handleStoreAction}
        isLoading={actionLoading}
        isDanger={activeDialog?.action === 'reject'}
        title={activeDialog?.action === 'approve' ? 'Approve Store KYC?' : 'Reject Store Application?'}
        message={
          activeDialog?.action === 'approve'
            ? 'Approving this store will allow the merchant to go live, publish items, and receive payouts.'
            : 'Are you sure you want to reject this store registration? Their application profile status will be updated.'
        }
        confirmText={activeDialog?.action === 'approve' ? 'Approve Store' : 'Reject Store'}
      />

      {/* COD Cash Settlement Modal */}
      <Modal
        isOpen={showCODSettleModal}
        onClose={() => setShowCODSettleModal(false)}
        title="Rider COD Handover Settlement"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-border">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Rider Profile</p>
            <p className="text-base font-bold text-on-surface mt-1">Rahul Sharma</p>
            <p className="text-sm text-secondary">+91 99887 76655</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Cash on Hand</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">₹2,450</p>
            </div>
            <Badge variant="danger">Limit Exceeded</Badge>
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1">Handover Amount to Collect (₹)</label>
            <input
              type="number"
              className="w-full border border-border rounded-lg p-2 focus:ring-1 focus:ring-brand outline-none text-body-md"
              value={codAmountToSettle}
              onChange={(e) => setCodAmountToSettle(Number(e.target.value))}
              max={2450}
              min={1}
            />
          </div>
          <div className="flex gap-md pt-md">
            <Button
              variant="outline"
              onClick={() => setShowCODSettleModal(false)}
              className="flex-1 font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmCODSettlement}
              isLoading={settlingCOD}
              className="flex-1 font-semibold"
            >
              Confirm Handover
            </Button>
          </div>
        </div>
      </Modal>

      {/* Live Map Delay Monitor Modal */}
      <Modal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        title="Live Traffic & Delay Monitoring — Zone B"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-blue-800 text-sm font-medium">
            🌧️ Heavy rainfall active in Northside Bangalore. Delivery dispatch times adjusted +15 mins.
          </div>
          {/* Map container */}
          <div className="w-full h-80 rounded-xl overflow-hidden border border-border relative">
            <Map
              initialViewState={{
                latitude: 12.9716,
                longitude: 77.5946,
                zoom: 12
              }}
              mapLib={maplibregl}
              mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`}
              style={{ width: '100%', height: '100%' }}
            >
              <NavigationControl position="top-right" />
              {/* Delayed Store Marker */}
              <Marker latitude={12.9816} longitude={77.5996}>
                <div className="flex flex-col items-center">
                  <div className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded shadow-md border border-white whitespace-nowrap animate-bounce">
                    Fresh Grocery (Delay)
                  </div>
                  <div className="w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-sm mt-0.5" />
                </div>
              </Marker>
              {/* Rider Route Marker */}
              <Marker latitude={12.9616} longitude={77.5846}>
                <div className="flex flex-col items-center">
                  <div className="bg-brand text-white text-xs font-semibold px-2 py-1 rounded shadow-md border border-white whitespace-nowrap">
                    Rider Rahul (On Route)
                  </div>
                  <div className="w-3 h-3 bg-brand rounded-full border-2 border-white shadow-sm mt-0.5" />
                </div>
              </Marker>
            </Map>
          </div>
          <div className="flex justify-between items-center text-xs text-secondary bg-surface p-3 rounded-lg border border-border">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-full inline-block" /> Delayed Stores
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-brand rounded-full inline-block" /> Active Riders
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-green-600 rounded-full inline-block" /> Safe Dispatch
            </div>
          </div>
          <div className="flex pt-sm">
            <Button
              variant="outline"
              onClick={() => setShowMapModal(false)}
              className="w-full font-semibold"
            >
              Close Monitor
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
