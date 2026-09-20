/** Loading, empty and error states, so no screen ever renders blank. */
export function Loading({ label = 'Loading' }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="spinner" />
      {label}
    </div>
  )
}

export function EmptyState({ title = 'No data yet', children }) {
  return (
    <div className="state">
      <h3>{title}</h3>
      <p style={{ margin: '0 auto' }}>{children}</p>
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  const message = error?.message || 'Something went wrong.'
  return (
    <div className="state error" role="alert">
      <h3>That did not load</h3>
      <p style={{ margin: '0 auto 14px' }}>{message}</p>
      {onRetry && <button className="ghost" onClick={onRetry}>Try again</button>}
    </div>
  )
}
