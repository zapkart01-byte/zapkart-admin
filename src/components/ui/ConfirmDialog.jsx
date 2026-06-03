import React from 'react'
import Modal from './Modal'
import Button from './Button'
import { AlertCircle } from 'lucide-react'

/**
 * ConfirmDialog Component
 * Custom confirmation layout dialog to prompt validation prior to executing critical actions.
 * Supports legacy and variations of prop names for seamless integration across all views.
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Are you sure?',
  message,
  description,
  confirmText = 'Confirm',
  confirmLabel,
  cancelText = 'Cancel',
  isDanger = false,
  variant,
  isLoading = false,
  loading,
  error,
}) {
  const activeClose = onClose || onCancel
  const activeMessage = message || description || 'This action cannot be undone. Please confirm you would like to proceed.'
  const activeConfirmText = confirmLabel || confirmText
  const activeLoading = isLoading || loading
  
  // Danger check
  const activeIsDanger = isDanger || variant === 'danger'
  const activeIsWarning = variant === 'warning'
  
  // Icon and badge styling based on status
  let badgeColor = 'bg-warning/10 text-warning'
  if (activeIsDanger) {
    badgeColor = 'bg-danger/10 text-danger'
  } else if (activeIsWarning) {
    badgeColor = 'bg-amber-100 text-amber-600'
  }

  return (
    <Modal isOpen={isOpen} onClose={activeClose} title={title} size="sm" closeOnBackdrop={!activeLoading}>
      <div className="flex flex-col items-center text-center gap-md">
        {/* Warning Indicator icon */}
        <div className={`p-md rounded-full ${badgeColor}`}>
          <AlertCircle className="w-8 h-8 shrink-0" />
        </div>

        {/* Informative message */}
        <p className="text-body-md text-secondary font-medium">
          {activeMessage}
        </p>

        {/* Error message if action failed */}
        {error && (
          <div className="w-full text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg p-2 font-medium">
            {error}
          </div>
        )}

        {/* Action Button group */}
        <div className="flex items-center justify-center gap-sm w-full pt-sm border-t border-surface-variant">
          <Button
            variant="outline"
            onClick={activeClose}
            disabled={activeLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={activeIsDanger ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={activeLoading}
            disabled={activeLoading}
            className="flex-1"
          >
            {activeConfirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

