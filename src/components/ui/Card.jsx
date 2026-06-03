import React from 'react'

/**
 * Card Component
 * General block container panel providing headers, active hover overlays, and Stitch shadow/borders.
 */
export default function Card({
  children,
  title,
  subtitle,
  headerAction,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  hoverable = false,
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-container-lowest border border-surface-variant rounded-xl shadow-card overflow-hidden flex flex-col ${
        hoverable ? 'hover:shadow-elevated transition-shadow duration-300 cursor-pointer active:scale-[0.99] transition-transform' : ''
      } ${className}`}
      {...props}
    >
      {/* Optional Card Header section */}
      {(title || subtitle || headerAction) && (
        <div
          className={`px-md py-sm border-b border-surface-variant flex justify-between items-center bg-surface shrink-0 gap-sm ${headerClassName}`}
        >
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="font-headline-sm text-headline-sm text-on-surface truncate font-semibold">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="font-body-sm text-body-sm text-secondary truncate mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0 flex items-center">{headerAction}</div>}
        </div>
      )}

      {/* Main Card Content area */}
      <div className={`p-md flex-1 ${bodyClassName}`}>{children}</div>
    </div>
  )
}
