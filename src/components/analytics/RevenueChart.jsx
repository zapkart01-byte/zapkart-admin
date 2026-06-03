import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../../utils/formatters'

/**
 * RevenueChart Component
 * Renders an interactive LineChart tracking gross platform revenue over time.
 */
export default function RevenueChart({ data }) {
  const chartData = data?.length ? data : [{ date: '—', revenue: 0 }]

  // Custom tooltips rendering INR rupee values
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-border p-3 rounded-lg shadow-lg text-xs">
          <p className="text-secondary font-semibold">{label}</p>
          <p className="text-primary font-bold mt-1 text-[13px]">
            Revenue: {formatCurrency(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-[300px] w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F4" />
          <XAxis
            dataKey="date"
            stroke="#9AA0A6"
            fontSize={10}
            tickLine={false}
            dy={8}
          />
          <YAxis
            stroke="#9AA0A6"
            fontSize={10}
            tickLine={false}
            tickFormatter={(value) => `₹${value}`}
            dx={-8}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#FF6B00" // Premium Brand Orange
            strokeWidth={3}
            dot={{ r: 4, stroke: '#FF6B00', strokeWidth: 2, fill: '#FFFFFF' }}
            activeDot={{ r: 6, stroke: '#FF6B00', strokeWidth: 2, fill: '#FF6B00' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
