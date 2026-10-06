import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, AlertCircle } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout'
import FormField from '../components/auth/FormField'
import PasswordField from '../components/auth/PasswordField'
import PrimaryButton from '../components/auth/PrimaryButton'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError(null)
  }

  async function submit(e) {
    e.preventDefault()

    if (!form.email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!form.password) {
      setError('Please enter your password.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await login(form)
      toast.success('Signed in successfully.')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.message || 'Invalid email or password. Please verify your credentials.'
      setError(msg.includes('<!DOCTYPE') ? 'Unable to reach the server. Please try again later.' : msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Continue your wellness journey."
      footerPrompt="Don't have an account?"
      footerLinkText="Create an account"
      footerLinkTo="/register"
    >
      <form onSubmit={submit} noValidate className="auth-form-element">
        {error && (
          <div className="auth-global-error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <FormField
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="you@domain.com"
          value={form.email}
          onChange={change}
          icon={Mail}
          autoComplete="email"
          required
          disabled={busy}
        />

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)' }}>
              Password <span className="auth-required-star" aria-hidden="true">*</span>
            </span>
            <button
              type="button"
              className="auth-inline-link"
              onClick={() => toast.info('For this demo, please sign in or register a new account.')}
              tabIndex={0}
            >
              Forgot password?
            </button>
          </div>

          <PasswordField
            id="password"
            name="password"
            label=""
            placeholder="••••••••••••"
            value={form.password}
            onChange={change}
            autoComplete="current-password"
            required
            disabled={busy}
          />
        </div>

        <PrimaryButton
          type="submit"
          loading={busy}
          loadingText="Signing in…"
          disabled={busy || !form.email || !form.password}
        >
          Sign in
        </PrimaryButton>
      </form>
    </AuthLayout>
  )
}
