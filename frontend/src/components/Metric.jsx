export default function Metric({ label, value, unit, note, tone }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">
        {value ?? '--'}{unit && <span> {unit}</span>}
      </div>
      {note && (
        tone
          ? <div className="note"><span className={`pill ${tone}`}>{note}</span></div>
          : <div className="note">{note}</div>
      )}
    </div>
  )
}
