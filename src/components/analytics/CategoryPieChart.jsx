import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '../../utils/formatters'

/**
 * CategoryPieChart Component
 * Renders an interactive PieChart displaying order revenue share across main grocery categories.
 * Supported categories follow PRD: Dairy, Snacks, Vegetables, Beverages, Staples, Others.
 */
export default function CategoryPieChart({ data }) {
  const chartData = data?.length
    ? data
    : [{ name: 'Others', value: 1 }]

  // Curated, beautiful premium HSL color tokens for categories
  const COLORS = {
    Dairy: '#4772FF',      // Blue
    Snacks: '#FF9F43',     // Amber
    Vegetables: '#28C76F', // Green
    Beverages: '#00CFE8',  // Cyan
    Staples: '#EA5455',    // Red
    Others: '#82868B',     // Grey
  }

  // Custom tooltips rendering category share with INR currency format
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      return (
        <div className="bg-white border border-border p-3 rounded-lg shadow-lg text-xs">
          <p className="font-semibold text-on-surface flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
              style={{ backgroundColor: COLORS[dataPoint.name] || '#FF6B00' }}
            ></span>
            {dataPoint.name}
          </p>
          <p className="text-secondary font-medium mt-1 text-[11px]">
            Share Value: <span className="font-bold text-on-surface">{formatCurrency(dataPoint.value)}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-[300px] w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name] || '#FF6B00'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', fontWeight: '500' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
