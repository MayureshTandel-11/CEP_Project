import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import Card from './Card'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../services/api'

/**
 * Opt-in for using a user's data to evaluate the recommendation model. Off by default and
 * reversible at any time. Does not change what the user sees unless a comparison group is
 * enabled by the operator.
 */
export default function ResearchConsentCard() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const consented = Boolean(user?.research_consent)

  async function toggle(next) {
    setBusy(true)
    try {
      const result = await api.setResearchConsent(next)
      setUser({ ...user, research_consent: Boolean(result.research_consent) })
      toast.success(next ? 'Thanks, research participation turned on.' : 'Research participation turned off.')
    } catch (err) {
      toast.error(err.message || 'Could not update this setting.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="Help improve recommendations"
      sub="Optional. You can change this at any time."
      icon={FlaskConical}
    >
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: busy ? 'wait' : 'pointer' }}>
        <input
          type="checkbox"
          checked={consented}
          disabled={busy}
          onChange={(e) => toggle(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span style={{ fontSize: '0.9rem' }}>
          Allow my de-identified logs and plan outcomes to be used to evaluate how well the
          recommendation model works. This may include being shown rule-based plans only, for
          comparison. No name or email is included, and turning this off stops future use.
        </span>
      </label>
    </Card>
  )
}
