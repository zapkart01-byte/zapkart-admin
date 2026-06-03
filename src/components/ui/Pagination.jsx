import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

/**
 * Pagination Component
 * Displays pagination controllers to browse through large structured listings.
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  // Prevent actions if total pages is 1
  if (totalPages <= 1) return null

  // Helper limits
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-center gap-md py-md px-lg bg-surface border border-surface-variant rounded-xl shadow-card w-full ${className}`}>
      {/* Informative index ranges */}
      <p className="text-body-sm text-secondary font-medium">
        Showing <span className="font-semibold text-on-surface">{startItem}</span> to{' '}
        <span className="font-semibold text-on-surface">{endItem}</span> of{' '}
        <span className="font-semibold text-on-surface">{totalItems}</span> results
      </p>

      {/* Pages navigations button triggers */}
      <div className="flex items-center gap-sm shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-9 w-9 p-0 flex items-center justify-center rounded-lg"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-xs font-semibold text-label-md">
          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1
            const isCurrent = pageNum === currentPage

            // Responsive limits: Only show nearby pages if totalPages is large
            if (totalPages > 5) {
              if (pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
                if (pageNum === 2 || pageNum === totalPages - 1) {
                  return (
                    <span key={pageNum} className="text-secondary px-xs">
                      ...
                    </span>
                  )
                }
                return null
              }
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`h-9 min-w-9 px-sm rounded-lg transition-colors flex items-center justify-center ${
                  isCurrent
                    ? 'bg-primary-container text-on-primary-container border border-transparent shadow-sm'
                    : 'text-secondary bg-transparent hover:bg-surface-container-high border border-transparent hover:text-on-surface'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-9 w-9 p-0 flex items-center justify-center rounded-lg"
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
