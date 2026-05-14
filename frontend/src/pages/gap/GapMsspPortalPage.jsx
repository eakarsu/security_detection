// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapMsspPortalPage() {
  return (
    <GapFeaturePage
      title="Customer/MSSP Portal"
      description="Customer/MSSP Portal"
      slug="mssp-portal"
      aiResultKey="request"
      fields={[
  {
    "name": "customerId",
    "label": "Customer ID",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "request",
    "label": "Request",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}
