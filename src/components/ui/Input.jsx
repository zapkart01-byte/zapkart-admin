import React, { forwardRef } from 'react'

/**
 * Input Component
 * Reusable layout form input displaying labels, supporting icon slots, custom borders, and dynamic error state alerts.
 */
const Input = forwardRef(
  (
    {
      label,
      id,
      error,
      type = 'text',
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      className = '',
      wrapperClassName = '',
      required = false,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`space-y-sm w-full ${wrapperClassName}`}>
        {label && (
          <label htmlFor={id} className="block font-label-md text-label-md text-on-surface-variant font-semibold">
            {label}
            {required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}

        <div className="relative rounded-lg">
          {/* Left Icon overlay */}
          {LeftIcon && (
            <div className="absolute inset-y-0 left-0 pl-sm flex items-center pointer-events-none text-secondary">
              <LeftIcon className="w-5 h-5 shrink-0" />
            </div>
          )}

          <input
            ref={ref}
            id={id}
            type={type}
            required={required}
            className={`block w-full py-sm px-md text-body-md text-on-surface bg-surface border rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-colors outline-none disabled:opacity-50 ${
              LeftIcon ? 'pl-xl' : ''
            } ${RightIcon ? 'pr-xl' : ''} ${
              error ? 'border-error focus:ring-error focus:border-error' : 'border-outline-variant'
            } ${className}`}
            {...props}
          />

          {/* Right Icon overlay */}
          {RightIcon && (
            <div className="absolute inset-y-0 right-0 pr-sm flex items-center pointer-events-none text-secondary">
              <RightIcon className="w-5 h-5 shrink-0" />
            </div>
          )}
        </div>

        {/* Display validation error block */}
        {error && (
          <p className="text-body-sm text-error font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
