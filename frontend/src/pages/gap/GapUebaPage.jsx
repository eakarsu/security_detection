// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapUebaPage() {
  return (
    <GapFeaturePage
      title="User-Behavior Analytics (UEBA)"
      description="User-Behavior Analytics (UEBA)"
      slug="ueba"
      aiResultKey="risk"
      fields={[
  {
    "name": "userId",
    "label": "User ID",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "events",
    "label": "Events (JSON)",
    "type": "json"
  }
]}
    />
  )
}
