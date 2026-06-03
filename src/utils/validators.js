/**
 * ZapKart Input Validation Utilities
 * All validators return null for valid input, or an error message string for invalid input.
 */

// Validates that a required field has a non-empty value
export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${fieldName} is required`
  }
  return null
}

// Validates email format using RFC-compliant regex
export function validateEmail(email) {
  if (!email) return 'Email is required'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return 'Invalid email address'
  return null
}

// Validates Indian mobile number (10 digits starting with 6-9)
export function validatePhone(phone) {
  if (!phone) return 'Phone number is required'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length !== 10) return 'Phone number must be 10 digits'
  if (!/^[6-9]/.test(cleaned)) return 'Invalid Indian phone number'
  return null
}

// Validates GSTIN format (15-character alphanumeric Indian GST number)
export function validateGSTIN(gstin) {
  if (!gstin) return null
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  if (!gstinRegex.test(gstin.toUpperCase())) return 'Invalid GSTIN format'
  return null
}

// Validates IFSC code format (11-character Indian bank branch code)
export function validateIFSC(ifsc) {
  if (!ifsc) return 'IFSC code is required'
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
  if (!ifscRegex.test(ifsc.toUpperCase())) return 'Invalid IFSC code format'
  return null
}

// Validates Indian bank account number (9-18 digits)
export function validateBankAccount(account) {
  if (!account) return 'Bank account number is required'
  const cleaned = account.replace(/\D/g, '')
  if (cleaned.length < 9 || cleaned.length > 18) {
    return 'Bank account number must be 9-18 digits'
  }
  return null
}

// Validates price is positive and does not exceed MRP
export function validatePrice(price, maxMrp) {
  if (price === null || price === undefined || price === '') return 'Price is required'
  const numPrice = Number(price)
  if (isNaN(numPrice)) return 'Price must be a number'
  if (numPrice < 0) return 'Price cannot be negative'
  if (maxMrp && numPrice > maxMrp) return 'Price cannot exceed MRP'
  return null
}

// Validates stock quantity is a non-negative integer
export function validateStock(stock) {
  if (stock === null || stock === undefined || stock === '') return 'Stock is required'
  const numStock = Number(stock)
  if (isNaN(numStock)) return 'Stock must be a number'
  if (numStock < 0) return 'Stock cannot be negative'
  if (!Number.isInteger(numStock)) return 'Stock must be a whole number'
  return null
}

// Validates a delivery radius is within acceptable bounds
export function validateDeliveryRadius(radius) {
  if (!radius) return 'Delivery radius is required'
  const numRadius = Number(radius)
  if (isNaN(numRadius)) return 'Radius must be a number'
  if (numRadius < 0.5) return 'Minimum radius is 0.5 km'
  if (numRadius > 25) return 'Maximum radius is 25 km'
  return null
}

// Validates a discount value is within valid range
export function validateDiscount(value, type) {
  if (!value) return 'Discount value is required'
  const numValue = Number(value)
  if (isNaN(numValue)) return 'Discount must be a number'
  if (numValue <= 0) return 'Discount must be positive'
  if (type === 'percentage' && numValue > 100) return 'Percentage cannot exceed 100'
  return null
}
