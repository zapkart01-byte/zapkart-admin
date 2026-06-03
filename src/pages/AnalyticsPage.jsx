import React, { useState, useEffect, useCallback } from 'react'
import { TrendingUp, ShoppingBag, Store, Award, Calendar, FileSpreadsheet, RefreshCw, BarChart2, Star } from 'lucide-react'
import { getDashboardSummary, getRevenueChart, getOrderTrends, getCategoryBreakdown, getTopStores, getTopProducts, buildEmptyChartSeries, buildEmptyCategoryBreakdown } from '../services/analyticsService'
import { formatCurrency } from '../utils/formatters'
import RevenueChart from '../components/analytics/RevenueChart'
import OrdersChart from '../components/analytics/OrdersChart'
import CategoryPieChart from '../components/analytics/CategoryPieChart'
import PageLayout from '../components/layout/PageLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import Skeleton from '../components/ui/Skeleton'
import toast from 'react-hot-toast'

/**
 * ZapKart Analytics Page
 * Deep-dive analysis and dashboard with revenue tracking, category distributions, and inventory leaderboards.
 */
export default function AnalyticsPage() {
  // Date period states: '7d' | '30d' | '90d'
  const [period, setPeriod] = useState('30d')
  
  // Custom Date inputs (active if custom is selected)
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Data states
  const [summary, setSummary] = useState(null)
  const [revenueData, setRevenueData] = useState([])
  const [orderTrends, setOrderTrends] = useState([])
  const [categoryBreakdown, setCategoryBreakdown] = useState([])
  const [topStores, setTopStores] = useState([])
  const [topProducts, setTopProducts] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all analytics components
  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const chartPeriod = period === '7d' ? 'daily' : period === '30d' ? 'weekly' : 'monthly'
      const emptyPointCount = period === '7d' ? 7 : period === '30d' ? 4 : 3
      
      const [
        sum,
        rev,
        trends,
        cats,
        stores,
        products,
      ] = await Promise.all([
        getDashboardSummary(),
        getRevenueChart(chartPeriod),
        getOrderTrends(chartPeriod),
        getCategoryBreakdown(),
        getTopStores(5),
        getTopProducts(5),
      ])

      setSummary(sum)
      
      // Use zero-filled series when no order data exists so charts still render
      let finalRevenue = rev?.length ? rev : buildEmptyChartSeries(chartPeriod, emptyPointCount)
      let finalTrends = trends?.length ? trends : buildEmptyChartSeries(chartPeriod, emptyPointCount)
      
      if (showCustomRange && startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        
        const inBounds = (item) => {
          const d = new Date(item.date)
          return d >= start && d <= end
        }
        
        finalRevenue = finalRevenue.filter(inBounds)
        finalTrends = finalTrends.filter(inBounds)
      }

      setRevenueData(finalRevenue)
      setOrderTrends(finalTrends)
      setCategoryBreakdown(cats?.length ? cats : buildEmptyCategoryBreakdown())
      setTopStores(stores || [])
      setTopProducts(products || [])
    } catch (err) {
      setError(err.message || 'Failed to fetch platform metrics analysis.')
    } finally {
      setLoading(false)
    }
  }, [period, showCustomRange, startDate, endDate])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Download active report in CSV format
  const handleExportCSV = () => {
    if (!summary) {
      toast.error('No dashboard analytics loaded to export')
      return
    }

    const headers = ['Metric Report Name', 'Value']
    const rows = [
      ['Gross Sales Revenue', formatCurrency(summary.grossSales || 0)],
      ['Total Orders Volume', summary.totalOrders || 0],
      ['Avg Order Value (AOV)', formatCurrency(summary.avgOrderValue || 0)],
      ['Active Merchants count', summary.activeStores || 0],
      ['Active Rider count', summary.activeRiders || 0],
    ]

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map(val => `"${String(val)}"`).join(','))].join('\n')
      
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Zapkart_Platform_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Performance report CSV downloaded successfully.')
  }

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* ─── Page Header & CSV Export ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface font-headline-md">Platform Performance Analytics</h2>
          <p className="text-sm text-secondary mt-0.5">
            Realtime charts, customer order volumes, merchant distributions, and brand leaderboards.
          </p>
        </div>
        <div className="flex gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white text-secondary hover:bg-surface text-xs font-semibold transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Report CSV
          </button>
        </div>
      </div>

      {/* ─── Date filter controls ─── */}
      <div className="bg-white rounded-xl border border-border p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        {/* Toggle options */}
        <div className="flex gap-1.5 p-1 bg-surface border border-border rounded-lg w-full md:w-auto">
          {['7d', '30d', '90d'].map((opt) => (
            <button
              key={opt}
              onClick={() => { setPeriod(opt); setShowCustomRange(false) }}
              className={`flex-1 md:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                period === opt && !showCustomRange
                  ? 'bg-white text-on-surface shadow-sm border border-border/20'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              {opt === '7d' ? 'Last 7 Days' : opt === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
          <button
            onClick={() => setShowCustomRange(true)}
            className={`flex-1 md:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              showCustomRange
                ? 'bg-white text-on-surface shadow-sm border border-border/20'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Custom date range fields (only if active) */}
        {showCustomRange && (
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 flex-1 md:flex-initial">
              <span className="text-xs text-secondary font-medium">Start:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs border border-border rounded-lg outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1 md:flex-initial">
              <span className="text-xs text-secondary font-medium">End:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs border border-border rounded-lg outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <Button
              variant="outline"
              onClick={fetchAnalytics}
              disabled={!startDate || !endDate}
              className="text-xs py-1 px-3 min-h-[32px]"
            >
              Apply Filter
            </Button>
          </div>
        )}
      </div>

      {/* Screen State Loading */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-80 rounded-xl lg:col-span-2" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-600 font-medium">
          <p>{error}</p>
          <button onClick={fetchAnalytics} className="mt-2 text-sm text-brand underline font-semibold">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* ─── KPI Aggregated Cards Row ─── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Sales */}
            <Card>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-secondary font-bold uppercase tracking-wider">Gross Platform Sales</p>
                  <h3 className="text-xl font-bold text-on-surface mt-1.5">
                    {formatCurrency(summary?.grossSales || 0)}
                  </h3>
                </div>
                <div className="p-2.5 bg-brand/10 text-brand rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </Card>

            {/* Volume */}
            <Card>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-secondary font-bold uppercase tracking-wider">Completed Orders</p>
                  <h3 className="text-xl font-bold text-on-surface mt-1.5">
                    {summary?.deliveredOrders || 0} / {summary?.totalOrders || 0}
                  </h3>
                </div>
                <div className="p-2.5 bg-info/10 text-info rounded-lg">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
            </Card>

            {/* AOV */}
            <Card>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-secondary font-bold uppercase tracking-wider">Avg Order Value (AOV)</p>
                  <h3 className="text-xl font-bold text-on-surface mt-1.5">
                    {formatCurrency(summary?.avgOrderValue || 0)}
                  </h3>
                </div>
                <div className="p-2.5 bg-success/10 text-success rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
              </div>
            </Card>

            {/* Stores */}
            <Card>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-secondary font-bold uppercase tracking-wider">Active Store Network</p>
                  <h3 className="text-xl font-bold text-on-surface mt-1.5">
                    {summary?.activeStores || 0} Stores
                  </h3>
                </div>
                <div className="p-2.5 bg-warning/10 text-warning rounded-lg">
                  <Store className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* ─── Interactive Charts Grid ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend LineChart */}
            <Card className="lg:col-span-2 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Gross Platform Revenue Trend</h4>
                <p className="text-[10px] text-secondary mt-0.5">Displays total customer subtotal and delivery collections in Indian Rupees (₹).</p>
              </div>
              <RevenueChart data={revenueData} />
            </Card>

            {/* Category breakdown share PieChart */}
            <Card className="flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Grocery Categories Share</h4>
                <p className="text-[10px] text-secondary mt-0.5">Subtotal revenue share split across grocery shelf categories (PRD standard).</p>
              </div>
              <CategoryPieChart data={categoryBreakdown} />
            </Card>

            {/* Orders trends bar chart */}
            <Card className="lg:col-span-3">
              <div>
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Orders Volume Trends</h4>
                <p className="text-[10px] text-secondary mt-0.5">Quantity of orders placed over the selected interval.</p>
              </div>
              <OrdersChart data={orderTrends} />
            </Card>
          </div>

          {/* ─── Leaderboard Tables Grid ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top 5 stores */}
            <Card className="p-0 overflow-hidden border border-border">
              <div className="p-4 bg-surface border-b border-border flex items-center justify-between">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Top Performing Stores</h4>
                <BarChart2 className="w-4 h-4 text-secondary shrink-0" />
              </div>
              
              {topStores.length === 0 ? (
                <div className="p-6 text-center text-xs text-secondary">No store performance logs.</div>
              ) : (
                <div className="divide-y divide-border">
                  {topStores.map((store, idx) => (
                    <div key={store.id} className="flex items-center justify-between px-5 py-3 text-xs hover:bg-surface-container-low/20 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-secondary text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-on-surface">{store.store_name}</p>
                          <p className="text-[9px] text-secondary font-mono">ID: {store.id?.slice(0, 8)?.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="font-bold text-primary">{store.total_orders || 0} orders</p>
                          <p className="text-[10px] text-secondary flex items-center gap-0.5 justify-end">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> {store.rating?.toFixed(1) || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top 5 products */}
            <Card className="p-0 overflow-hidden border border-border">
              <div className="p-4 bg-surface border-b border-border flex items-center justify-between">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Top Selling Grocery Items</h4>
                <Award className="w-4 h-4 text-secondary shrink-0" />
              </div>

              {topProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-secondary">No product performance logs.</div>
              ) : (
                <div className="divide-y divide-border">
                  {topProducts.map((prod, idx) => (
                    <div key={prod.id} className="flex items-center justify-between px-5 py-3 text-xs hover:bg-surface-container-low/20 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-secondary text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-on-surface">{prod.name}</p>
                          <p className="text-[9px] text-secondary">Store: <span className="font-medium text-on-surface">{prod.stores?.store_name || '—'}</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700">{prod.units_sold_total || 0} units sold</p>
                        <p className="text-[10px] text-secondary">{formatCurrency(prod.store_price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
