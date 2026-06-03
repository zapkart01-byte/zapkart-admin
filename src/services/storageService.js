import { supabase } from './supabase'

/**
 * ZapKart Storage Service
 * File upload, download, and deletion via Supabase Storage.
 */

// Uploads a file to the specified Supabase Storage bucket and path
export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw new Error(`Failed to upload file: ${error.message}`)
  return data
}

// Returns the public URL for a file in Supabase Storage
export function getPublicUrl(bucket, path) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}

// Deletes a file from the specified Supabase Storage bucket
export async function deleteFile(bucket, path) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) throw new Error(`Failed to delete file: ${error.message}`)
  return true
}

// Uploads an image file and returns its public URL for immediate use
export async function uploadImage(bucket, fileName, file) {
  const timestamp = Date.now()
  const ext = file.name.split('.').pop()
  const path = `${fileName}-${timestamp}.${ext}`

  await uploadFile(bucket, path, file)
  return getPublicUrl(bucket, path)
}
