export default function Disclaimer({ text }) {
  return (
    <p className="disclaimer">
      {text || 'This application is for general wellness and educational purposes only. ' +
        'It is not a medical or clinical tool and does not provide diagnosis, treatment, ' +
        'or medical advice.'}
    </p>
  )
}
