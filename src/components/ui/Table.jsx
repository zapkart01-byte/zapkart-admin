import React from 'react'
import Spinner from './Spinner'
import EmptyState from './EmptyState'

/**
 * Table Component
 * Structured custom data table rendering header schemas, row cells, empty fallbacks, and loading spinners.
 */
export default function Table({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage,
  emptyDescription,
  onRowClick,
  className = '',
}) {
  const hasData = data && data.length > 0

  return (
    <div className={`w-full overflow-hidden border border-surface-variant rounded-xl bg-surface-container-lowest shadow-card ${className}`}>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[600px]">
          {/* Table Header Schema */}
          <thead>
            <tr className="bg-surface-container-low text-secondary font-label-sm uppercase tracking-wider border-b border-surface-variant">
              {columns.map((col, index) => (
                <th
                  key={col.key || index}
                  className={`p-md font-semibold text-label-sm select-none ${col.headerClassName || ''}`}
                  style={{ width: col.width }}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-surface-variant text-body-md text-on-surface">
            {/* Loading Indicator Spinner Row */}
            {isLoading && (
              <tr>
                <td colSpan={columns.length} className="p-xl text-center">
                  <div className="flex flex-col items-center justify-center gap-md">
                    <Spinner size="lg" />
                    <p className="text-body-sm text-secondary font-semibold">Loading data...</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty Fallback Display */}
            {!isLoading && !hasData && (
              <tr>
                <td colSpan={columns.length} className="p-xl text-center">
                  <EmptyState
                    title={emptyMessage || 'No records found'}
                    description={emptyDescription || 'There are no active records in this system folder.'}
                    className="py-md"
                  />
                </td>
              </tr>
            )}

            {/* Active Data Rows */}
            {!isLoading &&
              hasData &&
              data.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${
                    onRowClick ? 'hover:bg-surface-container-low cursor-pointer' : 'hover:bg-surface-container-lowest'
                  }`}
                >
                  {columns.map((col, colIndex) => {
                    const cellValue = row[col.key]
                    return (
                      <td
                        key={col.key || colIndex}
                        className={`p-md text-body-md font-medium align-middle ${col.cellClassName || ''}`}
                      >
                        {col.render ? col.render(cellValue, row, rowIndex) : cellValue ?? '-'}
                      </td>
                    )
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
