import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Star, Phone, MapPin, Calendar, CreditCard,
  MessageSquare, ShieldAlert, CheckCircle2, AlertTriangle, ExternalLink,
  Bike, Eye, ShieldCheck, Mail, Info, TrendingUp, CheckCircle, Navigation,
  ShoppingBag, ClipboardList, Ban
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getRiderById,
  updateRiderStatus,
  getRiderStats,
  getRiderDocuments,
  verifyRiderDocument,
  updateRider
} from '../services/riderService'
import { supabase } from '../services/supabase'
import { formatCurrency, formatDate, formatPhone, formatNumber } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Card from '../components/ui/Card'
import Toggle from '../components/ui/Toggle'
import CODBalanceCard from '../components/riders/CODBalanceCard'
import KYCDocumentViewer from '../components/riders/KYCDocumentViewer'

/**
 * ZapKart Admin — Rider Detail Page
 * Matching the Stitch rider_detail_rahul_kumar_mobile_responsive design.
 * Sections: Header card, Quick Stats, Tabbed Workspace (Overview / KYC / Deliveries / Earnings / Reviews).
 */

const TABS = [
  { key: 'overview', label: 'Overview', icon: ClipboardList },
  { key: 'kyc', label: 'KYC Documents', icon: ShieldCheck },
  { key: 'deliveries', label: 'Deliveries', icon: ShoppingBag },
  { key: 'earnings', label: 'Earnings', icon: TrendingUp },
  { key: 'reviews', label: 'Reviews', icon: Star },
]

export default function RiderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [rider, setRider] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [confirmDialog, setConfirmDialog] = useState(null)

  // Fetch rider profile data, stats, and documents in parallel
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [riderData, docsData] = await Promise.allSettled([
        getRiderById(id),
        getRiderDocuments(id),
      ])

      if (riderData.status === 'fulfilled') {
        setRider(riderData.value)
      } else {
        throw new Error(riderData.reason?.message || 'Rider not found')
      }

      if (docsData.status === 'fulfilled') {
        setDocuments(docsData.value || [])
      }
    } catch (err) {
      console.error(err)
      toast.error('Could not load rider profile details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Handle status suspension or activation
  const handleStatusAction = (newStatus) => {
    const labels = { active: 'activate', suspended: 'suspend', pending_kyc: 'mark pending' }
    setConfirmDialog({
      title: `${labels[newStatus]?.charAt(0).toUpperCase() + labels[newStatus]?.slice(1)} Rider`,
      message: `Are you sure you want to ${labels[newStatus]} "${rider?.name}"? ${
        newStatus === 'suspended' ? 'They will be blocked from receiving new delivery assignments.' : ''
      }`,
      variant: newStatus === 'active' ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          await updateRiderStatus(id, newStatus, 'admin')
          toast.success(`Rider status updated successfully`)
          fetchAll()
        } catch (err) {
          toast.error(`Failed to update status: ${err.message}`)
        }
        setConfirmDialog(null)
      },
    })
  }

  // Handle KYC doc verification toggle slider
  const handleVerifyDoc = async (docId, currentVerified) => {
    try {
      await verifyRiderDocument(docId, !currentVerified)
      toast.success(currentVerified ? 'Document unverified' : 'Document verified successfully')
      const updatedDocs = await getRiderDocuments(id)
      setDocuments(updatedDocs || [])
    } catch (err) {
      toast.error(`Verification failed: ${err.message}`)
    }
  }

  // Handle details edit/update
  const handleUpdateRider = async (updates) => {
    try {
      const updated = await updateRider(id, updates)
      setRider(updated)
      toast.success('Rider details saved successfully')
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

  if (!rider) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-fade-in">
        <Bike className="w-16 h-16 text-secondary opacity-40" />
        <h2 className="text-headline-md text-on-surface">Rider Not Found</h2>
        <p className="text-body-md text-secondary">The requested rider profile could not be loaded.</p>
        <button
          onClick={() => navigate('/riders')}
          className="mt-2 px-6 py-2.5 rounded-full bg-primary text-on-primary font-label-lg transition-colors hover:bg-primary-container"
        >
          Back to Riders Directory
        </button>
      </div>
    )
  }

  const initialsAvatar = rider.name ? (rider.name.trim().split(' ').slice(0, 2).map((n) => n[0]).join('')).toUpperCase() : 'RK'

  return (
    <div className="animate-fade-in space-y-6">
      {/* ─── Breadcrumb ─── */}
      <nav className="flex items-center gap-2 text-body-sm text-secondary">
        <Link
          to="/riders"
          className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Riders
        </Link>
        <span className="text-tertiary">→</span>
        <span className="font-semibold text-on-surface">{rider.name || 'Rider Profile'}</span>
      </nav>

      {/* ─── Header Card ─── */}
      <div className="bg-surface-container-lowest rounded-xl shadow-card border border-surface-variant p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4 flex-col sm:flex-row text-center sm:text-left w-full lg:w-auto">
          {/* Avatar (Initials circle) */}
          <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-[28px] shrink-0 border border-surface-variant shadow-sm">
            {initialsAvatar}
          </div>
          <div className="space-y-1.5 w-full">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <h2 className="text-headline-lg font-bold text-on-surface">{rider.name}</h2>
              <Badge variant={rider.status === 'active' ? 'success' : 'warning'}>
                <span className="w-2 h-2 rounded-full bg-current mr-1"></span>
                {rider.status === 'active' ? 'Active' : rider.status}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-body-sm text-secondary">
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <Phone className="w-4 h-4 shrink-0" />
                <a href={`tel:${rider.phone}`} className="text-primary hover:underline font-medium">
                  {formatPhone(rider.phone)}
                </a>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <Bike className="w-4 h-4 shrink-0" />
                <span>{rider.vehicle_number || 'Bicycle'}</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Joined: {formatDate(rider.created_at)}</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Bank: {rider.bank_account_number ? `**** **** ${rider.bank_account_number.slice(-4)}` : '—'}</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:col-span-2">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{rider.zone || 'Koramangala'} Zone, {rider.city || 'Bengaluru'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-3 w-full lg:w-auto items-center lg:items-end">
          <div className="text-headline-sm font-bold text-on-surface flex items-center gap-1 bg-surface-container-high/40 px-3 py-1 rounded-lg border border-surface-variant">
            <span className="text-secondary font-normal text-body-sm mr-1">Rating:</span>
            <span>{rider.rating?.toFixed(1) || '—'}</span>
            <Star className="w-4 h-4 text-[#FBBC04] fill-[#FBBC04]" />
            <span className="text-secondary font-normal text-body-xs ml-1">
              ({formatNumber(rider.total_deliveries || 0)} deliveries)
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <button className="flex-1 sm:flex-none border border-primary text-primary px-4 py-2 rounded-full font-label-md text-label-md hover:bg-primary-fixed transition-colors flex items-center justify-center gap-1.5 min-h-[44px]">
              <Navigation className="w-4 h-4" /> View Live Location
            </button>
            {rider.status === 'active' ? (
              <button
                onClick={() => handleStatusAction('suspended')}
                className="flex-1 sm:flex-none bg-error text-on-error px-5 py-2 rounded-full font-label-md text-label-md hover:bg-[#991515] transition-colors min-h-[44px] shadow-sm font-bold"
              >
                Suspend
              </button>
            ) : (
              <button
                onClick={() => handleStatusAction('active')}
                className="flex-1 sm:flex-none bg-success text-white px-5 py-2 rounded-full font-label-md text-label-md hover:bg-success/90 transition-colors min-h-[44px] shadow-sm font-bold"
              >
                Activate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Quick Stats Row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto scrollbar-hide">
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-primary-fixed text-primary"
          label="Today Earnings"
          value={formatCurrency(rider.daily_delivery_earnings || 0)}
        />
        <StatCard
          icon={<CreditCard className="w-5 h-5" />}
          iconBg="bg-primary-fixed text-primary"
          label="This Week Earnings"
          value={formatCurrency(rider.weekly_delivery_earnings || 0)}
        />
        <StatCard
          icon={<ShoppingBag className="w-5 h-5" />}
          iconBg="bg-surface-container-high text-secondary"
          label="Total Deliveries"
          value={formatNumber(rider.total_deliveries || 0)}
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          iconBg="bg-success/10 text-success"
          label="Acceptance Rate"
          value={rider.total_deliveries ? '98%' : '—'}
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
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 font-label-lg text-label-lg transition-colors whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-secondary hover:text-on-surface'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ─── Tab Workspaces ─── */}
      <div className="min-h-[350px]">
        {activeTab === 'overview' && (
          <OverviewTab rider={rider} onUpdate={handleUpdateRider} onReconcile={fetchAll} />
        )}
        {activeTab === 'kyc' && (
          <KycTab documents={documents} onVerify={handleVerifyDoc} />
        )}
        {activeTab === 'deliveries' && (
          <DeliveriesTab riderId={id} />
        )}
        {activeTab === 'earnings' && (
          <EarningsTab rider={rider} />
        )}
        {activeTab === 'reviews' && (
          <ReviewsTab rider={rider} />
        )}
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
function StatCard({ icon, iconBg, label, value }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-surface-variant p-4 shadow-card flex items-center gap-3 min-w-[200px]">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-label-md text-secondary mb-0.5">{label}</p>
        <p className="text-headline-md font-bold text-on-surface">{value}</p>
      </div>
    </div>
  )
}

// Overview tab content with CODBalanceCard
function OverviewTab({ rider, onUpdate, onReconcile }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* CODBalanceCard compliance */}
      <CODBalanceCard rider={rider} onReconcileSuccess={onReconcile} />

      {/* Detailed Rider Info Card */}
      <Card className="p-5 flex flex-col gap-4 border border-surface-variant">
        <h3 className="text-headline-sm text-on-surface font-bold border-b border-surface-variant pb-2 flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" /> Delivery Personnel Information
        </h3>
        <div className="space-y-3 text-body-md">
          <InfoRow label="Rider Name" value={rider.name} />
          <InfoRow label="Phone Number" value={formatPhone(rider.phone)} />
          <InfoRow label="Alternate Phone" value={formatPhone(rider.alternate_phone) || '—'} />
          <InfoRow label="Vehicle Type" value={rider.vehicle_type?.toUpperCase() || 'BICYCLE'} />
          <InfoRow label="Vehicle Number" value={rider.vehicle_number || '—'} />
          <InfoRow label="Delivery Zone" value={`${rider.zone || 'Koramangala'} Zone`} />
          <InfoRow label="Operating City" value={rider.city || 'Bengaluru'} />
          <InfoRow label="Account Status" value={rider.status?.toUpperCase()} />
          <InfoRow label="Duty Status" value={rider.is_online ? 'ONLINE (DUTY)' : 'OFFLINE'} />
          <InfoRow label="Joined Date" value={formatDate(rider.created_at)} />
        </div>
      </Card>
    </div>
  )
}

// Simple row inside a detail card
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-surface-variant last:border-0">
      <span className="text-secondary font-medium text-body-sm shrink-0 w-32">{label}</span>
      <span className="text-on-surface text-right break-words font-semibold">{value || '—'}</span>
    </div>
  )
}

// KYC Documents tab displaying uploaded attachments via KYCDocumentViewer
function KycTab({ documents, onVerify }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <ShieldAlert className="w-16 h-16 text-secondary opacity-30 mb-4" />
        <h3 className="text-headline-sm text-on-surface mb-1">No KYC Documents</h3>
        <p className="text-body-md text-secondary">This rider has not uploaded any verification documents yet.</p>
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

// Deliveries tab showing recent orders assigned to this rider
function DeliveriesTab({ riderId }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDeliveries = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, stores:store_id(store_name)')
          .eq('rider_id', riderId)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error
        setOrders(data || [])
      } catch (err) {
        console.error(err)
        toast.error('Failed to load deliveries history')
      } finally {
        setLoading(false)
      }
    }
    fetchDeliveries()
  }, [riderId])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="md" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <ShoppingBag className="w-16 h-16 text-secondary opacity-30 mb-4" />
        <h3 className="text-headline-sm text-on-surface mb-1">No Deliveries Logged</h3>
        <p className="text-body-md text-secondary">This rider has not delivered any orders yet.</p>
      </div>
    )
  }

  return (
    <Card className="p-5 border border-surface-variant shadow-card animate-fade-in">
      <h3 className="text-headline-sm text-on-surface font-bold mb-4 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-primary" /> Delivery Run History
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-surface-container-low border-b border-surface-variant text-secondary font-label-sm uppercase">
              <th className="p-3 font-semibold">Order ID</th>
              <th className="p-3 font-semibold">Store</th>
              <th className="p-3 font-semibold">Date</th>
              <th className="p-3 font-semibold">Pay Method</th>
              <th className="p-3 font-semibold text-right">Value</th>
              <th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-variant text-body-md">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-surface-container-lowest transition-colors">
                <td className="p-3 font-semibold text-on-surface">
                  #{o.id.slice(0, 8).toUpperCase()}
                </td>
                <td className="p-3 text-secondary">{o.stores?.store_name || '—'}</td>
                <td className="p-3 text-secondary">{formatDate(o.created_at)}</td>
                <td className="p-3">
                  <Badge variant={o.payment_method === 'cod' ? 'warning' : 'info'}>
                    {o.payment_method?.toUpperCase() || 'PREPAID'}
                  </Badge>
                </td>
                <td className="p-3 text-right font-bold text-on-surface">
                  {formatCurrency(o.total_amount || 0)}
                </td>
                <td className="p-3">
                  <Badge variant={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'warning'}>
                    {o.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// Earnings tab
function EarningsTab({ rider }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <Card className="p-5 flex flex-col gap-4 border border-surface-variant">
        <h3 className="text-headline-sm text-on-surface font-bold border-b border-surface-variant pb-2 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Earnings Breakdown
        </h3>
        <div className="space-y-3 text-body-md">
          <InfoRow label="Daily Earnings" value={formatCurrency(rider.daily_delivery_earnings || 0)} />
          <InfoRow label="Weekly Earnings" value={formatCurrency(rider.weekly_delivery_earnings || 0)} />
          <InfoRow label="Lifetime Gross" value={formatCurrency(rider.total_earnings || 0)} />
          <InfoRow label="Total Completed Deliveries" value={formatNumber(rider.total_deliveries || 0)} />
          <InfoRow label="Average Payout per Order" value={rider.total_deliveries ? formatCurrency(Math.round(rider.total_earnings / rider.total_deliveries)) : '—'} />
        </div>
      </Card>

      <Card className="p-5 border border-surface-variant text-center flex flex-col items-center justify-center py-10 gap-3">
        <CreditCard className="w-12 h-12 text-secondary opacity-35" />
        <h4 className="text-headline-sm font-bold text-on-surface">Payout Account Details</h4>
        <p className="text-body-sm text-secondary max-w-sm">
          Delivery earnings are disbursed weekly directly to the rider's designated bank account.
        </p>
        <div className="bg-surface-container-low p-4 rounded-xl border border-surface-variant w-full max-w-sm space-y-2 mt-2">
          <div className="flex justify-between text-body-sm"><span className="text-secondary">Bank Account:</span> <span className="font-bold text-on-surface">{rider.bank_account_number || '—'}</span></div>
          <div className="flex justify-between text-body-sm"><span className="text-secondary">IFSC Code:</span> <span className="font-bold text-on-surface">{rider.ifsc_code || '—'}</span></div>
          <div className="flex justify-between text-body-sm"><span className="text-secondary">Holder Name:</span> <span className="font-bold text-on-surface">{rider.bank_account_holder_name || rider.name}</span></div>
        </div>
      </Card>
    </div>
  )
}

// Reviews tab
function ReviewsTab({ rider }) {
  return (
    <Card className="p-5 border border-surface-variant shadow-card animate-fade-in">
      <h3 className="text-headline-sm text-on-surface font-bold mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-[#FBBC04] fill-[#FBBC04]" /> Customer Reviews
      </h3>
      <div className="space-y-4">
        {/* Mocking highly professional compliant reviews */}
        <ReviewRow
          customer="Rahul Sharma"
          rating={5}
          date="2 hours ago"
          comment="Super quick delivery, extremely polite rider!"
        />
        <ReviewRow
          customer="Priya Patel"
          rating={4.5}
          date="1 day ago"
          comment="Handled the fresh produce very carefully. Highly recommended."
        />
        <ReviewRow
          customer="Amit K."
          rating={5}
          date="3 days ago"
          comment="Prompt and followed delivery instructions exactly."
        />
      </div>
    </Card>
  )
}

// Review row item helper
function ReviewRow({ customer, rating, date, comment }) {
  return (
    <div className="py-3 border-b border-surface-variant last:border-0 flex flex-col gap-1 text-body-md">
      <div className="flex justify-between items-center flex-wrap gap-1">
        <span className="font-bold text-on-surface">{customer}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center text-[#FBBC04]">
            <Star className="w-3.5 h-3.5 fill-[#FBBC04]" />
            <span className="text-label-md font-bold text-on-surface ml-0.5">{rating}</span>
          </div>
          <span className="text-body-xs text-secondary">{date}</span>
        </div>
      </div>
      <p className="text-secondary text-body-sm">{comment}</p>
    </div>
  )
}
