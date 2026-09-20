import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Disclaimer from '../components/Disclaimer'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(form)
      toast.success('Signed in.')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">Wellness Recommender</div>
        <p className="lede">
          Personalised nutrition, activity and wellness suggestions built from your
          own profile and daily logs.
        </p>

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email"
                   value={form.email} onChange={change} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password"
                   autoComplete="current-password"
                   value={form.password} onChange={change} required />
          </div>

          {error && <p className="field err" role="alert">{error}</p>}

          <button type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: '.9rem' }}>
          New here? <Link to="/register">Create an account</Link>
        </p>
        <Disclaimer />
      </div>
    </div>
  )
}
