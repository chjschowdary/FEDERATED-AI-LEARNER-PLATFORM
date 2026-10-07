#!/usr/bin/env python3
"""
FederAI Cloud — Presentation & Reviewer Demo Guide Generator
Generates both:
1. FederAI_Cloud_Reviewer_Demo_Guide.pdf (Comprehensive PDF manual)
2. FederAI_Cloud_Reviewer_Presentation.pptx (Executive slide deck)
"""

import os
import sys

# ReportLab for PDF Generation
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Python-PPTX for PowerPoint Generation
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom Brand Palette
    c_primary = colors.HexColor("#0284c7") # Sky blue
    c_dark = colors.HexColor("#0f172a")    # Slate 900
    c_card = colors.HexColor("#1e293b")    # Slate 800
    c_text = colors.HexColor("#334155")    # Slate 700
    c_accent = colors.HexColor("#10b981")  # Emerald green
    c_danger = colors.HexColor("#ef4444")  # Red
    c_light = colors.HexColor("#f8fafc")   # Off-white

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_dark,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_primary,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=c_dark,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_primary,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_text,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"),
        borderPadding=6,
        spaceAfter=6
    )

    story = []

    # Title Banner
    story.append(Paragraph("FederAI Cloud — Reviewer Demo & Technical Guide", title_style))
    story.append(Paragraph("A Cloud-Native, Secure and Privacy-Preserving Infrastructure for Federated AI", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_primary, spaceBefore=0, spaceAfter=12))

    # Section 1: Executive Overview
    story.append(Paragraph("1. Executive Summary & Problem Solved", h1_style))
    story.append(Paragraph(
        "<b>Core Challenge:</b> Traditional centralized Machine Learning requires aggregating patient health records into a central server. In healthcare and finance, this violates regulatory privacy mandates (HIPAA, GDPR) and introduces massive data leak liabilities.",
        body_style
    ))
    story.append(Paragraph(
        "<b>The FederAI Cloud Solution:</b> <i>'Train Together. Share Intelligence, Not Data.'</i><br/>"
        "The model architecture travels to edge hospital nodes. Hospitals compute local weight gradients on private data. "
        "Gradients pass through Differential Privacy (DP-SGD) noise injection, Directional Cosine alignment verification, "
        "and Statistical L2-Norm Z-score filtering before being aggregated into a Byzantine-resilient global clinical risk model.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Section 2: Step-by-Step Demo Procedure
    story.append(Paragraph("2. Step-by-Step Reviewer Demonstration Script", h1_style))
    
    demo_steps = [
        ("Step 1: Open the Control Plane", "Navigate browser to <b>http://localhost</b> (Port 80). Show the live glassmorphism HUD, Active Clients (5), Global Accuracy (50.0%), and nominal status. Point out the zero-data-leakage architecture."),
        ("Step 2: Inspect 5 Hospital Nodes", "Click <b>Federation Map & Nodes</b> tab. Point out 5 medical centers (Mount Sinai NY, Mayo Clinic, Stanford, Johns Hopkins, Cleveland Clinic) with independent non-IID clinical risk datasets and initial trust scores."),
        ("Step 3: Run Honest Federated Training", "Go to <b>Training Controls</b>. Set Target Rounds = 5, Strategy = FedAvg, DP = Enabled (&epsilon;=1.0, &delta;=10⁻⁵). Click <b>Launch Federation Round</b>. Watch the WebSocket state machine transition through Dispatch &rarr; Train &rarr; DP &rarr; Threat Scan &rarr; Aggregate. Show validation accuracy climbing to ~80-85%."),
        ("Step 4: Byzantine Threat Chaos Injection", "Under <b>Training Controls</b>, toggle <i>Adversarial Attack Simulation</i> to <b>ON</b>. Select <b>Sign-Flipping Gradient Inversion</b> or <b>Gradient Scaling (20x)</b>. Click <b>Launch Federation Round</b>."),
        ("Step 5: Show Live Byzantine Defense", "Show Hospital Delta turning <b>BRIGHT RED</b> in quarantine. Switch to <b>Security Center</b> tab: show the Directional Cosine Anomaly check (&lt; 0.0) or Norm Z-Score (&gt; 3.0), and the Bayesian Trust score penalty. Emphasize that global model accuracy was protected because the poisoned gradient was discarded!"),
        ("Step 6: Zero-Downtime Model Rollback", "Go to <b>Model Registry</b> tab. Show immutable S3/SeaweedFS model checkpoints (v1, v2). Click <b>Rollback</b> on model-clinical-v1 to demonstrate instant production rollbacks."),
        ("Step 7: Cloud Telemetry & Cost Modeling", "Go to <b>Infrastructure</b> and <b>Cost Estimator</b> tabs to review live Prometheus metrics, Grafana observability, and AWS monthly cost breakdowns across EKS, RDS Multi-AZ, and S3.")
    ]

    for step_title, step_desc in demo_steps:
        story.append(Paragraph(f"<b>{step_title}</b>", h2_style))
        story.append(Paragraph(step_desc, bullet_style))

    story.append(Spacer(1, 10))

    # Section 3: Tools & Tech Stack Table
    story.append(Paragraph("3. Technologies & Tools Used in FederAI Cloud", h1_style))
    story.append(Paragraph("Below is the complete engineering matrix of every technology used and its specific architectural purpose:", body_style))

    tech_table_data = [
        [Paragraph("<b>Component / Tool</b>", body_style), Paragraph("<b>Category</b>", body_style), Paragraph("<b>Exact Architectural Role in FederAI Cloud</b>", body_style)],
        [Paragraph("<b>Python 3.11 & NumPy</b>", body_style), Paragraph("Machine Learning", body_style), Paragraph("Core mathematical engine: ClinicalRiskMLP neural network forward/backward pass, SGD optimizer, gradient clipping.", body_style)],
        [Paragraph("<b>Differential Privacy (DP-SGD)</b>", body_style), Paragraph("Cybersecurity / AI", body_style), Paragraph("Gaussian & Laplace noise perturbation, L2 gradient clipping (C=1.0), Moments Accountant tracking.", body_style)],
        [Paragraph("<b>FastAPI & Uvicorn</b>", body_style), Paragraph("Backend Gateway", body_style), Paragraph("Asynchronous REST API Gateway, WebSocket live event dispatcher, JWT auth, RBAC permissions, /metrics endpoint.", body_style)],
        [Paragraph("<b>PostgreSQL 16 & SQLAlchemy</b>", body_style), Paragraph("Relational Database", body_style), Paragraph("Multi-tenant persistence for organizations, client nodes, sessions, training rounds, audit logs, and security events.", body_style)],
        [Paragraph("<b>SeaweedFS / AWS S3</b>", body_style), Paragraph("Object Storage", body_style), Paragraph("S3-compatible object storage for immutable binary model checkpoints (v1, v2), gradient tensors, and instant rollbacks.", body_style)],
        [Paragraph("<b>RabbitMQ 3.12</b>", body_style), Paragraph("Message Broker", body_style), Paragraph("AMQP async event broker for coordinating distributed round dispatch and aggregation worker synchronization.", body_style)],
        [Paragraph("<b>Prometheus & Grafana</b>", body_style), Paragraph("Observability", body_style), Paragraph("Time-series metrics scraping from FastAPI and real-time visualization dashboards for ML convergence and server health.", body_style)],
        [Paragraph("<b>Docker & Compose</b>", body_style), Paragraph("DevOps Containerization", body_style), Paragraph("Multi-stage container builds and single-command local cloud orchestration with automated healthchecks.", body_style)],
        [Paragraph("<b>Kubernetes (EKS) & HPA</b>", body_style), Paragraph("Cloud Orchestration", body_style), Paragraph("Declarative manifests, Horizontal Pod Autoscalers (70% CPU/RAM), Ingress routing, StatefulSets, and PVC storage.", body_style)],
        [Paragraph("<b>Terraform (AWS)</b>", body_style), Paragraph("Infrastructure as Code", body_style), Paragraph("Modular AWS cloud infrastructure: Multi-AZ VPC, EKS Managed Node Groups, RDS Multi-AZ PostgreSQL, KMS S3, ALB.", body_style)],
        [Paragraph("<b>HTML5 / CSS3 / ES Modules</b>", body_style), Paragraph("Frontend SPA", body_style), Paragraph("Custom dark glassmorphism Command Center SPA with zero heavyweight frameworks, live WebSockets, and chart canvas.", body_style)]
    ]

    t = Table(tech_table_data, colWidths=[120, 95, 325])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    story.append(PageBreak())

    # Section 4: Comprehensive Button & Input Guide
    story.append(Paragraph("4. Comprehensive Guide to Every Button & Input in the UI", h1_style))
    story.append(Paragraph("This reference explains the precise functionality of every interactive element across all screens:", body_style))

    button_table_data = [
        [Paragraph("<b>UI Location</b>", body_style), Paragraph("<b>Button / Input Control</b>", body_style), Paragraph("<b>Exact Functional Action & Backend Effect</b>", body_style)],
        
        # Navigation
        [Paragraph("<b>Sidebar</b>", body_style), Paragraph("<b>Command Center Tab</b>", body_style), Paragraph("Switches to the main executive overview HUD, active session status, convergence trends, and quick action cards.", body_style)],
        [Paragraph("<b>Sidebar</b>", body_style), Paragraph("<b>Federation Map Tab</b>", body_style), Paragraph("Displays the 5 hospital geographic nodes, individual client status badges, dataset sizes, and Bayesian trust scores.", body_style)],
        [Paragraph("<b>Sidebar</b>", body_style), Paragraph("<b>Training Controls Tab</b>", body_style), Paragraph("Opens round orchestrator configuration, strategy selection, Differential Privacy parameters, and attack injectors.", body_style)],
        [Paragraph("<b>Sidebar</b>", body_style), Paragraph("<b>Model Registry Tab</b>", body_style), Paragraph("Lists all immutable global model versions in S3 storage with accuracy scores, validation loss, and rollback buttons.", body_style)],
        [Paragraph("<b>Sidebar</b>", body_style), Paragraph("<b>Security Center Tab</b>", body_style), Paragraph("Displays Byzantine threat detection logs, directional cosine similarity scores, norm Z-scores, and quarantine events.", body_style)],
        [Paragraph("<b>Sidebar</b>", body_style), Paragraph("<b>Infrastructure Tab</b>", body_style), Paragraph("Shows real-time CPU, RAM, Network I/O, database latency, and replica counts for all 7 platform microservices.", body_style)],
        [Paragraph("<b>Sidebar</b>", body_style), Paragraph("<b>Cost Estimator Tab</b>", body_style), Paragraph("Provides dynamic AWS infrastructure cost calculators based on node cluster sizes and training frequency.", body_style)],
        [Paragraph("<b>Sidebar</b>", body_style), Paragraph("<b>Viva & Reviewer FAQ</b>", body_style), Paragraph("Opens the interactive academic examiner question-and-answer guide with formal mathematical definitions.", body_style)],
        
        # Header
        [Paragraph("<b>Top Header</b>", body_style), Paragraph("<b>Start Training Button</b>", body_style), Paragraph("Sends <code>POST /api/federation/start</code> to trigger the next federated training round across all active clients.", body_style)],
        [Paragraph("<b>Top Header</b>", body_style), Paragraph("<b>Reset Session Button</b>", body_style), Paragraph("Sends <code>POST /api/federation/reset</code> to reset training session back to Round 0 and baseline model v1.", body_style)],
        [Paragraph("<b>Top Header</b>", body_style), Paragraph("<b>Telemetry Badges</b>", body_style), Paragraph("Live WebSocket indicators showing active round count, global accuracy, convergence loss, and privacy budget spent.", body_style)],
        
        # Training Controls
        [Paragraph("<b>Training Controls</b>", body_style), Paragraph("<b>Target Rounds Input</b>", body_style), Paragraph("Sets maximum number of iterative federated rounds to execute (default: 20 rounds).", body_style)],
        [Paragraph("<b>Training Controls</b>", body_style), Paragraph("<b>Target Accuracy Input</b>", body_style), Paragraph("Defines target validation accuracy threshold (e.g. 0.88) at which training will automatically complete.", body_style)],
        [Paragraph("<b>Training Controls</b>", body_style), Paragraph("<b>Strategy Dropdown</b>", body_style), Paragraph("Selects aggregation algorithm: <b>FedAvg</b> (sample-weighted), <b>Trimmed Mean</b> (coordinate-trimmed), or <b>Multi-Krum</b> (distance-based).", body_style)],
        [Paragraph("<b>Training Controls</b>", body_style), Paragraph("<b>DP Epsilon (&epsilon;) Input</b>", body_style), Paragraph("Sets Differential Privacy budget parameter (e.g. 1.0). Smaller values inject more noise for stronger privacy.", body_style)],
        [Paragraph("<b>Training Controls</b>", body_style), Paragraph("<b>Attack Toggle Switch</b>", body_style), Paragraph("Enables simulation of Byzantine adversarial behaviors from Hospital Delta during the upcoming round.", body_style)],
        [Paragraph("<b>Training Controls</b>", body_style), Paragraph("<b>Attack Vector Dropdown</b>", body_style), Paragraph("Selects specific threat mode: <b>Sign-Flipping</b>, <b>Gradient Scaling (20x)</b>, <b>Random Noise</b>, or <b>Label Flipping</b>.", body_style)],
        [Paragraph("<b>Training Controls</b>", body_style), Paragraph("<b>Launch Round Button</b>", body_style), Paragraph("Executes a discrete training round synchronously, displaying live step tracker progress (1 through 5).", body_style)],
        
        # Federation Map & Client Details
        [Paragraph("<b>Federation Map</b>", body_style), Paragraph("<b>Node Cards (Hospital Alpha-Epsilon)</b>", body_style), Paragraph("Clicking any hospital card opens the deep-dive node inspector showing IP address, EHR cohort size, and trust history.", body_style)],
        [Paragraph("<b>Federation Map</b>", body_style), Paragraph("<b>Unquarantine Button</b>", body_style), Paragraph("Sends <code>POST /api/clients/{id}/unquarantine</code> to restore a quarantined node after manual security review.", body_style)],
        
        # Model Registry
        [Paragraph("<b>Model Registry</b>", body_style), Paragraph("<b>Rollback Button</b>", body_style), Paragraph("Sends <code>POST /api/models/rollback</code> to restore active global model weights to the selected previous version in S3.", body_style)],
        [Paragraph("<b>Model Registry</b>", body_style), Paragraph("<b>Download Checkpoint</b>", body_style), Paragraph("Retrieves pre-signed binary S3 download URL for local model inspection or offline inference testing.", body_style)],
        
        # Infrastructure
        [Paragraph("<b>Infrastructure</b>", body_style), Paragraph("<b>Simulate Node Failure</b>", body_style), Paragraph("Sends test chaos event to verify Kubernetes pod self-healing and HPA replica scaling triggers.", body_style)]
    ]

    t_buttons = Table(button_table_data, colWidths=[90, 140, 310])
    t_buttons.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    story.append(t_buttons)

    # Build PDF Document
    doc.build(story)
    print(f"PDF successfully generated at: {output_path}")

def create_pptx(output_path: str):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6] # Blank slide

    # Theme colors
    bg_dark = RGBColor(15, 23, 42)      # Slate 900
    card_dark = RGBColor(30, 41, 59)    # Slate 800
    c_primary = RGBColor(14, 165, 233)  # Sky blue
    c_white = RGBColor(248, 250, 252)   # Slate 50
    c_muted = RGBColor(148, 163, 184)   # Slate 400
    c_accent = RGBColor(16, 185, 129)   # Emerald
    c_danger = RGBColor(239, 68, 68)    # Red

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = bg_dark
        bg.line.fill.background()
        return bg

    def add_header(slide, title_text, category_text="FEDERAI CLOUD — PRESENTATION DECK"):
        # Header category
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = c_primary
        p_cat.font.name = 'Helvetica'

        # Main Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.7), Inches(0.8))
        tf = title_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(22)
        p.font.bold = True
        p.font.color.rgb = c_white
        p.font.name = 'Helvetica'

    # Slide 1: Title Slide
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    t_box = s1.shapes.add_textbox(Inches(1.0), Inches(2.0), Inches(11.33), Inches(3.5))
    tf = t_box.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "FederAI Cloud"
    p0.font.size = Pt(44)
    p0.font.bold = True
    p0.font.color.rgb = c_primary
    p0.font.name = 'Helvetica'

    p1 = tf.add_paragraph()
    p1.text = "A Cloud-Native, Secure and Privacy-Preserving Infrastructure for Federated AI"
    p1.font.size = Pt(20)
    p1.font.color.rgb = c_white
    p1.font.name = 'Helvetica'
    p1.space_before = Pt(14)

    p2 = tf.add_paragraph()
    p2.text = "Tagline: 'Train Together. Share Intelligence, Not Data.'"
    p2.font.size = Pt(15)
    p2.font.italic = True
    p2.font.color.rgb = c_accent
    p2.font.name = 'Helvetica'
    p2.space_before = Pt(12)

    p3 = tf.add_paragraph()
    p3.text = "Comprehensive Reviewer Demo Guide & System Architecture Walkthrough"
    p3.font.size = Pt(13)
    p3.font.color.rgb = c_muted
    p3.font.name = 'Helvetica'
    p3.space_before = Pt(20)

    # Slide 2: Problem Statement & Vision
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "1. The Core Challenge & Solution Paradigm")

    # Card 1: Problem
    card1 = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8))
    card1.fill.solid()
    card1.fill.fore_color.rgb = card_dark
    card1.line.color.rgb = c_danger
    card1.line.width = Pt(1.5)
    
    tf1 = card1.text_frame
    tf1.word_wrap = True
    p = tf1.paragraphs[0]
    p.text = "THE PROBLEM: Centralized AI Fails in Healthcare"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = c_danger
    
    bullets1 = [
        "Strict Regulatory Barriers: HIPAA, GDPR, and CCPA forbid sharing raw Electronic Health Records (EHR).",
        "Massive Data Liability: Aggregating sensitive records into central data lakes creates catastrophic honeypot leak vectors.",
        "Data Silos: Medical centers operate on isolated patient cohorts, limiting AI model generalization."
    ]
    for b in bullets1:
        p_b = tf1.add_paragraph()
        p_b.text = f"• {b}"
        p_b.font.size = Pt(11)
        p_b.font.color.rgb = c_muted
        p_b.space_before = Pt(12)

    # Card 2: Solution
    card2 = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.9), Inches(1.8), Inches(5.6), Inches(4.8))
    card2.fill.solid()
    card2.fill.fore_color.rgb = card_dark
    card2.line.color.rgb = c_accent
    card2.line.width = Pt(1.5)
    
    tf2 = card2.text_frame
    tf2.word_wrap = True
    p = tf2.paragraphs[0]
    p.text = "THE SOLUTION: FederAI Cloud Infrastructure"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = c_accent
    
    bullets2 = [
        "Decentralized Model Training: The model travels to the hospitals; only gradient updates travel back.",
        "Mathematical Privacy Guarantee: (ε, δ)-Differential Privacy (DP-SGD) with Gaussian noise & gradient clipping.",
        "Byzantine Threat Resilience: Directional Cosine alignment & L2-Norm Z-score outlier filtering isolates attackers.",
        "Zero-Downtime Rollbacks: Immutable S3 model version registry with instant fallback."
    ]
    for b in bullets2:
        p_b = tf2.add_paragraph()
        p_b.text = f"• {b}"
        p_b.font.size = Pt(11)
        p_b.font.color.rgb = c_muted
        p_b.space_before = Pt(10)

    # Slide 3: Step-by-Step Demo Flow
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "2. Step-by-Step Live Demonstration Script")

    steps = [
        ("Step 1: Dashboard HUD", "Open http://localhost. Show active clients, 50% accuracy baseline, and zero data leakage status."),
        ("Step 2: Hospital Topology", "Go to Federation Map. Show 5 distributed medical center nodes with private non-IID EHR datasets."),
        ("Step 3: Honest Training", "Go to Training Controls. Run 5 rounds with FedAvg + DP. Show accuracy climbing from 50% to ~82%."),
        ("Step 4: Threat Simulation", "Toggle Attack Simulation ON. Set Sign-Flipping or Gradient Scaling (20x) on Hospital Delta."),
        ("Step 5: Byzantine Defense", "Launch round. Show Delta flagged in RED and quarantined. Explain Cosine Sim (< 0.0) & Z-score catch."),
        ("Step 6: Model Rollback", "Go to Model Registry. Demonstrate 1-click zero-downtime rollback to a previous stable checkpoint.")
    ]

    for i, (st, sd) in enumerate(steps):
        row = i // 3
        col = i % 3
        x = Inches(0.8 + col * 3.9)
        y = Inches(1.8 + row * 2.5)
        
        box = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.7), Inches(2.2))
        box.fill.solid()
        box.fill.fore_color.rgb = card_dark
        box.line.color.rgb = c_primary
        box.line.width = Pt(1)

        tf = box.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = st
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = c_primary

        p_d = tf.add_paragraph()
        p_d.text = sd
        p_d.font.size = Pt(10)
        p_d.font.color.rgb = c_muted
        p_d.space_before = Pt(6)

    # Slide 4: Tools & Technologies Matrix
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, "3. List of Tools & Technologies Used (Architecture Stack)")

    tools_list = [
        ("Python 3.11 & NumPy", "Machine Learning Core", "ClinicalRiskMLP neural network forward/backward pass, SGD, gradient weight flattening/loading."),
        ("Differential Privacy (DP-SGD)", "Cybersecurity & Privacy", "Gaussian / Laplace noise injection, L2-norm gradient clipping (C=1.0), Moments Accountant."),
        ("FastAPI & Uvicorn", "Microservices Gateway", "Async REST endpoints, WebSocket live event dispatcher, JWT authentication, RBAC authorization."),
        ("PostgreSQL 16 & SQLAlchemy", "Relational Database", "Multi-tenant persistence for organizations, nodes, sessions, training rounds, and audit logs."),
        ("SeaweedFS / AWS S3", "Object Storage Gateway", "S3-compatible immutable model checkpoint registry with SHA256 validation and instant rollbacks."),
        ("RabbitMQ & Celery", "Message Broker", "AMQP asynchronous round coordination and distributed worker synchronization."),
        ("Prometheus & Grafana", "Monitoring & Telemetry", "Scrapes /metrics endpoint; pre-configured dashboards for ML convergence and server health."),
        ("Kubernetes (EKS) & HPA", "Cloud Orchestration", "Auto-scaling pod replicas (70% CPU/RAM), Ingress controllers, StatefulSets, PVC storage."),
        ("Terraform (AWS)", "Infrastructure as Code", "Multi-AZ VPC, EKS Managed Node Groups, RDS PostgreSQL Multi-AZ, S3 KMS encryption, ALB.")
    ]

    for i, (tool_name, tool_cat, tool_desc) in enumerate(tools_list):
        row = i // 3
        col = i % 3
        x = Inches(0.8 + col * 3.9)
        y = Inches(1.8 + row * 1.7)

        box = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.7), Inches(1.5))
        box.fill.solid()
        box.fill.fore_color.rgb = card_dark
        box.line.color.rgb = c_accent if "ML" in tool_cat or "Privacy" in tool_cat else c_primary
        box.line.width = Pt(1)

        tf = box.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = tool_name
        p_t.font.size = Pt(11.5)
        p_t.font.bold = True
        p_t.font.color.rgb = c_white

        p_c = tf.add_paragraph()
        p_c.text = tool_cat.upper()
        p_c.font.size = Pt(8.5)
        p_c.font.bold = True
        p_c.font.color.rgb = c_accent if "Privacy" in tool_cat else c_primary

        p_d = tf.add_paragraph()
        p_d.text = tool_desc
        p_d.font.size = Pt(9)
        p_d.font.color.rgb = c_muted
        p_d.space_before = Pt(3)

    # Slide 5: Comprehensive Button & Input Guide
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, "4. UI Interactive Controls & Button Usage Guide")

    buttons_guide = [
        ("Start Training (Header)", "Sends POST /api/federation/start to launch iterative federated training rounds across active nodes."),
        ("Reset Session (Header)", "Sends POST /api/federation/reset to wipe round telemetry and restore model back to Round 0 baseline."),
        ("Strategy Selector (Controls)", "Selects aggregation math: FedAvg (weighted average), Trimmed Mean (outlier trimmed), or Multi-Krum."),
        ("DP Epsilon & Delta (Controls)", "Sets privacy parameters (ε=1.0, δ=10⁻⁵). Smaller ε injects more Gaussian noise for tighter privacy."),
        ("Attack Simulator (Controls)", "Simulates Byzantine attacks from Hospital Delta: Sign Flipping, Gradient Scaling (20x), or Noise Blasting."),
        ("Launch Round (Controls)", "Synchronously executes a discrete round, updating the live 5-step progress pipeline tracker."),
        ("Unquarantine Button (Nodes)", "Sends POST /api/clients/{id}/unquarantine to restore a quarantined node after security review."),
        ("Rollback Button (Models)", "Sends POST /api/models/rollback to instantly activate a previous verified model checkpoint in S3.")
    ]

    for i, (b_name, b_desc) in enumerate(buttons_guide):
        row = i // 2
        col = i % 2
        x = Inches(0.8 + col * 5.9)
        y = Inches(1.8 + row * 1.3)

        box = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(5.6), Inches(1.15))
        box.fill.solid()
        box.fill.fore_color.rgb = card_dark
        box.line.color.rgb = c_primary
        box.line.width = Pt(1)

        tf = box.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = f"🔘 {b_name}"
        p_t.font.size = Pt(11)
        p_t.font.bold = True
        p_t.font.color.rgb = c_primary

        p_d = tf.add_paragraph()
        p_d.text = b_desc
        p_d.font.size = Pt(9.5)
        p_d.font.color.rgb = c_muted
        p_d.space_before = Pt(2)

    # Slide 6: Examiner Q&A Defense
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, "5. Examiner / Reviewer Defense Q&A Cheat Sheet")

    qa_items = [
        ("Q: Why is DP required if raw data never leaves the hospital?", "A: Deep neural network gradients leak training records through gradient inversion and membership inference attacks. (ε, δ)-DP adds mathematically calibrated Gaussian noise bounded by L2 gradient clipping C=1.0 to provably prevent record reconstruction."),
        ("Q: How does FederAI Cloud defeat Byzantine poisoning?", "A: Standard FedAvg uses simple weighted averages, so a single 100x scaled gradient ruins the model. FederAI Cloud enforces Directional Cosine alignment (< 0.0 rejected), L2-norm Z-score filtering (> 3.0 quarantined), Multi-Krum, and Bayesian dynamic trust scoring."),
        ("Q: Why use S3/SeaweedFS instead of storing models in PostgreSQL?", "A: Neural network weights are multi-megabyte binary numpy tensors. Storing them in SQL bloats database transaction logs. S3 gives object immutability, SHA256 checksums, pre-signed download URLs, and zero-downtime rollback.")
    ]

    for i, (q, a) in enumerate(qa_items):
        box = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8 + i * 1.7), Inches(11.7), Inches(1.5))
        box.fill.solid()
        box.fill.fore_color.rgb = card_dark
        box.line.color.rgb = c_accent
        box.line.width = Pt(1)

        tf = box.text_frame
        tf.word_wrap = True
        p_q = tf.paragraphs[0]
        p_q.text = q
        p_q.font.size = Pt(11.5)
        p_q.font.bold = True
        p_q.font.color.rgb = c_accent

        p_a = tf.add_paragraph()
        p_a.text = a
        p_a.font.size = Pt(10)
        p_a.font.color.rgb = c_white
        p_a.space_before = Pt(4)

    # Save PPTX
    prs.save(output_path)
    print(f"PPTX successfully generated at: {output_path}")

if __name__ == "__main__":
    pdf_out = os.path.abspath("FederAI_Cloud_Reviewer_Demo_Guide.pdf")
    pptx_out = os.path.abspath("FederAI_Cloud_Reviewer_Presentation.pptx")
    
    print("Generating FederAI Cloud Presentation & Documentation Artifacts...")
    create_pdf(pdf_out)
    create_pptx(pptx_out)
    print("Generation complete!")
