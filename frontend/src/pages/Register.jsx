import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, AlertCircle, Check, CheckCircle2 } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout'
import FormField from '../components/auth/FormField'
import PasswordField from '../components/auth/PasswordField'
import PrimaryButton from '../components/auth/PrimaryButton'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Register() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError(null)
  }

  const lengthOk = form.password.length >= 8
  const letterAndNumOk = /[A-Za-z]/.test(form.password) && /\d/.test(form.password)
  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword
  const passwordValid = lengthOk && letterAndNumOk && passwordsMatch

  async function submit(e) {
    e.preventDefault()

    if (!form.name.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!form.email.trim()) {
      setError('Please enter a valid email address.')
      return
    }
    if (!lengthOk || !letterAndNumOk) {
      setError('Password must be at least 8 characters and contain both letters and numbers.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      toast.success('Account created! Next, configure your wellness profile.')
      navigate('/profile')
    } catch (err) {
      const msg = err.message || 'Unable to create account. Please try again.'
      setError(msg.includes('<!DOCTYPE') ? 'Unable to reach the server. Please try again later.' : msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Create your wellness profile"
      subtitle="Start building healthier habits with personalized insights."
      footerPrompt="Already have an account?"
      footerLinkText="Sign in"
      footerLinkTo="/login"
    >
      {/* Onboarding Step Progress Indicator */}
      <div className="auth-step-indicator-wrap" aria-label="Onboarding Progress">
        <div className="auth-step-labels">
          <span className="auth-step-pill active">01 Account</span>
          <span className="auth-step-line" />
          <span className="auth-step-pill">02 Biometrics</span>
          <span className="auth-step-line" />
          <span className="auth-step-pill">03 Goals</span>
        </div>
        <div className="auth-step-caption">Step 1 of 3 · Credentials & Login</div>
      </div>

      <form onSubmit={submit} noValidate className="auth-form-element">
        {error && (
          <div className="auth-global-error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <FormField
          id="name"
          name="name"
          label="Full name"
          placeholder="e.g. Hardik Singh"
          value={form.name}
          onChange={change}
          icon={User}
          autoComplete="name"
          required
          disabled={busy}
        />

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

        <PasswordField
          id="password"
          name="password"
          label="Password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={change}
          autoComplete="new-password"
          required
          disabled={busy}
        />

        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChange={change}
          autoComplete="new-password"
          required
          disabled={busy}
          error={form.confirmPassword && !passwordsMatch ? 'Passwords do not match' : null}
        />

        {/* Live Password Criteria UX */}
        {form.password.length > 0 && (
          <div className="auth-password-criteria-box">
            <div className={`auth-criteria-item ${lengthOk ? 'met' : ''}`}>
              <span className="auth-criteria-icon">{lengthOk ? <Check size={12} strokeWidth={3} /> : '•'}</span>
              <span>8+ characters</span>
            </div>
            <div className={`auth-criteria-item ${letterAndNumOk ? 'met' : ''}`}>
              <span className="auth-criteria-icon">{letterAndNumOk ? <Check size={12} strokeWidth={3} /> : '•'}</span>
              <span>Letters & numbers</span>
            </div>
            <div className={`auth-criteria-item ${passwordsMatch ? 'met' : ''}`}>
              <span className="auth-criteria-icon">{passwordsMatch ? <Check size={12} strokeWidth={3} /> : '•'}</span>
              <span>Passwords match</span>
            </div>
          </div>
        )}

        <PrimaryButton
          type="submit"
          loading={busy}
          loadingText="Creating account…"
          disabled={busy || !form.name || !form.email || !passwordValid}
        >
          Create account & continue
        </PrimaryButton>
      </form>
    </AuthLayout>
  )
}
