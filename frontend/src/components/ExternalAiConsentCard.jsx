import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import Card from './Card'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../services/api'

/**
 * Two separate, default-off choices about sending data to an external AI provider.
 * Medical categories can only be shared while the first choice is on; turning the first
 * off turns both off. The server enforces the same rules.
 */
export default function ExternalAiConsentCard() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const external = Boolean(user?.external_ai_consent)
  const medical = Boolean(user?.medical_data_consent)

  async function save(body, okMessage) {
    setBusy(true)
    try {
      const result = await api.setAiConsent(body)
      setUser({
        ...user,
        external_ai_consent: Boolean(result.external_ai_consent),
        medical_data_consent: Boolean(result.medical_data_consent),
      })
      toast.success(okMessage)
    } catch (err) {
      toast.error(err.message || 'Could not update this setting.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="AI assistant and AI-written tips"
      sub="Off by default. Your plans and the rule engine work without this."
      icon={ShieldCheck}
    >
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: busy ? 'wait' : 'pointer' }}>
        <input
          type="checkbox"
          checked={external}
          disabled={busy}
          onChange={(e) => save(
            { external_ai: e.target.checked },
            e.target.checked ? 'External AI turned on.' : 'External AI and medical sharing turned off.',
          )}
          style={{ marginTop: 3 }}
        />
        <span style={{ fontSize: '0.9rem' }}>
          <strong>Use an external AI provider.</strong> When on, your age range (not exact age), goal, activity
          level, diet, allergies, dislikes, BMI category, calorie/protein/water targets and 7-day averages are
          sent to the AI provider configured on this server, along with anything you type to the assistant.
          Your name, email, gender, exact numbers such as BMI, free-text notes and medications are never sent.
        </span>
      </label>

      <label
        style={{
          display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 14,
          opacity: external ? 1 : 0.55, cursor: busy || !external ? 'not-allowed' : 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={medical}
          disabled={busy || !external}
          onChange={(e) => save(
            { medical_data: e.target.checked },
            e.target.checked ? 'Medical categories will be shared.' : 'Medical categories are no longer shared.',
          )}
          style={{ marginTop: 3 }}
        />
        <span style={{ fontSize: '0.9rem' }}>
          <strong>Also share my diagnosed condition categories</strong> (for example &ldquo;Asthma&rdquo;), so
          tips can be more cautious. Only the category names you ticked are sent. Medications, notes and
          &ldquo;Other&rdquo; text are never sent. {external ? '' : 'Turn on the option above first.'}
        </span>
      </label>
    </Card>
  )
}
