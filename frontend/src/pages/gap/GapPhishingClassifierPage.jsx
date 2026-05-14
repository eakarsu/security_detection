// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapPhishingClassifierPage() {
  return (
    <GapFeaturePage
      title="Phishing Email Classifier"
      description="Phishing Email Classifier"
      slug="phishing-classifier"
      aiResultKey="classification"
      fields={[
  {
    "name": "emailContent",
    "label": "Email Content",
    "type": "textarea",
    "rows": 4,
    "required": true
  }
]}
    />
  )
}
