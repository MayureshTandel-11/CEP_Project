const RANGES = [7, 30, 90]

export default function RangePicker({ value, onChange }) {
  return (
    <div className="segmented-control" role="group" aria-label="Time range selector">
      {RANGES.map((days) => (
        <button
          key={days}
          type="button"
          className={`segmented-btn ${value === days ? 'active' : ''}`}
          aria-pressed={value === days}
          onClick={() => onChange(days)}
        >
          {days} Days
        </button>
      ))}
    </div>
  )
}
