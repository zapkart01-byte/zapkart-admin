import React, { useState, useEffect, useCallback } from 'react'
import { Image as ImageIcon, Plus, Trash2, Edit2, Calendar, GripVertical, Link as LinkIcon, RefreshCw, Upload } from 'lucide-react'
import { getBanners, createBanner, updateBanner, deleteBanner, reorderBanners } from '../services/bannerService'
import { uploadImage } from '../services/storageService'
import { supabase } from '../services/supabase'
import { formatDate } from '../utils/formatters'
import PageLayout from '../components/layout/PageLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import Toggle from '../components/ui/Toggle'
import toast from 'react-hot-toast'

/**
 * ZapKart Banners Page
 * CMS panel for managing promo banners displayed in customer app.
 * Supports HTML5 drag-and-drop sorting, image uploads, and deep links.
 */
export default function BannersPage() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Dropdown options
  const [stores, setStores] = useState([])
  const [categories, setCategories] = useState([])

  // Modal / Form state
  const [showModal, setShowModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  // Form Fields
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [linkType, setLinkType] = useState('external') // store | category | external
  const [linkValue, setLinkValue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null)

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Fetch banners
  const fetchBanners = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBanners()
      setBanners(data || [])
    } catch (err) {
      setError(err.message || 'Failed to fetch promotional banners.')
      setBanners([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch lists for select dropdowns
  useEffect(() => {
    fetchBanners()
    
    async function loadSelectors() {
      try {
        const [{ data: storeData }, { data: catData }] = await Promise.all([
          supabase.from('stores').select('id, store_name').eq('status', 'active').order('store_name'),
          supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order'),
        ])
        setStores(storeData || [])
        setCategories(catData || [])
      } catch (err) {
        console.error('Selector lists load error:', err)
      }
    }
    loadSelectors()
  }, [fetchBanners])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingBanner(null)
    setTitle('')
    setImageUrl('')
    setImageFile(null)
    setLinkType('external')
    setLinkValue('')
    setStartDate('')
    setEndDate('')
    setShowModal(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (banner) => {
    setEditingBanner(banner)
    setTitle(banner.title || '')
    setImageUrl(banner.image_url || '')
    setImageFile(null)
    setLinkType(banner.link_type || 'external')
    setLinkValue(banner.link_value || '')
    
    const parseDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : ''
    setStartDate(parseDate(banner.start_date))
    setEndDate(parseDate(banner.end_date))
    setShowModal(true)
  }

  // Handle local image select
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      // Visual preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Banner title is required')
      return
    }

    if (!imageUrl && !imageFile) {
      toast.error('Please select an image file or enter an image URL')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date')
      return
    }

    setFormLoading(true)
    try {
      let finalImageUrl = imageUrl

      // Upload if local file is selected
      if (imageFile) {
        try {
          const timestamp = Date.now()
          const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)
          finalImageUrl = await uploadImage('banners', `banner_${sanitizedTitle}`, imageFile)
        } catch (uploadErr) {
          // If Supabase storage is missing or returns error, fallback to visual URL preview if valid
          console.warn('Supabase storage upload failed, fallback to text url:', uploadErr)
          if (imageUrl.startsWith('data:')) {
            throw new Error(`Storage upload failed: ${uploadErr.message}. Direct image upload requires Supabase bucket configuration.`)
          }
        }
      }

      const payload = {
        title: title.trim(),
        image_url: finalImageUrl,
        link_type: linkType,
        link_value: linkValue,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        is_active: editingBanner ? editingBanner.is_active : true,
        sort_order: editingBanner ? editingBanner.sort_order : banners.length + 1,
      }

      if (editingBanner) {
        await updateBanner(editingBanner.id, payload)
        toast.success('Promo banner updated successfully')
      } else {
        await createBanner(payload)
        toast.success('Promo banner created successfully')
      }

      setShowModal(false)
      fetchBanners()
    } catch (err) {
      toast.error(err.message || 'Action failed')
    } finally {
      setFormLoading(false)
    }
  }

  // Toggle active banner status
  const handleToggleActive = async (banner) => {
    try {
      const newStatus = !banner.is_active
      await updateBanner(banner.id, { is_active: newStatus })
      toast.success(`Banner marked as ${newStatus ? 'active' : 'inactive'}`)
      setBanners(prev =>
        prev.map(b => (b.id === banner.id ? { ...b, is_active: newStatus } : b))
      )
    } catch (err) {
      toast.error(err.message || 'Status toggle failed')
    }
  }

  // Delete banner confirmation
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setDeleteLoading(true)
    try {
      await deleteBanner(confirmDelete.id)
      toast.success('Promo banner removed successfully')
      setConfirmDelete(null)
      fetchBanners()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Drag and Drop Handlers ──────────────────────────────────────────────────
  const handleDragStart = (index) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    
    // Perform live swap in local state for smooth animations
    const newBanners = [...banners]
    const draggedItem = newBanners[draggedIndex]
    newBanners.splice(draggedIndex, 1)
    newBanners.splice(index, 0, draggedItem)
    
    setDraggedIndex(index)
    setBanners(newBanners)
  }

  const handleDragEnd = async () => {
    setDraggedIndex(null)
    try {
      const orderedIds = banners.map(b => b.id)
      await reorderBanners(orderedIds)
      toast.success('Sort order updated successfully')
    } catch (err) {
      toast.error('Reorder update failed: ' + err.message)
      fetchBanners() // revert
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Promotional Banners</h2>
          <p className="text-sm text-secondary mt-0.5">
            Configure sliding app banners and reorder by dragging. Link directly to store catalogs or URLs.
          </p>
        </div>
        <div className="flex gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchBanners}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white text-secondary hover:bg-surface text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-5 h-5" /> Add New Banner
          </Button>
        </div>
      </div>

      {/* ─── Workspace Banners Grid ─── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600 font-medium">
          <p>{error}</p>
          <button onClick={fetchBanners} className="mt-2 text-sm text-brand underline font-semibold">
            Retry
          </button>
        </div>
      ) : banners.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No promo banners active"
          description="Create your first homepage promo banner linking stores, products or events."
          actionText="Add New Banner"
          onActionClick={handleOpenCreate}
          className="py-12 bg-white rounded-xl border border-border"
          data-testid="banners-empty-state"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="banners-list">
          {banners.map((banner, index) => {
            const isActive = banner.is_active
            return (
              <div
                key={banner.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
                  draggedIndex === index ? 'ring-2 ring-brand ring-offset-2 scale-[0.98]' : 'border-border'
                } ${!isActive ? 'opacity-70' : ''}`}
              >
                {/* Banner visual wrapper */}
                <div className="h-36 bg-surface relative overflow-hidden flex items-center justify-center border-b border-border">
                  {banner.image_url ? (
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-secondary/30" />
                  )}
                  {/* Position Badge overlay */}
                  <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold py-1 px-2.5 rounded-full uppercase tracking-wider">
                    Pos: #{index + 1}
                  </span>
                  
                  {/* Drag indicator handle on hover */}
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 pointer-events-none">
                    <GripVertical className="w-8 h-8 text-white drop-shadow-md shrink-0" />
                  </div>
                </div>

                {/* Banner details */}
                <div className="p-4 space-y-2.5">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-bold text-on-surface truncate pr-1" title={banner.title}>
                      {banner.title}
                    </h4>
                    <div
                      onDragStart={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      draggable="false"
                    >
                      <Toggle
                        checked={banner.is_active}
                        onChange={() => handleToggleActive(banner)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-secondary">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        Link: <strong className="text-on-surface font-semibold capitalize">{banner.link_type}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        Ends: <strong className="text-on-surface font-semibold">{formatDate(banner.end_date)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div 
                    className="flex gap-2 pt-2 border-t border-surface-variant justify-end"
                    onDragStart={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable="false"
                  >
                    <button
                      onClick={() => handleOpenEdit(banner)}
                      className="flex items-center gap-1 text-[11px] font-bold text-primary px-3 py-1.5 rounded-lg border border-border hover:bg-surface transition-colors"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(banner)}
                      className="flex items-center gap-1 text-[11px] font-bold text-danger px-3 py-1.5 rounded-lg border border-border hover:bg-danger/5 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Add/Edit Banner Modal ─── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingBanner ? 'Edit Banner Details' : 'Add New Promotional Banner'}
        size="md"
        closeOnBackdrop={!formLoading}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          {/* Banner Title */}
          <Input
            label="Banner Campaign Title"
            placeholder="e.g. 50% Off Fresh Farm Vegetables"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* Image Input Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary flex items-center justify-between">
              <span>Promo Image Asset</span>
              <span className="text-[10px] text-brand">Vapor-fast uploads supported</span>
            </label>
            <div className="border border-dashed border-border hover:border-brand rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-surface hover:bg-surface/50 transition-colors relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-7 h-7 text-secondary" />
              <p className="text-xs font-semibold text-on-surface">Click to upload file</p>
              <p className="text-[10px] text-secondary">SVG, PNG, JPG or WebP (recommended 720x360px)</p>
            </div>
            
            {/* Fallback Text URL input */}
            <Input
              label="Or enter Image Direct URL (fallback)"
              placeholder="https://example.com/banner.png"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value)
                setImageFile(null)
              }}
              className="text-xs mt-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Link Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-secondary">Link Deep Type</label>
              <select
                value={linkType}
                onChange={(e) => {
                  setLinkType(e.target.value)
                  setLinkValue('')
                }}
                className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-surface outline-none focus:ring-1 focus:ring-brand font-medium h-[38px]"
              >
                <option value="external">External Link (Web URL)</option>
                <option value="store">Store Dashboard Catalog</option>
                <option value="category">Category Shelf Filter</option>
              </select>
            </div>

            {/* Link Value (dependent on type) */}
            {linkType === 'external' ? (
              <Input
                label="Redirect URL"
                placeholder="e.g. https://www.zapkart.in"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                required
              />
            ) : linkType === 'store' ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-secondary">Select Store</label>
                <select
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-surface outline-none focus:ring-1 focus:ring-brand font-medium h-[38px]"
                >
                  <option value="">Choose Store...</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.store_name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-secondary">Select Category</label>
                <select
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-surface outline-none focus:ring-1 focus:ring-brand font-medium h-[38px]"
                >
                  <option value="">Choose Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Start Date */}
            <Input
              type="date"
              label="Promotions Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />

            {/* End Date */}
            <Input
              type="date"
              label="Promotions End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          {/* Buttons */}
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
              {editingBanner ? 'Save Changes' : 'Create Banner'}
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
        title="Remove Promotion Banner?"
        description={
          confirmDelete
            ? `Are you sure you want to permanently remove promo banner campaign "${confirmDelete.title}"? Customers won't see this homepage banner anymore.`
            : ''
        }
        confirmLabel="Remove Banner"
        variant="danger"
      />
    </div>
  )
}
