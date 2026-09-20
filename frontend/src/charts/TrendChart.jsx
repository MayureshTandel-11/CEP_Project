import {
  CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement,
  PointElement, Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { EmptyState } from '../components/States'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip,
  Legend, Filler)

const INK = '#16212e'
const TEAL = '#0f766e'
const LINE = '#dde4ea'

export default function TrendChart({ label, dates, values, unit, color = TEAL, target }) {
  const points = (values || []).filter((v) => v !== null && v !== undefined)
  if (!points.length) {
    return <EmptyState title={`No ${label.toLowerCase()} logged`}>
      Add a wellness log to start this chart.
    </EmptyState>
  }

  const datasets = [{
    label: unit ? `${label} (${unit})` : label,
    data: values,
    borderColor: color,
    backgroundColor: 'rgba(15,118,110,.08)',
    pointRadius: 2,
    pointHoverRadius: 5,
    borderWidth: 2,
    tension: 0.3,
    spanGaps: true,
    fill: true,
  }]

  if (target) {
    datasets.push({
      label: 'Target',
      data: dates.map(() => target),
      borderColor: '#b45309',
      borderDash: [5, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    })
  }

  return (
    <div className="chart-box">
      <Line
        data={{ labels: dates, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: !!target, labels: { boxWidth: 12, color: INK } },
            tooltip: { backgroundColor: INK },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#8595a4', maxTicksLimit: 8 } },
            y: { grid: { color: LINE }, ticks: { color: '#8595a4' },
                 beginAtZero: label !== 'Weight' },
          },
        }}
      />
    </div>
  )
}
