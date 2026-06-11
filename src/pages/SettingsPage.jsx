import React, { useState, useEffect } from 'react'
import { Settings, Landmark, ShieldCheck, DollarSign, Clock, MapPin, Calculator, RefreshCw, Save } from 'lucide-react'
import { getPlatformSettings, updatePlatformSettings } from '../services/platformService'
import { calculateOrderPricing } from '../utils/pricingCalculator'
import { formatCurrency } from '../utils/formatters'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import Skeleton from '../components/ui/Skeleton'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

/**
 * ZapKart Platform Settings Page
 * Editable form for platform-wide parameters and timeouts.
 * Features an interactive live pricing calculator mock to preview active calculations.
 */
export default function SettingsPage() {
  const { adminProfile } = useAuth()

  // Data states
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Interactive Calculator State
  const [calcCartValue, setCalcCartValue] = useState('299')
  const [calcDistance, setCalcDistance] = useState('2.5')
  const [calcResults, setCalcResults] = useState(null)

  // Form Fields State
  const [formData, setFormData] = useState({
    commission_rate: 0.18,
    minimum_profit: 10,
    min_delivery_fee: 15,
    max_delivery_fee: 150,
    free_delivery_above: 499,
    minimum_order_value: 99,
    rider_payout_under_2km: 25,
    rider_payout_2_to_4km: 40,
    rider_payout_above_4km: 60,
    store_confirmation_timeout: 5,
    rider_acceptance_timeout: 60,
    max_cod_balance_per_rider: 2000,
    store_cancellation_penalty: 100,
    platform_markup_per_item: 1,
    bonus_event_order: 5,
    offer_budget_daily: 1000,
    min_profit_tier1: 12,
    min_profit_tier2: 14,
    min_profit_tier3: 15,
    min_profit_tier4: 10,
    min_profit_tier5: 8,
  })

  // Fetch settings
  const fetchSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPlatformSettings()
      setSettings(data)
      // Set form state
      setFormData({
        commission_rate: Number(data.commission_rate) || 0.18,
        minimum_profit: Number(data.minimum_profit) || 10,
        min_delivery_fee: Number(data.min_delivery_fee) || 15,
        max_delivery_fee: Number(data.max_delivery_fee) || 150,
        free_delivery_above: Number(data.free_delivery_above) || 499,
        minimum_order_value: Number(data.minimum_order_value) || 99,
        rider_payout_under_2km: Number(data.rider_payout_under_2km) || 25,
        rider_payout_2_to_4km: Number(data.rider_payout_2_to_4km) || 40,
        rider_payout_above_4km: Number(data.rider_payout_above_4km) || 60,
        store_confirmation_timeout: Number(data.store_confirmation_timeout) || 5,
        rider_acceptance_timeout: Number(data.rider_acceptance_timeout) || 60,
        max_cod_balance_per_rider: Number(data.max_cod_balance_per_rider) || 2000,
        store_cancellation_penalty: Number(data.store_cancellation_penalty) || 100,
        platform_markup_per_item: data.platform_markup_per_item !== null && data.platform_markup_per_item !== undefined ? Number(data.platform_markup_per_item) : 1,
        bonus_event_order: data.bonus_event_order !== null && data.bonus_event_order !== undefined ? Number(data.bonus_event_order) : 5,
        offer_budget_daily: data.offer_budget_daily !== null && data.offer_budget_daily !== undefined ? Number(data.offer_budget_daily) : 1000,
        min_profit_tier1: data.min_profit_tier1 !== null && data.min_profit_tier1 !== undefined ? Number(data.min_profit_tier1) : 12,
        min_profit_tier2: data.min_profit_tier2 !== null && data.min_profit_tier2 !== undefined ? Number(data.min_profit_tier2) : 14,
        min_profit_tier3: data.min_profit_tier3 !== null && data.min_profit_tier3 !== undefined ? Number(data.min_profit_tier3) : 15,
        min_profit_tier4: data.min_profit_tier4 !== null && data.min_profit_tier4 !== undefined ? Number(data.min_profit_tier4) : 10,
        min_profit_tier5: data.min_profit_tier5 !== null && data.min_profit_tier5 !== undefined ? Number(data.min_profit_tier5) : 8,
      })
    } catch (err) {
      setError(err.message || 'Failed to fetch platform parameters.')
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    fetchSettings()
  }, [])

  // Calculate pricing preview live
  useEffect(() => {
    if (!formData) return
    const cart = Number(calcCartValue) || 0
    const dist = Number(calcDistance) || 0
    
    try {
      const results = calculateOrderPricing(cart, dist, formData)
      setCalcResults(results)
    } catch (err) {
      console.error('Pricing preview calculate error:', err)
    }
  }, [calcCartValue, calcDistance, formData])

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: Number(value) || 0,
    }))
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    const adminId = adminProfile?.id || 'admin'
    
    try {
      await updatePlatformSettings(formData, adminId)
      toast.success('Platform configurations updated and logged successfully')
      setShowConfirm(false)
      fetchSettings()
    } catch (err) {
      toast.error('Save failed: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Platform & Tariff Configurations</h2>
          <p className="text-sm text-secondary mt-0.5">
            Modify commission thresholds, delivery tariff caps, and rider acceptance limits.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white text-secondary hover:bg-surface text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-600 font-medium">
          <p>{error}</p>
          <button onClick={fetchSettings} className="mt-2 text-sm text-brand underline font-semibold">
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Settings Inputs Form (2 columns size) ─── */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setShowConfirm(true)
            }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Tariff and Payout parameters */}
            <Card className="bg-white">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                <Landmark className="w-5 h-5 text-brand" />
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Pricing, Commissions & Tariff</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  step="0.01"
                  label="Platform Commission Rate (e.g. 0.18 = 18%)"
                  value={formData.commission_rate}
                  onChange={(e) => handleFieldChange('commission_rate', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Target Platform Profit per Order (₹)"
                  value={formData.minimum_profit}
                  onChange={(e) => handleFieldChange('minimum_profit', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Minimum Cap Delivery Fee (₹)"
                  value={formData.min_delivery_fee}
                  onChange={(e) => handleFieldChange('min_delivery_fee', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Maximum Cap Delivery Fee (₹)"
                  value={formData.max_delivery_fee}
                  onChange={(e) => handleFieldChange('max_delivery_fee', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Free Delivery Threshold (₹)"
                  value={formData.free_delivery_above}
                  onChange={(e) => handleFieldChange('free_delivery_above', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Minimum Order Value Limit (₹)"
                  value={formData.minimum_order_value}
                  onChange={(e) => handleFieldChange('minimum_order_value', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Platform Markup per Item (₹)"
                  value={formData.platform_markup_per_item}
                  onChange={(e) => handleFieldChange('platform_markup_per_item', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Daily Offer Budget Limit (₹)"
                  value={formData.offer_budget_daily}
                  onChange={(e) => handleFieldChange('offer_budget_daily', e.target.value)}
                  required
                />
              </div>
            </Card>

            {/* Rider delivery Payout rates */}
            <Card className="bg-white">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                <MapPin className="w-5 h-5 text-info" />
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Rider Delivery Distance Band Payouts & Bonuses</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  type="number"
                  label="Under 2 km Band (₹)"
                  value={formData.rider_payout_under_2km}
                  onChange={(e) => handleFieldChange('rider_payout_under_2km', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="2 km to 4 km Band (₹)"
                  value={formData.rider_payout_2_to_4km}
                  onChange={(e) => handleFieldChange('rider_payout_2_to_4km', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Above 4 km Band (₹)"
                  value={formData.rider_payout_above_4km}
                  onChange={(e) => handleFieldChange('rider_payout_above_4km', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Rider Event Sale Bonus (₹)"
                  value={formData.bonus_event_order}
                  onChange={(e) => handleFieldChange('bonus_event_order', e.target.value)}
                  required
                />
              </div>
            </Card>

            {/* Minimum Profit Tiered Rules */}
            <Card className="bg-white">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                <Calculator className="w-5 h-5 text-success" />
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Minimum Profit Tiered Rules (₹)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Input
                  type="number"
                  label="Tier 1 (<= ₹149)"
                  value={formData.min_profit_tier1}
                  onChange={(e) => handleFieldChange('min_profit_tier1', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Tier 2 (<= ₹249)"
                  value={formData.min_profit_tier2}
                  onChange={(e) => handleFieldChange('min_profit_tier2', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Tier 3 (<= ₹399)"
                  value={formData.min_profit_tier3}
                  onChange={(e) => handleFieldChange('min_profit_tier3', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Tier 4 (<= ₹499)"
                  value={formData.min_profit_tier4}
                  onChange={(e) => handleFieldChange('min_profit_tier4', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Tier 5 (>= ₹500)"
                  value={formData.min_profit_tier5}
                  onChange={(e) => handleFieldChange('min_profit_tier5', e.target.value)}
                  required
                />
              </div>
            </Card>

            {/* Timeouts & Risk compliance limits */}
            <Card className="bg-white">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                <Clock className="w-5 h-5 text-warning" />
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Risk Policies & Timeouts</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Store Confirm Timeout (Minutes)"
                  value={formData.store_confirmation_timeout}
                  onChange={(e) => handleFieldChange('store_confirmation_timeout', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Rider Acceptance Timeout (Seconds)"
                  value={formData.rider_acceptance_timeout}
                  onChange={(e) => handleFieldChange('rider_acceptance_timeout', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Max Rider COD Balance Handheld Limit (₹)"
                  value={formData.max_cod_balance_per_rider}
                  onChange={(e) => handleFieldChange('max_cod_balance_per_rider', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label="Store Reject Order Penalty Tariff (₹)"
                  value={formData.store_cancellation_penalty}
                  onChange={(e) => handleFieldChange('store_cancellation_penalty', e.target.value)}
                  required
                />
              </div>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-2.5">
              <Button
                variant="outline"
                type="button"
                onClick={fetchSettings}
                className="w-32"
              >
                Reset Form
              </Button>
              <Button
                variant="primary"
                type="submit"
                className="w-40 flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save Settings
              </Button>
            </div>
          </form>

          {/* ─── Right Interactive Calculator Preview Panel (1 column size) ─── */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-white border border-brand/20 shadow-md ring-1 ring-brand/5">
              <div className="flex items-center gap-2 mb-3 border-b border-border pb-3">
                <Calculator className="w-5 h-5 text-brand" />
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Live Pricing Preview</h3>
              </div>
              <p className="text-[11px] text-secondary leading-relaxed">
                Test active tariff configurations using the pricing simulator panel below. Values update instantly as inputs change.
              </p>

              {/* Inputs */}
              <div className="space-y-3.5 mt-4 pt-3 border-t border-surface-variant">
                <Input
                  type="number"
                  label="Simulated Cart Value (₹)"
                  placeholder="e.g. 299"
                  value={calcCartValue}
                  onChange={(e) => setCalcCartValue(e.target.value)}
                  min="0"
                />
                <Input
                  type="number"
                  step="0.1"
                  label="Simulated Distance (km)"
                  placeholder="e.g. 2.5"
                  value={calcDistance}
                  onChange={(e) => setCalcDistance(e.target.value)}
                  min="0"
                />
              </div>

              {/* Simulated Output details */}
              {calcResults && (
                <div className="mt-5 p-3.5 bg-surface rounded-xl border border-surface-variant text-xs space-y-2.5">
                  <h4 className="font-bold text-on-surface text-[11px] uppercase tracking-wide border-b border-border pb-1.5 flex justify-between items-center">
                    <span>Pricing Engine Outputs</span>
                    {calcResults.isFreeDelivery && (
                      <span className="bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full">
                        FREE DELIVERY!
                      </span>
                    )}
                  </h4>
                  
                  <div className="flex justify-between items-center text-secondary">
                    <span>Dynamic Delivery Fee:</span>
                    <span className="font-semibold text-on-surface">{formatCurrency(calcResults.deliveryFee)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-secondary">
                    <span>Rider Payout (Band aware):</span>
                    <span className="font-semibold text-on-surface">{formatCurrency(calcResults.riderPayout)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-secondary">
                    <span>Merchant Platform Comm:</span>
                    <span className="font-semibold text-danger">-{formatCurrency(calcResults.commissionAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center text-secondary border-t border-dashed border-border pt-1.5">
                    <span>Store Merchant Receives:</span>
                    <span className="font-semibold text-on-surface">{formatCurrency(calcResults.storeReceives)}</span>
                  </div>

                  <div className="flex justify-between items-center text-secondary">
                    <span>Customer Total Bill:</span>
                    <span className="font-bold text-primary text-sm">{formatCurrency(calcResults.totalCustomerPays)}</span>
                  </div>

                  <div className="flex justify-between items-center text-secondary border-t border-border pt-2">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                      <span>ZapKart Net Profit:</span>
                    </span>
                    <span className={`font-bold text-sm ${calcResults.zapkartNetProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {formatCurrency(calcResults.zapkartNetProfit)}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ─── Confirm Save Settings Dialog ─── */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSaveSettings}
        loading={isSaving}
        title="Confirm Platform Re-configurations?"
        description="WARNING: Saving these settings will immediately alter the pricing engine parameters for all new customer orders, rider assignments, and payouts processed. Please make sure this aligns with marketplace policy."
        confirmLabel="Apply Settings"
        variant="danger"
      />
    </div>
  )
}
