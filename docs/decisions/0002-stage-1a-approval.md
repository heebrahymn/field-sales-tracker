# ADR 0002: Stage 1A Approval — Design System, Application Shell, and Responsive UI Checkpoint

**Date:** 2026-10-16  
**Status:** Approved by Stakeholder  
**Context:** Review and sign-off of Stage 1A deliverables, including design system implementation, authentic brand application, responsive application shell, and refinements.

---

## Decisions & Deliverables Approved

### 1. Visual Design & Official Branding
- Authentic Carbon Car Care logo in `public/brand/carbon_logo.png` integrated across all shells, headers, and login views without distortion, recolouring, or cropping.
- Brand design tokens implemented via Tailwind CSS v4 and CSS variables:
  - Carbon Primary Blue: `#21409A`
  - Carbon Green: `#1B9A4A` (with accessible text shade `#157A3A` for WCAG AA compliance)
  - Carbon Yellow Highlight: `#E8CF2F`
  - Typography: Manrope font family self-hosted in `public/fonts/`.

### 2. Application Shell & Role-Based Navigation
- Context-aware application shell (`AppShell.tsx`) supporting distinct role layouts:
  - **Salesperson:** Mobile-first layout with persistent operational status indicators (Simulated GPS accuracy, Sync status, Offline indicator, Market code), bottom tab bar with 48px touch targets, and large primary field action triggers.
  - **Country Sales Head:** Desktop console with collapsible mobile drawer (`<1024px`), persistent market scope indicators, scannable approval workbench, and audit triage views.
  - **HQ Admin:** Tri-market consolidated console with cross-border regional aggregates, country hub cards (Nigeria, Zambia, Malawi), handset inventory, and client master import batches.

### 3. Stage 1A Refinements Approved
- **Context-Aware Salesperson Logic (AT-04 & PRD §6.1):**
  - Enforced single active normal visit rule: starting a second visit is blocked when a visit is in progress.
  - Primary mobile field action dynamically switches to "Resume Active Visit".
  - "End Day" is strictly blocked while a normal visit is open, unless resolved via checkout or approved exception workflow.
  - Meeting log dialog matches PRD §7.3 with immediate checkout or 2-hour grace period, and next-step captured strictly as free-text narrative (no task creation).
- **Fictional Demonstration Entities:**
  - Replaced all corporate names with 100% fictional fleet and logistics accounts (Apex Heavy Logistics, Equatorial Energy, Zenith Logistics, Pinnacle Cargo).
- **Unified Enterprise Card Styling:**
  - Redesigned KPI cards across both Sales Head and HQ Admin views into uniform white cards (`bg-white rounded-xl border border-slate-200/90 shadow-xs`), with dedicated soft-tinted icon avatars, standardized metric and badge placement, and status-dot footers.
  - Eliminated text truncation (`truncate` with ellipses) on all card headers and footers.
- **Full Mobile Responsiveness:**
  - Slide-over navigation drawer with frosted backdrop for tablets and mobile phones.
  - Responsive 2-column mobile grid (`grid-cols-2 lg:grid-cols-5`) for KPI cards.
  - Outdoor-tested full-width touch targets (`h-9` minimum) for all approval and review actions.

### 4. Non-Commercial Scope Boundaries Preserved
- No quotation management, sales pipeline, revenue tracking, or follow-up task engines exist in the codebase.
- Salesperson retains exclusive rights to create visit and exception records; managers review, approve, or reject but never originate salesperson logs.

### 5. Authorization for Stage 1B
- Stage 1A is confirmed and completed.
- Authorised to proceed to **Stage 1B — Complete Salesperson Mobile Interface** (comprehensive sub-flows for Attendance Start/End Day, Client & Branch Directory, Visit Capture with Geofence & Camera Simulation, Meeting Logs, Exception Filing, Non-Visit Day Requests, and Offline Sync Interface).
