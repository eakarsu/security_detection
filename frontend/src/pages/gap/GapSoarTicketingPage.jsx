// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapSoarTicketingPage() {
  return (
    <GapFeaturePage
      title="SOAR Ticketing (Jira/ServiceNow)"
      description="SOAR Ticketing (Jira/ServiceNow)"
      slug="soar-ticketing"
      aiResultKey="ticket"
      fields={[
  {
    "name": "summary",
    "label": "Summary",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "priority",
    "label": "Priority",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}
