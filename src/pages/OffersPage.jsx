import React, { useState, useEffect, useCallback } from 'react'
import { 
  Ticket, Percent, Plus, Trash2, Edit2, Calendar, Search, 
  RefreshCw, BadgePercent, Clock, Coins, Users, ShoppingBag, 
  TrendingUp, Upload, AlertCircle, Check 
} from 'lucide-react'
import { getOffers, createOffer, updateOffer, toggleOfferStatus, deleteOffer } from '../services/offerService'
import { getCategories } from '../services/categoryService'
import { uploadImage } from '../services/storageService'
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
import { supabase } from '../services/supabase'

/**
 * Live Countdown Timer Component for active event sales and flash deals
 */
function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(targetDate) - new Date()
      if (difference <= 0) {
        setTimeLeft('Expired')
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      let parts = []
      if (days > 0) parts.push(`${days}d`)
      parts.push(`${String(hours).padStart(2, '0')}h`)
      parts.push(`${String(minutes).padStart(2, '0')}m`)
      parts.push(`${String(seconds).padStart(2, '0')}s`)

      setTimeLeft(parts.join(' '))
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  const isExpired = timeLeft === 'Expired'

  return (
    <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
      isExpired ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-orange-50 text-orange-600 border border-orange-200'
    }`}>
      <Clock className="w-3.5 h-3.5" />
      <span>{timeLeft}</span>
    </div>
  )
}

/**
 * ZapKart Offers & Promotions Module
 */
export default function OffersPage() {
  // Tabs: 'coupons' | 'events' | 'flash'
  const [activeTab, setActiveTab] = useState('coupons')

  // Search & Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // Data states
  const [offers, setOffers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [categoriesList, setCategoriesList] = useState([])

  // Global Platform budget & usage stats
  const [budgetLimit, setBudgetLimit] = useState(1000)
  const [todaySpend, setTodaySpend] = useState(0)
  const [weeklySpend, setWeeklySpend] = useState(0)
  const [ordersAffected, setOrdersAffected] = useState(0)
  const [offerOrderStats, setOfferOrderStats] = useState({})

  // Modal / Form state
  const [showModal, setShowModal] = useState(false)
  const [editingOffer, setEditingOffer] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  // Form Fields
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [discountType, setDiscountType] = useState('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [minOrderValue, setMinOrderValue] = useState('0')
  const [maxDiscountCap, setMaxDiscountCap] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [usageLimit, setUsageLimit] = useState('100')
  const [perUserLimit, setPerUserLimit] = useState('1')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [bannerUrl, setBannerUrl] = useState('')
  const [riderBonus, setRiderBonus] = useState(true)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  // Action Dialog state
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Auto-generate code helper
  const handleAutoGenerateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let generated = 'ZAP'
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCode(generated)
  }

  // Load platform settings & categories
  useEffect(() => {
    async function loadConfig() {
      try {
        const { data: settings } = await supabase
          .from('platform_settings')
          .select('offer_budget_daily')
          .eq('id', 1)
          .maybeSingle()

        if (settings?.offer_budget_daily) {
          setBudgetLimit(Number(settings.offer_budget_daily))
        }

        const cats = await getCategories()
        setCategoriesList(cats || [])
      } catch (err) {
        console.error('Failed to load settings or categories:', err)
      }
    }
    loadConfig()
  }, [])

  // Fetch Orders and calculate Platform-wide Analytics & Per-Offer Analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      weekStart.setHours(0, 0, 0, 0)

      // Fetch orders in the last week
      const { data: weeklyOrders, error: orderError } = await supabase
        .from('orders')
        .select('id, discount_amount, offer_id, customer_id, created_at, status')
        .gte('created_at', weekStart.toISOString())

      if (orderError) throw orderError

      // Today's discount spend
      const todayStr = todayStart.toISOString().split('T')[0]
      const spendToday = (weeklyOrders || [])
        .filter(o => o.created_at.startsWith(todayStr))
        .reduce((sum, o) => sum + Number(o.discount_amount || 0), 0)
      
      setTodaySpend(spendToday)

      // Weekly discount spend
      const spendWeek = (weeklyOrders || [])
        .reduce((sum, o) => sum + Number(o.discount_amount || 0), 0)
      setWeeklySpend(spendWeek)

      // Weekly orders affected
      const affected = (weeklyOrders || [])
        .filter(o => o.offer_id !== null).length
      setOrdersAffected(affected)

      // Group all-time orders to calculate per-offer usage analytics
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('offer_id, discount_amount, customer_id')
        .neq('offer_id', null)

      if (allOrdersError) throw allOrdersError

      const statsMap = {}
      if (allOrders) {
        allOrders.forEach(o => {
          if (!statsMap[o.offer_id]) {
            statsMap[o.offer_id] = {
              ordersCount: 0,
              discountSum: 0,
              customers: new Set()
            }
          }
          statsMap[o.offer_id].ordersCount += 1
          statsMap[o.offer_id].discountSum += Number(o.discount_amount || 0)
          if (o.customer_id) {
            statsMap[o.offer_id].customers.add(o.customer_id)
          }
        })
      }
      setOfferOrderStats(statsMap)

    } catch (err) {
      console.error('Failed to load offer analytics:', err)
    }
  }, [])

  // Fetch offers
  const fetchOffers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const type = activeTab === 'coupons' ? 'coupon' : activeTab === 'events' ? 'event_sale' : 'flash_deal'
      const res = await getOffers({
        type,
        search: debouncedSearch || undefined,
        page,
        pageSize,
      })
      setOffers(res.offers || [])
      setTotal(res.total || 0)
      
      // Load live statistics
      await fetchAnalytics()
    } catch (err) {
      setError(err.message || 'Failed to fetch offers.')
      setOffers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [activeTab, debouncedSearch, page, pageSize, fetchAnalytics])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // Reset pagination on tab switch
  useEffect(() => {
    setPage(1)
    setSearch('')
    setDebouncedSearch('')
  }, [activeTab])

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingOffer(null)
    setCode('')
    setName('')
    setDiscountType('percentage')
    setDiscountValue('')
    setMinOrderValue('0')
    setMaxDiscountCap('')
    
    // Default valid dates (today to next week)
    const today = new Date()
    const parseDateTime = (d) => d.toISOString().slice(0, 16)
    setStartDate(parseDateTime(today))
    
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)
    setEndDate(parseDateTime(nextWeek))
    
    setUsageLimit('100')
    setPerUserLimit('1')
    setSelectedCategories([])
    setBannerUrl('')
    setRiderBonus(true)
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
    
    // Parse timestamps to YYYY-MM-DDTHH:MM
    const parseDateTime = (d) => d ? new Date(d).toISOString().slice(0, 16) : ''
    setStartDate(parseDateTime(offer.start_date))
    setEndDate(parseDateTime(offer.end_date))
    setUsageLimit(String(offer.usage_limit || '100'))
    setPerUserLimit(String(offer.per_user_limit || '1'))
    setSelectedCategories(offer.categories || [])
    setBannerUrl(offer.banner_image_url || '')
    setRiderBonus(offer.rider_gets_event_bonus !== false)
    setShowModal(true)
  }

  // Handle banner image upload
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    try {
      const fileName = `banner-${Date.now()}`
      const url = await uploadImage('offer-banners', fileName, file)
      setBannerUrl(url)
      toast.success('Promo banner uploaded successfully')
    } catch (err) {
      toast.error('Image upload failed: ' + err.message)
    } finally {
      setUploadingBanner(false)
    }
  }

  // Form Submit handler
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    
    if (activeTab === 'coupons' && !code.trim()) {
      toast.error('Coupon code is required')
      return
    }
    if (!name.trim()) {
      toast.error('Promotion name is required')
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
      toast.error('Start date/time cannot be after end date/time')
      return
    }

    if ((activeTab === 'events' || activeTab === 'flash') && selectedCategories.length === 0) {
      toast.error('Please select at least one applicable category')
      return
    }

    setFormLoading(true)
    try {
      const type = activeTab === 'coupons' ? 'coupon' : activeTab === 'events' ? 'event_sale' : 'flash_deal'
      
      const payload = {
        type,
        code: activeTab === 'coupons' ? code.toUpperCase().trim() : null,
        name: name.trim(),
        discount_type: activeTab === 'events' ? 'percentage' : discountType, // Events are percentage only
        discount_value: value,
        min_order_value: Number(minOrderValue) || 0,
        max_discount_cap: Number(maxDiscountCap) || null,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        usage_limit: activeTab === 'coupons' ? (Number(usageLimit) || null) : null,
        per_user_limit: activeTab === 'coupons' ? (Number(perUserLimit) || 1) : 1,
        categories: (activeTab === 'events' || activeTab === 'flash') ? selectedCategories : null,
        banner_image_url: (activeTab === 'events' || activeTab === 'flash') ? bannerUrl : null,
        rider_gets_event_bonus: activeTab === 'events' ? riderBonus : false,
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
      toast.error(err.message || 'Failed to save offer. Check validation requirements.')
    } finally {
      setFormLoading(false)
    }
  }

  // Toggle active status
  const handleToggleActive = async (offer) => {
    try {
      const newStatus = !offer.is_active
      await toggleOfferStatus(offer.id, newStatus)
      toast.success(`Offer marked as ${newStatus ? 'active' : 'inactive'}`)
      
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
      toast.success('Offer deactivated')
      setConfirmDelete(null)
      fetchOffers()
    } catch (err) {
      toast.error(err.message || 'Failed to remove offer.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Category selection handler
  const handleCategoryToggle = (catName) => {
    setSelectedCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface font-headline-md">Promotions & Offers CMS</h2>
          <p className="text-sm text-secondary mt-0.5 font-medium">
            Configure discount codes and seasonal marketplace events.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 self-start sm:self-auto bg-orange-600 hover:bg-orange-700 text-white font-bold"
        >
          <Plus className="w-5 h-5" />
          {activeTab === 'coupons' ? 'Create Coupon' : activeTab === 'events' ? 'Create Event Sale' : 'Create Flash Deal'}
        </Button>
      </div>

      {/* ─── Offer Analytics Panel ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-orange-500/10 text-orange-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Today's Discount Spend</p>
            <p className="text-xl font-extrabold text-orange-500">{formatCurrency(todaySpend)}</p>
            <p className="text-[10px] text-slate-500 font-medium">Limit: {formatCurrency(budgetLimit)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
          <div className="p-3 rounded-lg bg-green-500/10 text-green-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">This Week's Discount</p>
            <p className="text-xl font-extrabold text-green-500">{formatCurrency(weeklySpend)}</p>
            <p className="text-[10px] text-slate-500 font-medium">Platform Absorbed</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Orders Affected</p>
            <p className="text-xl font-extrabold text-blue-500">{ordersAffected} orders</p>
            <p className="text-[10px] text-slate-500 font-medium">Active this week</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Budget Remaining Today</p>
            <p className={`text-xl font-extrabold ${budgetLimit - todaySpend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(Math.max(0, budgetLimit - todaySpend))}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Daily budget safety limit</p>
          </div>
        </div>
      </div>

      {/* ─── Compliance Notice Banner ─── */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-800 text-xs shadow-sm font-medium">
        <AlertCircle className="w-5 h-5 shrink-0 text-blue-500" />
        <div className="space-y-1">
          <p className="font-bold">Important Financial Guidelines:</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700 font-semibold">
            <li>"Store earnings are not affected by any offers."</li>
            <li>"Riders earn INR 5 extra per order during event sales."</li>
            <li>"ZapKart absorbs all discount costs."</li>
          </ul>
        </div>
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
        <button
          onClick={() => setActiveTab('flash')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'flash'
              ? 'bg-primary-container text-on-primary-container shadow-sm'
              : 'text-secondary hover:text-on-surface hover:bg-surface'
          }`}
        >
          <Clock className="w-4 h-4" /> Flash Deals
        </button>
      </div>

      {/* ─── Search Bar ─── */}
      <div className="bg-white rounded-b-xl border border-t-0 border-border p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab === 'coupons' ? "coupon codes" : activeTab === 'events' ? "event sales" : "flash deals"}…`}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-surface outline-none"
          />
        </div>
        <button
          onClick={fetchOffers}
          className="p-2 rounded-lg border border-border bg-white text-secondary hover:bg-surface transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ─── Offers List Workspace ─── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
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
          title={`No promotions found`}
          description={`There are no ${activeTab === 'coupons' ? 'coupons' : activeTab === 'events' ? 'event sales' : 'flash deals'} configured.`}
          actionText={`Create ${activeTab === 'coupons' ? 'Coupon' : activeTab === 'events' ? 'Event' : 'Flash Deal'}`}
          onActionClick={handleOpenCreate}
          className="py-12 bg-white rounded-xl border border-border"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {offers.map((offer) => {
            const stats = offerOrderStats[offer.id] || { ordersCount: 0, discountSum: 0, customers: new Set() }
            const isPerc = offer.discount_type === 'percentage'
            const discountDisplay = isPerc ? `${offer.discount_value}% Off` : `${formatCurrency(offer.discount_value)} Off`
            const hasStarted = new Date(offer.start_date) <= new Date()
            const hasEnded = new Date(offer.end_date) <= new Date()

            return (
              <div
                key={offer.id}
                className={`bg-white rounded-xl border border-border p-5 flex flex-col md:flex-row gap-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${
                  !offer.is_active ? 'opacity-65 bg-slate-50/50' : ''
                }`}
              >
                {/* Visual Accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  !offer.is_active ? 'bg-slate-300' : activeTab === 'coupons' ? 'bg-orange-500' : activeTab === 'events' ? 'bg-green-600' : 'bg-red-600'
                }`} />

                {/* Banner / Type Avatar */}
                <div className="shrink-0 flex items-center justify-center">
                  {(offer.banner_image_url) ? (
                    <img
                      src={offer.banner_image_url}
                      alt={offer.name}
                      className="w-24 h-24 rounded-lg object-cover border border-border shadow-sm"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center border border-dashed ${
                      activeTab === 'coupons' ? 'bg-orange-50 border-orange-200 text-orange-500' : activeTab === 'events' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                      {activeTab === 'coupons' ? <Ticket className="w-8 h-8" /> : activeTab === 'events' ? <BadgePercent className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                      <span className="text-[10px] font-bold mt-1 font-mono uppercase">{offer.type}</span>
                    </div>
                  )}
                </div>

                {/* Middle Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-extrabold text-sm text-on-surface truncate">{offer.name}</h3>
                    {offer.code && (
                      <span className="inline-block px-2.5 py-0.5 rounded bg-orange-100 text-orange-800 text-xs font-bold font-mono tracking-wide uppercase border border-orange-200">
                        {offer.code}
                      </span>
                    )}
                    {offer.is_active && hasStarted && !hasEnded && (
                      <CountdownTimer targetDate={offer.end_date} />
                    )}
                    {hasEnded && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">Expired</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    Discount: <span className="text-on-surface font-extrabold">{discountDisplay}</span>
                    {offer.max_discount_cap ? ` (Capped at ${formatCurrency(offer.max_discount_cap)})` : ''}
                    {' · '} Min Order: <span className="text-on-surface font-extrabold">{formatCurrency(offer.min_order_value)}</span>
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 font-bold">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {formatDate(offer.start_date)} - {formatDate(offer.end_date)}</span>
                    {offer.categories && offer.categories.length > 0 && (
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">Cats: {offer.categories.join(', ')}</span>
                    )}
                    {offer.rider_gets_event_bonus && (
                      <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-md font-bold">Rider gets ₹5 Bonus</span>
                    )}
                  </div>

                  {/* ─── Per-offer Usage Stats ─── */}
                  <div className="grid grid-cols-3 gap-2.5 max-w-md pt-2.5 border-t border-dashed border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <ShoppingBag className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">Orders</p>
                        <p className="font-extrabold text-on-surface text-xs">{stats.ordersCount} orders</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Coins className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">Discount Given</p>
                        <p className="font-extrabold text-green-600 text-xs">{formatCurrency(stats.discountSum)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Users className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">New Customers</p>
                        <p className="font-extrabold text-on-surface text-xs">{stats.customers.size} customers</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 gap-3">
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={offer.is_active}
                      onChange={() => handleToggleActive(offer)}
                    />
                    <span className={`text-[11px] font-bold ${offer.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                      {offer.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(offer)}
                      className="p-2 border border-slate-200 hover:bg-slate-50 text-primary rounded-lg transition-colors flex items-center justify-center"
                      title="Edit Campaign"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(offer)}
                      className="p-2 border border-slate-200 hover:bg-red-50 text-red-500 rounded-lg transition-colors flex items-center justify-center"
                      title="Deactivate Offer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* ─── Create/Edit Offer Modal ─── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingOffer ? 'Edit Promotion Offer' : `Configure New ${activeTab === 'coupons' ? 'Coupon' : activeTab === 'events' ? 'Event Sale' : 'Flash Deal'}`}
        size="lg"
        closeOnBackdrop={!formLoading}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Coupon Code (Only coupons) */}
            {activeTab === 'coupons' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-secondary">Coupon Code (Unique)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. MONSOON20"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    disabled={!!editingOffer}
                    className="flex-1 px-3 py-2 text-xs border border-border rounded-lg bg-surface outline-none focus:ring-1 focus:ring-brand font-mono font-bold tracking-wider"
                  />
                  {!editingOffer && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAutoGenerateCode}
                      className="text-xs py-1"
                    >
                      Auto-Gen
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Offer Name */}
            <Input
              label={activeTab === 'coupons' ? "Offer Name / Description" : "Campaign Name"}
              placeholder="e.g. Diwali Mega Grocery Sale"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            {/* Discount Type (Coupons & Flash Deals) */}
            {activeTab !== 'events' ? (
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
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-secondary">Discount Type</label>
                <div className="px-3 py-2 text-xs border border-border rounded-lg bg-slate-50 font-bold text-slate-700 h-[38px] flex items-center">
                  Percentage (%) Discount Only
                </div>
              </div>
            )}

            {/* Discount Value */}
            <Input
              type="number"
              label={discountType === 'percentage' || activeTab === 'events' ? "Discount Value (%)" : "Discount Value (₹)"}
              placeholder={discountType === 'percentage' || activeTab === 'events' ? "e.g. 15" : "e.g. 100"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              required
              min="1"
              max={discountType === 'percentage' || activeTab === 'events' ? "100" : undefined}
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

            {/* Max Discount Cap (Percentage only) */}
            {(discountType === 'percentage' || activeTab === 'events') ? (
              <Input
                type="number"
                label="Maximum Discount Cap (₹) — Optional"
                placeholder="Leave empty for unlimited cap"
                value={maxDiscountCap}
                onChange={(e) => setMaxDiscountCap(e.target.value)}
                min="0"
              />
            ) : <div />}

            {/* Start Date & Time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-secondary">Validity Start Date & Time</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-surface outline-none focus:ring-1 focus:ring-brand font-medium"
              />
            </div>

            {/* End Date & Time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-secondary">Validity End Date & Time</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-surface outline-none focus:ring-1 focus:ring-brand font-medium"
              />
            </div>

            {/* Usage Limit & Per User Limit (Only coupons) */}
            {activeTab === 'coupons' && (
              <>
                <Input
                  type="number"
                  label="Global Total Usage Limit"
                  placeholder="e.g. 500"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  min="1"
                  required
                />
                <Input
                  type="number"
                  label="Per Customer Usage Limit"
                  placeholder="default 1"
                  value={perUserLimit}
                  onChange={(e) => setPerUserLimit(e.target.value)}
                  min="1"
                  required
                />
              </>
            )}

            {/* Banner Image Upload (Only Event Sales & Flash Deals) */}
            {(activeTab === 'events' || activeTab === 'flash') && (
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-secondary">Campaign Banner Image (Required for home screen)</label>
                <div className="flex items-center gap-4 border border-border border-dashed p-3 rounded-lg bg-surface">
                  <div className="relative overflow-hidden w-28 h-16 bg-slate-100 rounded border border-border flex items-center justify-center shrink-0">
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      disabled={uploadingBanner}
                      className="text-xs"
                    />
                    <p className="text-[10px] text-secondary mt-1 font-medium">Recommended: 1200 x 600px, PNG or JPG (max 2MB)</p>
                  </div>
                  {uploadingBanner && <Spinner size="sm" />}
                </div>
              </div>
            )}

            {/* Category selection (Only Event Sales & Flash Deals) */}
            {(activeTab === 'events' || activeTab === 'flash') && (
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-secondary">Applicable Grocery Categories (Multi-select)</label>
                <div className="flex flex-wrap gap-2 border border-border p-3 rounded-lg bg-surface min-h-[50px]">
                  {categoriesList.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.name)
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryToggle(cat.name)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                          isSelected
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cat.emoji || '📦'}</span>
                        <span>{cat.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Rider Event Bonus Toggle (Only Event Sales) */}
            {activeTab === 'events' && (
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 md:col-span-2">
                <div>
                  <p className="text-xs font-bold text-slate-700">Rider Event Bonus Incentive</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Riders earn an extra ₹5 per order completed during this event sale. Cost absorbed by ZapKart.</p>
                </div>
                <Toggle
                  checked={riderBonus}
                  onChange={setRiderBonus}
                />
              </div>
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
              type="submit"
              variant="primary"
              isLoading={formLoading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold"
            >
              {editingOffer ? 'Save Changes' : 'Create Offer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        title="Deactivate Promo Campaign?"
        description={
          confirmDelete
            ? `Are you sure you want to stop the promotion "${confirmDelete.name}"? Active customers will no longer receive these discount benefits.`
            : ''
        }
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  )
}
