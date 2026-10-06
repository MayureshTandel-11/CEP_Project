import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { TrendingUp } from 'lucide-react'
import { EmptyState } from '../components/States'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
)

const COLOR_MAP = {
  Weight: '#10b981', // Emerald
  Water: '#2563eb', // Blue
  Sleep: '#6366f1', // Indigo
  Exercise: '#8b5cf6', // Purple
  Steps: '#0d9488', // Teal
  Calories: '#d97706', // Amber
}

export default function TrendChart({ label, dates, values, unit, color, target }) {
  const points = (values || []).filter((v) => v !== null && v !== undefined)
  if (!points.length) {
    return (
      <EmptyState
        icon={TrendingUp}
        title={`No ${label.toLowerCase()} recorded`}
        description={`Record your ${label.toLowerCase()} in the wellness log to see trends.`}
        actionText="Add log"
        actionLink="/logs"
      />
    )
  }

  const primaryColor = color || COLOR_MAP[label] || '#0d9488'

  // Format dates for display (e.g., "Oct 4" or "Mon 4")
  const formattedLabels = (dates || []).map((d) => {
    if (!d) return ''
    try {
      const parts = d.split('-')
      if (parts.length === 3) {
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2])
        return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      }
      return d
    } catch {
      return d
    }
  })

  const datasets = [
    {
      label: unit ? `${label} (${unit})` : label,
      data: values,
      borderColor: primaryColor,
      backgroundColor: (context) => {
        const ctx = context.chart.ctx
        const gradient = ctx.createLinearGradient(0, 0, 0, 200)
        gradient.addColorStop(0, `${primaryColor}28`) // 16% opacity
        gradient.addColorStop(1, `${primaryColor}00`) // 0% opacity
        return gradient
      },
      pointBackgroundColor: '#ffffff',
      pointBorderColor: primaryColor,
      pointBorderWidth: 2,
      pointRadius: values.length > 20 ? 1.5 : 3.5,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: primaryColor,
      pointHoverBorderColor: '#ffffff',
      pointHoverBorderWidth: 2,
      borderWidth: 2.5,
      tension: 0.35,
      spanGaps: true,
      fill: true,
    },
  ]

  if (target) {
    datasets.push({
      label: `Target (${target}${unit ? ` ${unit}` : ''})`,
      data: dates.map(() => target),
      borderColor: '#f59e0b',
      borderDash: [5, 4],
      borderWidth: 1.8,
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
    })
  }

  return (
    <div className="chart-box">
      <Line
        data={{ labels: formattedLabels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: !!target,
              position: 'top',
              align: 'end',
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                usePointStyle: true,
                pointStyle: 'circle',
                color: '#64748b',
                font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 },
                padding: 10,
              },
            },
            tooltip: {
              backgroundColor: '#0f172a',
              titleColor: '#f8fafc',
              bodyColor: '#f8fafc',
              padding: { top: 8, bottom: 8, left: 12, right: 12 },
              cornerRadius: 8,
              bodyFont: { family: 'Plus Jakarta Sans', size: 12, weight: 600 },
              titleFont: { family: 'Plus Jakarta Sans', size: 11, weight: 500 },
              displayColors: true,
              boxWidth: 8,
              boxHeight: 8,
              boxPadding: 4,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: '#94a3b8',
                font: { family: 'Plus Jakarta Sans', size: 11 },
                maxTicksLimit: 7,
              },
              border: { display: false },
            },
            y: {
              grid: {
                color: '#f1f5f9',
                drawBorder: false,
              },
              ticks: {
                color: '#94a3b8',
                font: { family: 'Plus Jakarta Sans', size: 11 },
                maxTicksLimit: 5,
              },
              border: { display: false },
              beginAtZero: label !== 'Weight',
            },
          },
        }}
      />
    </div>
  )
}
