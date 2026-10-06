import { ArrowRight } from 'lucide-react'

export default function PrimaryButton({
  children,
  loading = false,
  loadingText = 'Processing…',
  disabled = false,
  type = 'submit',
  showArrow = true,
  className = '',
  ...props
}) {
  const isBusy = loading || disabled

  return (
    <button
      type={type}
      disabled={isBusy}
      className={`auth-primary-btn ${loading ? 'is-loading' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span className="auth-btn-spinner" aria-hidden="true" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {showArrow && <ArrowRight size={17} strokeWidth={2.2} className="auth-btn-arrow" />}
        </>
      )}
    </button>
  )
}
