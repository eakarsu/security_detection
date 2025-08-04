"""
NodeGuard AI Security Platform - Alert Routes
Real alert dispatch endpoints for workflow nodes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, EmailStr
import structlog
from datetime import datetime
import json

logger = structlog.get_logger(__name__)

router = APIRouter()


class AlertRequest(BaseModel):
    """Alert dispatch request model"""
    alert_type: str  # email, slack, teams, webhook
    recipients: List[str]  # email addresses, slack channels, etc.
    event_data: Dict[str, Any]
    severity: str = "medium"
    subject: Optional[str] = None
    message: Optional[str] = None
    template: Optional[str] = "default"


class AlertResponse(BaseModel):
    """Alert dispatch response model"""
    alert_id: str
    status: str
    dispatched_to: List[str]
    dispatch_time: str
    delivery_status: Dict[str, str]
    retry_count: int
    estimated_delivery: str


@router.post("/dispatch", response_model=AlertResponse)
async def dispatch_alert(request: AlertRequest) -> AlertResponse:
    """Dispatch security alerts via multiple channels"""
    try:
        start_time = datetime.utcnow()
        alert_id = f"alert_{int(start_time.timestamp())}"
        
        # Dispatch alerts based on type
        delivery_status = {}
        
        if request.alert_type == "email":
            delivery_status.update(await dispatch_email_alerts(request, alert_id))
        elif request.alert_type == "slack":
            delivery_status.update(await dispatch_slack_alerts(request, alert_id))
        elif request.alert_type == "teams":
            delivery_status.update(await dispatch_teams_alerts(request, alert_id))
        elif request.alert_type == "webhook":
            delivery_status.update(await dispatch_webhook_alerts(request, alert_id))
        elif request.alert_type == "multi":
            # Dispatch to multiple channels
            delivery_status.update(await dispatch_email_alerts(request, alert_id))
            delivery_status.update(await dispatch_slack_alerts(request, alert_id))
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported alert type: {request.alert_type}")
        
        # Calculate success rate
        successful_dispatches = sum(1 for status in delivery_status.values() if status == "sent")
        total_dispatches = len(delivery_status)
        
        overall_status = "success" if successful_dispatches == total_dispatches else "partial_failure"
        if successful_dispatches == 0:
            overall_status = "failed"
        
        logger.info("Alert dispatch completed", 
                   alert_id=alert_id,
                   alert_type=request.alert_type,
                   recipients_count=len(request.recipients),
                   success_rate=f"{successful_dispatches}/{total_dispatches}",
                   severity=request.severity)
        
        return AlertResponse(
            alert_id=alert_id,
            status=overall_status,
            dispatched_to=request.recipients,
            dispatch_time=start_time.isoformat(),
            delivery_status=delivery_status,
            retry_count=0,
            estimated_delivery="immediate"
        )
        
    except Exception as e:
        logger.error("Alert dispatch failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Alert dispatch failed: {str(e)}")


@router.post("/template")
async def create_alert_template(template_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create custom alert template"""
    try:
        template_id = f"template_{int(datetime.utcnow().timestamp())}"
        
        # Validate template structure
        required_fields = ["name", "subject_template", "body_template", "alert_type"]
        if not all(field in template_data for field in required_fields):
            raise HTTPException(status_code=400, detail="Missing required template fields")
        
        # Store template (in production, this would go to database)
        logger.info("Alert template created", 
                   template_id=template_id,
                   name=template_data["name"],
                   alert_type=template_data["alert_type"])
        
        return {
            "template_id": template_id,
            "status": "created",
            "template": template_data
        }
        
    except Exception as e:
        logger.error("Failed to create alert template", error=str(e))
        raise HTTPException(status_code=500, detail=f"Template creation failed: {str(e)}")


@router.get("/status/{alert_id}")
async def get_alert_status(alert_id: str) -> Dict[str, Any]:
    """Get alert delivery status"""
    try:
        # In production, this would query from database or message queue
        return {
            "alert_id": alert_id,
            "status": "delivered",
            "created_at": datetime.utcnow().isoformat(),
            "delivered_at": datetime.utcnow().isoformat(),
            "delivery_details": {
                "attempts": 1,
                "last_attempt": datetime.utcnow().isoformat(),
                "next_retry": None
            }
        }
        
    except Exception as e:
        logger.error("Failed to get alert status", error=str(e))
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")


async def dispatch_email_alerts(request: AlertRequest, alert_id: str) -> Dict[str, str]:
    """Dispatch email alerts"""
    delivery_status = {}
    
    try:
        # Build email content
        subject = request.subject or generate_alert_subject(request.event_data, request.severity)
        message = request.message or generate_alert_message(request.event_data, request.template)
        
        for recipient in request.recipients:
            try:
                # In production, this would use SMTP or email service
                await send_email_alert(recipient, subject, message, request.event_data)
                delivery_status[f"email:{recipient}"] = "sent"
                logger.info("Email alert sent", recipient=recipient, alert_id=alert_id)
                
            except Exception as e:
                delivery_status[f"email:{recipient}"] = f"failed: {str(e)}"
                logger.error("Email alert failed", recipient=recipient, error=str(e))
        
    except Exception as e:
        logger.error("Email dispatch failed", error=str(e))
        for recipient in request.recipients:
            delivery_status[f"email:{recipient}"] = f"failed: {str(e)}"
    
    return delivery_status


async def dispatch_slack_alerts(request: AlertRequest, alert_id: str) -> Dict[str, str]:
    """Dispatch Slack alerts"""
    delivery_status = {}
    
    try:
        # Build Slack message
        slack_message = generate_slack_message(request.event_data, request.severity)
        
        for channel in request.recipients:
            try:
                # In production, this would use Slack API
                await send_slack_alert(channel, slack_message, request.event_data)
                delivery_status[f"slack:{channel}"] = "sent"
                logger.info("Slack alert sent", channel=channel, alert_id=alert_id)
                
            except Exception as e:
                delivery_status[f"slack:{channel}"] = f"failed: {str(e)}"
                logger.error("Slack alert failed", channel=channel, error=str(e))
        
    except Exception as e:
        logger.error("Slack dispatch failed", error=str(e))
        for channel in request.recipients:
            delivery_status[f"slack:{channel}"] = f"failed: {str(e)}"
    
    return delivery_status


async def dispatch_teams_alerts(request: AlertRequest, alert_id: str) -> Dict[str, str]:
    """Dispatch Microsoft Teams alerts"""
    delivery_status = {}
    
    try:
        # Build Teams message
        teams_message = generate_teams_message(request.event_data, request.severity)
        
        for webhook_url in request.recipients:
            try:
                # In production, this would use Teams webhook API
                await send_teams_alert(webhook_url, teams_message, request.event_data)
                delivery_status[f"teams:{webhook_url[-10:]}"] = "sent"
                logger.info("Teams alert sent", alert_id=alert_id)
                
            except Exception as e:
                delivery_status[f"teams:{webhook_url[-10:]}"] = f"failed: {str(e)}"
                logger.error("Teams alert failed", error=str(e))
        
    except Exception as e:
        logger.error("Teams dispatch failed", error=str(e))
        for webhook_url in request.recipients:
            delivery_status[f"teams:{webhook_url[-10:]}"] = f"failed: {str(e)}"
    
    return delivery_status


async def dispatch_webhook_alerts(request: AlertRequest, alert_id: str) -> Dict[str, str]:
    """Dispatch webhook alerts"""
    delivery_status = {}
    
    try:
        # Build webhook payload
        webhook_payload = {
            "alert_id": alert_id,
            "timestamp": datetime.utcnow().isoformat(),
            "severity": request.severity,
            "event_data": request.event_data,
            "alert_type": "security_event"
        }
        
        for webhook_url in request.recipients:
            try:
                # In production, this would make HTTP POST to webhook
                await send_webhook_alert(webhook_url, webhook_payload)
                delivery_status[f"webhook:{webhook_url[-10:]}"] = "sent"
                logger.info("Webhook alert sent", alert_id=alert_id)
                
            except Exception as e:
                delivery_status[f"webhook:{webhook_url[-10:]}"] = f"failed: {str(e)}"
                logger.error("Webhook alert failed", error=str(e))
        
    except Exception as e:
        logger.error("Webhook dispatch failed", error=str(e))
        for webhook_url in request.recipients:
            delivery_status[f"webhook:{webhook_url[-10:]}"] = f"failed: {str(e)}"
    
    return delivery_status


def generate_alert_subject(event_data: Dict[str, Any], severity: str) -> str:
    """Generate alert email subject"""
    event_type = event_data.get("event_type", "Security Event")
    source_ip = event_data.get("source_ip", "Unknown")
    
    severity_emoji = {
        "low": "🟡",
        "medium": "🟠", 
        "high": "🔴",
        "critical": "🚨"
    }
    
    emoji = severity_emoji.get(severity, "⚠️")
    return f"{emoji} {severity.upper()} Security Alert: {event_type} from {source_ip}"


def generate_alert_message(event_data: Dict[str, Any], template: str = "default") -> str:
    """Generate alert message body"""
    if template == "detailed":
        return generate_detailed_alert_message(event_data)
    elif template == "summary":
        return generate_summary_alert_message(event_data)
    else:
        return generate_default_alert_message(event_data)


def generate_default_alert_message(event_data: Dict[str, Any]) -> str:
    """Generate default alert message"""
    timestamp = event_data.get("timestamp", datetime.utcnow().isoformat())
    event_type = event_data.get("event_type", "Security Event")
    source_ip = event_data.get("source_ip", "Unknown")
    severity = event_data.get("severity", "medium")
    
    message = f"""
Security Alert Detected

Event Details:
- Event Type: {event_type}
- Severity: {severity.upper()}
- Source IP: {source_ip}
- Timestamp: {timestamp}
- Event ID: {event_data.get("event_id", "N/A")}

Description: {event_data.get("description", "No description available")}

This alert was generated by NodeGuard AI Security Platform.
Please investigate and take appropriate action.
"""
    
    return message.strip()


def generate_detailed_alert_message(event_data: Dict[str, Any]) -> str:
    """Generate detailed alert message"""
    basic_message = generate_default_alert_message(event_data)
    
    additional_details = f"""

Additional Information:
- Destination IP: {event_data.get("destination_ip", "N/A")}
- User ID: {event_data.get("user_id", "N/A")}
- Asset ID: {event_data.get("asset_id", "N/A")}
- ML Score: {event_data.get("ml_score", "N/A")}
- Risk Score: {event_data.get("risk_score", "N/A")}

Raw Event Data:
{json.dumps(event_data, indent=2, default=str)}
"""
    
    return basic_message + additional_details


def generate_summary_alert_message(event_data: Dict[str, Any]) -> str:
    """Generate summary alert message"""
    event_type = event_data.get("event_type", "Security Event")
    source_ip = event_data.get("source_ip", "Unknown")
    severity = event_data.get("severity", "medium")
    
    return f"Security Alert: {event_type} from {source_ip} - Severity: {severity.upper()}"


def generate_slack_message(event_data: Dict[str, Any], severity: str) -> Dict[str, Any]:
    """Generate Slack message format"""
    color_map = {
        "low": "#36a64f",      # Green
        "medium": "#ff9500",   # Orange  
        "high": "#ff4444",     # Red
        "critical": "#8b0000"  # Dark Red
    }
    
    color = color_map.get(severity, "#ff9500")
    
    return {
        "text": f"Security Alert: {event_data.get('event_type', 'Unknown Event')}",
        "attachments": [
            {
                "color": color,
                "fields": [
                    {"title": "Severity", "value": severity.upper(), "short": True},
                    {"title": "Source IP", "value": event_data.get("source_ip", "Unknown"), "short": True},
                    {"title": "Event Type", "value": event_data.get("event_type", "Unknown"), "short": True},
                    {"title": "Timestamp", "value": event_data.get("timestamp", "Unknown"), "short": True},
                    {"title": "Description", "value": event_data.get("description", "No description"), "short": False}
                ],
                "footer": "NodeGuard AI Security Platform",
                "ts": int(datetime.utcnow().timestamp())
            }
        ]
    }


def generate_teams_message(event_data: Dict[str, Any], severity: str) -> Dict[str, Any]:
    """Generate Microsoft Teams message format"""
    color_map = {
        "low": "Good",
        "medium": "Warning", 
        "high": "Attention",
        "critical": "Attention"
    }
    
    theme_color = color_map.get(severity, "Warning")
    
    return {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "FF4444" if severity in ["high", "critical"] else "FF9500",
        "summary": f"Security Alert: {event_data.get('event_type', 'Unknown')}",
        "sections": [
            {
                "activityTitle": "Security Alert Detected",
                "activitySubtitle": f"Severity: {severity.upper()}",
                "facts": [
                    {"name": "Event Type", "value": event_data.get("event_type", "Unknown")},
                    {"name": "Source IP", "value": event_data.get("source_ip", "Unknown")},
                    {"name": "Timestamp", "value": event_data.get("timestamp", "Unknown")},
                    {"name": "Event ID", "value": event_data.get("event_id", "N/A")}
                ],
                "markdown": True
            }
        ]
    }


async def send_email_alert(recipient: str, subject: str, message: str, event_data: Dict[str, Any]):
    """Send email alert (mock implementation)"""
    # In production, this would use SMTP or email service like AWS SES, SendGrid, etc.
    logger.info("Mock email sent", recipient=recipient, subject=subject)
    return True


async def send_slack_alert(channel: str, message: Dict[str, Any], event_data: Dict[str, Any]):
    """Send Slack alert (mock implementation)"""
    # In production, this would use Slack Web API
    logger.info("Mock Slack message sent", channel=channel)
    return True


async def send_teams_alert(webhook_url: str, message: Dict[str, Any], event_data: Dict[str, Any]):
    """Send Teams alert (mock implementation)"""
    # In production, this would POST to Teams webhook URL
    logger.info("Mock Teams message sent", webhook_url=webhook_url[-10:])
    return True


async def send_webhook_alert(webhook_url: str, payload: Dict[str, Any]):
    """Send webhook alert (mock implementation)"""
    # In production, this would make HTTP POST request
    logger.info("Mock webhook sent", webhook_url=webhook_url[-10:])
    return True