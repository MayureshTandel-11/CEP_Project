import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Disclaimer from '../components/Disclaimer'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Register() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const passwordOk = form.password.length >= 8 &&
    /[A-Za-z]/.test(form.password) && /\d/.test(form.password)
  const showPasswordHint = form.password.length > 0 && !passwordOk

  async function submit(e) {
    e.preventDefault()
    if (!passwordOk) return
    setBusy(true)
    setError(null)
    try {
      await register(form)
      toast.success('Account created. Next, complete your profile.')
      navigate('/profile')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">Create your account</div>
        <p className="lede">Takes a minute. Your data stays visible only to you.</p>

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" value={form.name} onChange={change} required />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email"
                   value={form.email} onChange={change} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password"
                   autoComplete="new-password"
                   aria-invalid={showPasswordHint}
                   aria-describedby="pw-hint"
                   value={form.password} onChange={change} required />
            <div id="pw-hint" className={showPasswordHint ? 'err' : 'hint'}>
              At least 8 characters, with one letter and one number.
            </div>
          </div>

          {error && <p className="field err" role="alert">{error}</p>}

          <button type="submit" disabled={busy || !passwordOk} style={{ width: '100%' }}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: '.9rem' }}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
        <Disclaimer />
      </div>
    </div>
  )
}
