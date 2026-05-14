// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapLogShippersPage() {
  return (
    <GapFeaturePage
      title="Native Log Shippers (Syslog/CloudTrail/WinEvent)"
      description="Native Log Shippers (Syslog/CloudTrail/WinEvent)"
      slug="log-shippers"
      aiResultKey="job"
      fields={[
  {
    "name": "source",
    "label": "Source",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "target",
    "label": "Target",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}
