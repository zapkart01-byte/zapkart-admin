import React, { useState, useEffect, useCallback } from 'react'
import { FolderHeart, Plus, Trash2, Edit2, GripVertical, RefreshCw, Search, ToggleLeft } from 'lucide-react'
import { supabase } from '../services/supabase'
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
 * ZapKart Categories Page
 * CMS panel for managing product shelf categories, emojis, and sorting order.
 */
export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filters
  const [search, setSearch] = useState('')
  const [draggedIndex, setDraggedIndex] = useState(null)

  // Modal / Form state
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, error: err } = await query
      if (err) throw err
      setCategories(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Open Create
  const handleOpenCreate = () => {
    setEditingCategory(null)
    setName('')
    setEmoji('🍎')
    setShowModal(true)
  }

  // Open Edit
  const handleOpenEdit = (cat) => {
    setEditingCategory(cat)
    setName(cat.name || '')
    setEmoji(cat.emoji || '🍎')
    setShowModal(true)
  }

  // Submit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Category name is required')
      return
    }

    setFormLoading(true)
    try {
      const payload = {
        name: name.trim(),
        emoji: emoji.trim(),
        is_active: editingCategory ? editingCategory.is_active : true,
        sort_order: editingCategory ? editingCategory.sort_order : categories.length + 1,
      }

      if (editingCategory) {
        const { error: err } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id)

        if (err) throw err
        toast.success('Category details updated')
      } else {
        const { error: err } = await supabase
          .from('categories')
          .insert(payload)

        if (err) throw err
        toast.success('New category shelf created')
      }

      setShowModal(false)
      fetchCategories()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setFormLoading(false)
    }
  }

  // Toggle Active Status
  const handleToggleActive = async (cat) => {
    try {
      const newStatus = !cat.is_active
      const { error: err } = await supabase
        .from('categories')
        .update({ is_active: newStatus })
        .eq('id', cat.id)

      if (err) throw err
      toast.success(`Category marked as ${newStatus ? 'active' : 'inactive'}`)
      setCategories(prev =>
        prev.map(c => (c.id === cat.id ? { ...c, is_active: newStatus } : c))
      )
    } catch (err) {
      toast.error(err.message || 'Toggle status failed')
    }
  }

  // Delete Category
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setDeleteLoading(true)
    try {
      const { error: err } = await supabase
        .from('categories')
        .delete()
        .eq('id', confirmDelete.id)

      if (err) throw err
      toast.success('Category deleted permanently')
      setConfirmDelete(null)
      fetchCategories()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Drag and Drop Reordering Handlers ───────────────────────────────────────
  const handleDragStart = (index) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newCats = [...categories]
    const draggedItem = newCats[draggedIndex]
    newCats.splice(draggedIndex, 1)
    newCats.splice(index, 0, draggedItem)

    setDraggedIndex(index)
    setCategories(newCats)
  }

  const handleDragEnd = async () => {
    setDraggedIndex(null)
    try {
      // Re-map sort orders in Supabase
      const updates = categories.map((cat, idx) => ({
        id: cat.id,
        sort_order: idx + 1,
      }))

      for (const update of updates) {
        await supabase
          .from('categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
      }
      toast.success('Categories display order updated')
    } catch (err) {
      toast.error('Reorder update failed: ' + err.message)
      fetchCategories()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Shelf Categories Manager</h2>
          <p className="text-sm text-secondary mt-0.5">
            Configure catalog product categories, emoji identifiers, and drag to set customer app priority.
          </p>
        </div>
        <div className="flex gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchCategories}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white text-secondary hover:bg-surface text-xs font-semibold transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-5 h-5" /> Add Category
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-border p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shelves name…"
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-surface outline-none font-medium"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-brand hover:underline font-semibold"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Workspace list */}
      {loading ? (
        <div className="space-y-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-600 font-medium">
          <p>{error}</p>
          <button onClick={fetchCategories} className="mt-2 text-sm text-brand underline font-semibold">
            Retry
          </button>
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={FolderHeart}
          title="No shelf categories found"
          description="Create grocery shelves like Dairy, Staples, Beverages to classify items."
          className="py-12 bg-white rounded-xl border border-border"
        />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm max-w-3xl">
          {/* Table headers */}
          <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_1fr_100px] gap-4 px-5 py-3 bg-surface border-b border-border text-xs font-semibold text-secondary uppercase tracking-wide">
            <span>Order</span>
            <span>Emoji</span>
            <span>Shelf Name</span>
            <span>Active Status</span>
            <span className="text-right">Actions</span>
          </div>

          {/* List items */}
          <div className="divide-y divide-border">
            {categories.map((cat, idx) => {
              const isActive = cat.is_active
              return (
                <div
                  key={cat.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`grid grid-cols-1 sm:grid-cols-[80px_1fr_1fr_1fr_100px] gap-4 px-5 py-3.5 items-center hover:bg-surface-container-low/20 transition-colors cursor-grab active:cursor-grabbing select-none ${
                    draggedIndex === idx ? 'bg-brand/5 ring-1 ring-brand/10' : ''
                  } ${!isActive ? 'opacity-60 bg-surface/30' : ''}`}
                >
                  {/* Handle & Position */}
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-secondary/40 shrink-0 cursor-grab" />
                    <span className="text-xs font-mono font-bold text-secondary">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Emoji */}
                  <span className="text-2xl">{cat.emoji || '📦'}</span>

                  {/* Name */}
                  <span className="text-xs font-bold text-on-surface">{cat.name}</span>

                  {/* Active Toggle */}
                  <div 
                    onDragStart={(e) => e.stopPropagation()} 
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable="false"
                  >
                    <Toggle
                      checked={cat.is_active}
                      onChange={() => handleToggleActive(cat)}
                    />
                  </div>

                  {/* Actions */}
                  <div 
                    className="flex justify-end gap-1.5"
                    onDragStart={(e) => e.stopPropagation()} 
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable="false"
                  >
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 rounded-lg text-primary hover:bg-primary/5 transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(cat)}
                      className="p-1.5 rounded-lg text-danger hover:bg-danger/5 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Create/Edit Category Modal ─── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? 'Edit Category Shelf' : 'Add New Category Shelf'}
        size="sm"
        closeOnBackdrop={!formLoading}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          {/* Emoji */}
          <Input
            label="Category Emoji / Icon Symbol"
            placeholder="e.g. 🥦, 🥛, 🍞"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            required
            maxLength={4}
            className="text-center text-lg w-20 mx-auto"
          />

          {/* Name */}
          <Input
            label="Category Name"
            placeholder="e.g. Fresh Vegetables"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

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
              {editingCategory ? 'Save Changes' : 'Create Shelf'}
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
        title="Delete Shelf Category?"
        description={
          confirmDelete
            ? `Are you sure you want to permanently delete category shelf "${confirmDelete.name}"? This removes the category from the database permanently.`
            : ''
        }
        confirmLabel="Remove Permanently"
        variant="danger"
      />
    </div>
  )
}
