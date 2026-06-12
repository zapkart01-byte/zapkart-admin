import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Star, Phone, MapPin, Clock, Truck, User, Edit2,
  MessageSquare, Ban, CheckCircle, Package, FileText, Settings,
  TrendingUp, ShoppingBag, Receipt, Percent, ExternalLink,
  Store as StoreIcon, Shield, AlertTriangle, Trash2, Flag, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getStoreById,
  updateStoreStatus,
  getStoreStats,
  getStoreDocuments,
  verifyStoreDocument,
  updateStore
} from '../services/storeService'
import {
  getProducts,
  flagProduct,
  removeProduct
} from '../services/productService'
import { getOrders } from '../services/orderService'
import { supabase } from '../services/supabase'
import { formatCurrency, formatDate, formatPhone, formatNumber } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Card from '../components/ui/Card'
import Toggle from '../components/ui/Toggle'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import Table from '../components/ui/Table'
import StatsCard from '../components/ui/StatsCard'
import StoreLocationMap from '../components/stores/StoreLocationMap'
import KYCDocumentViewer from '../components/riders/KYCDocumentViewer'

/**
 * ZapKart Admin — Store Detail Page
 * Matching the Stitch store_detail_fresh_mart design.
 * Sections: Header card, Quick Stats, Tabbed Content (6 PRD tabs + operational tabs).
 */

const TABS = [
  { key: 'overview', label: 'Overview', icon: TrendingUp },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'orders', label: 'Orders', icon: ShoppingBag },
  { key: 'riders', label: 'Riders', icon: User },
  { key: 'payouts', label: 'Payouts', icon: Receipt },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'kyc', label: 'KYC Documents', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings },
]

// Maps store status to Badge variant
function statusVariant(status) {
  const map = { active: 'success', pending: 'warning', suspended: 'danger', closed: 'secondary' }
  return map[status?.toLowerCase()] || 'secondary'
}

export default function StoreDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [store, setStore] = useState(null)
  const [stats, setStats] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [confirmDialog, setConfirmDialog] = useState(null)

  // Fetch store data, stats, and documents in parallel
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [storeData, storeStats, storeDocs] = await Promise.allSettled([
        getStoreById(id),
        getStoreStats(id),
        getStoreDocuments(id),
      ])
      if (storeData.status === 'fulfilled') setStore(storeData.value)
      else throw new Error(storeData.reason?.message || 'Store not found')
      if (storeStats.status === 'fulfilled') setStats(storeStats.value)
      if (storeDocs.status === 'fulfilled') setDocuments(storeDocs.value || [])
    } catch (err) {
      console.error(err)
      toast.error('Could not load store details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id === 'new') {
      navigate('/stores', { replace: true })
      return
    }
    fetchAll()
  }, [fetchAll, id, navigate])

  // Handle status change
  const handleStatusAction = (newStatus) => {
    const labels = { active: 'activate', suspended: 'suspend', closed: 'close' }
    setConfirmDialog({
      title: `${labels[newStatus]?.charAt(0).toUpperCase() + labels[newStatus]?.slice(1)} Store`,
      message: `Are you sure you want to ${labels[newStatus]} "${store?.store_name}"?${newStatus === 'suspended' ? ' They will not receive new orders.' : ''}`,
      variant: newStatus === 'active' ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          await updateStoreStatus(id, newStatus, 'admin')
          toast.success(`Store ${labels[newStatus]}d successfully`)
          fetchAll()
        } catch (err) {
          toast.error(`Failed: ${err.message}`)
        }
        setConfirmDialog(null)
      },
    })
  }

  // Handle KYC doc verification toggle
  const handleVerifyDoc = async (docId, currentVerified) => {
    try {
      await verifyStoreDocument(docId, !currentVerified)
      toast.success(currentVerified ? 'Document marked pending' : 'Document verified successfully')
      const updated = await getStoreDocuments(id)
      setDocuments(updated || [])
    } catch (err) {
      toast.error(`Verification failed: ${err.message}`)
    }
  }

  // Handle setting updates (e.g. commission rate)
  const handleUpdateStore = async (updates) => {
    try {
      const updated = await updateStore(id, updates)
      setStore(updated)
      toast.success('Store configuration updated successfully')
    } catch (err) {
      toast.error(`Update failed: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-fade-in">
        <StoreIcon className="w-16 h-16 text-secondary opacity-40" />
        <h2 className="text-headline-md text-on-surface">Store Not Found</h2>
        <p className="text-body-md text-secondary">The requested store could not be loaded.</p>
        <button
          onClick={() => navigate('/stores')}
          className="mt-2 px-6 py-2.5 rounded-full bg-primary text-on-primary font-label-lg transition-colors hover:bg-primary-container"
        >
          Back to Stores
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* ─── Breadcrumb ─── */}
      <nav className="flex items-center gap-2 mb-6 text-body-sm text-secondary">
        <Link
          to="/stores"
          className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Stores
        </Link>
        <span className="text-tertiary">→</span>
        <span className="font-semibold text-on-surface">{store.store_name || 'Store Detail'}</span>
      </nav>

      {/* ─── Store Header Card ─── */}
      <div className="bg-surface-container-lowest rounded-xl shadow-card border border-surface-variant p-5 mb-6 flex flex-col lg:flex-row gap-6">
        {/* Left: Store photos */}
        <div className="flex gap-2 shrink-0">
          <div className="relative w-40 h-24 rounded-xl overflow-hidden bg-surface-container group border border-surface-variant">
            {store.logo_url ? (
              <img src={store.logo_url} alt="Store Front" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <StoreIcon className="w-10 h-10 text-secondary opacity-40" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 text-white text-label-sm">
              Store Front
            </div>
          </div>
        </div>

        {/* Middle: Store details */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-headline-lg text-on-surface">{store.store_name}</h2>
            <span className="px-2 py-1 bg-surface-container-low text-secondary font-label-md rounded-md">
              {store.store_type || 'General Store'} · {store.city || 'Location N/A'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-body-sm text-secondary">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 shrink-0" />
              <span>
                {store.owner_name || '—'} ·{' '}
                <a href={`tel:${store.owner_phone}`} className="text-primary hover:underline font-medium">
                  {formatPhone(store.owner_phone)}
                </a>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{store.address || '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{store.opening_time || '8:00 AM'} – {store.closing_time || '10:00 PM'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 shrink-0" />
              <span>Delivery radius: {store.delivery_radius || 2} km</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-1 pt-2 border-t border-surface-variant font-label-md text-label-md">
            <div className="text-secondary">
              Joined: <span className="text-on-surface">{formatDate(store.created_at)}</span>
            </div>
            {store.gstin && (
              <div className="text-secondary">
                GSTIN: <span className="text-on-surface">{store.gstin}</span>
              </div>
            )}
            <div className="text-secondary flex items-center gap-1">
              Commission: <span className="text-on-surface font-bold">{store.commission_rate || 18}%</span>
            </div>
          </div>
        </div>

        {/* Right: Status & Actions */}
        <div className="flex flex-col items-end justify-between gap-4 border-t lg:border-t-0 lg:border-l border-surface-variant pt-4 lg:pt-0 lg:pl-6 shrink-0">
          <div className="flex items-center gap-4 w-full justify-between lg:justify-end">
            <div className="text-label-lg text-on-surface flex items-center gap-1.5">
              <span className="text-primary font-bold">{store.rating?.toFixed(1) || '—'}</span>
              <Star className="w-4 h-4 text-[#FBBC04] fill-[#FBBC04]" />
              <span className="text-secondary font-normal text-body-sm">
                ({formatNumber(store.total_reviews || 0)} reviews)
              </span>
            </div>
            <Badge variant={statusVariant(store.status)} className="text-label-md px-3 py-1">
              <span className="text-[8px] leading-none mr-1">●</span>
              {store.status}
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto mt-auto">
            <button className="px-4 py-2 border border-secondary text-secondary font-label-lg rounded-full hover:bg-surface-container-low transition-colors w-full lg:w-auto min-h-[44px] flex items-center justify-center gap-1.5">
              <MessageSquare className="w-4 h-4" /> Send Message
            </button>
            {store.status === 'active' ? (
              <button
                onClick={() => handleStatusAction('suspended')}
                className="px-4 py-2 border border-danger text-danger font-label-lg rounded-full hover:bg-danger/10 transition-colors w-full lg:w-auto min-h-[44px] flex items-center justify-center gap-1.5"
              >
                <Ban className="w-4 h-4" /> Suspend Store
              </button>
            ) : (
              <button
                onClick={() => handleStatusAction('active')}
                className="px-4 py-2 border border-success text-success font-label-lg rounded-full hover:bg-success/10 transition-colors w-full lg:w-auto min-h-[44px] flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> Activate Store
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Quick Stats Row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          iconBg="bg-primary-soft text-primary"
          label="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          valueClass="text-primary font-bold"
        />
        <StatsCard
          icon={<ShoppingBag className="w-5 h-5 text-primary" />}
          iconBg="bg-primary-soft text-primary"
          label="Total Orders"
          value={formatNumber(stats?.totalOrders || 0)}
        />
        <StatsCard
          icon={<Receipt className="w-5 h-5 text-primary" />}
          iconBg="bg-primary-soft text-primary"
          label="Delivered"
          value={formatNumber(stats?.deliveredOrders || 0)}
        />
        <StatsCard
          icon={<Percent className="w-5 h-5 text-success" />}
          iconBg="bg-success/10 text-success"
          label="Completion Rate"
          value={stats?.totalOrders ? `${Math.round((stats.deliveredOrders / stats.totalOrders) * 100)}%` : '—'}
        />
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="flex gap-1 border-b border-surface-variant mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 font-label-lg text-label-lg transition-colors whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-secondary hover:text-on-surface hover:border-surface-variant'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ─── Tab Content ─── */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <OverviewTab store={store} stats={stats} onUpdate={handleUpdateStore} onStatusAction={handleStatusAction} />
        )}
        {activeTab === 'products' && <ProductsTab storeId={id} />}
        {activeTab === 'orders' && <OrdersTab storeId={id} />}
        {activeTab === 'riders' && <RidersTab storeId={id} />}
        {activeTab === 'payouts' && <PayoutsTab storeId={id} />}
        {activeTab === 'reviews' && <ReviewsTab store={store} />}
        {activeTab === 'kyc' && <KycTab documents={documents} onVerify={handleVerifyDoc} />}
        {activeTab === 'settings' && <SettingsTab store={store} onUpdate={handleUpdateStore} />}
      </div>

      {/* ─── Confirm Dialog ─── */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel="Confirm"
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}

/* ═══════ Sub-Components ═══════ */

// Stat card for the quick stats row
function StatCard({ icon, iconBg, label, value, valueClass = 'text-on-surface' }) {
  return (
    <div className="bg-surface-container-lowest rounded-lg border border-surface-variant p-4 shadow-card flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-label-md text-secondary mb-0.5">{label}</p>
        <p className={`text-headline-md font-bold ${valueClass}`}>{value}</p>
      </div>
    </div>
  )
}

// Overview tab content
function OverviewTab({ store, stats, onUpdate, onStatusAction }) {
  // Local store open/closed toggles
  const isOpen = store.is_open ?? true

  const handleOpenToggle = async (checked) => {
    try {
      await onUpdate({ is_open: checked })
      toast.success(checked ? 'Store marked Open' : 'Store marked Closed')
    } catch (err) {
      toast.error('Failed to update operational status')
    }
  }

  const handleActiveToggle = (checked) => {
    if (!checked) {
      onStatusAction('suspended')
    } else {
      onStatusAction('active')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* Left Column: Store Information & Location Map */}
      <div className="flex flex-col gap-6">
        <Card className="p-5 flex flex-col gap-4">
          <h3 className="text-headline-sm text-on-surface flex items-center gap-2 font-bold border-b border-surface-variant pb-2">
            <StoreIcon className="w-5 h-5 text-primary" /> Store Information
          </h3>
          <div className="space-y-3 text-body-md">
            <InfoRow label="Store Name" value={store.store_name} />
            <InfoRow label="Owner" value={store.owner_name} />
            <InfoRow label="Phone" value={formatPhone(store.owner_phone)} />
            <InfoRow label="Email" value={store.owner_email || '—'} />
            <InfoRow label="Type" value={store.store_type || 'General Store'} />
            <InfoRow label="Address" value={store.address || '—'} />
            <InfoRow label="City" value={store.city || '—'} />
            <InfoRow label="PIN Code" value={store.pincode || '—'} />
            <InfoRow label="Delivery Radius" value={`${store.delivery_radius || 2} km`} />
            <InfoRow label="Commission Rate" value={`${store.commission_rate || 18}%`} />
            <InfoRow label="GSTIN" value={store.gstin || '—'} />
            <InfoRow label="FSSAI" value={store.fssai_number || '—'} />
            <InfoRow label="Joined" value={formatDate(store.created_at)} />
          </div>
        </Card>

        {store.lat && store.lng && (
          <Card className="p-5 flex flex-col gap-4 border border-surface-variant shadow-card">
            <h3 className="text-headline-sm text-on-surface flex items-center gap-2 font-bold border-b border-surface-variant pb-2">
              <MapPin className="w-5 h-5 text-primary" /> Store Location
            </h3>
            <StoreLocationMap latitude={store.lat} longitude={store.lng} storeName={store.store_name} />
          </Card>
        )}
      </div>

      {/* Control Panel & Performance */}
      <div className="flex flex-col gap-6">
        {/* Quick Toggles */}
        <Card className="p-5 flex flex-col gap-4">
          <h3 className="text-headline-sm text-on-surface flex items-center gap-2 font-bold border-b border-surface-variant pb-2">
            <Shield className="w-5 h-5 text-primary" /> Operational Controls
          </h3>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex justify-between items-center bg-surface-container-low p-3 rounded-xl border border-surface-variant">
              <div>
                <p className="text-label-lg text-on-surface">Store Open Status</p>
                <p className="text-body-sm text-secondary">Control if this store is accepting orders online today.</p>
              </div>
              <Toggle checked={isOpen} onChange={handleOpenToggle} label={isOpen ? 'OPEN' : 'CLOSED'} />
            </div>

            <div className="flex justify-between items-center bg-surface-container-low p-3 rounded-xl border border-surface-variant">
              <div>
                <p className="text-label-lg text-on-surface">Store Approval / Access</p>
                <p className="text-body-sm text-secondary">Quickly suspend or approve this merchant account.</p>
              </div>
              <Toggle
                checked={store.status === 'active'}
                onChange={handleActiveToggle}
                label={store.status === 'active' ? 'ACTIVE' : 'SUSPENDED'}
              />
            </div>
          </div>
        </Card>

        {/* Performance Summary */}
        <Card className="p-5">
          <h3 className="text-headline-sm text-on-surface flex items-center gap-2 font-bold border-b border-surface-variant pb-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" /> Performance Summary
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-primary-fixed/30 rounded-lg">
              <span className="text-label-lg text-secondary">Total Revenue</span>
              <span className="text-headline-md text-primary font-bold">{formatCurrency(stats?.totalRevenue || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
              <span className="text-label-lg text-secondary">Total Orders</span>
              <span className="text-headline-md text-on-surface font-bold">{formatNumber(stats?.totalOrders || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
              <span className="text-label-lg text-secondary">Delivered Orders</span>
              <span className="text-headline-md text-on-surface font-bold">{formatNumber(stats?.deliveredOrders || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
              <span className="text-label-lg text-secondary">Completion Rate</span>
              <span className="text-headline-md text-success font-bold">
                {stats?.totalOrders ? `${Math.round((stats.deliveredOrders / stats.totalOrders) * 100)}%` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
              <span className="text-label-lg text-secondary">Average Rating</span>
              <span className="text-headline-md text-on-surface font-bold flex items-center gap-1">
                {store.rating?.toFixed(1) || '—'}
                <Star className="w-4 h-4 text-[#FBBC04] fill-[#FBBC04]" />
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Simple info row inside a detail card
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-surface-variant last:border-0">
      <span className="text-secondary font-medium text-body-sm shrink-0 w-32">{label}</span>
      <span className="text-on-surface text-right break-words">{value || '—'}</span>
    </div>
  )
}

// KYC Documents tab with slider toggles using the reusable KYCDocumentViewer
function KycTab({ documents, onVerify }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <FileText className="w-16 h-16 text-secondary opacity-30 mb-4" />
        <h3 className="text-headline-sm text-on-surface mb-1">No KYC Documents</h3>
        <p className="text-body-md text-secondary">This store has not uploaded any verification documents yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {documents.map((doc) => (
        <KYCDocumentViewer key={doc.id} document={doc} onVerify={onVerify} />
      ))}
    </div>
  )
}

// Products tab with MRP Pricing Violation tracking & sort, flags & deactivation
function ProductsTab({ storeId }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [flagModal, setFlagModal] = useState(null) // holds product object when flagging
  const [flagReason, setFlagReason] = useState('')
  const [confirmDialog, setConfirmDialog] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getProducts({ storeId, isActive: true, pageSize: 100 }) // Load up to 100 products for review catalog
      const items = res.products || []

      // Sort: Price Violation (store_price > platform_mrp) first, then by created_at descending
      const sorted = [...items].sort((a, b) => {
        const violationA = (a.store_price || 0) > (a.platform_mrp || 0)
        const violationB = (b.store_price || 0) > (b.platform_mrp || 0)
        if (violationA && !violationB) return -1
        if (!violationA && violationB) return 1
        return new Date(b.created_at) - new Date(a.created_at)
      })

      setProducts(sorted)
    } catch (err) {
      toast.error('Failed to load store products catalog')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Handle flag product action
  const handleFlagProduct = async () => {
    if (!flagReason.trim()) {
      toast.error('Please enter a reason for flagging this listing.')
      return
    }
    try {
      await flagProduct(flagModal.id, flagReason, 'admin')
      toast.success('Product listing has been successfully flagged for revision')
      setFlagModal(null)
      setFlagReason('')
      fetchProducts()
    } catch (err) {
      toast.error(`Action failed: ${err.message}`)
    }
  }

  // Handle remove/deactivate product listing action
  const handleRemoveProduct = (product) => {
    setConfirmDialog({
      title: 'Remove Product Listing',
      message: `Are you sure you want to deactivate and remove the catalog listing for "${product.name}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await removeProduct(product.id, 'admin')
          toast.success('Product listing removed from database successfully')
          fetchProducts()
        } catch (err) {
          toast.error(`Deactivation failed: ${err.message}`)
        }
        setConfirmDialog(null)
      },
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="md" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <Package className="w-16 h-16 text-secondary opacity-30 mb-4" />
        <h3 className="text-headline-sm text-on-surface mb-1">No Products Assigned</h3>
        <p className="text-body-md text-secondary">This store hasn't uploaded or been mapped to any products yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Informational Warning Alert */}
      <div className="flex gap-3 bg-warning/15 border border-warning/30 p-4 rounded-xl text-body-md text-on-surface-variant shadow-sm">
        <AlertTriangle className="text-warning w-5 h-5 shrink-0" />
        <div>
          <p className="font-semibold text-on-surface">Compliance Catalog Review</p>
          <p className="text-body-sm text-secondary mt-0.5">
            Store pricing must NEVER exceed the legally declared Platform MRP (Maximum Retail Price). Listings violating this statutory mandate are automatically sorted to the top and highlighted in red for action.
          </p>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-variant text-secondary font-label-sm uppercase">
                <th className="p-4 font-semibold">Product Name</th>
                <th className="p-4 font-semibold">SKU / ID</th>
                <th className="p-4 font-semibold">Store Price</th>
                <th className="p-4 font-semibold">Platform MRP</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant">
              {products.map((product) => {
                const isViolation = (product.store_price || 0) > (product.platform_mrp || 0)
                return (
                  <tr
                    key={product.id}
                    className={`transition-colors ${
                      isViolation
                        ? 'bg-red-50/70 hover:bg-red-100/70 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                        : 'hover:bg-surface-container-lowest'
                    }`}
                  >
                    <td className="p-4 font-medium text-on-surface">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-secondary" />
                          )}
                        </div>
                        <div>
                          <div className="text-label-lg font-semibold">{product.name}</div>
                          {isViolation && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-danger font-semibold bg-red-100/80 px-2 py-0.5 rounded-full mt-1 border border-danger/20">
                              <AlertTriangle className="w-3 h-3" /> Price exceeds MRP!
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-body-sm text-secondary font-medium">
                      {product.sku || product.id?.slice(0, 8).toUpperCase()}
                    </td>
                    <td className={`p-4 text-headline-sm font-bold ${isViolation ? 'text-danger' : 'text-on-surface'}`}>
                      {formatCurrency(product.store_price || 0)}
                    </td>
                    <td className="p-4 text-body-md text-secondary font-semibold">
                      {formatCurrency(product.platform_mrp || 0)}
                    </td>
                    <td className="p-4">
                      {product.is_flagged ? (
                        <Badge variant="warning">Flagged</Badge>
                      ) : product.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!product.is_flagged && (
                          <button
                            onClick={() => setFlagModal(product)}
                            className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-warning"
                            title="Flag listing for review"
                          >
                            <Flag className="w-4.5 h-4.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveProduct(product)}
                          className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-danger"
                          title="Deactivate listing"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flag Reason Modal */}
      {flagModal && (
        <Modal
          isOpen={true}
          onClose={() => setFlagModal(null)}
          title="Flag Product Listing"
        >
          <div className="space-y-4 py-2">
            <p className="text-body-md text-secondary">
              State the reason why product <span className="font-semibold text-on-surface">"{flagModal.name}"</span> is being flagged for moderation. This will notify the store merchant dashboard immediately.
            </p>
            <Input
              id="flag-reason-input"
              label="Moderation Reason"
              placeholder="e.g. Price exceeds platform MRP / Mismatched imagery..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              error={!flagReason.trim() ? 'A valid explanation is required' : ''}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFlagModal(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleFlagProduct} className="bg-primary text-white">Flag Listing</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Deactivation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel="Confirm"
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}

// Settings Tab (Override store commission rates, radius, times)
function SettingsTab({ store, onUpdate }) {
  const [commission, setCommission] = useState(store.commission_rate || 18)
  const [radius, setRadius] = useState(store.delivery_radius || 2)
  const [minOrder, setMinOrder] = useState(store.min_order_amount || 0)
  const [openTime, setOpenTime] = useState(store.opening_time || '08:00')
  const [closeTime, setCloseTime] = useState(store.closing_time || '22:00')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onUpdate({
        commission_rate: parseFloat(commission),
        delivery_radius: parseFloat(radius),
        min_order_amount: parseFloat(minOrder),
        opening_time: openTime,
        closing_time: closeTime,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <Card className="p-6">
        <h3 className="text-headline-sm text-on-surface mb-4 flex items-center gap-2 font-bold border-b border-surface-variant pb-2">
          <Settings className="w-5 h-5 text-primary" /> Store Configuration
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="commission-input"
              type="number"
              label="Override Commission Rate (%)"
              min="0"
              max="100"
              step="0.1"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              required
            />
            <Input
              id="radius-input"
              type="number"
              label="Delivery Radius (km)"
              min="0.1"
              step="0.1"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              required
            />
          </div>

          <Input
            id="minorder-input"
            type="number"
            label="Minimum Order Value (₹)"
            min="0"
            step="1"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="opentime-input"
              type="time"
              label="Opening Time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              required
            />
            <Input
              id="closetime-input"
              type="time"
              label="Closing Time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              required
            />
          </div>

          <div className="pt-4 border-t border-surface-variant flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              className="bg-primary text-white px-6 min-h-[44px]"
            >
              {saving ? 'Saving Config...' : 'Apply Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// Store-scoped orders list tab with status filters and paginated table
function OrdersTab({ storeId }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const pageSize = 10

  // Fetches orders for this store matching current status filters and page
  const fetchStoreOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getOrders({
        storeId,
        status: statusFilter,
        page,
        pageSize
      })
      setOrders(res.orders || [])
      setTotal(res.total || 0)
    } catch (err) {
      setError(err.message)
      toast.error('Could not load store orders.')
    } finally {
      setLoading(false)
    }
  }, [storeId, statusFilter, page])

  useEffect(() => {
    fetchStoreOrders()
  }, [fetchStoreOrders])

  // Handles changing the active order status filter category
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status)
    setPage(1)
  }

  // Column specs for store orders table
  const columns = [
    {
      title: 'Order ID',
      key: 'id',
      render: (id) => (
        <Link to={`/orders/${id}`} className="font-semibold text-primary hover:underline">
          #{id.slice(0, 8).toUpperCase()}
        </Link>
      )
    },
    {
      title: 'Customer',
      key: 'customers',
      render: (c) => <span className="font-medium text-on-surface">{c?.name || '—'}</span>
    },
    {
      title: 'Date',
      key: 'created_at',
      render: (date) => <span className="text-secondary">{formatDate(date)}</span>
    },
    {
      title: 'Payment',
      key: 'payment_method',
      render: (method) => <Badge variant={method === 'cod' ? 'warning' : 'info'}>{method?.toUpperCase()}</Badge>
    },
    {
      title: 'Total',
      key: 'total',
      render: (total) => <span className="font-bold text-on-surface">{formatCurrency(total)}</span>
    },
    {
      title: 'Status',
      key: 'status',
      render: (status) => <Badge variant={status}>{status}</Badge>
    }
  ]

  const orderStatuses = ['all', 'placed', 'confirmed', 'packed', 'picked', 'out_for_delivery', 'delivered', 'cancelled']

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton variant="table" rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertTriangle className="w-12 h-12 text-danger" />
        <p className="text-body-md text-secondary">Failed to load orders: {error}</p>
        <Button variant="outline" onClick={fetchStoreOrders}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Horizontal scrolling status filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {orderStatuses.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusFilterChange(status)}
            className={`px-4 py-1.5 rounded-full font-label-md text-label-md transition-colors whitespace-nowrap ${
              statusFilter === status
                ? 'bg-primary text-white font-semibold'
                : 'bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {status.replace(/_/g, ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Orders table container */}
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-card overflow-hidden">
        <Table
          columns={columns}
          data={orders}
          isLoading={loading}
          emptyMessage="No Orders Found"
          emptyDescription="This store has not processed any orders matching this filter."
        />
        {total > pageSize && (
          <div className="p-4 border-t border-surface-variant flex justify-end">
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Store-scoped delivery riders tab listing riders who delivered for this store
function RidersTab({ storeId }) {
  const [riders, setRiders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetches unique riders who have fulfilled orders for this store
  const fetchStoreRiders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('orders')
        .select('rider_id, riders:rider_id(*)')
        .eq('store_id', storeId)
        .not('rider_id', 'is', null)

      if (fetchErr) throw fetchErr

      // Deduplicates riders and tallies their total deliveries completed for this store
      const ridersMap = {}
      data.forEach((item) => {
        if (item.riders) {
          const rId = item.riders.id
          if (!ridersMap[rId]) {
            ridersMap[rId] = {
              ...item.riders,
              storeDeliveries: 1
            }
          } else {
            ridersMap[rId].storeDeliveries += 1
          }
        }
      })

      setRiders(Object.values(ridersMap))
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load store riders.')
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchStoreRiders()
  }, [fetchStoreRiders])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton variant="card" rows={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertTriangle className="w-12 h-12 text-danger" />
        <p className="text-body-md text-secondary">Failed to load riders: {error}</p>
        <Button variant="outline" onClick={fetchStoreRiders}>Retry</Button>
      </div>
    )
  }

  if (riders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm">
        <User className="w-16 h-16 text-secondary opacity-30 mb-4" />
        <h3 className="text-headline-sm text-on-surface mb-1 font-bold">No Riders Mapped</h3>
        <p className="text-body-md text-secondary">No riders have completed delivery runs for this store yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {riders.map((r) => {
        const initials = r.name ? r.name.trim().split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() : 'RK'
        return (
          <Card key={r.id} className="p-5 border border-surface-variant shadow-sm flex flex-col justify-between gap-4 bg-surface-bright">
            <div className="flex gap-4 items-center">
              {/* Avatar circle containing rider initials */}
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-headline-sm shrink-0 shadow-sm border border-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-on-surface text-label-lg truncate">{r.name}</h4>
                <p className="text-body-sm text-secondary font-medium mt-0.5 capitalize">{r.vehicle_type || 'Motorcycle'}</p>
              </div>
            </div>

            {/* Stats row with store-specific order tallies */}
            <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-3 rounded-lg border border-surface-variant text-center">
              <div>
                <p className="text-body-xs text-secondary mb-0.5">Rating</p>
                <p className="text-label-lg font-bold text-on-surface flex items-center justify-center gap-1">
                  {r.rating?.toFixed(1) || '5.0'}
                  <Star className="w-3.5 h-3.5 text-[#FBBC04] fill-[#FBBC04]" />
                </p>
              </div>
              <div>
                <p className="text-body-xs text-secondary mb-0.5">Store Runs</p>
                <p className="text-label-lg font-bold text-on-surface">{r.storeDeliveries} runs</p>
              </div>
            </div>

            <div className="pt-2 border-t border-surface-variant flex justify-between items-center text-body-sm">
              <a href={`tel:${r.phone}`} className="text-primary hover:underline font-semibold flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Call Rider
              </a>
              <Link to={`/riders/${r.id}`} className="text-secondary hover:text-on-surface font-semibold flex items-center gap-1">
                View Profile →
              </Link>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// Store payouts list tab displaying payouts disbursed to this merchant
function PayoutsTab({ storeId }) {
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetches payouts from database table scoped to stores recipient
  const fetchStorePayouts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('payouts')
        .select('*')
        .eq('recipient_type', 'store')
        .eq('recipient_id', storeId)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setPayouts(data || [])
    } catch (err) {
      setError(err.message)
      toast.error('Could not load store payouts.')
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchStorePayouts()
  }, [fetchStorePayouts])

  // Column specifications for payouts table
  const columns = [
    {
      title: 'Settlement Period',
      key: 'period_start',
      render: (_, row) => (
        <span className="font-semibold text-on-surface">
          {formatDate(row.period_start)} – {formatDate(row.period_end)}
        </span>
      )
    },
    {
      title: 'Gross Amount',
      key: 'gross_amount',
      render: (val) => <span className="text-secondary font-medium">{formatCurrency(val)}</span>
    },
    {
      title: 'Platform Comm.',
      key: 'commission_amount',
      render: (val) => <span className="text-danger font-medium">-{formatCurrency(val)}</span>
    },
    {
      title: 'Net Payout',
      key: 'net_amount',
      render: (val) => <span className="font-bold text-success">{formatCurrency(val)}</span>
    },
    {
      title: 'Status',
      key: 'status',
      render: (status) => (
        <Badge variant={status === 'processed' ? 'success' : 'warning'}>
          {status?.toUpperCase()}
        </Badge>
      )
    },
    {
      title: 'Bank Reference',
      key: 'bank_reference',
      render: (val) => <span className="font-mono text-body-sm text-secondary">{val || '—'}</span>
    }
  ]

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="table" rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertTriangle className="w-12 h-12 text-danger" />
        <p className="text-body-md text-secondary">Failed to load payouts: {error}</p>
        <Button variant="outline" onClick={fetchStorePayouts}>Retry</Button>
      </div>
    )
  }

  if (payouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm">
        <Receipt className="w-16 h-16 text-secondary opacity-30 mb-4" />
        <h3 className="text-headline-sm text-on-surface mb-1 font-bold">No Payout Records</h3>
        <p className="text-body-md text-secondary">This merchant account has not received any payouts yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-card overflow-hidden animate-fade-in">
      <Table
        columns={columns}
        data={payouts}
        isLoading={loading}
        emptyMessage="No Payouts Logged"
      />
    </div>
  )
}

// Mock Reviews tab for reviews display aligning with client PRD
function ReviewsTab({ store }) {
  // Hardcoded compliance mockup ratings representing Indian consumer feedback
  const mockReviews = [
    {
      id: 'rev-1',
      customer: 'Amit Sharma',
      rating: 5,
      date: '2 hours ago',
      comment: 'Excellent service. The vegetables were extremely fresh and delivery was completed within 12 minutes! Best grocery shopping in Koramangala.'
    },
    {
      id: 'rev-2',
      customer: 'Priya Patel',
      rating: 5,
      date: '1 day ago',
      comment: 'Very reliable merchant. Dairy items are always delivered cold and packaged properly. Highly satisfied!'
    },
    {
      id: 'rev-3',
      customer: 'Kiran Patil',
      rating: 4,
      date: '3 days ago',
      comment: 'Good product availability. Clean and well-sorted grains. Delivery fee is reasonable.'
    },
    {
      id: 'rev-4',
      customer: 'Rajesh Kumar',
      rating: 5,
      date: '1 week ago',
      comment: 'Prompt delivery, very polite delivery personnel. Items were exactly as ordered.'
    }
  ]

  return (
    <Card className="p-5 border border-surface-variant shadow-card animate-fade-in bg-surface-bright">
      <h3 className="text-headline-sm text-on-surface font-bold mb-6 flex items-center gap-2 border-b border-surface-variant pb-2">
        <Star className="w-5 h-5 text-[#FBBC04] fill-[#FBBC04]" /> Customer Reviews
      </h3>
      
      {/* Polish rating distribution overview header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6 p-4 bg-surface-container-low rounded-xl border border-surface-variant items-center sm:items-start">
        <div className="text-center shrink-0 flex flex-col items-center">
          <p className="text-[44px] font-black text-on-surface leading-none">{store.rating?.toFixed(1) || '5.0'}</p>
          <div className="flex text-[#FBBC04] my-2">
            <Star className="w-5 h-5 fill-current" />
            <Star className="w-5 h-5 fill-current" />
            <Star className="w-5 h-5 fill-current" />
            <Star className="w-5 h-5 fill-current" />
            <Star className="w-5 h-5 fill-current" />
          </div>
          <p className="text-body-xs text-secondary font-medium">Average merchant rating</p>
        </div>
        <div className="flex-1 w-full space-y-2">
          <ReviewBar stars={5} pct={85} />
          <ReviewBar stars={4} pct={10} />
          <ReviewBar stars={3} pct={5} />
          <ReviewBar stars={2} pct={0} />
          <ReviewBar stars={1} pct={0} />
        </div>
      </div>

      <div className="space-y-4 divide-y divide-surface-variant/50">
        {mockReviews.map((r, index) => (
          <div key={r.id} className={`flex flex-col gap-1 text-body-md pt-4 ${index === 0 ? 'pt-0' : ''}`}>
            <div className="flex justify-between items-center flex-wrap gap-1">
              <span className="font-bold text-on-surface">{r.customer}</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center text-[#FBBC04]">
                  <Star className="w-3.5 h-3.5 fill-[#FBBC04]" />
                  <span className="text-label-md font-bold text-on-surface ml-0.5">{r.rating}</span>
                </div>
                <span className="text-body-xs text-secondary">{r.date}</span>
              </div>
            </div>
            <p className="text-secondary text-body-sm leading-relaxed mt-1 font-medium">{r.comment}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// Visual rating bar component for star distributions
function ReviewBar({ stars, pct }) {
  return (
    <div className="flex items-center gap-2 text-body-sm font-medium">
      <span className="w-3 text-right">{stars}</span>
      <Star className="w-3.5 h-3.5 text-[#FBBC04] fill-[#FBBC04] shrink-0" />
      <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }}></div>
      </div>
      <span className="w-8 text-right text-secondary text-body-xs">{pct}%</span>
    </div>
  )
}
