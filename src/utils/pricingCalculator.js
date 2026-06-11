/**
 * ZapKart Pricing Engine
 * THIS FUNCTION MUST BE IDENTICAL in: admin frontend, customer app, AND backend.
 * Backend always recalculates and verifies on order placement.
 * Never trust client-calculated totals.
 */

// Calculates complete order pricing including delivery fee, commission, and profit
export function calculateOrderPricing(cartValue, distanceKm, settings) {
  // Determines rider payout based on delivery distance band
  let riderPayout
  if (distanceKm < 2) riderPayout = settings.rider_payout_under_2km
  else if (distanceKm < 4) riderPayout = settings.rider_payout_2_to_4km
  else riderPayout = settings.rider_payout_above_4km

  // Calculates platform commission from cart value
  const commissionEarned = cartValue * settings.commission_rate

  // Select minimum profit based on cart value tiers if available in settings
  let minProfit = settings.minimum_profit
  if (settings.min_profit_tier1 !== undefined && settings.min_profit_tier1 !== null) {
    if (cartValue <= 149) minProfit = settings.min_profit_tier1
    else if (cartValue <= 249) minProfit = settings.min_profit_tier2
    else if (cartValue <= 399) minProfit = settings.min_profit_tier3
    else if (cartValue <= 499) minProfit = settings.min_profit_tier4
    else minProfit = settings.min_profit_tier5
  }

  // Calculates minimum revenue needed to guarantee platform profit
  const revenueNeeded = riderPayout + minProfit

  // Calculates dynamic delivery fee to ensure minimum profit
  let deliveryFee = revenueNeeded - commissionEarned

  // Waives delivery fee when cart value exceeds free delivery threshold
  if (cartValue >= settings.free_delivery_above) deliveryFee = 0

  // Clamps delivery fee within configured minimum and maximum bounds
  deliveryFee = Math.max(deliveryFee, settings.min_delivery_fee)
  deliveryFee = Math.min(deliveryFee, settings.max_delivery_fee)
  deliveryFee = Math.round(deliveryFee)

  // Rounds commission to nearest integer for clean currency display
  const commissionAmount = Math.round(commissionEarned)

  // Calculates ZapKart's net profit from commission plus delivery fee minus rider payout
  const zapkartNetProfit = Math.round(commissionEarned + deliveryFee - riderPayout)

  return {
    deliveryFee,
    riderPayout,
    commissionAmount,
    storeReceives: Math.round(cartValue - commissionAmount),
    zapkartNetProfit,
    isFreeDelivery: cartValue >= settings.free_delivery_above,
    totalCustomerPays: cartValue + deliveryFee,
  }
}

// Calculates discount percentage between MRP and store price for display badges
export function calculateDiscountPercent(platformMrp, storePrice) {
  if (!platformMrp || platformMrp <= 0) return 0
  return Math.round(((platformMrp - storePrice) / platformMrp) * 100)
}

// Validates that store price does not exceed platform MRP (illegal under Indian law)
export function validatePriceAgainstMRP(storePrice, platformMrp) {
  if (storePrice > platformMrp) {
    return 'Price cannot exceed MRP'
  }
  return null
}
