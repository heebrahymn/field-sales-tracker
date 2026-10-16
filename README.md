# Carbon Field Sales Tracker

An enterprise-grade, mobile-first, offline-capable Progressive Web Application (PWA) for field-sales activity recording, physical visit verification, client branch management, and managerial audits across African markets (**Nigeria**, **Zambia**, and **Malawi**).

Built for **Carbon Car Care** with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Supabase.

---

## 1. Project Overview & Business Purpose

Field sales operations in emerging markets require robust, tamper-resistant operational records without adding administrative burden or assuming permanent high-speed cellular connectivity.

The **Carbon Field Sales Tracker** establishes an objective operational baseline for field activities:
- **Attendance & Workday Tracking:** Captures authenticated employee identity, assigned company device status, fresh GPS coordinates, and live front-camera selfie check-in.
- **Physical Visit Verification:** Enforces a configurable 200m geofence radius around registered client branch GPS pins combined with live on-site premises photography.
- **Client & Branch Directory:** Distinguishes parent enterprises from individual operating branches, supporting multi-branch organizations that legitimately share switchboard telephone numbers ([PRD §4.2](docs/Carbon_Field_Sales_Tracker_PRD_v1.2_MVP_Updated.pdf)).
- **Meeting Documentation:** Records contacts met, visit purposes, products discussed, narrative meeting outcomes, free-text next steps, and business-card captures ([PRD §7.3](docs/Carbon_Field_Sales_Tracker_PRD_v1.2_MVP_Updated.pdf)).
- **Salesperson-Originated Exceptions:** Salespeople own and submit their own GPS failure, camera failure, battery depletion, or missed visit claims. Managers review, approve, or reject, but **never** fabricate or alter logs on behalf of a salesperson ([PRD §7.4](docs/Carbon_Field_Sales_Tracker_PRD_v1.2_MVP_Updated.pdf)).
- **Resilient Offline Journal:** Queues offline actions locally with monotonic ordering and client-generated UUID idempotency keys, guaranteeing ordered, duplicate-safe server reconciliation.

---

## 2. Strict MVP Boundaries (Non-Commercial Exclusions)

To maintain absolute focus on core field activity verification and operational integrity, the following features are **strictly excluded from the MVP**:

- ❌ Quotation creation, editing, pricing values, or quotation approval workflows.
- ❌ Sales pipeline stages, deal conversion probabilities, and revenue reporting charts.
- ❌ Commercial purchase order tracking, sales transactions, invoicing, or payment processing.
- ❌ Automated follow-up task scheduling engines, calendar alarms, or due-date task managers (next steps are captured strictly as narrative free text).
- ❌ Continuous employee GPS breadcrumb tracking or turn-by-turn route optimization.
- ❌ Automated facial recognition or biometric scanning.
- ❌ Live ERP / CRM synchronization.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| **Core Framework** | React 18, TypeScript (strict mode), Vite |
| **Styling & Design System** | Tailwind CSS v4, shadcn/ui primitives, Radix UI, Lucide React |
| **Typography & Assets** | Self-hosted Manrope font family, authentic Carbon Car Care brand mark (`public/brand/carbon_logo.png`) |
| **Backend (Stage 2+)** | Supabase PostgreSQL, Auth, Row-Level Security (RLS), Edge Functions, private Storage |
| **Offline Architecture** | Service Worker, Vite PWA, IndexedDB (Dexie), UUID idempotency keys |
| **Location & Mapping** | Browser Geolocation API, Leaflet, OpenStreetMap |
| **Testing & Quality** | Vitest, React Testing Library |

### Official Brand Design Tokens

| Token | Hex Value | Usage |
|---|---|---|
| **Carbon Primary Blue** | `#21409A` | Headers, primary actions, active visit indicators |
| **Carbon Green** | `#1B9A4A` (`#157A3A` text) | Verified statuses, start day actions, success indicators |
| **Carbon Yellow Highlight** | `#E8CF2F` | Live timer pulses, active visit highlights, operational accents |
| **Neutral Surfaces** | `#FFFFFF` / Slate scales | High-contrast cards, outdoor-friendly forms, scannable tables |

---

## 4. Current Milestone Status (Stages 1A & 1B Completed)

```
[✓] Stage 0  — Technical Architecture, Database Model & Implementation Plan (ADR 0001)
[✓] Stage 1A — Design System, Application Shell, Role Switcher & Card Refinements (ADR 0002)
[✓] Stage 1B — Complete Salesperson Mobile Interface (ADR 0003)
[ ] Stage 1C — Country Sales Head Dashboard (Next)
[ ] Stage 1D — HQ Admin Regional Oversight Console
[ ] Stage 2  — Supabase Dev Project, Schema Migrations, Auth & RLS Security Policies
[ ] Stage 3  — Real Geolocation, Camera Integration & Visit Workflows
[ ] Stage 4  — Offline Dexie Sync, Idempotency Engine & Exception Resolution
[ ] Stage 5  — Management Reports, Safe CSV Exports & Reconciliation
[ ] Stage 6  — Security Audit, Real-Device QA & Pilot Deployment
```

> [!IMPORTANT]
> **Simulation Notice:** All functionality in Stage 1 operates on **simulated mock data**. Hardware APIs (GPS coordinates, camera captures), IndexedDB storage queues, and authentication sessions are simulated in-browser to thoroughly test and approve the UI/UX workflows before backend integration. All demonstrated corporate accounts use realistic fictional entities (*Apex Heavy Logistics*, *Equatorial Energy*, *Zenith Logistics*, *Pinnacle Cargo*).

---

## 5. Completed Stage 1B Salesperson Mobile Features

1. **Salesperson Home Dashboard:** Live attendance status, in-progress visit summary, real-time counters, completed visit history, and context-aware action tiles.
2. **Start Day & End Day Workflows:**
   - Simulated front-camera selfie preview with coordinate watermarking (`6.5244° N, 3.3792° E`).
   - Fresh GPS satellite fix accuracy meter (±12m within the ≤100m PRD limit).
   - **PRD §6.1 / AT-03 Hard Block:** Workday closure is strictly blocked while a normal visit session remains open.
3. **Clients & Branch Management:**
   - Searchable branch directory with distance tags, category filters, and direct call actions.
   - **Shared Company Phone Number Support (PRD §4.2):** Validates and supports multiple facilities sharing a switchboard phone (`+234 1 270 5000`) without duplicate rejection.
   - **Register Branch Modal:** Captures facility details, site contact, proposed GPS pin (accuracy ≤ 50m required), and live premises photo.
4. **Client Visit Workflow:**
   - Interactive 6-step flow with GPS simulator test controls (*Inside 38m*, *Outside 340m*, *Degraded ±140m*).
   - Mandatory rear-camera premises photo viewfinder.
   - Live elapsed visit timer (`MM:SS`).
   - Single active physical visit rule enforcement (AT-04).
   - **Permitted Outside-Geofence Checkout (PRD §7.2 / AT-05):** Checkouts outside 200m are permitted to avoid blocking closure, but automatically raise a review flag (`Checkout Outside Geofence`) for manager triage.
5. **Meeting Log Documentation:**
   - Categorized visit purpose, multi-select products, narrative outcome, and optional business-card capture preview.
   - Next steps captured strictly as unparsed free text narrative.
   - Immediate submission or 2-hour SLA deferral option.
6. **My Exceptions Workbench:**
   - Salesperson-exclusive claim creation (GPS failure, camera failure, device depletion recovery, missed visits).
   - Complete audit trail showing manager review decisions (`Manager Approved — Location Unverified` per PRD §2).
7. **Non-Visit Workday Requests:**
   - Requests for office proposal prep, training, virtual meetings, and internal operations.
   - Explicit governance notice: counts toward attendance, strictly zero physical visit targets.
8. **Offline Queue & Synchronisation:**
   - Cellular connectivity simulator (Online vs. Offline / Airplane Mode).
   - Animated "Sync Now" trigger.
   - Durable IndexedDB journal demonstrating monotonic sequence ordering and client-generated UUID idempotency keys (`evt-8f4b-2291-a10c`).

---

## 6. Installation & Development Commands

### Prerequisites
- Node.js 18.0+ or 20.0+ LTS
- npm 9.0+

### Setup
```powershell
# Clone the repository
git clone https://github.com/heebrahymn/field-sales-tracker.git
cd field-sales-tracker

# Install dependencies
npm install

# Start the local development server
npm run dev
```

The application will be accessible at `http://localhost:5173/`.

### Development & Verification Commands
```powershell
# Run TypeScript compilation check (Strict Mode, 0 errors)
npx tsc --noEmit

# Run Vitest automated unit tests
npm test

# Build the production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 7. Project Structure

```
carbonSalesTracker/
├── docs/                                # Project guides, PRD, and ADR records
│   ├── Carbon_Field_Sales_Tracker_PRD_v1.2_MVP_Updated.pdf
│   ├── ANTIGRAVITY_MASTER_PROMPT.md
│   ├── decisions/                       # Architectural Decision Records (ADRs)
│   │   ├── 0001-stage-0-approval.md
│   │   ├── 0002-stage-1a-approval.md
│   │   └── 0003-stage-1b-salesperson-mobile-interface.md
│   └── screenshots/                     # High-resolution screen captures
│       └── stage1b/
├── public/
│   ├── brand/
│   │   └── carbon_logo.png              # Authentic Carbon Car Care logo
│   └── fonts/                           # Self-hosted Manrope font family
├── src/
│   ├── components/                      # Reusable UI primitives and layouts
│   │   ├── brand/                       # Brand logo component
│   │   ├── feedback/                    # Demo role switcher banner
│   │   ├── field/                       # Persistent status strip
│   │   ├── layout/                      # AppShell, ConsoleHeader, Navbars
│   │   └── ui/                          # Button, Card, Badge, Input, Table
│   ├── context/                         # Reactive application state
│   │   ├── AuthContext.tsx              # Role-switching demo provider
│   │   └── FieldSessionContext.tsx      # Comprehensive field state engine
│   ├── features/                        # Role-specific feature modules
│   │   ├── admin/                       # HQ Admin regional console
│   │   ├── auth/                        # Branded login screen
│   │   ├── field/                       # Salesperson mobile screens & modals
│   │   └── review/                      # Country Sales Head dashboards
│   ├── lib/                             # Utilities & Tailwind helpers
│   └── test/                            # Vitest unit test suites
│       ├── at15-exclusions.test.tsx     # Strict MVP scope boundary assertions
│       ├── brand-logo.test.tsx          # Brand identity compliance assertions
│       ├── salesperson-context.test.tsx # AT-03, AT-04, PRD §4.2, §7.4, §9 tests
│       └── status-badge.test.tsx        # Operational status badge tests
├── AGENTS.md                            # Always-on Antigravity master instructions
└── package.json
```

---

## 8. License

Proprietary — Internal application developed for **Carbon Car Care**. All rights reserved.
