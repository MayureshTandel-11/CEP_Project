export default function Card({ title, sub, icon: Icon, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header>
          <div className="card-title-group">
            {title && (
              <h2>
                {Icon && <Icon size={20} className="card-title-icon" />}
                <span>{title}</span>
              </h2>
            )}
            {sub && <div className="sub">{sub}</div>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
