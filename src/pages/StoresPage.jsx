import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, X, Star, MoreVertical, Plus, Store as StoreIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { getStores, updateStoreStatus, createStore } from '../services/storeService'
import { formatCurrency, formatDate } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import Pagination from '../components/ui/Pagination'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

/**
 * ZapKart Admin — Store Inventory Management Page
 * Matching the Stitch stores_management_responsive design.
 * Desktop: table view | Mobile: card view
 */

const STATUS_TABS = [
  { key: 'all', label: 'All Stores' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending Approval' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'closed', label: 'Closed' },
]

const PAGE_SIZE = 20

// Maps store status to Badge variant for visual consistency
function statusVariant(status) {
  const map = {
    active: 'success',
    pending: 'warning',
    suspended: 'danger',
    closed: 'secondary',
  }
  return map[status?.toLowerCase()] || 'secondary'
}

export default function StoresPage() {
  const navigate = useNavigate()
  const [stores, setStores] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionMenuId, setActionMenuId] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [storeType, setStoreType] = useState('grocery')

  // Debounce search input by 400ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // Fetch stores whenever filters change
  const fetchStores = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getStores({ status, search: debouncedSearch, page, pageSize: PAGE_SIZE })
      setStores(res.stores || [])
      setTotal(res.total || 0)
    } catch (err) {
      console.error('Failed to fetch stores:', err)
      toast.error('Could not load stores.')
    } finally {
      setLoading(false)
    }
  }, [status, debouncedSearch, page])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [status, debouncedSearch])

  // Handle status action from the dropdown
  const handleStatusAction = (store, newStatus) => {
    setActionMenuId(null)
    const labels = { active: 'activate', suspended: 'suspend', closed: 'close' }
    setConfirmDialog({
      title: `${labels[newStatus]?.charAt(0).toUpperCase() + labels[newStatus]?.slice(1)} Store`,
      message: `Are you sure you want to ${labels[newStatus]} "${store.store_name}"? ${newStatus === 'suspended' ? 'They will not receive new orders.' : ''}`,
      variant: newStatus === 'active' ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          await updateStoreStatus(store.id, newStatus, 'admin')
          toast.success(`Store ${labels[newStatus]}d successfully`)
          fetchStores()
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
    setStoreName('')
    setOwnerName('')
    setOwnerPhone('')
    setAddress('')
    setStoreType('grocery')
    setShowCreateModal(true)
  }

  const handleCreateStore = async (e) => {
    e.preventDefault()
    if (!storeName.trim() || !ownerName.trim() || !ownerPhone.trim()) {
      toast.error('Store name, owner name, and phone are required.')
      return
    }

    setFormLoading(true)
    try {
      const created = await createStore({
        store_name: storeName,
        owner_name: ownerName,
        owner_phone: ownerPhone,
        address,
        store_type: storeType,
        status: 'pending',
      })
      toast.success('Store created successfully')
      setShowCreateModal(false)
      fetchStores()
      navigate(`/stores/${created.id}`)
    } catch (err) {
      toast.error(err.message || 'Failed to create store.')
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-headline-lg text-on-surface">Store Inventory Management</h2>
          <p className="text-body-md text-secondary mt-1">
            Manage active stores, performance, and inventory levels.
          </p>
        </div>
        <button
          type="button"
          data-testid="add-store-button"
          onClick={handleOpenCreate}
          className="bg-primary text-on-primary font-label-lg px-6 py-3 rounded-full flex items-center gap-2 hover:bg-on-primary-container transition-colors min-h-[44px] shadow-sm active:scale-[0.97]"
        >
          <Plus className="w-5 h-5" />
          Add New Store
        </button>
      </div>

      {/* ─── Filters & Search Bar ─── */}
      <div className="bg-surface border border-surface-variant rounded-xl p-4 mb-6 shadow-card flex flex-col md:flex-row gap-4 items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
          <input
            id="store-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stores by name, ID, or location..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-surface-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary text-body-md outline-none transition-all"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {STATUS_TABS.map((tab) => {
            const isActive = status === tab.key
            return (
              <button
                key={tab.key}
                id={`filter-${tab.key}`}
                onClick={() => setStatus(tab.key)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full font-label-md text-label-md min-h-[40px] transition-colors ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'border border-surface-variant bg-surface text-secondary hover:bg-surface-container-low'
                }`}
              >
                {tab.label}
                {isActive && tab.key !== 'all' && (
                  <X
                    className="w-3.5 h-3.5 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      setStatus('all')
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Loading State ─── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {/* ─── Empty State ─── */}
      {!loading && stores.length === 0 && (
        <EmptyState
          icon={StoreIcon}
          title="No stores found"
          description={debouncedSearch ? `No stores match "${debouncedSearch}". Try another search term.` : 'There are no stores with the selected status.'}
          actionText="Add New Store"
          onActionClick={handleOpenCreate}
          className="py-16"
        />
      )}

      {/* ─── Desktop Table View (Hidden on Mobile) ─── */}
      {!loading && stores.length > 0 && (
        <>
          <div className="hidden md:block bg-surface border border-surface-variant rounded-xl shadow-card overflow-hidden mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-variant text-secondary font-label-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Store Info</th>
                  <th className="p-4 font-semibold">Location</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Daily Revenue</th>
                  <th className="p-4 font-semibold">Rating</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {stores.map((store) => (
                  <tr
                    key={store.id}
                    className="hover:bg-surface-container-lowest transition-colors cursor-pointer"
                    onClick={() => navigate(`/stores/${store.id}`)}
                  >
                    {/* Store Info — avatar + name */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                          {store.logo_url ? (
                            <img
                              src={store.logo_url}
                              alt={store.store_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <StoreIcon className="w-6 h-6 text-secondary" />
                          )}
                        </div>
                        <div>
                          <div className="text-label-lg text-on-surface font-semibold">
                            {store.store_name || 'Unnamed Store'}
                          </div>
                          <div className="text-label-sm text-secondary">
                            ID: {store.id?.slice(0, 8)?.toUpperCase() || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="p-4 text-body-md text-secondary">
                      {store.address || store.city || '—'}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <Badge variant={statusVariant(store.status)}>
                        {store.status || 'unknown'}
                      </Badge>
                    </td>

                    {/* Daily Revenue */}
                    <td className="p-4 text-headline-sm text-primary font-semibold">
                      {formatCurrency(store.daily_revenue || 0)}
                    </td>

                    {/* Rating */}
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-[#FBBC04] fill-[#FBBC04]" />
                        <span className="text-label-md text-on-surface font-medium">
                          {store.rating?.toFixed(1) || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="relative inline-block">
                        <button
                          id={`action-${store.id}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setActionMenuId(actionMenuId === store.id ? null : store.id)
                          }}
                          className="text-primary hover:bg-surface-container-low p-2 rounded-full transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {actionMenuId === store.id && (
                          <div className="absolute right-0 top-10 z-30 w-48 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-lg py-1 animate-fade-in">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/stores/${store.id}`) }}
                              className="w-full text-left px-4 py-2.5 text-body-md text-on-surface hover:bg-surface-container-low transition-colors"
                            >
                              View Details
                            </button>
                            {store.status !== 'active' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusAction(store, 'active') }}
                                className="w-full text-left px-4 py-2.5 text-body-md text-success hover:bg-surface-container-low transition-colors"
                              >
                                Activate Store
                              </button>
                            )}
                            {store.status !== 'suspended' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusAction(store, 'suspended') }}
                                className="w-full text-left px-4 py-2.5 text-body-md text-warning hover:bg-surface-container-low transition-colors"
                              >
                                Suspend Store
                              </button>
                            )}
                            {store.status !== 'closed' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusAction(store, 'closed') }}
                                className="w-full text-left px-4 py-2.5 text-body-md text-danger hover:bg-surface-container-low transition-colors"
                              >
                                Close Store
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── Mobile Card View (Hidden on Desktop) ─── */}
          <div className="md:hidden space-y-4 mb-6">
            {stores.map((store) => (
              <div
                key={store.id}
                className="bg-surface border border-surface-variant rounded-xl p-3 shadow-card flex flex-col gap-3"
              >
                <div className="flex gap-3">
                  {/* Store image / icon */}
                  <div className="w-16 h-16 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.store_name} className="w-full h-full object-cover" />
                    ) : (
                      <StoreIcon className="w-7 h-7 text-secondary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="text-label-lg text-on-surface font-semibold truncate">
                        {store.store_name || 'Unnamed'}
                      </div>
                      <Badge variant={statusVariant(store.status)} className="ml-2">
                        {store.status}
                      </Badge>
                    </div>
                    <div className="text-body-sm text-secondary mt-0.5 truncate">
                      {store.address || store.city || '—'}
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <div className="text-headline-sm text-primary font-semibold">
                        {formatCurrency(store.daily_revenue || 0)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-[#FBBC04] fill-[#FBBC04]" />
                        <span className="text-label-md text-on-surface">{store.rating?.toFixed(1) || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Card bottom actions */}
                <div className="border-t border-surface-variant pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setActionMenuId(actionMenuId === store.id ? null : store.id)}
                    className="px-4 py-1.5 rounded-full border border-surface-variant text-secondary font-label-md hover:bg-surface-container-low min-h-[36px] transition-colors"
                  >
                    Manage
                  </button>
                  <button
                    onClick={() => navigate(`/stores/${store.id}`)}
                    className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-md min-h-[36px] transition-colors hover:brightness-110"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
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
        title="Add New Store"
        size="md"
        closeOnBackdrop={!formLoading}
      >
        <form onSubmit={handleCreateStore} className="space-y-4" data-testid="store-create-form">
          <Input
            label="Store Name"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="e.g. Fresh Mart Koramangala"
            required
            disabled={formLoading}
          />
          <Input
            label="Owner Name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Store owner full name"
            required
            disabled={formLoading}
          />
          <Input
            label="Owner Phone"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="+91 9876543210"
            required
            disabled={formLoading}
          />
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Full store address"
            disabled={formLoading}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface-variant">Store Type</label>
            <select
              value={storeType}
              onChange={(e) => setStoreType(e.target.value)}
              disabled={formLoading}
              className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface outline-none focus:ring-2 focus:ring-primary-container"
            >
              <option value="grocery">Grocery</option>
              <option value="general">General</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="bakery">Bakery</option>
            </select>
          </div>
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
              Create Store
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
