const RANGES = [7, 30, 90]

export default function RangePicker({ value, onChange }) {
  return (
    <div className="btn-row" role="group" aria-label="Time range">
      {RANGES.map((days) => (
        <button
          key={days}
          className="ghost"
          aria-pressed={value === days}
          onClick={() => onChange(days)}
        >
          {days} days
        </button>
      ))}
    </div>
  )
}
