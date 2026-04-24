"""
NodeGuard AI Security Platform - Export Routes
CSV and PDF export endpoints for incidents and threat intelligence
"""

import csv
import io
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from starlette.responses import StreamingResponse
from typing import List, Dict, Any
import structlog
from ..services.database import get_database_service

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("/csv/incidents")
async def export_incidents_csv():
    """Export all incidents as CSV"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            query = """
                SELECT
                    id,
                    event_type,
                    description,
                    severity,
                    status,
                    source_ip,
                    destination_ip,
                    user_id,
                    endpoint,
                    ml_score,
                    created_at,
                    updated_at,
                    assigned_to
                FROM security.events
                ORDER BY created_at DESC
            """
            rows = await conn.fetch(query)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "id", "event_type", "description", "severity", "status",
            "source_ip", "destination_ip", "user_id", "endpoint",
            "ml_score", "created_at", "updated_at", "assigned_to"
        ])
        for row in rows:
            writer.writerow([
                str(row['id']),
                row['event_type'],
                row['description'],
                row['severity'],
                row['status'],
                str(row['source_ip']) if row['source_ip'] else "",
                str(row['destination_ip']) if row['destination_ip'] else "",
                row['user_id'] or "",
                row['endpoint'] or "",
                float(row['ml_score']) if row['ml_score'] else "",
                row['created_at'].isoformat() + 'Z' if row['created_at'] else "",
                row['updated_at'].isoformat() + 'Z' if row['updated_at'] else "",
                str(row['assigned_to']) if row['assigned_to'] else ""
            ])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=incidents_export.csv"}
        )

    except Exception as e:
        logger.error("Error exporting incidents CSV", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to export incidents as CSV")


@router.get("/csv/threat-intel")
async def export_threat_intel_csv():
    """Export all threat intelligence as CSV"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            query = """
                SELECT
                    id,
                    indicator_type,
                    indicator_value,
                    threat_type,
                    confidence_score,
                    source,
                    description,
                    first_seen,
                    last_seen,
                    is_active,
                    created_at
                FROM security.threat_intel
                ORDER BY confidence_score DESC, last_seen DESC
            """
            rows = await conn.fetch(query)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "id", "indicator_type", "indicator_value", "threat_type",
            "confidence_score", "source", "description", "first_seen",
            "last_seen", "is_active", "created_at"
        ])
        for row in rows:
            writer.writerow([
                str(row['id']),
                row['indicator_type'],
                row['indicator_value'],
                row['threat_type'],
                float(row['confidence_score']),
                row['source'],
                row['description'],
                row['first_seen'].isoformat() + 'Z' if row['first_seen'] else "",
                row['last_seen'].isoformat() + 'Z' if row['last_seen'] else "",
                row['is_active'],
                row['created_at'].isoformat() + 'Z' if row['created_at'] else ""
            ])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=threat_intel_export.csv"}
        )

    except Exception as e:
        logger.error("Error exporting threat intel CSV", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to export threat intel as CSV")


@router.get("/pdf/incidents")
async def export_incidents_pdf():
    """Export incidents as PDF"""
    try:
        from reportlab.lib.pagesizes import letter, landscape
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="PDF export requires reportlab. Install it with: pip install reportlab>=4.0.0"
        )

    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            query = """
                SELECT
                    id, event_type, description, severity, status,
                    source_ip, user_id, ml_score, created_at
                FROM security.events
                ORDER BY created_at DESC
            """
            rows = await conn.fetch(query)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
        styles = getSampleStyleSheet()
        elements = []

        # Title
        elements.append(Paragraph("NodeGuard AI - Incidents Report", styles['Title']))
        elements.append(Spacer(1, 0.25 * inch))

        # Table data
        table_data = [["ID", "Type", "Severity", "Status", "Source IP", "User", "ML Score", "Created"]]
        for row in rows:
            table_data.append([
                str(row['id'])[:8],
                row['event_type'],
                row['severity'],
                row['status'],
                str(row['source_ip']) if row['source_ip'] else "N/A",
                row['user_id'] or "N/A",
                f"{float(row['ml_score']):.2f}" if row['ml_score'] else "N/A",
                row['created_at'].strftime("%Y-%m-%d %H:%M") if row['created_at'] else "N/A"
            ])

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a237e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5f5f5')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(table)

        doc.build(elements)
        buffer.seek(0)

        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=incidents_report.pdf"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error exporting incidents PDF", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to export incidents as PDF")


@router.get("/pdf/threat-intel")
async def export_threat_intel_pdf():
    """Export threat intelligence as PDF"""
    try:
        from reportlab.lib.pagesizes import letter, landscape
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="PDF export requires reportlab. Install it with: pip install reportlab>=4.0.0"
        )

    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            query = """
                SELECT
                    id, indicator_type, indicator_value, threat_type,
                    confidence_score, source, description, is_active, last_seen
                FROM security.threat_intel
                ORDER BY confidence_score DESC, last_seen DESC
            """
            rows = await conn.fetch(query)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
        styles = getSampleStyleSheet()
        elements = []

        # Title
        elements.append(Paragraph("NodeGuard AI - Threat Intelligence Report", styles['Title']))
        elements.append(Spacer(1, 0.25 * inch))

        # Table data
        table_data = [["ID", "Type", "Value", "Threat", "Confidence", "Source", "Active", "Last Seen"]]
        for row in rows:
            table_data.append([
                str(row['id'])[:8],
                row['indicator_type'],
                row['indicator_value'][:30],
                row['threat_type'],
                f"{float(row['confidence_score']):.2f}",
                row['source'],
                "Yes" if row['is_active'] else "No",
                row['last_seen'].strftime("%Y-%m-%d %H:%M") if row['last_seen'] else "N/A"
            ])

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a237e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5f5f5')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(table)

        doc.build(elements)
        buffer.seek(0)

        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=threat_intel_report.pdf"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error exporting threat intel PDF", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to export threat intel as PDF")
