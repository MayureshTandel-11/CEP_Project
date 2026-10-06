import { AlertCircle } from 'lucide-react'

export default function FormField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  hint,
  icon: Icon,
  required = false,
  autoComplete,
  disabled = false,
  ...props
}) {
  const hasError = Boolean(error)
  const inputId = id || name

  return (
    <div className={`auth-field-group ${hasError ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="auth-field-label">
          {label}
          {required && <span className="auth-required-star" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="auth-input-container">
        {Icon && (
          <div className="auth-input-icon">
            <Icon size={18} strokeWidth={2} />
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
          className={`auth-text-input ${Icon ? 'with-icon' : ''}`}
          {...props}
        />
      </div>

      {hasError && (
        <div id={`${inputId}-err`} className="auth-field-error" role="alert">
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {!hasError && hint && (
        <div id={`${inputId}-hint`} className="auth-field-hint">
          {hint}
        </div>
      )}
    </div>
  )
}
