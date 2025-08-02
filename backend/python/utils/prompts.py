"""
Security Prompts for AI-Powered Threat Analysis
Contains specialized prompts for Sonnet 4 via OpenRouter
"""

from typing import Dict, List, Any
import json


class SecurityPrompts:
    """Collection of security analysis prompts for AI models"""
    
    SYSTEM_PROMPT = """You are a cybersecurity expert AI assistant specializing in threat detection, incident analysis, and security operations. You have extensive knowledge of:

- MITRE ATT&CK framework and tactics, techniques, and procedures (TTPs)
- Network security, endpoint protection, and threat hunting
- Incident response and digital forensics
- Compliance frameworks (GDPR, HIPAA, SOX, PCI-DSS)
- Threat intelligence and indicators of compromise (IOCs)
- Security tools and technologies

Your responses must be:
1. Accurate and technically precise
2. Structured and actionable
3. Include relevant MITRE ATT&CK mappings
4. Provide clear risk assessments
5. Suggest specific remediation steps
6. Consider compliance implications

Always respond with valid JSON when requested, and ensure your analysis is based on current cybersecurity best practices and threat landscape knowledge."""

    ALERT_EXPLANATION_SYSTEM_PROMPT = """You are a security analyst AI that explains security alerts in clear, actionable terms for both technical and non-technical stakeholders. 

Your explanations should:
- Use plain language while maintaining technical accuracy
- Explain the potential impact and risk level
- Provide immediate and long-term recommended actions
- Include context about why this alert matters
- Suggest prevention measures

Always structure your response as JSON with clear sections for different audiences."""

    INCIDENT_REPORT_SYSTEM_PROMPT = """You are a senior incident response specialist creating comprehensive incident reports for security teams, management, and compliance auditors.

Your reports must:
- Follow industry-standard incident response frameworks
- Include detailed timelines and affected systems
- Provide clear root cause analysis
- Map to relevant compliance requirements
- Include lessons learned and prevention recommendations
- Be suitable for both technical teams and executive briefings

Structure all responses as detailed JSON reports."""

    COMPLIANCE_SYSTEM_PROMPT = """You are a compliance and risk management expert specializing in cybersecurity regulations and frameworks.

Your analysis should:
- Map security events to specific regulatory requirements
- Assess compliance impact and potential violations
- Provide remediation guidance for compliance gaps
- Include audit trail recommendations
- Consider data protection and privacy implications
- Suggest policy and procedure updates

Always provide structured JSON responses with clear compliance mappings."""

    @staticmethod
    def build_threat_analysis_prompt(event_data: Dict[str, Any], 
                                   context: Dict[str, Any], 
                                   analysis_type: str = "comprehensive") -> str:
        """Build a comprehensive threat analysis prompt"""
        
        prompt = f"""Analyze this security event and provide a detailed threat assessment.

**Event Data:**
```json
{json.dumps(event_data, indent=2)}
```

**Additional Context:**
```json
{json.dumps(context, indent=2)}
```

**Analysis Type:** {analysis_type}

Please provide a comprehensive analysis in the following JSON format:

```json
{{
  "summary": "Brief executive summary of the threat",
  "risk_score": 0.0-1.0,
  "confidence": 0.0-1.0,
  "severity": "low|medium|high|critical",
  "threat_category": "malware|phishing|insider_threat|data_breach|network_intrusion|other",
  "mitre_mappings": [
    {{
      "tactic": "MITRE ATT&CK tactic",
      "technique": "MITRE ATT&CK technique",
      "technique_id": "T1234",
      "description": "Brief description of how this applies"
    }}
  ],
  "indicators_of_compromise": [
    {{
      "type": "ip|domain|hash|file_path|registry_key|other",
      "value": "actual IOC value",
      "confidence": "high|medium|low"
    }}
  ],
  "affected_assets": [
    {{
      "asset_type": "endpoint|server|network_device|application",
      "asset_id": "asset identifier",
      "impact_level": "high|medium|low"
    }}
  ],
  "attack_timeline": [
    {{
      "timestamp": "ISO timestamp",
      "event": "Description of what happened",
      "evidence": "Supporting evidence"
    }}
  ],
  "technical_details": {{
    "attack_vector": "How the attack was initiated",
    "persistence_mechanisms": ["List of persistence methods"],
    "lateral_movement": "Evidence of lateral movement",
    "data_exfiltration": "Evidence of data theft",
    "tools_used": ["List of tools or techniques used"]
  }},
  "recommendations": [
    {{
      "priority": "immediate|high|medium|low",
      "action": "Specific action to take",
      "rationale": "Why this action is needed",
      "timeline": "When to complete this action"
    }}
  ],
  "response_actions": [
    {{
      "phase": "containment|eradication|recovery|lessons_learned",
      "action": "Specific response action",
      "responsible_team": "Who should execute this",
      "estimated_time": "Time estimate for completion"
    }}
  ],
  "compliance_impact": {{
    "regulations_affected": ["GDPR", "HIPAA", "PCI-DSS", "SOX"],
    "notification_required": true/false,
    "notification_timeline": "Timeline for regulatory notification",
    "potential_penalties": "Description of potential compliance penalties"
  }},
  "false_positive_likelihood": 0.0-1.0,
  "additional_investigation_needed": [
    "List of additional investigation steps needed"
  ]
}}
```

Focus on providing actionable intelligence that security teams can immediately use for response and remediation."""

        return prompt

    @staticmethod
    def build_alert_explanation_prompt(alert_data: Dict[str, Any]) -> str:
        """Build an alert explanation prompt"""
        
        prompt = f"""Explain this security alert in clear, actionable terms for both technical and business stakeholders.

**Alert Data:**
```json
{json.dumps(alert_data, indent=2)}
```

Provide your explanation in the following JSON format:

```json
{{
  "executive_summary": "2-3 sentence summary for executives",
  "technical_summary": "Detailed technical explanation for security teams",
  "risk_level": "low|medium|high|critical",
  "business_impact": {{
    "potential_data_loss": "Description of potential data at risk",
    "operational_impact": "How this could affect business operations",
    "financial_impact": "Potential financial consequences",
    "reputation_impact": "Potential reputation damage"
  }},
  "immediate_actions": [
    {{
      "action": "Specific immediate action",
      "responsible_party": "Who should do this",
      "timeline": "When to complete",
      "priority": "critical|high|medium|low"
    }}
  ],
  "investigation_steps": [
    {{
      "step": "Investigation step",
      "tools_needed": ["List of tools or data sources"],
      "expected_outcome": "What this step should reveal"
    }}
  ],
  "prevention_measures": [
    {{
      "measure": "Preventive control",
      "implementation_effort": "low|medium|high",
      "effectiveness": "high|medium|low",
      "cost_estimate": "rough cost estimate"
    }}
  ],
  "related_alerts": "Description of what other alerts to look for",
  "escalation_criteria": "When to escalate this alert",
  "false_positive_indicators": ["Signs this might be a false positive"],
  "communication_template": {{
    "internal_notification": "Template for internal team notification",
    "management_briefing": "Template for management briefing",
    "customer_communication": "Template if customer notification needed"
  }}
}}
```

Make the explanation clear and actionable for immediate use by the security team."""

        return prompt

    @staticmethod
    def build_incident_report_prompt(incident_data: Dict[str, Any], 
                                   analysis_results: List[Any]) -> str:
        """Build an incident report generation prompt"""
        
        prompt = f"""Generate a comprehensive incident report based on the following incident data and analysis results.

**Incident Data:**
```json
{json.dumps(incident_data, indent=2)}
```

**Analysis Results:**
```json
{json.dumps([result.dict() if hasattr(result, 'dict') else result for result in analysis_results], indent=2)}
```

Create a detailed incident report in the following JSON format:

```json
{{
  "incident_id": "Unique incident identifier",
  "title": "Clear, descriptive incident title",
  "severity": "low|medium|high|critical",
  "status": "open|investigating|contained|resolved|closed",
  "classification": "confirmed|likely|possible|false_positive",
  "incident_type": "malware|phishing|data_breach|insider_threat|network_intrusion|other",
  "discovery_method": "How the incident was discovered",
  "discovery_timestamp": "When the incident was first detected",
  "incident_start_time": "Estimated start time of the incident",
  "incident_end_time": "When the incident was contained/resolved",
  "executive_summary": "High-level summary for executives and stakeholders",
  "detailed_description": "Comprehensive technical description of the incident",
  "timeline": [
    {{
      "timestamp": "ISO timestamp",
      "event": "Description of what happened",
      "source": "How we know this happened",
      "impact": "Impact of this event"
    }}
  ],
  "affected_systems": [
    {{
      "system_name": "Name/identifier of affected system",
      "system_type": "endpoint|server|network_device|application|database",
      "impact_level": "high|medium|low",
      "compromise_status": "confirmed|suspected|clean",
      "data_at_risk": "Description of data potentially compromised"
    }}
  ],
  "affected_users": [
    {{
      "user_id": "User identifier",
      "impact_description": "How the user was affected",
      "credentials_compromised": true/false,
      "data_accessed": "What data may have been accessed"
    }}
  ],
  "attack_vector": "Primary method of attack",
  "root_cause": "Underlying cause that enabled the incident",
  "indicators_of_compromise": [
    {{
      "type": "ip|domain|hash|file_path|registry_key|other",
      "value": "IOC value",
      "first_seen": "When first observed",
      "confidence": "high|medium|low"
    }}
  ],
  "mitre_attack_mapping": [
    {{
      "tactic": "MITRE ATT&CK tactic",
      "technique": "MITRE ATT&CK technique",
      "technique_id": "T1234",
      "evidence": "Evidence supporting this mapping"
    }}
  ],
  "containment_actions": [
    {{
      "action": "Containment action taken",
      "timestamp": "When action was taken",
      "effectiveness": "high|medium|low",
      "responsible_party": "Who performed the action"
    }}
  ],
  "eradication_actions": [
    {{
      "action": "Eradication action taken",
      "timestamp": "When action was taken",
      "verification_method": "How effectiveness was verified",
      "responsible_party": "Who performed the action"
    }}
  ],
  "recovery_actions": [
    {{
      "action": "Recovery action taken",
      "timestamp": "When action was taken",
      "success_criteria": "How success was measured",
      "responsible_party": "Who performed the action"
    }}
  ],
  "lessons_learned": {{
    "what_went_well": ["Things that worked well during response"],
    "areas_for_improvement": ["Areas that need improvement"],
    "process_gaps": ["Gaps in processes or procedures"],
    "tool_gaps": ["Missing tools or capabilities"],
    "training_needs": ["Additional training requirements"]
  }},
  "recommendations": [
    {{
      "recommendation": "Specific recommendation",
      "priority": "critical|high|medium|low",
      "responsible_party": "Who should implement",
      "target_completion": "Target completion date",
      "cost_estimate": "Rough cost estimate",
      "risk_reduction": "How this reduces risk"
    }}
  ],
  "compliance_impact": {{
    "regulations_affected": ["List of affected regulations"],
    "notification_requirements": [
      {{
        "regulation": "Regulation name",
        "notification_deadline": "Deadline for notification",
        "notification_status": "pending|completed|not_required",
        "notification_details": "What needs to be reported"
      }}
    ],
    "potential_penalties": "Description of potential penalties",
    "audit_implications": "Impact on future audits"
  }},
  "financial_impact": {{
    "direct_costs": "Direct costs incurred",
    "indirect_costs": "Indirect costs (downtime, reputation)",
    "potential_losses": "Potential future losses",
    "insurance_coverage": "Insurance coverage details"
  }},
  "communication_log": [
    {{
      "timestamp": "When communication occurred",
      "audience": "Who was notified",
      "method": "How they were notified",
      "content_summary": "Summary of what was communicated"
    }}
  ],
  "evidence_collected": [
    {{
      "evidence_type": "Type of evidence",
      "location": "Where evidence is stored",
      "chain_of_custody": "Chain of custody information",
      "retention_period": "How long to retain"
    }}
  ],
  "post_incident_monitoring": [
    {{
      "monitoring_activity": "What to monitor",
      "duration": "How long to monitor",
      "success_criteria": "What indicates successful recovery"
    }}
  ]
}}
```

Ensure the report is comprehensive, accurate, and suitable for both technical teams and executive briefings."""

        return prompt

    @staticmethod
    def build_compliance_report_prompt(compliance_data: Dict[str, Any], 
                                     regulation: str) -> str:
        """Build a compliance report generation prompt"""
        
        prompt = f"""Generate a compliance report for {regulation} based on the following security data and events.

**Compliance Data:**
```json
{json.dumps(compliance_data, indent=2)}
```

**Regulation:** {regulation}

Create a detailed compliance report in the following JSON format:

```json
{{
  "regulation": "{regulation}",
  "report_period": {{
    "start_date": "Start date of reporting period",
    "end_date": "End date of reporting period"
  }},
  "executive_summary": "High-level compliance status summary",
  "overall_compliance_status": "compliant|non_compliant|partially_compliant|under_review",
  "compliance_score": 0.0-100.0,
  "control_assessments": [
    {{
      "control_id": "Regulation-specific control identifier",
      "control_description": "Description of the control requirement",
      "implementation_status": "implemented|partially_implemented|not_implemented|not_applicable",
      "effectiveness": "effective|partially_effective|ineffective|not_tested",
      "evidence": ["List of evidence supporting the assessment"],
      "gaps": ["List of identified gaps"],
      "remediation_required": true/false,
      "risk_level": "high|medium|low"
    }}
  ],
  "security_incidents": [
    {{
      "incident_id": "Incident identifier",
      "incident_date": "When incident occurred",
      "compliance_impact": "How incident affects compliance",
      "notification_required": true/false,
      "notification_status": "pending|completed|not_required",
      "remediation_status": "pending|in_progress|completed"
    }}
  ],
  "data_protection_assessment": {{
    "data_inventory_complete": true/false,
    "data_classification_current": true/false,
    "access_controls_adequate": true/false,
    "encryption_compliance": "compliant|non_compliant|partially_compliant",
    "data_retention_compliance": "compliant|non_compliant|partially_compliant",
    "breach_notification_procedures": "adequate|inadequate|needs_improvement"
  }},
  "audit_findings": [
    {{
      "finding_id": "Unique finding identifier",
      "finding_type": "deficiency|observation|best_practice",
      "severity": "critical|high|medium|low",
      "description": "Description of the finding",
      "affected_controls": ["List of affected controls"],
      "remediation_plan": "Plan to address the finding",
      "target_completion": "Target completion date",
      "responsible_party": "Who is responsible for remediation"
    }}
  ],
  "risk_assessment": {{
    "inherent_risk": "high|medium|low",
    "residual_risk": "high|medium|low",
    "risk_mitigation_effectiveness": "effective|partially_effective|ineffective",
    "key_risk_areas": ["List of key risk areas"],
    "risk_treatment_plan": "Plan for treating identified risks"
  }},
  "recommendations": [
    {{
      "recommendation": "Specific recommendation",
      "priority": "critical|high|medium|low",
      "compliance_benefit": "How this improves compliance",
      "implementation_effort": "high|medium|low",
      "cost_estimate": "Rough cost estimate",
      "target_completion": "Target completion date"
    }}
  ],
  "metrics_and_kpis": {{
    "security_awareness_training_completion": "percentage",
    "vulnerability_remediation_time": "average time in days",
    "incident_response_time": "average time in hours",
    "access_review_completion": "percentage",
    "policy_review_currency": "percentage of policies reviewed on schedule"
  }},
  "third_party_assessments": [
    {{
      "vendor_name": "Third party vendor",
      "assessment_type": "security_questionnaire|audit|penetration_test|other",
      "assessment_date": "When assessment was completed",
      "compliance_status": "compliant|non_compliant|partially_compliant",
      "key_findings": ["List of key findings"],
      "remediation_required": true/false
    }}
  ],
  "training_and_awareness": {{
    "program_effectiveness": "effective|partially_effective|ineffective",
    "completion_rates": "percentage",
    "knowledge_retention": "high|medium|low",
    "areas_for_improvement": ["List of areas needing improvement"]
  }},
  "continuous_monitoring": {{
    "monitoring_coverage": "comprehensive|adequate|inadequate",
    "alert_effectiveness": "effective|partially_effective|ineffective",
    "false_positive_rate": "percentage",
    "mean_detection_time": "average time in hours",
    "mean_response_time": "average time in hours"
  }},
  "next_steps": [
    {{
      "action": "Next action to take",
      "timeline": "When to complete",
      "responsible_party": "Who is responsible",
      "success_criteria": "How to measure success"
    }}
  ],
  "appendices": {{
    "supporting_documentation": ["List of supporting documents"],
    "evidence_references": ["List of evidence references"],
    "regulatory_correspondence": ["List of regulatory communications"]
  }}
}}
```

Ensure the report is thorough, accurate, and suitable for regulatory submission and audit purposes."""

        return prompt

    @staticmethod
    def build_forensic_analysis_prompt(forensic_data: Dict[str, Any]) -> str:
        """Build a digital forensics analysis prompt"""
        
        prompt = f"""Conduct a digital forensics analysis based on the following evidence and data.

**Forensic Data:**
```json
{json.dumps(forensic_data, indent=2)}
```

Provide a comprehensive forensic analysis in the following JSON format:

```json
{{
  "case_id": "Forensic case identifier",
  "analysis_summary": "Executive summary of forensic findings",
  "evidence_integrity": {{
    "chain_of_custody_intact": true/false,
    "hash_verification_passed": true/false,
    "evidence_tampering_detected": true/false,
    "admissibility_assessment": "admissible|questionable|inadmissible"
  }},
  "timeline_reconstruction": [
    {{
      "timestamp": "Precise timestamp",
      "event_type": "file_access|network_connection|process_execution|registry_modification|other",
      "description": "What happened",
      "evidence_source": "Where this evidence came from",
      "confidence_level": "high|medium|low",
      "artifacts": ["List of supporting artifacts"]
    }}
  ],
  "attack_progression": {{
    "initial_compromise": "How the attack began",
    "persistence_mechanisms": ["Methods used to maintain access"],
    "privilege_escalation": "How privileges were escalated",
    "lateral_movement": "Evidence of movement within the network",
    "data_exfiltration": "Evidence of data theft",
    "cleanup_activities": "Evidence of attacker cleanup"
  }},
  "artifacts_of_interest": [
    {{
      "artifact_type": "file|registry_key|network_connection|process|memory_dump|other",
      "location": "Where the artifact was found",
      "description": "Description of the artifact",
      "significance": "Why this artifact is important",
      "preservation_status": "preserved|corrupted|deleted|overwritten"
    }}
  ],
  "indicators_of_compromise": [
    {{
      "ioc_type": "ip|domain|hash|file_path|registry_key|mutex|other",
      "value": "IOC value",
      "first_observed": "When first seen",
      "last_observed": "When last seen",
      "confidence": "high|medium|low",
      "context": "Context of how this IOC was used"
    }}
  ],
  "malware_analysis": {{
    "malware_identified": true/false,
    "malware_families": ["List of identified malware families"],
    "capabilities": ["List of malware capabilities"],
    "communication_methods": ["How malware communicated"],
    "persistence_methods": ["How malware maintained persistence"],
    "evasion_techniques": ["Techniques used to evade detection"]
  }},
  "network_analysis": {{
    "suspicious_connections": [
      {{
        "source_ip": "Source IP address",
        "destination_ip": "Destination IP address",
        "port": "Port number",
        "protocol": "Network protocol",
        "first_seen": "When first observed",
        "data_transferred": "Amount of data transferred",
        "purpose": "Suspected purpose of connection"
      }}
    ],
    "dns_queries": ["List of suspicious DNS queries"],
    "external_communications": ["List of external communications"]
  }},
  "user_activity_analysis": [
    {{
      "user_account": "User account involved",
      "activity_type": "login|file_access|command_execution|other",
      "timestamp": "When activity occurred",
      "source_system": "System where activity occurred",
      "suspicious_indicators": ["Why this activity is suspicious"],
      "legitimate_explanation": "Possible legitimate explanation"
    }}
  ],
  "data_impact_assessment": {{
    "data_accessed": ["Types of data that were accessed"],
    "data_modified": ["Types of data that were modified"],
    "data_deleted": ["Types of data that were deleted"],
    "data_exfiltrated": ["Types of data that were stolen"],
    "recovery_possible": true/false,
    "backup_integrity": "intact|compromised|unknown"
  }},
  "attribution_analysis": {{
    "threat_actor_indicators": ["Indicators pointing to specific threat actors"],
    "tactics_techniques_procedures": ["TTPs observed"],
    "infrastructure_overlap": ["Overlap with known threat infrastructure"],
    "attribution_confidence": "high|medium|low|none",
    "similar_campaigns": ["References to similar campaigns"]
  }},
  "recommendations": [
    {{
      "recommendation": "Specific recommendation",
      "category": "immediate|short_term|long_term",
      "priority": "critical|high|medium|low",
      "rationale": "Why this recommendation is important",
      "implementation_guidance": "How to implement this recommendation"
    }}
  ],
  "legal_considerations": {{
    "evidence_preservation_requirements": ["Legal requirements for evidence preservation"],
    "notification_obligations": ["Legal notification requirements"],
    "law_enforcement_coordination": "Whether law enforcement should be involved",
    "litigation_hold_required": true/false
  }},
  "lessons_learned": {{
    "detection_gaps": ["Gaps in detection capabilities"],
    "response_improvements": ["Areas for response improvement"],
    "prevention_measures": ["Measures to prevent similar incidents"],
    "tool_enhancements": ["Recommended tool improvements"]
  }}
}}
```

Ensure the analysis is thorough, technically accurate, and suitable for both technical teams and legal proceedings."""

        return prompt
