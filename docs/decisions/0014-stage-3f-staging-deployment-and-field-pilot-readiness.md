# ADR 0014: Stage 3F Staging Deployment, Physical Device QA Protocols & Staging Isolation

**Status:** Approved  
**Date:** 2026-10-28  
**Authors:** Senior Full-Stack Architect & Enterprise Security Reviewer  
**Deciders:** Project Owner, Enterprise Operations Lead, Lead Architect  
**Supersedes/Builds On:** ADR 0001 (Architecture & MVP Scope), ADR 0009 (Supabase Auth & RBAC), ADR 0010 (Attendance Integrity), ADR 0011 (Visit PostGIS Geofencing), ADR 0012 (Offline IndexedDB Journal), ADR 0013 (Management & HQ Governance)

---

## 1. Context and Problem Statement

With Stage 3E (Real Management & HQ Administration Integration) verified and checkpointed under commit `d4dbb37` and annotated tag `stage-3e-management-approved`, the project requires deployment to a hosted staging environment and validation across real field workflows, multi-role operations, and physical company-issued Android handsets (Samsung Galaxy A15 and Nokia G22).

Key architectural and governance challenges addressed in this decision:
1. **Deployment Environment Distinction:** Clearly differentiating technical hosting deployment (Vercel deployment tier) from operational business rollout to avoid premature operational use before field pilots are conducted.
2. **Physical Hardware vs Browser Verification:** Enforcing strict boundaries between automated Playwright mobile browser emulation (390x844 and 360x800 viewports) and actual on-handset Android testing (camera sensor orientation, physical GNSS hardware uncertainty, OS battery optimization, and PWA standalone installation).
3. **Local Evidence & Offline Journal Retention:** Governing client-side IndexedDB persistence, ensuring unsynchronised field evidence is never silently cleared, and isolating offline queues strictly by authenticated user ID.
4. **ERP Data Activation Gate:** Establishing precise prerequisites for transitioning from synthetic ERP import tests to importing actual client records into the operational client master.

---

## 2. Decision Outcomes

### 2.1 Technical Staging Deployment vs Operational Business Rollout
- The Vercel deployment at `https://field-sales-tracker-b6l7.vercel.app/` is formally classified as a **Controlled Staging & Testing Environment** backed by Supabase development database `[SUPABASE_PROJECT_ID]`.
- The fact that Vercel labels the default production branch as "Production" is recognized purely as a technical deployment designation. Normal employee operations across Nigeria, Zambia, and Malawi remain unauthorized until formal field-pilot sign-off.
- The deployment is hardened with strict HTTP security headers configured in `vercel.json`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - Asset caching: `public, max-age=31536000, immutable` for hashed assets.

### 2.2 Physical Handset Testing Governance
- Testing executed by automated agent tools via Playwright (Chromium, mobile user agents, viewport emulation 390x844 and 360x800) is reported accurately as **Automated Staging Browser Emulation**.
- Tests requiring physical hardware (genuine rear/front cameras, physical GPS chipsets with satellite multipath, hardware battery saving, PWA home screen installation on Android 13/14) are prepared as a formal **Physical Handset Execution Protocol** and marked **NOT TESTED (Physical Handset Required)** unless executed on physical test equipment.
- No synthetic or emulated sensor reading will be represented as genuine hardware validation.

### 2.3 Local Data Retention and Offline Security
- The IndexedDB event journal (`CarbonOfflineJournalDB`) stores offline event records and binary media blobs (`Uint8Array`) partitioned strictly by `ownerUserId`.
- When an employee logs out with pending unsynced events, the local queue is preserved in IndexedDB; other users logging into the same device cannot view, decrypt, or synchronise these events.
- When the owner logs back in, pending records are automatically detected and restored to the Sync Queue.
- IndexedDB storage is monitored for browser quota eviction risk. Critical field records are retained until explicit server acknowledgement (`status = 'synced'`).

### 2.4 ERP Client Master Import Safeguards
- Synthetic CSV test files verifying stable customer IDs, location IDs, shared switchboard telephone numbers (PRD §4.2), and `location_pending` status for unpinned branches are approved for staging verification.
- Activation of genuine ERP customer imports into the operational database is restricted until:
  1. Source ERP export column headers are formally inspected and mapped.
  2. Multi-branch parent-child relationships and switchboard phone sharing are verified.
  3. Destination database and market segregation (`NG`, `ZM`, `MW`) are verified.
  4. Enterprise administrative sign-off is obtained.
- Direct live ERP API synchronisation remains strictly excluded from the MVP.

---

## 3. Consequences

### Positive
- Prevents premature go-live while providing a robust, live HTTPS staging environment for stakeholders.
- Preserves full auditability and honesty regarding physical device test coverage.
- Guarantees zero data loss for offline field salespeople operating in low-connectivity rural territories.
- Enforces strict security boundaries preventing cross-market and cross-user data leakage.

### Trade-offs / Limitations
- Physical handset testing requires manual execution by local field pilot coordinators in Lagos, Lusaka, and Blantyre using the provided test protocol.
- Background sync remains subject to mobile OS browser lifecycle policies when the browser tab is terminated before sync completion. Salespeople are provided with prominent manual "Sync Now" CTAs.
