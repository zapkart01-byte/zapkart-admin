import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Filter, Flag, EyeOff, RefreshCw,
  AlertTriangle, Package, ChevronRight, Store, Tag, Plus, Check, X,
} from 'lucide-react'
import { getProducts, createProduct, flagProduct, removeProduct, approveProductImage, rejectProductImage } from '../services/productService'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, truncateText } from '../utils/formatters'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'

/**
 * ProductsPage — admin monitoring view for all products across all stores.
 * Supports search, store/category/violation filters, and flag/deactivate moderation actions.
 */

const PAGE_SIZE = 20

export default function ProductsPage() {
  const { user } = useAuth()

  // Filter state
  const [search, setSearch] = useState('')
  const [storeFilter, setStoreFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false)
  const [showOnlyMRPViolations, setShowOnlyMRPViolations] = useState(false)
  const [page, setPage] = useState(1)

  // Data state
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Stores and categories for filter dropdowns
  const [stores, setStores] = useState([])
  const [categories, setCategories] = useState([])

  // Moderation state
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'flag'|'deactivate', product }
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [productName, setProductName] = useState('')
  const [productStoreId, setProductStoreId] = useState('')
  const [productCategoryId, setProductCategoryId] = useState('')
  const [productUnit, setProductUnit] = useState('1 pc')
  const [productMrp, setProductMrp] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productStock, setProductStock] = useState('10')
  const [productCostPrice, setProductCostPrice] = useState('')

  // Image Review state (Phase 6)
  const [imageReviewProducts, setImageReviewProducts] = useState([])
  const [imageReviewLoading, setImageReviewLoading] = useState(true)
  const [imageActionLoading, setImageActionLoading] = useState(null) // productId being actioned

  const [platformSettings, setPlatformSettings] = useState({ platform_markup_per_item: 1 })

  const searchDebounce = useRef(null)

  // Loads store, category, and platform settings from Supabase
  useEffect(() => {
    async function loadInitialData() {
      const [{ data: storeData }, { data: catData }, { data: settingsData }] = await Promise.all([
        supabase.from('stores').select('id, store_name').order('store_name'),
        supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order'),
        supabase.from('platform_settings').select('platform_markup_per_item').single(),
      ])
      setStores(storeData || [])
      setCategories(catData || [])
      if (settingsData) {
        setPlatformSettings(settingsData)
      }
    }
    loadInitialData()
  }, [])

  // Fetches products that have custom images uploaded by stores (for moderation)
  const fetchImageReviewProducts = useCallback(async () => {
    setImageReviewLoading(true)
    try {
      const [productsRes, logsRes] = await Promise.all([
        supabase
          .from('products')
          .select('*, stores:store_id(id, store_name)')
          .not('image_url', 'is', null)
          .eq('is_flagged', false)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(100),
        supabase
          .from('audit_log')
          .select('target_id')
          .eq('action', 'APPROVE_PRODUCT_IMAGE')
      ])

      if (productsRes.error) throw productsRes.error

      const approvedProductIds = new Set(logsRes.data?.map(l => l.target_id) || [])
      const pendingReview = (productsRes.data || []).filter(
        (product) => !approvedProductIds.has(product.id)
      )

      setImageReviewProducts(pendingReview.slice(0, 50))
    } catch (err) {
      console.error('Failed to load image review queue:', err)
    } finally {
      setImageReviewLoading(false)
    }
  }, [])

  // Fetches paginated products from Supabase with current filters applied
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getProducts({
        search,
        storeId: storeFilter || undefined,
        categoryId: categoryFilter || undefined,
        isFlagged: showOnlyFlagged ? true : undefined,
        isActive: true,
        page,
        pageSize: PAGE_SIZE,
      })

      // Apply client-side MRP violation filter (Supabase gt with column comparison is limited in anon key)
      let filtered = result.products || []
      if (showOnlyMRPViolations) {
        filtered = filtered.filter((p) => Number(p.store_price) > Number(p.platform_mrp))
      }

      setProducts(filtered)
      setTotal(showOnlyMRPViolations ? filtered.length : (result.total || 0))
    } catch (err) {
      setError(err.message || 'Failed to load products.')
    } finally {
      setLoading(false)
    }
  }, [search, storeFilter, categoryFilter, showOnlyFlagged, showOnlyMRPViolations, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { fetchImageReviewProducts() }, [fetchImageReviewProducts])

  // Reset page to 1 when filters change
  useEffect(() => { setPage(1) }, [search, storeFilter, categoryFilter, showOnlyFlagged, showOnlyMRPViolations])

  // Debounced search input handler
  function handleSearchChange(e) {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => setSearch(e.target.value), 350)
  }

  // Executes the pending flag or deactivate action against productService
  async function handleConfirmAction() {
    if (!confirmAction) return
    setActionLoading(true)
    setActionError(null)
    try {
      if (confirmAction.type === 'flag') {
        await flagProduct(confirmAction.product.id, 'Flagged by admin', user.uid)
      } else {
        await removeProduct(confirmAction.product.id, user.uid)
      }
      setConfirmAction(null)
      fetchProducts()
    } catch (err) {
      setActionError(err.message || 'Action failed. Please retry.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setProductName('')
    setProductStoreId(stores[0]?.id || '')
    setProductCategoryId(categories[0]?.id || '')
    setProductUnit('1 pc')
    setProductMrp('')
    setProductPrice('')
    setProductStock('10')
    setProductCostPrice('')
    setShowCreateModal(true)
  }

  const handleCreateProduct = async (e) => {
    e.preventDefault()
    if (!productName.trim() || !productStoreId) {
      toast.error('Product name and store are required.')
      return
    }

    const mrp = Number(productMrp)
    const price = Number(productPrice)
    if (!mrp || !price || price > mrp) {
      toast.error('Enter valid MRP and store price (price must not exceed MRP).')
      return
    }

    setFormLoading(true)
    try {
      await createProduct({
        store_id: productStoreId,
        category_id: productCategoryId || null,
        name: productName,
        unit: productUnit,
        platform_mrp: mrp,
        store_price: price,
        stock: Number(productStock) || 0,
        cost_price: Number(productCostPrice) || 0,
      })
      toast.success('Product created successfully')
      setShowCreateModal(false)
      fetchProducts()
    } catch (err) {
      toast.error(err.message || 'Failed to create product.')
    } finally {
      setFormLoading(false)
    }
  }

  // Handles approve action for a product image
  const handleApproveImage = async (product) => {
    setImageActionLoading(product.id)
    try {
      await approveProductImage(product.id, user?.id)
      toast.success(`Image approved for "${product.name}"`)
      setImageReviewProducts((prev) => prev.filter((p) => p.id !== product.id))
    } catch (err) {
      toast.error('Failed to approve image: ' + err.message)
    } finally {
      setImageActionLoading(null)
    }
  }

  // Handles reject action for a product image
  const handleRejectImage = async (product) => {
    setImageActionLoading(product.id)
    try {
      await rejectProductImage(
        product.id,
        product.stores?.id,
        product.name,
        user?.id
      )
      toast.success(`Image rejected for "${product.name}". Store owner will be notified.`)
      setImageReviewProducts((prev) => prev.filter((p) => p.id !== product.id))
      fetchProducts() // Refresh product list as is_flagged changed
    } catch (err) {
      toast.error('Failed to reject image: ' + err.message)
    } finally {
      setImageActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Products</h1>
          <p className="text-sm text-secondary mt-0.5">
            Monitoring view — flag violations and deactivate listings
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            type="button"
            data-testid="add-product-button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
          <button
            onClick={fetchProducts}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white text-secondary hover:bg-surface text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* ─── Pending Image Review Section ─── */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide">
              Pending Image Review
            </h2>
            {!imageReviewLoading && (
              <span className="text-xs font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full">
                {imageReviewProducts.length}
              </span>
            )}
          </div>
          <button
            onClick={fetchImageReviewProducts}
            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
            title="Refresh image review queue"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {imageReviewLoading ? (
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : imageReviewProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-secondary">
            <Check className="w-10 h-10 text-green-500 mb-2" />
            <p className="text-sm font-semibold text-green-700">All images reviewed</p>
            <p className="text-xs text-secondary mt-1">No product images awaiting moderation.</p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {imageReviewProducts.map((product) => {
              const isActioning = imageActionLoading === product.id
              return (
                <div
                  key={product.id}
                  className="border border-border rounded-xl overflow-hidden bg-surface hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* Product image */}
                  <div className="relative aspect-square bg-gray-100">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>

                  {/* Product info */}
                  <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                    <p className="text-xs font-bold text-on-surface leading-tight line-clamp-2">{product.name}</p>
                    <p className="text-[10px] text-secondary truncate">{product.stores?.store_name || '—'}</p>
                    <p className="text-[10px] text-secondary">{product.unit}</p>

                    {/* Action buttons */}
                    <div className="flex gap-1.5 mt-auto pt-1.5 border-t border-border">
                      <button
                        onClick={() => handleApproveImage(product)}
                        disabled={isActioning}
                        title="Approve image"
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                      >
                        {isActioning ? (
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        OK
                      </button>
                      <button
                        onClick={() => handleRejectImage(product)}
                        disabled={isActioning}
                        title="Reject image"
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                      >
                        {isActioning ? (
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
            <input
              type="text"
              defaultValue={search}
              onChange={handleSearchChange}
              placeholder="Search by product name…"
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 bg-surface"
            />
          </div>

          {/* Store dropdown */}
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="">All Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.store_name}</option>
            ))}
          </select>

          {/* Category dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Toggle filters */}
        <div className="flex flex-wrap gap-3">
          <FilterToggle
            active={showOnlyMRPViolations}
            onToggle={() => setShowOnlyMRPViolations((v) => !v)}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label="MRP Violations Only"
            activeClass="bg-red-600 text-white border-red-600"
            inactiveClass="bg-white text-red-600 border-red-300 hover:bg-red-50"
          />
          <FilterToggle
            active={showOnlyFlagged}
            onToggle={() => setShowOnlyFlagged((v) => !v)}
            icon={<Flag className="w-3.5 h-3.5" />}
            label="Flagged Only"
            activeClass="bg-amber-500 text-white border-amber-500"
            inactiveClass="bg-white text-amber-600 border-amber-300 hover:bg-amber-50"
          />
        </div>
      </div>

      {/* Products table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchProducts}
            className="mt-3 text-sm font-semibold text-brand underline"
          >
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="No products match the current filters. Create a product or adjust your filters."
          actionText="Add Product"
          onActionClick={handleOpenCreate}
          data-testid="products-empty-state"
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm" data-testid="products-list">
            {/* Desktop header */}
            <div className="hidden lg:grid grid-cols-[1.8fr_1fr_0.8fr_0.6fr_0.6fr_1.5fr_0.5fr_0.5fr_90px] gap-3 px-5 py-3 bg-surface border-b border-border text-xs font-semibold text-secondary uppercase tracking-wide">
              <span>Product</span>
              <span>Store</span>
              <span>Category</span>
              <span>MRP</span>
              <span>Store Price</span>
              <span>Payout / Profits</span>
              <span>Stock</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-border">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  platformSettings={platformSettings}
                  onFlag={() => setConfirmAction({ type: 'flag', product })}
                  onDeactivate={() => setConfirmAction({ type: 'deactivate', product })}
                />
              ))}
            </div>
          </div>

          {totalPages > 1 && !showOnlyMRPViolations && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Confirm dialog for flag/deactivate */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => { setConfirmAction(null); setActionError(null) }}
        onConfirm={handleConfirmAction}
        loading={actionLoading}
        title={
          confirmAction?.type === 'flag'
            ? `Flag "${truncateText(confirmAction.product.name, 30)}"?`
            : `Deactivate "${truncateText(confirmAction?.product?.name, 30)}"?`
        }
        description={
          confirmAction?.type === 'flag'
            ? 'This product will be marked as flagged and reviewed. The store owner will be notified.'
            : 'This product will be deactivated and hidden from customers immediately.'
        }
        confirmLabel={confirmAction?.type === 'flag' ? 'Flag Product' : 'Deactivate'}
        variant={confirmAction?.type === 'flag' ? 'warning' : 'danger'}
        error={actionError}
      />

      <Modal
        isOpen={showCreateModal}
        onClose={() => !formLoading && setShowCreateModal(false)}
        title="Add Product"
        size="md"
        closeOnBackdrop={!formLoading}
      >
        <form onSubmit={handleCreateProduct} className="space-y-4" data-testid="product-create-form">
          <Input
            label="Product Name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            disabled={formLoading}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary">Store</label>
            <select
              value={productStoreId}
              onChange={(e) => setProductStoreId(e.target.value)}
              required
              disabled={formLoading}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="">Select store…</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.store_name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary">Category</label>
            <select
              value={productCategoryId}
              onChange={(e) => setProductCategoryId(e.target.value)}
              disabled={formLoading}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Unit"
            value={productUnit}
            onChange={(e) => setProductUnit(e.target.value)}
            disabled={formLoading}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Platform MRP (₹)"
              value={productMrp}
              onChange={(e) => setProductMrp(e.target.value)}
              required
              min="1"
              disabled={formLoading}
            />
            <Input
              type="number"
              label="Store Price (₹)"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              required
              min="1"
              disabled={formLoading}
            />
          </div>
          <Input
            type="number"
            label="Stock"
            value={productStock}
            onChange={(e) => setProductStock(e.target.value)}
            min="0"
            disabled={formLoading}
          />
          <Input
            type="number"
            label="Cost Price (₹)"
            value={productCostPrice}
            onChange={(e) => setProductCostPrice(e.target.value)}
            min="0"
            disabled={formLoading}
            placeholder="Optional — for profit calculation"
          />
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={formLoading} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formLoading} className="flex-1">
              Create Product
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Product Row ──────────────────────────────────────────────────────────────

// Renders a single product row — red-highlighted when store_price exceeds platform_mrp
function ProductRow({ product, platformSettings, onFlag, onDeactivate }) {
  const isMRPViolation = Number(product.store_price) > Number(product.platform_mrp)
  const isFlagged = product.is_flagged
  const isInactive = !product.is_active
  const discountPct = product.platform_mrp > 0
    ? Math.round((product.platform_mrp - product.store_price) / product.platform_mrp * 100)
    : 0

  // Calculate actual payouts and profits
  const commRate = Number(product.categories?.commission_rate !== undefined ? product.categories.commission_rate : 0.18)
  const storePayout = Number(product.store_price || 0) * (1 - commRate)
  const storeProfit = storePayout - Number(product.cost_price || 0)
  
  const markup = Math.min(Number(product.store_price || 0) + Number(platformSettings?.platform_markup_per_item || 1), Number(product.platform_mrp || 0)) - Number(product.store_price || 0)
  const zapkartProfit = (Number(product.store_price || 0) * commRate) + markup

  return (
    <div
      className={`group transition-colors ${
        isMRPViolation
          ? 'bg-red-50 border-l-4 border-l-red-500'
          : isFlagged
          ? 'bg-amber-50 border-l-4 border-l-amber-400'
          : 'hover:bg-surface border-l-4 border-l-transparent'
      }`}
    >
      {/* Desktop row */}
      <div className="hidden lg:grid grid-cols-[1.8fr_1fr_0.8fr_0.6fr_0.6fr_1.5fr_0.5fr_0.5fr_90px] gap-3 px-5 py-3.5 items-center">
        {/* Product name + image */}
        <div className="flex items-center gap-3 min-w-0">
          {(product.image_url || product.image_urls?.[0]) ? (
            <img
              src={product.image_url || product.image_urls[0]}
              alt={product.name}
              className="w-9 h-9 rounded-lg object-cover border border-border shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-secondary" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate">{truncateText(product.name, 30)}</p>
            <p className="text-xs text-secondary">{product.unit}</p>
          </div>
        </div>

        {/* Store */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Store className="w-3.5 h-3.5 text-secondary shrink-0" />
          <span className="text-sm text-secondary truncate">{truncateText(product.stores?.store_name, 20)}</span>
        </div>

        {/* Category */}
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-secondary shrink-0" />
          <span className="text-sm text-secondary">{product.categories?.name || '—'}</span>
        </div>

        {/* MRP */}
        <span className="text-sm text-secondary">{formatCurrency(product.platform_mrp)}</span>

        {/* Store price — red if violation */}
        <div>
          <span className={`text-sm font-semibold ${isMRPViolation ? 'text-red-600' : 'text-on-surface'}`}>
            {formatCurrency(product.store_price)}
          </span>
          {isMRPViolation && (
            <p className="text-xs text-red-500 font-medium">Exceeds MRP!</p>
          )}
          {discountPct > 0 && !isMRPViolation && (
            <p className="text-xs text-green-600">{discountPct}% off</p>
          )}
        </div>

        {/* Payout / Profit detailed cards */}
        <div className="flex flex-col gap-0.5 text-xs bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
          <div className="flex justify-between gap-1.5">
            <span className="text-secondary text-[11px]">Store Payout:</span>
            <span className="font-semibold text-green-600 text-[11px]">{formatCurrency(storePayout)}</span>
          </div>
          {Number(product.cost_price) > 0 && (
            <div className="flex justify-between gap-1.5">
              <span className="text-secondary text-[11px]">Store Profit:</span>
              <span className="font-semibold text-green-700 text-[11px]">{formatCurrency(storeProfit)}</span>
            </div>
          )}
          <div className="flex justify-between gap-1.5 border-t border-dashed border-border/80 mt-0.5 pt-0.5">
            <span className="text-secondary text-[11px]">ZapKart Profit:</span>
            <span className="font-semibold text-blue-600 text-[11px]">{formatCurrency(zapkartProfit)}</span>
          </div>
          <div className="flex justify-between gap-1.5 border-t border-dashed border-border/80 mt-0.5 pt-0.5">
            <span className="text-secondary text-[11px]">Rider Share:</span>
            <span className="font-semibold text-purple-600 text-[10px]">₹25-50/order</span>
          </div>
        </div>

        {/* Stock */}
        <span className={`text-sm font-medium ${product.stock === 0 ? 'text-red-500' : 'text-on-surface'}`}>
          {product.stock}
        </span>

        {/* Status */}
        <div className="flex flex-col gap-1">
          {isInactive ? (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full w-fit">Inactive</span>
          ) : (
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full w-fit">Active</span>
          )}
          {isFlagged && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full w-fit">Flagged</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {!isFlagged && !isInactive && (
            <button
              onClick={onFlag}
              title="Flag product"
              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
            >
              <Flag className="w-4 h-4" />
            </button>
          )}
          {!isInactive && (
            <button
              onClick={onDeactivate}
              title="Deactivate product"
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile card */}
      <div className="lg:hidden px-4 py-3 space-y-3">
        <div className="flex items-start gap-3">
          {(product.image_url || product.image_urls?.[0]) ? (
            <img src={product.image_url || product.image_urls[0]} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-secondary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-on-surface">{truncateText(product.name, 30)}</p>
            <p className="text-xs text-secondary">{product.stores?.store_name} · {product.categories?.name}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!isFlagged && !isInactive && (
              <button onClick={onFlag} className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors">
                <Flag className="w-4 h-4" />
              </button>
            )}
            {!isInactive && (
              <button onClick={onDeactivate} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                <EyeOff className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-secondary">MRP:</span>
              <span className="font-medium text-on-surface">{formatCurrency(product.platform_mrp)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-secondary">Store Price:</span>
              <span className={`font-semibold ${isMRPViolation ? 'text-red-600' : 'text-on-surface'}`}>
                {formatCurrency(product.store_price)}
                {isMRPViolation && ' ⚠️'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-secondary">Stock:</span>
              <span className={`font-medium ${product.stock === 0 ? 'text-red-500' : 'text-on-surface'}`}>{product.stock}</span>
            </div>
          </div>
          
          <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-100 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-secondary">Store Payout:</span>
              <span className="font-semibold text-green-600">{formatCurrency(storePayout)}</span>
            </div>
            {Number(product.cost_price) > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-secondary">Store Profit:</span>
                <span className="font-semibold text-green-700">{formatCurrency(storeProfit)}</span>
              </div>
            )}
            <div className="flex justify-between text-[11px] border-t border-dashed border-border/80 pt-1">
              <span className="text-secondary">ZapKart Profit:</span>
              <span className="font-semibold text-blue-600">{formatCurrency(zapkartProfit)}</span>
            </div>
            <div className="flex justify-between text-[11px] border-t border-dashed border-border/80 pt-1">
              <span className="text-secondary">Rider Share:</span>
              <span className="font-semibold text-purple-600">₹25-50/ord</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Filter Toggle Button ─────────────────────────────────────────────────────

// Renders a toggle filter pill with active/inactive styling
function FilterToggle({ active, onToggle, icon, label, activeClass, inactiveClass }) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active ? activeClass : inactiveClass
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
