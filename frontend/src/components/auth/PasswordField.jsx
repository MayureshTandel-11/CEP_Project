import { useState } from 'react'
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function PasswordField({
  id = 'password',
  name = 'password',
  label = 'Password',
  value,
  onChange,
  placeholder = '••••••••••••',
  error,
  hint,
  required = false,
  autoComplete = 'current-password',
  disabled = false,
  ...props
}) {
  const [show, setShow] = useState(false)
  const hasError = Boolean(error)

  return (
    <div className={`auth-field-group ${hasError ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={id} className="auth-field-label">
          {label}
          {required && <span className="auth-required-star" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="auth-input-container">
        <div className="auth-input-icon">
          <Lock size={18} strokeWidth={2} />
        </div>

        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-err` : hint ? `${id}-hint` : undefined}
          className="auth-text-input with-icon with-action"
          {...props}
        />

        <button
          type="button"
          className="auth-password-toggle-btn"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={0}
        >
          {show ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
        </button>
      </div>

      {hasError && (
        <div id={`${id}-err`} className="auth-field-error" role="alert">
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {!hasError && hint && (
        <div id={`${id}-hint`} className="auth-field-hint">
          {hint}
        </div>
      )}
    </div>
  )
}
