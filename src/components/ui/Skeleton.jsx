import React from 'react'

/**
 * Skeleton Component
 * Shimmering loaders representing mock cards, tables, and statistics.
 */
export default function Skeleton({
  variant = 'block',
  width = '100%',
  height = '16px',
  className = '',
  rows = 1,
}) {
  // Styles for different basic structural shapes
  const variantClasses = {
    block: 'rounded-lg',
    circle: 'rounded-full',
    card: 'rounded-xl h-[120px] border border-surface-variant p-md',
    tableRow: 'h-12 border-b border-surface-variant flex items-center justify-between px-md gap-lg',
  }

  // Helper template for repeated lists or rows
  const renderItems = () => {
    if (variant === 'tableRow') {
      return Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className={`${variantClasses.tableRow} animate-pulse ${className}`}>
          <div className="w-20 h-4 bg-surface-container-high rounded-lg shrink-0" />
          <div className="w-1/3 h-4 bg-surface-container-high rounded-lg" />
          <div className="w-16 h-4 bg-surface-container-high rounded-lg shrink-0" />
          <div className="w-24 h-4 bg-surface-container-high rounded-lg shrink-0" />
          <div className="w-10 h-10 rounded-full bg-surface-container-high shrink-0" />
        </div>
      ))
    }

    if (variant === 'card') {
      return Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className={`${variantClasses.card} bg-surface-bright flex flex-col justify-between animate-pulse ${className}`}>
          <div className="flex justify-between items-center w-full">
            <div className="w-10 h-10 rounded-full bg-surface-container-high shrink-0" />
            <div className="w-16 h-6 rounded-full bg-surface-container-high shrink-0" />
          </div>
          <div className="space-y-xs w-full">
            <div className="w-24 h-4 bg-surface-container-high rounded-lg" />
            <div className="w-16 h-8 bg-surface-container-high rounded-lg" />
          </div>
        </div>
      ))
    }

    return Array.from({ length: rows }).map((_, idx) => (
      <div
        key={idx}
        className={`bg-surface-container-high animate-pulse ${variantClasses[variant] || variantClasses.block} ${className}`}
        style={{
          width: width,
          height: variant === 'circle' ? width : height,
          marginBottom: rows > 1 && idx < rows - 1 ? '8px' : '0',
        }}
      />
    ))
  }

  return <>{renderItems()}</>
}
