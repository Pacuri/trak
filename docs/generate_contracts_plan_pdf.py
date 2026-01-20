#!/usr/bin/env python3
"""
Generate PDF for Contracts Implementation Plan
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# Colors
PRIMARY_COLOR = HexColor('#1e40af')  # Blue
SECONDARY_COLOR = HexColor('#3b82f6')  # Lighter blue
SUCCESS_COLOR = HexColor('#16a34a')  # Green
WARNING_COLOR = HexColor('#dc2626')  # Red
GRAY_COLOR = HexColor('#6b7280')
LIGHT_GRAY = HexColor('#f3f4f6')
DARK_COLOR = HexColor('#1f2937')

def create_styles():
    """Create custom paragraph styles"""
    styles = getSampleStyleSheet()

    # Title
    styles.add(ParagraphStyle(
        name='DocTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=PRIMARY_COLOR,
        spaceAfter=20,
        alignment=TA_CENTER,
    ))

    # Subtitle
    styles.add(ParagraphStyle(
        name='DocSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=GRAY_COLOR,
        spaceAfter=30,
        alignment=TA_CENTER,
    ))

    # Section Header
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=PRIMARY_COLOR,
        spaceBefore=20,
        spaceAfter=12,
        borderPadding=5,
    ))

    # Subsection Header
    styles.add(ParagraphStyle(
        name='SubsectionHeader',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=DARK_COLOR,
        spaceBefore=15,
        spaceAfter=8,
    ))

    # Body text
    styles.add(ParagraphStyle(
        name='DocBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_COLOR,
        spaceAfter=8,
        alignment=TA_JUSTIFY,
        leading=14,
    ))

    # Bullet item
    styles.add(ParagraphStyle(
        name='BulletItem',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_COLOR,
        leftIndent=15,
        spaceAfter=4,
    ))

    # Code/Technical
    styles.add(ParagraphStyle(
        name='CodeBlock',
        parent=styles['Normal'],
        fontSize=8,
        fontName='Courier',
        textColor=DARK_COLOR,
        backColor=LIGHT_GRAY,
        leftIndent=10,
        rightIndent=10,
        spaceAfter=8,
    ))

    # Table header
    styles.add(ParagraphStyle(
        name='TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        textColor=white,
        alignment=TA_CENTER,
    ))

    # Table cell
    styles.add(ParagraphStyle(
        name='TableCell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=DARK_COLOR,
    ))

    return styles


def create_table(data, col_widths=None, header=True):
    """Create a styled table"""
    table = Table(data, colWidths=col_widths)

    style_commands = [
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_COLOR),
    ]

    if header:
        style_commands.extend([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ])

        # Alternate row colors for body
        for i in range(1, len(data)):
            if i % 2 == 0:
                style_commands.append(('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY))

    table.setStyle(TableStyle(style_commands))
    return table


def build_document():
    """Build the PDF document"""
    output_path = '/sessions/festive-determined-knuth/mnt/Trak/docs/Contracts-Implementation-Plan.pdf'

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    styles = create_styles()
    story = []

    # =====================================================
    # TITLE PAGE
    # =====================================================
    story.append(Spacer(1, 3*cm))
    story.append(Paragraph("TRAK", styles['DocTitle']))
    story.append(Paragraph("Contracts Implementation Plan", styles['DocTitle']))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("Ugovori Module - Complete Technical Specification", styles['DocSubtitle']))
    story.append(Spacer(1, 2*cm))

    # Status box
    status_data = [
        ['Status', 'FINAL - Ready for Implementation'],
        ['Version', '2.0'],
        ['Date', 'January 2026'],
        ['Based On', 'AgTravelSoft Analysis + My Travel Contract Example'],
    ]
    status_table = create_table(status_data, col_widths=[4*cm, 10*cm], header=False)
    story.append(status_table)

    story.append(PageBreak())

    # =====================================================
    # TABLE OF CONTENTS
    # =====================================================
    story.append(Paragraph("Table of Contents", styles['SectionHeader']))

    toc_items = [
        "1. Executive Summary",
        "2. Business Requirements",
        "3. Package Ownership Model",
        "4. Contract Types & Flows",
        "5. Database Schema",
        "6. Contract Numbering",
        "7. Pricing & Currency",
        "8. Payment Tracking",
        "9. Contract Amendments (Anex)",
        "10. Document Templates",
        "11. UI Components",
        "12. Implementation Phases",
        "13. Technical Specifications",
    ]

    for item in toc_items:
        story.append(Paragraph(item, styles['BulletItem']))

    story.append(PageBreak())

    # =====================================================
    # EXECUTIVE SUMMARY
    # =====================================================
    story.append(Paragraph("1. Executive Summary", styles['SectionHeader']))

    story.append(Paragraph("What We're Building", styles['SubsectionHeader']))
    story.append(Paragraph(
        "A complete contract management system that:",
        styles['DocBody']
    ))

    features = [
        "Generates legally compliant travel contracts (Ugovori) for Serbian/BiH/Croatian markets",
        "Supports both direct sales (vlastiti paketi) and subagent resales (tudji paketi)",
        "Tracks payments linked to contracts with deposit/balance workflow",
        "Produces PDF documents matching legal requirements",
        "Auto-generates contracts with zero manual input when data is complete",
    ]
    for f in features:
        story.append(Paragraph(f"• {f}", styles['BulletItem']))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Key Decisions Made", styles['SubsectionHeader']))

    decisions_data = [
        ['Decision', 'Choice'],
        ['Package Ownership', 'Toggle: Vlastiti (own) vs Tudji (external)'],
        ['External Organizer', 'Free text with legal warning (not all in Trak)'],
        ['Contract Types', 'B2C (customer) + B2B (agency-to-agency)'],
        ['Contract Numbering', 'Separate sequences: 1/2026 (B2C), B-1/2026 (B2B)'],
        ['Currency', "Based on organization's operating country"],
        ['Pricing Model', 'Wholesale + Margin % = Retail (per-package)'],
        ['Capacity Deduction', 'On B2B confirmation, or B2C creation if no B2B'],
        ['Payment Tracking', 'Linked to contracts (not separate module)'],
        ['Signatures', 'Print & sign (MVP), digital signature (future)'],
        ['Amendments', 'Anex ugovora system (legal paper trail)'],
        ['Templates', 'Hybrid: locked legal structure + customizable branding'],
    ]
    story.append(create_table(decisions_data, col_widths=[5*cm, 11*cm]))

    story.append(PageBreak())

    # =====================================================
    # BUSINESS REQUIREMENTS
    # =====================================================
    story.append(Paragraph("2. Business Requirements", styles['SectionHeader']))

    story.append(Paragraph("Three-Party Structure", styles['SubsectionHeader']))
    story.append(Paragraph(
        "Every travel contract involves up to three parties:",
        styles['DocBody']
    ))

    parties_data = [
        ['Party', 'Role', 'Responsibilities'],
        ['ORGANIZATOR\n(Tour Operator)', 'Creates packages', 'Sets wholesale price, confirms bookings'],
        ['SUBAGENT\n(Selling Agency)', 'Sells to customers', 'Adds margin, issues contracts, collects payments'],
        ['NOSILAC\n(Contract Holder)', 'Signs contract', 'Makes payments, travels with saputnici'],
    ]
    story.append(create_table(parties_data, col_widths=[4*cm, 4*cm, 8*cm]))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Two Sales Scenarios", styles['SubsectionHeader']))

    story.append(Paragraph("<b>Scenario 1: Own Package (Vlastiti)</b>", styles['DocBody']))
    story.append(Paragraph("• Agency IS the tour operator", styles['BulletItem']))
    story.append(Paragraph("• Single contract: Agency -> Customer", styles['BulletItem']))
    story.append(Paragraph("• Agency keeps 100% of revenue", styles['BulletItem']))

    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("<b>Scenario 2: External Package (Tudji)</b>", styles['DocBody']))
    story.append(Paragraph("• Agency is reselling another operator's package", styles['BulletItem']))
    story.append(Paragraph("• Two linked contracts:", styles['BulletItem']))
    story.append(Paragraph("  - B2B: Organizer -> Subagent (wholesale price)", styles['BulletItem']))
    story.append(Paragraph("  - B2C: Subagent -> Customer (retail price)", styles['BulletItem']))
    story.append(Paragraph("• Subagent keeps the margin", styles['BulletItem']))

    story.append(PageBreak())

    # =====================================================
    # PACKAGE OWNERSHIP MODEL
    # =====================================================
    story.append(Paragraph("3. Package Ownership Model", styles['SectionHeader']))

    story.append(Paragraph(
        "When creating/editing a package, agents must specify ownership via a toggle:",
        styles['DocBody']
    ))

    story.append(Paragraph("<b>Vlastiti paket</b> - Your agency is the tour operator", styles['BulletItem']))
    story.append(Paragraph("<b>Tudji paket (preprodaja)</b> - Selling another operator's package", styles['BulletItem']))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("When 'Tudji paket' is Selected", styles['SubsectionHeader']))

    story.append(Paragraph(
        "<font color='red'><b>LEGAL WARNING:</b></font> The external organizer name field displays a prominent warning: "
        "'Enter the EXACT LEGAL NAME of the tour operator as registered. Incorrect name may cause an INVALID CONTRACT and legal problems.'",
        styles['DocBody']
    ))

    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("Pricing Fields for Resale:", styles['DocBody']))
    pricing_fields = [
        ['Field', 'Description', 'Example'],
        ['Nabavna cijena', 'Wholesale price from organizer', '450.00 EUR'],
        ['Vasa marza (%)', 'Your markup percentage', '12%'],
        ['Prodajna cijena', 'Auto-calculated retail price', '504.00 EUR'],
        ['Vasa zarada', 'Your profit per person', '54.00 EUR'],
    ]
    story.append(create_table(pricing_fields, col_widths=[4*cm, 7*cm, 5*cm]))

    story.append(PageBreak())

    # =====================================================
    # CONTRACT TYPES & FLOWS
    # =====================================================
    story.append(Paragraph("4. Contract Types & Flows", styles['SectionHeader']))

    story.append(Paragraph("Contract Type Definitions", styles['SubsectionHeader']))

    contract_types = [
        ['Type', 'Code', 'Numbering', 'Purpose'],
        ['Customer Contract', 'B2C', '1/2026, 2/2026...', 'Agency -> Customer'],
        ['Agency Contract', 'B2B', 'B-1/2026, B-2/2026...', 'Organizer -> Subagent'],
        ['Amendment', 'ANEX', 'Anex #1 uz Ugovor 5/2026', 'Changes to existing contract'],
    ]
    story.append(create_table(contract_types, col_widths=[4*cm, 2.5*cm, 5*cm, 4.5*cm]))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Contract Status Flow", styles['SubsectionHeader']))

    statuses = [
        ['Status', 'Serbian', 'Description'],
        ['draft', 'priprema', 'Contract being prepared, not yet sent'],
        ['sent', 'poslano', 'Sent to customer, awaiting signature'],
        ['signed', 'potpisano', 'Customer signed, deposit received'],
        ['completed', 'zavrseno', 'Travel completed, fully paid'],
        ['cancelled', 'storno', 'Cancelled before travel'],
        ['rejected', 'odbijeno', 'B2B only: Organizer rejected booking'],
    ]
    story.append(create_table(statuses, col_widths=[3*cm, 3*cm, 10*cm]))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Document Visibility Rules", styles['SubsectionHeader']))

    visibility = [
        ['Document', 'Organizer Sees', 'Subagent Sees', 'Customer Sees'],
        ['B2B Contract', 'Wholesale price', 'Wholesale price', 'Never'],
        ['B2C Contract', 'Never', 'Full document', 'Full document'],
        ['Customer Contract Header', '-', 'Listed as Subagent', 'Both agencies listed'],
    ]
    story.append(create_table(visibility, col_widths=[4*cm, 4*cm, 4*cm, 4*cm]))

    story.append(PageBreak())

    # =====================================================
    # DATABASE SCHEMA
    # =====================================================
    story.append(Paragraph("5. Database Schema", styles['SectionHeader']))

    story.append(Paragraph("Core Tables", styles['SubsectionHeader']))

    tables_overview = [
        ['Table', 'Purpose', 'Key Fields'],
        ['contracts', 'Main contract records', 'contract_number, customer_id, package_id, total_amount, status'],
        ['contract_passengers', 'Travelers on contract', 'contract_id, first_name, last_name, is_lead, passenger_type'],
        ['contract_services', 'Line items/pricing', 'contract_id, service_type, description, quantity, total_price'],
        ['contract_payments', 'Payment records', 'contract_id, payment_date, amount, payment_method, status'],
        ['contract_amendments', 'Anex records', 'contract_id, amendment_number, change_type, price_difference'],
        ['customers', 'Customer database', 'first_name, last_name, phone, email, total_contracts'],
    ]
    story.append(create_table(tables_overview, col_widths=[4*cm, 4*cm, 8*cm]))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Package Ownership Fields (to add)", styles['SubsectionHeader']))

    pkg_fields = [
        ['Field', 'Type', 'Description'],
        ['ownership_type', "TEXT ('own', 'resale')", 'Whether package is vlastiti or tudji'],
        ['external_organizer_name', 'TEXT', 'LEGAL REQUIREMENT: Exact name of tour operator'],
        ['wholesale_price', 'DECIMAL(10,2)', 'Price agency pays to organizer'],
        ['margin_percent', 'DECIMAL(5,2)', 'Agency markup percentage'],
    ]
    story.append(create_table(pkg_fields, col_widths=[5*cm, 4.5*cm, 6.5*cm]))

    story.append(PageBreak())

    # =====================================================
    # CONTRACT NUMBERING
    # =====================================================
    story.append(Paragraph("6. Contract Numbering", styles['SectionHeader']))

    story.append(Paragraph(
        "B2C and B2B contracts use separate numbering sequences:",
        styles['DocBody']
    ))

    numbering = [
        ['Type', 'Format', 'Examples'],
        ['B2C (Customer)', 'number / year', '1 / 2026, 2 / 2026, 3 / 2026...'],
        ['B2B (Agency)', 'B-number / year', 'B-1 / 2026, B-2 / 2026, B-3 / 2026...'],
        ['Amendment', 'Anex #N uz Ugovor X/Y', 'Anex #1 uz Ugovor 15 / 2026'],
    ]
    story.append(create_table(numbering, col_widths=[4*cm, 4*cm, 8*cm]))

    story.append(PageBreak())

    # =====================================================
    # PRICING & CURRENCY
    # =====================================================
    story.append(Paragraph("7. Pricing & Currency", styles['SectionHeader']))

    story.append(Paragraph("Currency by Country", styles['SubsectionHeader']))

    currencies = [
        ['Country', 'Currency Code', 'Symbol'],
        ['Bosnia & Herzegovina (ba)', 'BAM', 'KM'],
        ['Serbia (rs)', 'RSD', 'RSD'],
        ['Croatia (hr)', 'EUR', '\u20ac'],
        ['Montenegro (me)', 'EUR', '\u20ac'],
    ]
    story.append(create_table(currencies, col_widths=[6*cm, 5*cm, 5*cm]))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Resale Pricing Formula", styles['SubsectionHeader']))
    story.append(Paragraph(
        "<b>Retail Price = Wholesale Price x (1 + Margin% / 100)</b>",
        styles['DocBody']
    ))
    story.append(Paragraph(
        "Example: Wholesale 450 EUR + 12% margin = 504 EUR retail (54 EUR profit)",
        styles['DocBody']
    ))

    story.append(PageBreak())

    # =====================================================
    # PAYMENT TRACKING
    # =====================================================
    story.append(Paragraph("8. Payment Tracking", styles['SectionHeader']))

    story.append(Paragraph(
        "Payments are linked directly to contracts with deposit/balance tracking:",
        styles['DocBody']
    ))

    payment_flow = [
        ['Step', 'Action', 'Result'],
        ['1', 'Contract Created', 'Deposit due (30% default)'],
        ['2', 'Deposit Paid', 'Status: draft -> signed'],
        ['3', 'Balance Due', '7-14 days before departure'],
        ['4', 'Fully Paid', 'amount_remaining = 0'],
        ['5', 'Travel Complete', 'Status: signed -> completed'],
    ]
    story.append(create_table(payment_flow, col_widths=[2*cm, 5*cm, 9*cm]))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Payment Methods", styles['SubsectionHeader']))

    methods = [
        ['Code', 'Serbian', 'English'],
        ['cash', 'gotovina', 'Cash'],
        ['bank_transfer', 'uplata na racun', 'Bank Transfer'],
        ['card', 'kartica', 'Card'],
        ['online', 'online placanje', 'Online Payment'],
    ]
    story.append(create_table(methods, col_widths=[4*cm, 6*cm, 6*cm]))

    story.append(PageBreak())

    # =====================================================
    # CONTRACT AMENDMENTS
    # =====================================================
    story.append(Paragraph("9. Contract Amendments (Anex)", styles['SectionHeader']))

    story.append(Paragraph(
        "Following the AgTravelSoft model, contract changes are documented via Anex (amendments):",
        styles['DocBody']
    ))

    anex_rules = [
        ['Change Type', 'Requires Anex?', 'Example'],
        ['Date change', 'Yes', 'Moving from July 15 to July 22'],
        ['Add passenger', 'Yes', 'Adding a child to booking'],
        ['Remove passenger', 'Yes', 'One person cannot travel'],
        ['Room upgrade', 'Yes', 'Standard -> Sea View'],
        ['Price correction', 'Yes', 'Error in original calculation'],
        ['Contact info update', 'No', 'New phone number'],
        ['Internal notes', 'No', 'Agent notes'],
    ]
    story.append(create_table(anex_rules, col_widths=[4*cm, 3*cm, 9*cm]))

    story.append(PageBreak())

    # =====================================================
    # DOCUMENT TEMPLATES
    # =====================================================
    story.append(Paragraph("10. Document Templates", styles['SectionHeader']))

    story.append(Paragraph("Hybrid Template System", styles['SubsectionHeader']))

    story.append(Paragraph("<b>Locked Legal Structure (cannot be modified):</b>", styles['DocBody']))
    locked_elements = [
        "Contract header with number and date",
        "Three-party information section",
        "Passengers table",
        "Accommodation details",
        "Services/pricing table",
        "Financial summary",
        "Payment specification",
        "Terms and conditions footer",
        "Signature section",
    ]
    for elem in locked_elements:
        story.append(Paragraph(f"• {elem}", styles['BulletItem']))

    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("<b>Customizable Elements:</b>", styles['DocBody']))
    custom_elements = [
        "Agency logo",
        "Header colors/styling",
        "Contact information layout",
        "Additional terms section (can add, not remove required parts)",
        "Footer notes",
        "Font preferences (within approved set)",
    ]
    for elem in custom_elements:
        story.append(Paragraph(f"• {elem}", styles['BulletItem']))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Required Documents", styles['SubsectionHeader']))

    docs = [
        ['Document', 'Serbian Name', 'When Generated', 'Purpose'],
        ['Contract', 'Ugovor', 'On creation', 'Legal agreement with customer'],
        ['B2B Contract', 'TRGO Ugovor', 'For resale packages', 'Agreement with organizer'],
        ['Amendment', 'Anex', 'On changes', 'Document changes to contract'],
        ['Pro-forma Invoice', 'Profaktura', 'For deposit', 'Request advance payment'],
        ['Invoice', 'Faktura', 'After payment', 'Tax document'],
        ['Voucher', 'Vaucer', 'Before travel', 'Hotel check-in document'],
        ['Confirmation', 'Potvrda rezervacije', 'After deposit', 'Booking confirmation'],
    ]
    story.append(create_table(docs, col_widths=[3.5*cm, 3.5*cm, 3.5*cm, 5.5*cm]))

    story.append(PageBreak())

    # =====================================================
    # UI COMPONENTS
    # =====================================================
    story.append(Paragraph("11. UI Components", styles['SectionHeader']))

    story.append(Paragraph("Pages to Build", styles['SubsectionHeader']))

    pages = [
        ['Page', 'Route', 'Features'],
        ['Contract List', '/dashboard/contracts', 'Filters, search, stats bar, pagination'],
        ['Contract Detail', '/dashboard/contracts/[id]', 'Overview, passengers, services, payments, documents, history tabs'],
        ['New Contract', '/dashboard/contracts/new', 'Wizard: package -> departure -> customer -> passengers -> services -> generate'],
        ['Customer List', '/dashboard/customers', 'Search, filters, customer cards'],
        ['Customer Detail', '/dashboard/customers/[id]', 'Info, contract history, stats'],
    ]
    story.append(create_table(pages, col_widths=[3.5*cm, 5*cm, 7.5*cm]))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Key UI Features", styles['SubsectionHeader']))

    story.append(Paragraph("<b>Auto-generation with Missing Fields Modal:</b>", styles['DocBody']))
    story.append(Paragraph(
        "When generating a contract, if all data is complete, zero manual input required. "
        "If any fields are missing, a modal appears showing only the fields that need to be filled.",
        styles['DocBody']
    ))

    story.append(PageBreak())

    # =====================================================
    # IMPLEMENTATION PHASES
    # =====================================================
    story.append(Paragraph("12. Implementation Phases", styles['SectionHeader']))

    phases = [
        ['Phase', 'Timeline', 'Priority', 'Deliverables'],
        ['1. Database & Core', 'Week 1-2', 'CRITICAL', 'Migration files, TypeScript types, RLS policies'],
        ['2. Customer Management', 'Week 2-3', 'HIGH', 'Customer CRUD, search component, lead conversion'],
        ['3. Contract CRUD', 'Week 3-4', 'HIGH', 'List page, detail page, creation wizard, edit form'],
        ['4. Package Ownership', 'Week 4-5', 'HIGH', 'Vlastiti/tudji toggle, organizer field, B2B contracts'],
        ['5. Payments', 'Week 5-6', 'HIGH', 'Payment recording, status tracking, overdue alerts'],
        ['6. PDF Generation', 'Week 6-7', 'HIGH', 'Contract PDF, B2B PDF, Voucher, Amendment PDFs'],
        ['7. Template Customization', 'Week 7-8', 'MEDIUM', 'Logo upload, colors, additional terms'],
        ['8. Amendments', 'Week 8-9', 'MEDIUM', 'Amendment flow, history view, PDF generation'],
        ['9. Integration & Polish', 'Week 9-10', 'MEDIUM', 'Inquiry integration, dashboard stats, capacity'],
    ]
    story.append(create_table(phases, col_widths=[3.5*cm, 2.5*cm, 2.5*cm, 7.5*cm]))

    story.append(PageBreak())

    # =====================================================
    # TECHNICAL SPECIFICATIONS
    # =====================================================
    story.append(Paragraph("13. Technical Specifications", styles['SectionHeader']))

    story.append(Paragraph("Tech Stack", styles['SubsectionHeader']))

    tech = [
        ['Component', 'Technology'],
        ['Frontend', 'Next.js 14, React, TypeScript'],
        ['UI Components', 'shadcn/ui, Tailwind CSS'],
        ['State Management', 'React Query, Zustand'],
        ['Database', 'Supabase (PostgreSQL)'],
        ['PDF Generation', '@react-pdf/renderer'],
        ['Form Handling', 'React Hook Form, Zod'],
        ['Date Handling', 'date-fns'],
    ]
    story.append(create_table(tech, col_widths=[5*cm, 11*cm]))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Success Metrics", styles['SubsectionHeader']))

    metrics = [
        ['Metric', 'Target'],
        ['Contract creation time', '< 3 minutes (with complete data)'],
        ['Missing field completion', '< 2 minutes additional'],
        ['PDF generation time', '< 5 seconds'],
        ['Payment recording time', '< 30 seconds'],
        ['Amendment creation time', '< 2 minutes'],
    ]
    story.append(create_table(metrics, col_widths=[6*cm, 10*cm]))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Risk Mitigation", styles['SubsectionHeader']))

    risks = [
        ['Risk', 'Mitigation'],
        ['Legal compliance', 'Locked template sections, required fields'],
        ['Data migration', 'Customer import tool from AgTravelSoft'],
        ['Performance', 'Pagination, lazy loading, indexed queries'],
        ['PDF complexity', 'Component-based templates, caching'],
    ]
    story.append(create_table(risks, col_widths=[5*cm, 11*cm]))

    # =====================================================
    # FOOTER
    # =====================================================
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph(
        "<i>Document Version 2.0 | January 2026 | Based on AgTravelSoft analysis and My Travel contract example</i>",
        styles['DocSubtitle']
    ))

    # Build the document
    doc.build(story)
    print(f"PDF generated successfully: {output_path}")
    return output_path


if __name__ == '__main__':
    build_document()
