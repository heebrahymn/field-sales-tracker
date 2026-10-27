# Carbon Field Sales Tracker — Antigravity Master Project Guide

**Document type:** Persistent agent implementation guide  
**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Reference:** Carbon Field Sales Tracker PRD v1.2 (MVP Updated)  
**Status:** Stage 0, Stage 1A–1E, Stage 2A–2B, Pre-Stage 3 Audit, Stage 3A, and Stage 3B Completed; Stage 3C Authorisation Pending  
**Maintainer:** Project owner

## 1. Role and working standard

Act as a senior full-stack architect, React/TypeScript developer, SaaS product designer, database engineer, application security reviewer, and QA engineer. Develop a premium, reliable, maintainable **field-sales activity and visit-verification PWA** for Carbon Car Care. This project is built with Google Antigravity.

Match the polish of excellent contemporary SaaS apps: intentional navigation, responsive layouts, careful typography, strong accessibility, clear operational states, and usable manager dashboards. Do not mistake attractive mock screens for working features.

**Non-negotiable:** Do not implement the entire app in one prompt. Work in gated stages and request approval before proceeding to the next stage.

## 2. Source of truth and conflict handling

Before every significant task:

1. Review this guide and `AGENTS.md`.
2. Check `docs/Carbon_Field_Sales_Tracker_PRD_v1.2_MVP_Updated.pdf`, if present and readable. This is the latest approved-scope functional PRD, including workflows, requirements, and acceptance tests AT-01–AT-16.
3. Apply any newer, explicitly approved decisions recorded in the project repository or current user instruction.
4. If a document is inaccessible or ambiguous, state that and ask for clarification. Never fabricate its contents.

**Approved decisions that must survive future changes:**

- Devices are **company provided**.
- Salesperson creates and submits every missed-visit, GPS-failure, or device-failure record, including delayed submissions after phone recovery; managers **never** create these records for a salesperson.
- Manager-approved missing-GPS visits remain **Manager Approved — Location Unverified**, not GPS verified.
- Allow different branches of one company to share the same telephone number.
- An authorised non-visit working day can be manager approved; it counts toward attendance but not physical-visit targets.
- A properly evidenced GPS/geofence visit can count as **Location Verified** without client confirmation; client confirmation is a separate audit dimension.
- Quotes, follow-up task management/reminders, orders, sales pipelines, sales conversion/revenue analytics, invoicing, and ERP/CRM integration are **outside MVP**. Future integration is a roadmap only.
- Salesperson submits company device replacement requests directly to HQ Admin (`Profile → My Device → Report Device Issue`); there is **no Country Sales Head approval or intermediary submission step**. Hardware replacement is strictly administrative and separate from salesperson-authored field visit exceptions.

## 3. Project description

- **Product:** Carbon Field Sales Tracker
- **Markets:** Nigeria (`Africa/Lagos`), Zambia (`Africa/Lusaka`), Malawi (`Africa/Blantyre`)
- **Users:** salesperson, country Sales Head, HQ administrator
- **Platform:** Standalone, installable, mobile-first and offline-capable PWA for company phones; responsive manager/admin desktop views
- **Objective:** Record attendance, physical visits, client branches, meeting details, evidence, offline activity, reviewable exceptions, manager audits, and operational reports.

Never represent GPS/location evidence alone as proof a client meeting happened. Separate activity, location verification, client audit outcomes, and human disciplinary conclusions.

## 4. Approved technology stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui + Radix primitives, Lucide React, React Router, TanStack Query, TanStack Table, React Hook Form, Zod, Recharts, date-fns.

**Backend:** Supabase PostgreSQL, Auth, RLS, private Storage, Edge Functions, SQL migrations.

**Offline/PWA:** Service worker, Vite PWA, IndexedDB, Dexie, durable event/media queue, UUID idempotency keys, ordered dependency-based sync.

**Location/media:** Browser Geolocation API, `getUserMedia`, Leaflet and OpenStreetMap for manager maps.

**Testing:** Vitest, React Testing Library, Playwright, SQL/RLS authorization checks and real-device QA.

Use compatible, supported library releases; verify versions as installed. Do not add Next.js, Django, Firebase or a second database without a documented need and explicit approval.

## 5. Official brand identity — mandatory

The provided official logo should live at:

`public/brand/carbon_logo.png`

Never generate a replacement logo. If the file does not exist, request the authentic asset before finalising branded screens. Preserve proportions, whitespace, transparent background and original logo colours. Use it in login, app header/sidebar, manager/admin views, welcome/loading where appropriate, and thoughtfully derived PWA icons. Reference local project assets, never unauthorised hotlinked assets.

**Design tokens:**

| Token | Colour |
|---|---|
| Carbon primary blue | `#21409A` |
| Carbon green | `#1B9A4A` |
| Carbon yellow highlight | `#E8CF2F` |
| Background | `#FFFFFF` plus subtle neutral surfaces |
| Typography | Dark charcoal, muted slate secondary |

Use manrope or a similarly legible sans-serif, clear hierarchy, high contrast, restrained shadows, professional tables/cards, generous but controlled spacing, accessible forms, meaningful status colours, and outdoor-friendly mobile controls. Avoid generic template dashboards, unnecessary gradients, heavy glassmorphism, excessive animation, or oversized decoration.

Create reusable components for: app shell, responsive sidebar/mobile navigation, header, official logo, page headers, KPI cards, tables, filters, status badges, confirmation dialogs, skeletons, error/empty states, sync/GPS status, approval dialogs, evidence viewer, audit history and form fields.

**UX direction:** Mobile-first salesperson experience with large Start Day / Visit Client / Add Branch / My Exceptions / End Day / Sync Now actions; refined desktop Country Sales Head and HQ Admin dashboards. Clear error states and functional navigation. All mock data must be visibly identified as demonstration content.

## 6. User roles and security boundaries

### Salesperson

- View only own operational records and authorised market client data.
- Start/end day; view attendance status; search organisations and branches.
- Register organisations/branches subject to approval.
- Capture GPS check-in/out and mandatory live premises photo for normal verified visits.
- Complete meeting logs.
- Create and submit own missed-visit, GPS/device-failure exception logs.
- Submit company device replacement requests directly to HQ Admin under **Profile → My Device → Report Device Issue**; track approval, dispatch, activation status, and HQ decisions.
- Request non-visit day/activities, view reviews, and sync offline records.
- Cannot silently edit/delete submitted evidence or approve own exceptions or device replacements.

### Country Sales Head

- View one assigned country's team and client data.
- Review attendance, visit evidence, registration/pin approvals, exceptions, disputes, flags, client audits, and country CSV exports.
- Approve/reject/comment/escalate salesperson submissions and authorised non-field workdays.
- **Does not create, submit, approve, or reject company device replacement requests.** Read-only operational visibility where appropriate, with zero approval bottleneck.
- **Cannot create a salesperson's visit or exception log.** Enforce in API/database/RLS, not only in UI.

### HQ Admin

- Cross-country oversight, users, devices, country rules/calendars, client master imports, audited exports, escalation and system administration.
- Sole review and approval/rejection authority for salesperson company device replacement requests; manages spare depot inventory, records dispatch, confirms activation, and records old device disposition.
- Follow least-privilege controls; HQ privileges never imply impersonation or creation of fictitious salesperson evidence.

## 7. Salesperson workflows and screens

### Login

Authentic logo, branded form, secure authentication, useful validation, password reset when configured, assigned company-device status, accessible phone layout.

### Home

Date/market; attendance and active visit status; today's visits; pending sync/verification; prominent actions. No quotation, order, sales pipeline or follow-up task modules.

### Start Day

Collect authenticated identity, assigned device session, fresh GPS with accuracy, live front-camera selfie, local day and timezone, offline marker. Do not claim face matching/biometric verification in MVP. Handle leave/approved absences and schedule exceptions.

### Clients and branches

Separate parent companies and physical branches, including multiple branches with shared telephone numbers. Search by name/location; show authorised contacts, approved pins and visit history. Registration captures company, branch, category, address/landmark, contact, role, telephone, applicable fleet size/volume, GPS pin and live premises image. Duplicates prompt review; never automatically reject valid branches merely for a shared company telephone number. Field registrations and pin proposals require Country Sales Head approval and audit history.

### Visit capture

1. Select approved branch.
2. Capture recent GPS coordinates and accuracy.
3. Check geofence against the branch pin (default **200 m**, configurable) and account for reported GPS uncertainty; retry uncertain readings.
4. Capture live premises photo for a normal location-verified visit.
5. Check in; only one open normal visit at once.
6. Check out with location if available; **permit check-out outside the geofence and raise a flag** rather than blocking closure.
7. Submit meeting log at check-out or within two hours; late logs are flagged.

Default acceptable GPS accuracy: at most **100 m** for visits and **50 m** for proposed pins, subject to country/site configuration. Client-side checks are preliminary; server rechecks accepted synced events.

### Meeting log

Capture contact met; visit purpose; products discussed; narrative outcome; relevant fleet size/volume; **next step as free text only**; notes; optional live business-card photo. Use PRD-approved categories. Do not store quotation/order monetary values, create follow-up tasks or create commercial orders.

### Failure/missed-visit exception

- GPS or camera issues prompt retry and clear guidance; salesperson can submit a reasoned exception with available evidence.
- In a full phone failure, salesperson submits the claimed visit **after access is restored**.
- Include branch, claimed visit/time, actual submission time, meeting details, failure reason and supporting evidence, when available.
- Country Sales Head can review/approve/reject/comment/escalate; manager **never originates a log**.
- Approved insufficient-location record remains **Manager Approved — Location Unverified**.
- Retain original submission, author, timestamps, decision and immutable history.

### Non-visit working day

Support salesperson request plus manager approval for training, proposal preparation (office), virtual meeting, internal meeting or other legitimate assigned activity. These affect attendance, **not** GPS-verified visit targets and do not create quotation management features.

## 8. Visit verification, risk flags and audits

Keep separate notions of visit location status, client meeting confirmation and manager review. Implement location-verified, location-unverified, pending review/client approval, manager-approved unverified, client-confirmed, disputed and confirmed violation states as specified by the PRD.

A valid location-verified visit does **not** require every client's confirmation. Perform random weekly audit sampling of **5%** of verified visits plus independently identified risk-based audits. Client denial initiates **Disputed — Pending Review**; do not automatically issue disciplinary decisions.

Support adjustable flags for: visits under five minutes; checkout beyond geofence; implausible travel above 80 km/h; idle gaps over 150 minutes where applicable; late start/early finish against local schedules; no/low visits; late meeting log; near-attendance-origin visit; duplicate/similar images; clustered/duplicate client registration; repeated branch visits; late offline sync; clock discrepancies; high offline share over 30%; device change; and auto-closed days.

Flags are prompts for human review, not conclusive fraud findings. Preserve reviewer rationale and original evidence.

## 9. Offline-first and data integrity

- Service worker caches application shell and minimum authorised market/branch/rule data.
- IndexedDB stores captured event records and associated media while offline.
- Every event has a UUID, user/session, ordered sequence/dependencies, device timestamp, timezone, available GPS/accuracy, capture marker and later server receipt timestamp.
- Show meaningful states: Offline, Pending Sync, Syncing, Synced, Needs Review, Failed. Provide manual Sync Now and retry.
- Server validates event order, role/country, geofence, duplicates and idempotency when receiving records.
- Handle interrupted uploads, duplicate requests, browser restarts, reconnection and clock anomalies.
- Device time and browser elapsed-time are **not tamper-proof**, particularly across restarts. Browser storage may be cleared or lost; don't promise irreversible queues or perfect background sync.
- If evidence cannot be recovered, require a salesperson-submitted exception. Never reconstruct/fabricate records.
- Manager dashboards must label offline data as provisional; a disconnected device's unsynced queue length is not automatically known to the server.

## 10. Manager dashboards and reports

**Daily:** scheduled/active/absent, approved leave/non-visit days, open visits, completed visits, location-verified vs manager-approved-unverified, last known sync, missing logs, registration/pin approvals, flags and outstanding exceptions.

**Weekly:** workdays, verified visit count, unique branches, approved-unverified visits, offline percentage, flag closure, audits and approval turnaround.

**Quarterly:** account and branch coverage, repeat visit distribution, attendance, verified activity, exception and audit trends. No quotation/order/pipeline charts.

**Other views:** salesperson day timeline and map evidence, organisation/branch history, exception queue, registration approval queue, audit call workbench and CSV export.

Filter by market, user, and period according to permissions. Clearly label provisional sync status and use audited safe CSV exports, escaping formula-like cells. Daily **19:00** summaries are provisional; include next-day reconciliation where configured.

## 11. Database and secure implementation

Use the PRD's canonical MVP model and only add justified supporting relations. Conceptual entities include `markets`, `users`, `devices`, `work_schedules`, `attendance_days`, `organisations`, `branches`, `client_contacts`, `client_changes`, `visits`, `visit_photos`, `meeting_logs`, `activity_events`, `exceptions`, `flags`, `audit_checks`, `approval_audit`, `import_batches`, `export_jobs`.

Implement UUIDs, foreign keys, indexes, explicit allowed statuses, country-scoped RLS, append-only audit events, private media, signed temporary links, controlled exports, schema migrations and server-side checks. Do not expose service-role keys or other secrets to browser code.

**No MVP commercial tables/API/schedulers:** no `quotations`, `orders`, `opportunities`, `follow_up_tasks`, pipeline values or sales revenue reporting.

## 12. Strict MVP exclusions

The following are **not** part of MVP, even as placeholder screens or database tables:

- Quote/quotation creation, values or approval
- Follow-up task management or reminders
- Order tracking and order verification
- Opportunities, pipelines, sales conversion/revenue analytics
- Invoices, payments, fuel or allowance management
- Continuous employee tracking or route optimisation
- Facial recognition
- Live ERP/CRM integration

Only a future-phase roadmap may describe these. Meeting purpose can mention follow-up; next-step free text remains allowed without creating a task system.

## 13. Implementation phases and approval gates

| Stage | Deliverables | Gate / Status |
|---|---|---|
| **0** | PRD review, architecture, design plan, risks, open questions | **Completed** (ADR 0001) |
| **1** | Premium branded frontend for all roles with mock data; responsive UI walkthrough (1A–1E) | **Completed** (ADRs 0002–0006) |
| **2** | Supabase dev project, migrations, Auth, roles, RLS, company device assignment (2A–2B) | **Completed** (ADRs 0007–0008) |
| **Pre-3** | Pre-Stage 3 Product & UX Audit, Client terminology corrections, sync queue accessible navigation | **Completed** |
| **3A** | Real Supabase Auth, GoTrue session lifecycle, trusted database profile RBAC, country isolation | **Completed** (ADR 0009) |
| **3B** | Real attendance (Start/End Day), GPS capture, live camera selfie, non-visit request governance | **Completed** (ADR 0010) |
| **3C** | Real client visit check-in/out, GPS geofencing (200m), live premises photo, meeting logs | **Next Phase (Awaiting Authorization)** |
| **4** | Offline sync, salesperson-created exceptions, verification, flags and audit reviews | Planned |
| **5** | Operational dashboards, safe CSV export, notifications and reconciliation | Planned |
| **6** | Security audit, real-device GPS/camera/offline QA, deployment/pilot readiness | Planned |

At the end of each stage:

1. Summarise exactly what was implemented.
2. List files modified and migrations applied.
3. Run and report relevant tests and failures.
4. Show application/browser artifacts or screenshots when relevant.
5. List limitations and blockers.
6. Update all relevant documentation (`README.md`, `CHANGELOG.md`, `ROADMAP.md`, ADRs, and test reports).
7. **Stop and request approval** before moving to the next stage.

Use Git and preserve a stable commit at every approved checkpoint. Never overwrite approved UI without documenting it.

## 14. Testing, privacy and honesty

Use production-quality TypeScript, reusable components, input validation and clear separation of UI/data/business rules. Test permissions directly against backend APIs and RLS. Validate PRD acceptance cases AT-01–AT-16 as feasible at each stage. Browser simulations do not replace QA with company-issued real phones.

Support privacy notices, limited event-based location capture, access controls, data retention review, backups, observability and appropriate jurisdictional reviews. Do not promise spoof-proof GPS, tamper-proof offline events or perfect sync across devices/browsers.

## 15. Current State & Architectural Baseline — Stage 3B Completed

Stage 3B is fully implemented, verified, and locked. The current architecture establishes:

1. **Real Supabase Workday Attendance Persistence:** Daily Start Day and End Day records persist directly to `public.attendance_days` with authoritative PostGIS coordinates (`POINT(lng lat)`), reported accuracy, and UTC timestamps.
2. **Sole-Author Principle (PRD §2, §6):** Enforced via PostgreSQL RLS policy `attendance_days_insert_salesperson_only`. Managers receive `HTTP 403 Forbidden` if attempting direct insertion into `attendance_days` on behalf of a salesperson.
3. **Live Hardware Media & Geolocation:** Integrated HTML5 `getUserMedia` for live front-camera selfie capture with explicit track release (`track.stop()`) on capture/dismissal/unmount; fresh `getCurrentPosition` satellite fix enforcing the ≤ 100m horizontal accuracy threshold (AT-01, AT-02).
4. **Private Storage & Time-Limited Audit URLs:** Selfies upload to private bucket `attendance-selfies/${userId}/...`. Country Sales Heads inspect evidence via 300-second ephemeral signed URLs (`createSignedUrl(path, 300)`). No public URLs or biometric matching claims.
5. **Workday Persistence & Cross-Session Restoration:** On load, the app queries `attendance_days` for the user's market workday date (`Africa/Lagos`, `Africa/Lusaka`, `Africa/Blantyre`), restoring active `'started'` or completed `'ended'` states. Dynamic provider keys (`field-${currentUser.id}`) guarantee zero cross-user state leaks on logout.
6. **Active Visit Workday Closure Guard (PRD §6.1 / AT-03):** End Day modal evaluates active visit state and strictly hard-blocks workday closure while a client visit session remains in progress.
7. **Non-Visit Workday Governance:** Salesperson-authored non-visit requests (`request_non_visit_workday`) and manager reviews (`review_non_visit_workday`) populate `public.approved_absences` with `counts_as_attendance = TRUE, counts_as_visit_target = FALSE`, protecting attendance compliance with zero physical visit target credits.
8. **Next Phase (Stage 3C):** Live Supabase database writes for physical client visit check-in/out (`public.visits`), server-side 200m geofencing, premises photography, and meeting log documentation. Do not begin Stage 3C without explicit user instruction.

## 16. Instructions for every future user prompt

Before executing a new instruction, inspect `AGENTS.md` and this project guide, review the current stage and relevant PRD sections, and determine whether the user requested a feature outside scope. Apply the smallest coherent change. Do not treat an instruction to adjust a screen as blanket permission to start subsequent backend stages. If the user explicitly approves a stage transition, document that approval and move to the next stage.

**Response template at completion:**

- Implemented: ...
- Files changed: ...
- Verified/tested: ...
- Not yet complete / limitations: ...
- Next approval needed: ...
