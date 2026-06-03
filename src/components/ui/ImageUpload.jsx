import React, { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadImage } from '../../services/storageService'
import Spinner from './Spinner'

/**
 * ImageUpload - Polish drag-and-drop Supabase Storage image uploader.
 * All functions have one-line comments above them.
 */

// Renders the file dropzone container, handles uploading state, and yields public URL callbacks
export default function ImageUpload({ bucket = 'product-images', fileName = 'image', value, onChange, onError, className = '' }) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  // Handlers for drag-over state changes
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  // Prepares and processes selected files for uploading
  const processFile = async (file) => {
    if (!file) return

    // Enforces file type filters (images only)
    if (!file.type.startsWith('image/')) {
      toast.error('Only image uploads are permitted.')
      return
    }

    // Limits maximum upload size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds the 5MB size limit.')
      return
    }

    setUploading(true)
    try {
      const publicUrl = await uploadImage(bucket, fileName, file)
      onChange(publicUrl)
      toast.success('Image uploaded successfully.')
    } catch (err) {
      console.error(err)
      toast.error(`Upload failed: ${err.message}`)
      if (onError) onError(err)
    } finally {
      setUploading(false)
    }
  }

  // Handles files dropped directly into the zone
  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0])
    }
  }

  // Handles standard file selection click dialogs
  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0])
    }
  }

  // Triggers hidden input click selection dialogs
  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  // Resets uploader state by removing current image attachment
  const handleRemove = (e) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div className={`w-full ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Renders image preview card if URL value is present */}
      {value ? (
        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-surface-variant group bg-surface-container-low">
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              onClick={handleRemove}
              className="bg-red-600 text-white p-2.5 rounded-full shadow-md hover:scale-105 transition-transform"
              title="Remove attachment"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* Otherwise renders active upload dropzone wrapper */
        <div
          onClick={triggerFileInput}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`w-full aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-surface-variant hover:border-primary hover:bg-surface/5'
          } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Spinner size="md" />
              <p className="text-body-sm text-secondary font-medium">Uploading attachment...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-secondary">
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary-container">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-label-lg text-on-surface font-bold">Upload Image</p>
                <p className="text-body-sm mt-0.5">Drag & drop or click to browse</p>
              </div>
              <p className="text-body-xs opacity-75">PNG, JPG, JPEG up to 5MB</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
