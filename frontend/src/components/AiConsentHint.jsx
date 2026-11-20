import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

/** Explains why no AI text is shown. Renders nothing when AI text is present or irrelevant. */
export default function AiConsentHint({ status }) {
  if (status === 'not_consented') {
    return (
      <div className="why-box" style={{ marginBottom: 16 }}>
        <ShieldCheck size={18} className="why-icon" />
        <div>
          AI-written tips are off. Nothing about you was sent to an AI provider. You can turn them on
          in your <Link to="/profile">profile</Link>; this plan does not depend on them.
        </div>
      </div>
    )
  }
  if (status === 'not_configured') {
    return (
      <div className="why-box" style={{ marginBottom: 16 }}>
        <ShieldCheck size={18} className="why-icon" />
        <div>AI tips are allowed on your account, but no AI provider is set up on this server.</div>
      </div>
    )
  }
  if (status === 'unavailable') {
    return (
      <div className="why-box" style={{ marginBottom: 16 }}>
        <ShieldCheck size={18} className="why-icon" />
        <div>The AI provider could not be reached or returned nothing usable, so only the rule-based plan is shown.</div>
      </div>
    )
  }
  return null
}
