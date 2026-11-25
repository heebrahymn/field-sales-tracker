# ADR 0001: Stage 0 Architecture Approval and Project Decisions

**Date:** 2026-10-16  
**Status:** Approved by Stakeholder  
**Context:** Review and sign-off of Stage 0 Implementation Plan for the Carbon Field Sales Tracker.

---

## Decisions Approved

### 1. Technology Stack
- **Framework & Tooling:** React 18/19, TypeScript (strict mode), Vite.
- **Styling & UI:** Tailwind CSS v4, shadcn/ui compatible component primitives (Radix), Lucide React icons.
- **Typography:** Manrope (self-hosted variable font for reliable offline/standalone rendering).

### 2. Official Brand Assets & Logo
- **Asset path:** `public/brand/carbon_logo.png` (PNG format, transparent background).
- **Integrity:** Preserve original proportions, colours, transparency, and whitespace. No recolouring, cropping, or recreation.
- **Icon strategy (Option C):** Defer dedicated square icons until an official square brand asset is approved. Use a neutral development favicon in Stage 1 without representing it as the final production PWA icon.
- **Backgrounds:** The logo must be placed exclusively on white or light-neutral surfaces (no reversed/white version exists).

### 3. Brand Colours & Accessibility
- **Official Tokens:**
  - Blue: `#21409A`
  - Green: `#1B9A4A`
  - Yellow: `#E8CF2F`
- **Accessibility Safeguard:** `#1B9A4A` provides ~3.6:1 contrast on white (fails WCAG AA for normal text). Derived semantic darker variants (e.g., `#157A3A`) must be used for text and buttons to maintain ≥4.5:1 contrast. `#E8CF2F` is strictly reserved for highlights and dark-text chips (never text on white).

### 4. Wording, Permissions & Governance Corrections
- **Logo path:** Updated across all documentation to `public/brand/carbon_logo.png`.
- **Non-visit activity wording:** Corrected to `"Proposal preparation (office)"` (aligning with PRD v1.2, eliminating quotation references).
- **Approved Leave:** Authorised Country Sales Heads and HQ Admins record approved leave as an administrative attendance action in work schedules.
- **Strict Role Boundary:** Managers and HQ Admins **must never** create or rewrite salesperson visit logs, missed-visit logs, or GPS/device-failure exception logs. Only the authenticated salesperson can create and submit these records. Enforced via database RLS and server-side RPC validation.

### 5. Demo Evidence Media
- AI-generated fictional premises images may be used for frontend demonstration.
- Every demo image must be visibly watermarked/labelled `"DEMO"`.
- Neutral silhouette illustrations will be used for demo selfies (no fictional faces).
- Demo media must stay isolated in `public/demo/` and clearly identified as demonstration content.

### 6. Early Real-Device Testing
- Authorised an isolated technical spike for real company-issued handsets (GPS accuracy, front/rear camera, IndexedDB persistence across app kill/restart, network reconnect).
- Kept strictly separate from production application codebase.

### 7. Stage Authorization
- Stage 0 complete and confirmed.
- **Stage 1A authorised:** Frontend Design System, Official Branding, Reusable UI Components, Premium Login, and Responsive Application Shell with Mock Role Navigation.
