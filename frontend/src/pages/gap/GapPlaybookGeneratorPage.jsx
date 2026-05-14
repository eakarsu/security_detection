// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapPlaybookGeneratorPage() {
  return (
    <GapFeaturePage
      title="Auto Playbook Generator"
      description="Auto Playbook Generator"
      slug="playbook-generator"
      aiResultKey="playbook"
      fields={[
  {
    "name": "incidentType",
    "label": "Incident Type",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "summary",
    "label": "Summary",
    "type": "textarea",
    "rows": 4,
    "required": false
  }
]}
    />
  )
}
