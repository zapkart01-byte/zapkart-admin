import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

/**
 * OrdersChart Component
 * Renders an interactive BarChart displaying daily volume trends of orders.
 */
export default function OrdersChart({ data }) {
  const chartData = data?.length ? data : [{ date: '—', orders: 0 }]

  // Custom tooltips rendering order count values
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-border p-3 rounded-lg shadow-lg text-xs">
          <p className="text-secondary font-semibold">{label}</p>
          <p className="text-on-surface font-bold mt-1 text-[13px]">
            Volume: <strong className="text-primary font-bold">{payload[0].value} orders</strong>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-[300px] w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            dx={-8}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="orders"
            fill="#FFA366" // Lighter shade of brand orange
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
