/**
 * ZapKart Order Status Constants
 * Defines all order statuses, their display properties, and the status flow.
 */

// All possible order statuses with display labels, colors, and sort order
export const ORDER_STATUSES = {
  placed: {
    key: 'placed',
    label: 'Placed',
    bg: '#DBEAFE',
    text: '#1D4ED8',
    sortOrder: 1,
  },
  confirmed: {
    key: 'confirmed',
    label: 'Confirmed',
    bg: '#F5F3FF',
    text: '#7C3AED',
    sortOrder: 2,
  },
  packed: {
    key: 'packed',
    label: 'Packed',
    bg: '#FEF3C7',
    text: '#D97706',
    sortOrder: 3,
  },
  picked: {
    key: 'picked',
    label: 'Picked Up',
    bg: '#FFF0E6',
    text: '#FF6B00',
    sortOrder: 4,
  },
  out_for_delivery: {
    key: 'out_for_delivery',
    label: 'Out for Delivery',
    bg: '#FFF0E6',
    text: '#FF6B00',
    sortOrder: 5,
  },
  delivered: {
    key: 'delivered',
    label: 'Delivered',
    bg: '#DCFCE7',
    text: '#16A34A',
    sortOrder: 6,
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelled',
    bg: '#FEE2E2',
    text: '#EF4444',
    sortOrder: 7,
  },
}

// Ordered status flow for timeline rendering (excludes cancelled)
export const ORDER_STATUS_FLOW = [
  'placed',
  'confirmed',
  'packed',
  'picked',
  'out_for_delivery',
  'delivered',
]

// Customer-facing tracking steps (simplified 5-step view)
export const ORDER_TRACKING_STEPS = [
  { key: 'placed', label: 'Placed', icon: 'ShoppingCart' },
  { key: 'confirmed', label: 'Store Confirmed', icon: 'Store' },
  { key: 'packed', label: 'Being Packed', icon: 'Package' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'Truck' },
  { key: 'delivered', label: 'Delivered', icon: 'CheckCircle' },
]

// Payment method display labels
export const PAYMENT_METHODS = {
  cod: { label: 'Cash on Delivery', shortLabel: 'COD' },
  upi: { label: 'UPI Payment', shortLabel: 'UPI' },
  card: { label: 'Card Payment', shortLabel: 'Card' },
}

// Payment status display labels and colors
export const PAYMENT_STATUSES = {
  pending: { label: 'Pending', bg: '#FEF3C7', text: '#D97706' },
  paid: { label: 'Paid', bg: '#DCFCE7', text: '#16A34A' },
  failed: { label: 'Failed', bg: '#FEE2E2', text: '#EF4444' },
  refunded: { label: 'Refunded', bg: '#DBEAFE', text: '#1D4ED8' },
}
