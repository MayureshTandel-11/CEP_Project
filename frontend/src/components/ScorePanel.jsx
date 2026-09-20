/** The dashboard's one loud element: the weekly engagement score. */
export default function ScorePanel({ score }) {
  if (!score?.available) {
    return <p style={{ color: 'var(--ink-soft)' }}>{score?.message || 'No data yet.'}</p>
  }
  const rows = Object.entries(score.categories)
  return (
    <>
      <div className="score-panel">
        <div className="score-dial">
          <span className="n">{score.overall}</span>
          <span className="of">out of 100 · {score.days_logged} days logged</span>
        </div>
        <div className="score-bars">
          {rows.map(([name, item]) => (
            <div className="score-row" key={name}>
              <span className="name" style={{ textTransform: 'capitalize' }}>{name}</span>
              <span className={`bar ${item.score < 60 ? 'warn' : ''}`}>
                <i style={{ width: `${item.score}%` }} />
              </span>
              <span className="num">{item.score}</span>
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: '.8rem', color: 'var(--ink-faint)', marginTop: 14, marginBottom: 0 }}>
        {score.disclaimer}
      </p>
    </>
  )
}
