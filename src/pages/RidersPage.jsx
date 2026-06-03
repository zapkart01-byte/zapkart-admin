import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, X, Star, MoreVertical, Plus, Bike, ShieldAlert, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getRiders, updateRiderStatus, createRider } from '../services/riderService'
import { formatCurrency, formatDate, formatPhone } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import Pagination from '../components/ui/Pagination'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

/**
 * ZapKart Admin — Rider Management Directory Page
 * Matching the Stitch riders_management_responsive design.
 * Desktop: robust table | Mobile: listing cards
 */

const STATUS_TABS = [
  { key: 'all', label: 'All Riders' },
  { key: 'online', label: 'Online' },
  { key: 'pending_kyc', label: 'KYC Pending' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
]

const VEHICLE_TYPES = [
  { key: 'bike', label: 'Two Wheeler' },
  { key: 'ev', label: 'EV' },
  { key: 'bicycle', label: 'Bicycle' },
]

const RATING_FILTERS = [
  { key: '4+', label: '4.0 & Above' },
  { key: '3+', label: '3.0 & Above' },
  { key: 'low', label: 'Below 3.0' },
]

const KYC_STATUSES = [
  { key: 'verified', label: 'Verified' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
]

const ZONES = [
  { key: 'blr-south', label: 'Bengaluru South' },
  { key: 'blr-koramangala', label: 'Koramangala' },
  { key: 'del-ncr', label: 'Delhi NCR' },
]

const PAGE_SIZE = 20

// Helpers for initials avatar
export function getInitials(name) {
  if (!name) return 'RK'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function RidersPage() {
  const navigate = useNavigate()
  const [riders, setRiders] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
  const [kycStatus, setKycStatus] = useState('')
  const [zone, setZone] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionMenuId, setActionMenuId] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [riderName, setRiderName] = useState('')
  const [riderPhone, setRiderPhone] = useState('')
  const [formVehicleType, setFormVehicleType] = useState('motorcycle')
  const [vehicleNumber, setVehicleNumber] = useState('')

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // Fetch riders based on status and search query
  const fetchRiders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getRiders({
        status,
        search: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
      })
      let items = res.riders || []

      // Client-side sub-filtering for extra filters in design (vehicleType, ratingFilter, kycStatus, zone)
      if (vehicleType) {
        items = items.filter((r) => r.vehicle_type?.toLowerCase() === vehicleType.toLowerCase())
      }
      if (ratingFilter) {
        if (ratingFilter === '4+') items = items.filter((r) => (r.rating || 0) >= 4.0)
        else if (ratingFilter === '3+') items = items.filter((r) => (r.rating || 0) >= 3.0)
        else if (ratingFilter === 'low') items = items.filter((r) => (r.rating || 0) < 3.0)
      }
      if (kycStatus) {
        if (kycStatus === 'verified') items = items.filter((r) => r.status === 'active')
        else if (kycStatus === 'pending') items = items.filter((r) => r.status === 'pending_kyc')
        else if (kycStatus === 'rejected') items = items.filter((r) => r.status === 'suspended')
      }
      if (zone) {
        items = items.filter((r) => r.zone?.toLowerCase() === zone.toLowerCase())
      }

      setRiders(items)
      setTotal(res.total || 0)
    } catch (err) {
      console.error(err)
      toast.error('Could not load riders directory.')
    } finally {
      setLoading(false)
    }
  }, [status, debouncedSearch, page, vehicleType, ratingFilter, kycStatus, zone])

  useEffect(() => {
    fetchRiders()
  }, [fetchRiders])

  // Reset page when filters modify
  useEffect(() => {
    setPage(1)
  }, [status, debouncedSearch, vehicleType, ratingFilter, kycStatus, zone])

  const clearAllFilters = () => {
    setSearch('')
    setVehicleType('')
    setRatingFilter('')
    setKycStatus('')
    setZone('')
    setStatus('all')
  }

  // Handle rider action
  const handleStatusAction = (rider, newStatus) => {
    setActionMenuId(null)
    const labels = { active: 'approve', suspended: 'suspend', pending_kyc: 'reject kyc' }
    setConfirmDialog({
      title: `${labels[newStatus]?.charAt(0).toUpperCase() + labels[newStatus]?.slice(1)} Rider`,
      message: `Are you sure you want to ${labels[newStatus]} "${rider.name}"? ${newStatus === 'suspended' ? 'They will not be assigned new delivery runs.' : ''}`,
      variant: newStatus === 'active' ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          await updateRiderStatus(rider.id, newStatus, 'admin')
          toast.success(`Rider status updated successfully`)
          fetchRiders()
        } catch (err) {
          toast.error(`Failed: ${err.message}`)
        }
        setConfirmDialog(null)
      },
    })
  }

  // Close action menu when clicking outside
  useEffect(() => {
    const close = () => setActionMenuId(null)
    if (actionMenuId) window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [actionMenuId])

  const handleOpenCreate = () => {
    setRiderName('')
    setRiderPhone('')
    setFormVehicleType('motorcycle')
    setVehicleNumber('')
    setShowCreateModal(true)
  }

  const handleCreateRider = async (e) => {
    e.preventDefault()
    if (!riderName.trim() || !riderPhone.trim()) {
      toast.error('Rider name and phone are required.')
      return
    }

    setFormLoading(true)
    try {
      const created = await createRider({
        name: riderName,
        phone: riderPhone,
        vehicle_type: formVehicleType,
        vehicle_number: vehicleNumber,
      })
      toast.success('Rider created successfully')
      setShowCreateModal(false)
      fetchRiders()
      navigate(`/riders/${created.id}`)
    } catch (err) {
      toast.error(err.message || 'Failed to create rider.')
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* ─── Header Section ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-[28px] leading-[36px] font-bold text-on-background tracking-tight">Riders</h2>
          <p className="font-body-sm text-body-sm text-secondary mt-1">
            Manage delivery personnel across all operating zones.
          </p>
        </div>
        <button
          type="button"
          data-testid="add-rider-button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-surface text-primary border border-primary font-label-lg text-label-lg py-2.5 px-6 rounded-full hover:bg-primary hover:text-white transition-all shadow-sm whitespace-nowrap min-h-[44px] active:scale-[0.97]"
        >
          <Plus className="w-5 h-5" />
          Add Rider Manually
        </button>
      </div>

      {/* ─── Status Tabs ─── */}
      <div className="flex overflow-x-auto gap-6 border-b border-surface-variant pb-[1px] scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={`pb-3 font-label-lg text-label-lg whitespace-nowrap border-b-2 transition-all ${
                isActive
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-secondary hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ─── Filters Row ─── */}
      <div className="flex flex-wrap gap-3 items-center bg-surface-container-lowest p-3 rounded-xl shadow-card border border-surface-variant">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-[280px]">
          <div className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-2 border border-surface-variant focus-within:border-primary transition-colors min-h-[44px]">
            <Search className="text-secondary w-5 h-5" />
            <input
              id="rider-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rider name or phone..."
              className="bg-transparent border-none focus:ring-0 w-full text-body-sm text-on-surface outline-none"
            />
          </div>
        </div>

        {/* Vehicle Select */}
        <div className="relative min-w-[140px]">
          <select
            id="vehicle-filter"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-variant rounded-lg py-2.5 pl-3 pr-8 font-body-sm text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[44px] cursor-pointer"
          >
            <option value="">Vehicle Type</option>
            {VEHICLE_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Rating Select */}
        <div className="relative min-w-[120px]">
          <select
            id="rating-filter"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-variant rounded-lg py-2.5 pl-3 pr-8 font-body-sm text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[44px] cursor-pointer"
          >
            <option value="">Rating</option>
            {RATING_FILTERS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* KYC Select */}
        <div className="relative min-w-[130px]">
          <select
            id="kyc-filter"
            value={kycStatus}
            onChange={(e) => setKycStatus(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-variant rounded-lg py-2.5 pl-3 pr-8 font-body-sm text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[44px] cursor-pointer"
          >
            <option value="">KYC Status</option>
            {KYC_STATUSES.map((k) => (
              <option key={k.key} value={k.key}>{k.label}</option>
            ))}
          </select>
        </div>

        {/* Clear Button */}
        {(search || vehicleType || ratingFilter || kycStatus || zone || status !== 'all') && (
          <button
            onClick={clearAllFilters}
            className="ml-auto text-secondary hover:text-primary transition-colors flex items-center gap-1 font-label-sm text-label-sm min-h-[44px] px-3 rounded-full hover:bg-surface-container-low"
          >
            <X className="w-4 h-4" /> Clear Filters
          </button>
        )}
      </div>

      {/* ─── Loading State ─── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {/* ─── Empty State ─── */}
      {!loading && riders.length === 0 && (
        <EmptyState
          icon={Bike}
          title="No riders found"
          description="We couldn't find any delivery personnel matching the selected filter criteria."
          actionText="Add Rider Manually"
          onActionClick={handleOpenCreate}
          className="py-16"
        />
      )}

      {/* ─── Desktop Table View (Hidden on Mobile) ─── */}
      {!loading && riders.length > 0 && (
        <>
          <div className="hidden md:block bg-surface border border-surface-variant rounded-xl shadow-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-variant text-secondary font-label-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Rider</th>
                  <th className="p-4 font-semibold">Vehicle</th>
                  <th className="p-4 font-semibold">KYC</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">COD Cash</th>
                  <th className="p-4 font-semibold text-right">Week Earnings</th>
                  <th className="p-4 font-semibold">Rating</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {riders.map((rider) => {
                  const isCodCritical = (rider.cod_balance || 0) >= 2000
                  const initialAvatar = getInitials(rider.name)
                  return (
                    <tr
                      key={rider.id}
                      className={`hover:bg-surface-container-low transition-colors cursor-pointer ${
                        rider.status === 'pending_kyc'
                          ? 'border-l-4 border-blue-500 bg-blue-50/20'
                          : isCodCritical
                          ? 'border-l-4 border-red-500 bg-red-50/10'
                          : ''
                      }`}
                      onClick={() => navigate(`/riders/${rider.id}`)}
                    >
                      {/* Profile details */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-headline-sm shrink-0 border border-surface-variant">
                            {initialAvatar}
                          </div>
                          <div>
                            <div className="text-label-lg font-bold text-on-surface flex items-center gap-1.5">
                              {rider.name}
                              {isCodCritical && (
                                <AlertCircle className="w-4 h-4 text-danger" title="COD Limit Exceeded!" />
                              )}
                            </div>
                            <div className="text-body-sm text-secondary mt-0.5">
                              {formatPhone(rider.phone)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Vehicle detail */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 bg-surface-container-high px-2 py-1 rounded text-secondary font-label-sm">
                          <Bike className="w-4 h-4" />
                          {rider.vehicle_number || 'Bicycle'}
                        </span>
                      </td>

                      {/* KYC Badge */}
                      <td className="p-4">
                        <Badge
                          variant={
                            rider.status === 'active'
                              ? 'success'
                              : rider.status === 'pending_kyc'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {rider.status === 'active' ? '✓ Verified' : rider.status === 'pending_kyc' ? '⏳ Pending' : '✗ Suspended'}
                        </Badge>
                      </td>

                      {/* Online Status */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              rider.is_online ? 'bg-success pulse-dot' : 'bg-secondary'
                            }`}
                          />
                          <span className="text-body-sm font-semibold text-on-surface">
                            {rider.is_online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </td>

                      {/* COD Balance */}
                      <td className={`p-4 text-right font-bold ${isCodCritical ? 'text-danger font-extrabold' : 'text-on-surface'}`}>
                        {formatCurrency(rider.cod_balance || 0)}
                      </td>

                      {/* Weekly Earnings */}
                      <td className="p-4 text-right font-semibold text-primary">
                        {formatCurrency(rider.weekly_delivery_earnings || 0)}
                      </td>

                      {/* Rating */}
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-[#FBBC04] fill-[#FBBC04]" />
                          <span className="text-label-md font-bold text-on-surface">
                            {rider.rating?.toFixed(1) || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            id={`action-${rider.id}`}
                            onClick={() => setActionMenuId(actionMenuId === rider.id ? null : rider.id)}
                            className="text-primary hover:bg-surface-container-high p-2 rounded-full transition-colors"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {actionMenuId === rider.id && (
                            <div className="absolute right-0 top-10 z-30 w-48 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-lg py-1 animate-fade-in">
                              <button
                                onClick={() => navigate(`/riders/${rider.id}`)}
                                className="w-full text-left px-4 py-2.5 text-body-md text-on-surface hover:bg-surface-container-low transition-colors"
                              >
                                View Profile
                              </button>
                              {rider.status === 'pending_kyc' && (
                                <button
                                  onClick={() => handleStatusAction(rider, 'active')}
                                  className="w-full text-left px-4 py-2.5 text-body-md text-success hover:bg-surface-container-low transition-colors"
                                >
                                  Approve KYC
                                </button>
                              )}
                              {rider.status !== 'suspended' && (
                                <button
                                  onClick={() => handleStatusAction(rider, 'suspended')}
                                  className="w-full text-left px-4 py-2.5 text-body-md text-danger hover:bg-surface-container-low transition-colors"
                                >
                                  Suspend Rider
                                </button>
                              )}
                              {rider.status === 'suspended' && (
                                <button
                                  onClick={() => handleStatusAction(rider, 'active')}
                                  className="w-full text-left px-4 py-2.5 text-body-md text-success hover:bg-surface-container-low transition-colors"
                                >
                                  Unsuspend Rider
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ─── Mobile Card View (Hidden on Desktop) ─── */}
          <div className="md:hidden space-y-4">
            {riders.map((rider) => {
              const isCodCritical = (rider.cod_balance || 0) >= 2000
              const initialAvatar = getInitials(rider.name)
              return (
                <div
                  key={rider.id}
                  className={`bg-surface border border-surface-variant rounded-xl p-3.5 shadow-card flex flex-col gap-3 ${
                    rider.status === 'pending_kyc'
                      ? 'border-l-4 border-blue-500 bg-blue-50/10'
                      : isCodCritical
                      ? 'border-l-4 border-red-500 bg-red-50/10'
                      : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-headline-sm shrink-0">
                      {initialAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="text-label-lg font-bold text-on-surface truncate flex items-center gap-1">
                          {rider.name}
                          {isCodCritical && <AlertCircle className="w-4 h-4 text-danger" />}
                        </div>
                        <Badge
                          variant={
                            rider.status === 'active'
                              ? 'success'
                              : rider.status === 'pending_kyc'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {rider.status === 'active' ? 'Verified' : rider.status === 'pending_kyc' ? 'Pending' : 'Suspended'}
                        </Badge>
                      </div>
                      <div className="text-body-sm text-secondary mt-0.5">{formatPhone(rider.phone)}</div>
                      <div className="flex justify-between items-end mt-2">
                        <div>
                          <div className="text-body-xs text-secondary">Weekly Earnings</div>
                          <div className="text-headline-sm text-primary font-bold">{formatCurrency(rider.weekly_delivery_earnings || 0)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-body-xs text-secondary">COD Cash</div>
                          <div className={`text-label-lg font-bold ${isCodCritical ? 'text-danger font-extrabold' : 'text-on-surface'}`}>
                            {formatCurrency(rider.cod_balance || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-surface-variant pt-2 flex justify-between items-center">
                    <div className="flex items-center gap-1 text-body-sm font-semibold">
                      <Star className="w-3.5 h-3.5 text-[#FBBC04] fill-[#FBBC04]" />
                      <span>{rider.rating?.toFixed(1) || '—'}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/riders/${rider.id}`)}
                        className="px-4 py-1.5 rounded-full border border-surface-variant text-secondary font-label-md hover:bg-surface-container-low min-h-[36px] transition-colors"
                      >
                        Profile
                      </button>
                      {rider.status === 'pending_kyc' && (
                        <button
                          onClick={() => handleStatusAction(rider, 'active')}
                          className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-md min-h-[36px] transition-all hover:brightness-110"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ─── Pagination ─── */}
          <Pagination
            currentPage={page}
            totalItems={total}
            itemsPerPage={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}

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

      <Modal
        isOpen={showCreateModal}
        onClose={() => !formLoading && setShowCreateModal(false)}
        title="Add Rider Manually"
        size="md"
        closeOnBackdrop={!formLoading}
      >
        <form onSubmit={handleCreateRider} className="space-y-4" data-testid="rider-create-form">
          <Input
            label="Rider Name"
            value={riderName}
            onChange={(e) => setRiderName(e.target.value)}
            placeholder="Full name"
            required
            disabled={formLoading}
          />
          <Input
            label="Phone Number"
            value={riderPhone}
            onChange={(e) => setRiderPhone(e.target.value)}
            placeholder="+91 9876543210"
            required
            disabled={formLoading}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface-variant">Vehicle Type</label>
            <select
              value={formVehicleType}
              onChange={(e) => setFormVehicleType(e.target.value)}
              disabled={formLoading}
              className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface outline-none focus:ring-2 focus:ring-primary-container"
            >
              <option value="motorcycle">Motorcycle</option>
              <option value="bicycle">Bicycle</option>
              <option value="escooter">E-Scooter</option>
            </select>
          </div>
          <Input
            label="Vehicle Number"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            placeholder="e.g. KA01AB1234"
            disabled={formLoading}
          />
          <div className="flex gap-2 pt-2 border-t border-surface-variant">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={formLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formLoading} className="flex-1">
              Create Rider
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
