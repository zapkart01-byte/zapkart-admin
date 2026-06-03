import React from 'react'
import { Inbox } from 'lucide-react'
import Button from './Button'

/**
 * EmptyState Component
 * Displays elegant layout blocks when lists, search outputs, or folders return zero active items.
 */
export default function EmptyState({
  title = 'No data available',
  description = 'There are no active records in this directory or database file.',
  icon: Icon = Inbox,
  actionText,
  onActionClick,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-lg gap-md max-w-sm mx-auto ${className}`}>
      {/* Centered Graphic illustration */}
      <div className="p-lg rounded-full bg-surface-container-high text-secondary flex items-center justify-center shrink-0 shadow-inner">
        <Icon className="w-12 h-12 stroke-1" />
      </div>

      {/* Narrative explanations */}
      <div className="space-y-xs">
        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
          {title}
        </h3>
        <p className="font-body-sm text-body-sm text-secondary leading-relaxed font-medium">
          {description}
        </p>
      </div>

      {/* Action Button trigger */}
      {actionText && onActionClick && (
        <Button variant="primary" onClick={onActionClick} className="mt-sm">
          {actionText}
        </Button>
      )}
    </div>
  )
}
