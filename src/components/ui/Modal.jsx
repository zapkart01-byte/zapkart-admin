import React, { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Modal Component
 * Reusable modal screen overlay supporting background blurs, Escape hotkeys, and custom sizing.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  className = '',
}) {
  // Bind Escape key event listener to trigger modal close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent background scrolling when a modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  // Size constraints classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full m-margin-mobile md:m-lg h-[calc(100vh-32px)]',
  }

  // Backdrop click wrapper
  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-margin-mobile"
    >
      <div
        className={`w-full bg-surface-container-lowest border border-surface-variant rounded-xl shadow-elevated flex flex-col overflow-hidden animate-fade-in ${sizeClasses[size]} ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-md py-sm border-b border-surface-variant flex items-center justify-between bg-surface shrink-0">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate pr-md">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-xs text-secondary hover:bg-surface-container-high rounded-full flex items-center justify-center transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content Container */}
        <div className="p-md overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
