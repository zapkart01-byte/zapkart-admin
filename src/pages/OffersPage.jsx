import React, { useState, useEffect, useCallback } from 'react'
import { Ticket, Percent, Plus, Trash2, Edit2, ToggleLeft, ToggleRight, Calendar, Search, RefreshCw, BadgePercent } from 'lucide-react'
import { getOffers, createOffer, updateOffer, toggleOfferStatus, deleteOffer } from '../services/offerService'
import { formatCurrency, formatDate } from '../utils/formatters'
import PageLayout from '../components/layout/PageLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import Toggle from '../components/ui/Toggle'
import toast from 'react-hot-toast'

/**
 * ZapKart Offers Page
 * Provides full management of discount coupons and seasonal event sales.
 */
export default function OffersPage() {
  // Tabs: 'coupons' | 'events'
  const [activeTab, setActiveTab] = useState('coupons')

  // Search & Filter
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // Data states
  const [offers, setOffers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal / Form state
  const [showModal, setShowModal] = useState(false)
  const [editingOffer, setEditingOffer] = useState(null) // Offer object being edited
  const [formLoading, setFormLoading] = useState(false)

  // Form Fields
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [discountType, setDiscountType] = useState('percentage') // percentage | flat
  const [discountValue, setDiscountValue] = useState('')
  const [minOrderValue, setMinOrderValue] = useState('')
  const [maxDiscountCap, setMaxDiscountCap] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [usageLimit, setUsageLimit] = useState('')

  // Action Dialog state
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // Fetch offers
  const fetchOffers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const type = activeTab === 'coupons' ? 'coupon' : 'event_sale'
      const res = await getOffers({
        type,
        search: debouncedSearch || undefined,
        page,
        pageSize,
      })
      setOffers(res.offers || [])
      setTotal(res.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to fetch offers.')
      setOffers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [activeTab, debouncedSearch, page, pageSize])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  // Reset pagination on tab switch
  useEffect(() => {
    setPage(1)
    setSearch('')
    setDebouncedSearch('')
  }, [activeTab])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingOffer(null)
    setCode('')
    setName('')
    setDiscountType('percentage')
    setDiscountValue('')
    setMinOrderValue('0')
    setMaxDiscountCap('')
    setStartDate('')
    setEndDate('')
    setUsageLimit('100')
    setShowModal(true)
  }

  // Open modal for Edit
  const handleOpenEdit = (offer) => {
    setEditingOffer(offer)
    setCode(offer.code || '')
    setName(offer.name || '')
    setDiscountType(offer.discount_type || 'percentage')
    setDiscountValue(String(offer.discount_value || ''))
    setMinOrderValue(String(offer.min_order_value || '0'))
    setMaxDiscountCap(String(offer.max_discount_cap || ''))
    
    // Parse timestamp to YYYY-MM-DD
    const parseDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : ''
    setStartDate(parseDate(offer.start_date))
    setEndDate(parseDate(offer.end_date))
    setUsageLimit(String(offer.usage_limit || '100'))
    setShowModal(true)
  }

  // Form Submit handler
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    
    // Basic validations
    if (activeTab === 'coupons' && !code.trim()) {
      toast.error('Coupon code is required')
      return
    }
    if (!name.trim()) {
      toast.error('Offer name/description is required')
      return
    }
    
    const value = Number(discountValue)
    if (isNaN(value) || value <= 0) {
      toast.error('Discount value must be greater than zero')
      return
    }
    
    if (discountType === 'percentage' && value > 100) {
      toast.error('Percentage discount cannot exceed 100%')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date')
      return
    }

    setFormLoading(true)
    try {
      const type = activeTab === 'coupons' ? 'coupon' : 'event_sale'
      
      const payload = {
        type,
        code: activeTab === 'coupons' ? code.toUpperCase().trim() : null,
        name: name.trim(),
        discount_type: discountType,
        discount_value: value,
        min_order_value: Number(minOrderValue) || 0,
        max_discount_cap: Number(maxDiscountCap) || null,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        usage_limit: Number(usageLimit) || null,
        is_active: editingOffer ? editingOffer.is_active : true,
      }

      if (editingOffer) {
        await updateOffer(editingOffer.id, payload)
        toast.success('Offer details updated successfully')
      } else {
        await createOffer(payload)
        toast.success('New promotion offer created successfully')
      }
      
      setShowModal(false)
      fetchOffers()
    } catch (err) {
      toast.error(err.message || 'Failed to save offer. Make sure Coupon Code is unique.')
    } finally {
      setFormLoading(false)
    }
  }

  // Toggle active toggle
  const handleToggleActive = async (offer) => {
    try {
      const newStatus = !offer.is_active
      await toggleOfferStatus(offer.id, newStatus)
      toast.success(`Offer marked as ${newStatus ? 'active' : 'inactive'}`)
      
      // Local update to avoid full reload flickers
      setOffers(prev =>
        prev.map(o => (o.id === offer.id ? { ...o, is_active: newStatus } : o))
      )
    } catch (err) {
      toast.error(err.message || 'Status update failed.')
    }
  }

  // Trigger Delete
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setDeleteLoading(true)
    try {
      await deleteOffer(confirmDelete.id)
      toast.success('Offer deleted (deactivated)')
      setConfirmDelete(null)
      fetchOffers()
    } catch (err) {
      toast.error(err.message || 'Failed to remove offer.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface font-headline-md">Promotions & Offers CMS</h2>
          <p className="text-sm text-secondary mt-0.5">
            Configure discount codes and seasonal marketplace events.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          {activeTab === 'coupons' ? 'Create Coupon' : 'Create Event Sale'}
        </Button>
      </div>

      {/* ─── Navigation tabs ─── */}
      <div className="border-b border-border bg-white rounded-t-xl p-1 flex gap-2">
        <button
          onClick={() => setActiveTab('coupons')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'coupons'
              ? 'bg-primary-container text-on-primary-container shadow-sm'
              : 'text-secondary hover:text-on-surface hover:bg-surface'
          }`}
        >
          <Ticket className="w-4 h-4" /> Coupons
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'events'
              ? 'bg-primary-container text-on-primary-container shadow-sm'
              : 'text-secondary hover:text-on-surface hover:bg-surface'
          }`}
        >
          <BadgePercent className="w-4 h-4" /> Event Sales
        </button>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="bg-white rounded-b-xl border border-t-0 border-border p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'coupons' ? "Search coupon codes…" : "Search event names…"}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-surface outline-none"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          {(search) && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-brand hover:underline font-semibold pr-2"
            >
              Clear
            </button>
          )}
          <button
            onClick={fetchOffers}
            className="p-2 rounded-lg border border-border bg-white text-secondary hover:bg-surface transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Data Listings Workspace ─── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600 font-medium">
          <p>{error}</p>
          <button onClick={fetchOffers} className="mt-2 text-sm text-brand underline font-semibold">
            Retry
          </button>
        </div>
      ) : offers.length === 0 ? (
        <EmptyState
          icon={activeTab === 'coupons' ? Ticket : BadgePercent}
          title={`No ${activeTab} found`}
          description={debouncedSearch ? `No records found matching "${debouncedSearch}".` : `There are no ${activeTab === 'coupons' ? 'coupons' : 'event sales'} configured.`}
          actionText={activeTab === 'coupons' ? 'Create Coupon' : 'Create Event Sale'}
          onActionClick={handleOpenCreate}
          className="py-12 bg-white rounded-xl border border-border"
          data-testid="offers-empty-state"
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm" data-testid="offers-list">
            {/* Desktop columns */}
            <div className="hidden lg:grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1.5fr_0.8fr_80px] gap-4 px-5 py-3 bg-surface border-b border-border text-xs font-semibold text-secondary uppercase tracking-wide">
              <span>{activeTab === 'coupons' ? 'Coupon Code' : 'Event ID'}</span>
              <span>Name / Description</span>
              <span>Discount</span>
              <span>Min Order</span>
              <span>Max Cap</span>
              <span>Validity Dates</span>
              <span>Active</span>
              <span className="text-right">Actions</span>
            </div>

            {/* List */}
            <div className="divide-y divide-border">
              {offers.map((offer) => {
                const isPerc = offer.discount_type === 'percentage'
                const discountDisplay = isPerc ? `${offer.discount_value}% Off` : `${formatCurrency(offer.discount_value)} Off`
                
                return (
                  <div
                    key={offer.id}
                    className={`grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1.5fr_0.8fr_80px] gap-4 px-5 py-4 items-center hover:bg-surface-container-low/20 transition-colors ${
                      !offer.is_active ? 'opacity-60 bg-surface/30' : ''
                    }`}
                  >
                    {/* Code / ID */}
                    <div className="min-w-0">
                      {activeTab === 'coupons' ? (
                        <span className="inline-block px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider font-mono">
                          {offer.code}
                        </span>
                      ) : (
                        <span className="text-xs text-secondary font-mono">
                          #{offer.id?.slice(0, 8)?.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">{offer.name}</p>
                      {activeTab === 'coupons' && (
                        <p className="text-[10px] text-secondary">
                          Used: {offer.usage_count || 0} / {offer.usage_limit || '∞'} times
                        </p>
                      )}
                    </div>

                    {/* Discount */}
                    <span className="text-xs font-bold text-green-700">
                      {discountDisplay}
                    </span>

                    {/* Min Order */}
                    <span className="text-xs text-on-surface font-semibold">
                      {formatCurrency(offer.min_order_value || 0)}
                    </span>

                    {/* Max Cap */}
                    <span className="text-xs text-secondary font-medium">
                      {offer.max_discount_cap ? formatCurrency(offer.max_discount_cap) : 'No Cap'}
                    </span>

                    {/* Dates */}
                    <span className="text-xs text-secondary whitespace-nowrap">
                      {formatDate(offer.start_date)} - {formatDate(offer.end_date)}
                    </span>

                    {/* Active toggle */}
                    <div>
                      <Toggle
                        checked={offer.is_active}
                        onChange={() => handleToggleActive(offer)}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(offer)}
                        className="p-1.5 rounded-lg text-primary hover:bg-primary/5 transition-colors"
                        title="Edit Offer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(offer)}
                        className="p-1.5 rounded-lg text-danger hover:bg-danger/5 transition-colors"
                        title="Delete Offer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalItems={total}
              itemsPerPage={pageSize}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* ─── Create/Edit Offer Modal ─── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingOffer ? 'Edit Promotion Offer' : `Configure New ${activeTab === 'coupons' ? 'Coupon' : 'Event Sale'}`}
        size="md"
        closeOnBackdrop={!formLoading}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coupon Code (Only coupons) */}
            {activeTab === 'coupons' && (
              <Input
                label="Coupon Code (Unique)"
                placeholder="e.g. ZAPSUPER50"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                disabled={!!editingOffer}
                className="font-mono font-bold tracking-wider"
              />
            )}

            {/* Offer Name */}
            <Input
              label={activeTab === 'coupons' ? "Offer Name / Description" : "Event Sale Name"}
              placeholder="e.g. Monsoon Special Fruits Discount"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="md:col-span-1"
            />

            {/* Discount Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-secondary">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-surface outline-none focus:ring-1 focus:ring-brand font-medium h-[38px]"
              >
                <option value="percentage">Percentage (%) Discount</option>
                <option value="flat">Flat Cash (₹) Discount</option>
              </select>
            </div>

            {/* Discount Value */}
            <Input
              type="number"
              label={discountType === 'percentage' ? "Discount Value (%)" : "Discount Value (₹)"}
              placeholder={discountType === 'percentage' ? "e.g. 15" : "e.g. 100"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              required
              min="1"
              max={discountType === 'percentage' ? "100" : undefined}
            />

            {/* Minimum Order Value */}
            <Input
              type="number"
              label="Minimum Order Value (₹)"
              placeholder="e.g. 299"
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value)}
              required
              min="0"
            />

            {/* Max Discount Cap */}
            <Input
              type="number"
              label="Maximum Discount Cap (₹) — Optional"
              placeholder="Leave empty for unlimited cap"
              value={maxDiscountCap}
              onChange={(e) => setMaxDiscountCap(e.target.value)}
              min="0"
            />

            {/* Start Date */}
            <Input
              type="date"
              label="Validity Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />

            {/* End Date */}
            <Input
              type="date"
              label="Validity End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />

            {/* Usage Limit (Only coupons) */}
            {activeTab === 'coupons' && (
              <Input
                type="number"
                label="Global Total Usage Limit"
                placeholder="e.g. 500"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                min="1"
                required
              />
            )}
          </div>

          <div className="flex gap-2.5 pt-4 border-t border-border">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowModal(false)}
              disabled={formLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={formLoading}
              className="flex-1"
            >
              {editingOffer ? 'Save Changes' : 'Create Offer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirmation Dialog ─── */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        title={`Deactivate & Delete Offer?`}
        description={
          confirmDelete
            ? `Are you sure you want to deactivate and remove the promo campaign "${confirmDelete.name}"? This action stops customers from using this offer immediately.`
            : ''
        }
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  )
}
