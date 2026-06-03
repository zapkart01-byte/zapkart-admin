import React from 'react'
import {
  ShoppingCart, CheckCircle, Package, Truck,
  MapPin, XCircle, Clock,
} from 'lucide-react'
import { formatDateTime } from '../../utils/formatters'

/**
 * OrderTimeline — renders the chronological status progression with timestamps for an order.
 * Shows all six status steps; completed steps are green, current is orange, future are grey.
 */

// Each step in the timeline with its icon and label
const TIMELINE_STEPS = [
  { key: 'placed',           label: 'Order Placed',        icon: ShoppingCart },
  { key: 'confirmed',        label: 'Store Confirmed',      icon: CheckCircle  },
  { key: 'packed',           label: 'Order Packed',         icon: Package      },
  { key: 'picked',           label: 'Rider Picked Up',      icon: MapPin       },
  { key: 'out_for_delivery', label: 'Out for Delivery',     icon: Truck        },
  { key: 'delivered',        label: 'Delivered',            icon: CheckCircle  },
]

// Maps each status step to its timestamp field returned by getOrderTimeline()
const STATUS_TIMESTAMP_MAP = {
  placed:           'placed',
  confirmed:        'confirmed',
  packed:           null,          // no direct timestamp for packed in schema
  picked:           'picked',
  out_for_delivery: 'out_for_delivery',
  delivered:        'delivered',
}

// Returns the step index in the flow for a given status key
function getStepIndex(statusKey) {
  return TIMELINE_STEPS.findIndex((s) => s.key === statusKey)
}

export default function OrderTimeline({ timeline, currentStatus, className = '' }) {
  if (!timeline) return null

  const isCancelled = currentStatus === 'cancelled'
  const currentStepIndex = isCancelled ? -1 : getStepIndex(currentStatus)

  // Builds the timestamp string for a given step
  function getTimestamp(stepKey) {
    const field = STATUS_TIMESTAMP_MAP[stepKey]
    if (!field) return null
    const ts = timeline[field]
    if (!ts) return null
    return formatDateTime(ts)
  }

  return (
    <div className={`space-y-0 ${className}`}>
      {/* Cancelled state — shown at top if order was cancelled */}
      {isCancelled && (
        <div className="flex items-start gap-3 mb-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-100">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className="pt-1">
            <p className="text-sm font-semibold text-red-600">Order Cancelled</p>
            {timeline.cancellationReason && (
              <p className="text-xs text-secondary mt-0.5">
                Reason: {timeline.cancellationReason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main progress steps */}
      {TIMELINE_STEPS.map((step, idx) => {
        const StepIcon = step.icon
        const isCompleted = !isCancelled && idx <= currentStepIndex
        const isCurrent = !isCancelled && idx === currentStepIndex
        const isLast = idx === TIMELINE_STEPS.length - 1
        const timestamp = getTimestamp(step.key)

        // Determine circle color
        let circleClass = 'bg-gray-100 text-gray-400'
        let iconClass = 'text-gray-400'
        if (isCompleted) {
          circleClass = isCurrent ? 'bg-brand text-white' : 'bg-green-100 text-green-600'
          iconClass = isCurrent ? 'text-white' : 'text-green-600'
        }

        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Left: circle icon + vertical connector line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${circleClass}`}
              >
                {isCompleted && !isCurrent ? (
                  <CheckCircle className={`w-4 h-4 ${iconClass}`} />
                ) : (
                  <StepIcon className={`w-4 h-4 ${iconClass}`} />
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 h-6 mt-1 transition-colors ${
                    isCompleted && idx < currentStepIndex ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>

            {/* Right: label + timestamp */}
            <div className="pt-1 pb-4">
              <p
                className={`text-sm font-semibold ${
                  isCompleted ? (isCurrent ? 'text-brand' : 'text-green-700') : 'text-secondary'
                }`}
              >
                {step.label}
              </p>
              {timestamp ? (
                <p className="text-xs text-secondary mt-0.5">{timestamp}</p>
              ) : isCurrent ? (
                <p className="text-xs text-brand mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> In progress…
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
