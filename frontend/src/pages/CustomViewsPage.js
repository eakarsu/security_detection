import React from 'react';
import ThreatFeed from '../components/ThreatFeed';
import AlertSeverityDash from '../components/AlertSeverityDash';
import IncidentReportPDF from '../components/IncidentReportPDF';
import DetectionRulesEditor from '../components/DetectionRulesEditor';

const CustomViewsPage = () => {
  return (
    <div data-testid="custom-views-page" style={{ display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ color: '#fff', margin: '0 0 4px' }}>Security Views</h1>
        <p style={{ color: '#b0bec5', margin: 0 }}>
          Custom threat-detection views: live feed, severity dashboard, incident PDFs, and detection rules.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ThreatFeed />
        <AlertSeverityDash />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
        <IncidentReportPDF />
        <DetectionRulesEditor />
      </div>
    </div>
  );
};

export default CustomViewsPage;
