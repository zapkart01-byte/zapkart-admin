import { supabase } from './supabase'

/**
 * ZapKart Category Management Service
 * CRUD operations for product categories in the admin dashboard.
 */

// Fetches all categories sorted by their display order
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to fetch categories: ${error.message}`)
  return data
}

// Fetches a single category by its ID
export async function getCategoryById(id) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch category: ${error.message}`)
  return data
}

// Creates a new product category
export async function createCategory(categoryData) {
  const { data, error } = await supabase
    .from('categories')
    .insert(categoryData)
    .select()
    .single()

  if (error) throw new Error(`Failed to create category: ${error.message}`)
  return data
}

// Updates an existing category's fields
export async function updateCategory(id, categoryData) {
  const { data, error } = await supabase
    .from('categories')
    .update(categoryData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update category: ${error.message}`)
  return data
}

// Toggles a category's active status on or off
export async function toggleCategoryStatus(id, isActive) {
  const { data, error } = await supabase
    .from('categories')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to toggle category status: ${error.message}`)
  return data
}

// Deletes a category permanently from the database
export async function deleteCategory(id) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete category: ${error.message}`)
  return true
}

// Updates the sort order of all categories for drag-and-drop reordering
export async function reorderCategories(orderedIds) {
  const updates = orderedIds.map((id, index) => ({
    id,
    sort_order: index + 1,
  }))

  for (const update of updates) {
    const { error } = await supabase
      .from('categories')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id)

    if (error) throw new Error(`Failed to reorder categories: ${error.message}`)
  }

  return true
}
