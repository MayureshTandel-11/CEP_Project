import { ShieldCheck } from 'lucide-react'

export default function TrustNotice() {
  return (
    <div className="auth-trust-card">
      <div className="auth-trust-icon-wrap">
        <ShieldCheck size={18} strokeWidth={2.2} className="auth-trust-icon" />
      </div>
      <div className="auth-trust-content">
        <div className="auth-trust-title">Your wellness data is private</div>
        <p className="auth-trust-text">
          Your biometrics and logs are securely isolated and used solely to personalize your guidance.
        </p>
        <div className="auth-trust-disclaimer">
          General wellness & educational tool. Not clinical diagnosis or medical advice.
        </div>
      </div>
    </div>
  )
}
