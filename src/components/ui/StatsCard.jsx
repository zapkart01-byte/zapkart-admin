import React from 'react'
import Card from './Card'
import Badge from './Badge'

/**
 * StatsCard - Standardized KPI metric card layout using ZapKart HSL theme tokens.
 * All functions have one-line comments above them.
 */

// Renders reusable statistic panels with icon backdrops and trend indicators
export default function StatsCard({ icon, iconBg, label, value, trend, trendType, valueClass = 'text-on-surface' }) {
  return (
    <Card className="min-h-[120px] bg-surface-bright border-surface-variant flex flex-col justify-between p-0 shadow-card">
      <div className="p-md flex justify-between items-start w-full">
        {/* Metric icon with theme-styled background */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg || 'bg-surface-container-high'}`}>
          {icon}
        </div>
        
        {/* Dynamic percentage trend indicator badge */}
        {trend && (
          <Badge variant={trendType || 'info'} className="h-6 gap-xs font-semibold">
            {trend}
          </Badge>
        )}
      </div>
      
      {/* Metric value and description details */}
      <div className="px-md pb-md">
        <p className="font-label-md text-secondary font-semibold">{label}</p>
        <p className={`font-headline-lg text-headline-lg font-bold mt-xs truncate ${valueClass}`}>
          {value}
        </p>
      </div>
    </Card>
  )
}
