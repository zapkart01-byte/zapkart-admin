import React from 'react'

/**
 * Toggle Component
 * Reusable switch slider toggle representing active states or operational switches.
 */
export default function Toggle({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = '',
  id,
}) {
  const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={`flex items-center gap-sm select-none cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {/* Switch Input slider */}
      {/* Switch Input slider */}
      <label htmlFor={toggleId} className="relative cursor-pointer block w-12 h-7 shrink-0">
        <input
          type="checkbox"
          id={toggleId}
          checked={checked}
          onChange={(e) => !disabled && onChange && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        {/* Toggle Track line */}
        <div
          className={`block w-12 h-7 rounded-full transition-colors duration-200 border ${
            checked
              ? 'bg-primary-container border-transparent'
              : 'bg-surface-container-high border-outline-variant'
          }`}
        />
        {/* Toggle Slider handle knob */}
        <div
          className={`absolute left-1 top-1 bg-surface-container-lowest w-5 h-5 rounded-full transition-transform duration-200 shadow-sm ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </label>

      {/* Label descriptor text */}
      {label && (
        <label
          htmlFor={toggleId}
          className={`font-label-md text-label-md text-on-surface font-semibold ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {label}
        </label>
      )}
    </div>
  )
}
