export default function Card({ title, sub, actions, children }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header style={{ display: 'flex', justifyContent: 'space-between',
                         alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            {title && <h2>{title}</h2>}
            {sub && <div className="sub">{sub}</div>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}
