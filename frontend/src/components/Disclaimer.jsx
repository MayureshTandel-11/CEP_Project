import { ShieldAlert } from 'lucide-react'

export default function Disclaimer({ text }) {
  return (
    <div className="disclaimer-banner">
      <ShieldAlert size={16} className="disclaimer-icon" />
      <div>
        {text || 'This application is for general wellness and educational purposes only. It is not a medical or clinical tool and does not provide diagnosis, treatment, or medical advice.'}
      </div>
    </div>
  )
}
