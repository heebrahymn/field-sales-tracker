# Carbon Field Sales Tracker — Always-On Antigravity Instructions

These instructions apply to **every task** inside this project workspace. Antigravity should automatically load this root `AGENTS.md` when operating in the workspace.

## Mandatory reference

The complete, versioned project guide is included below. Treat it as a persistent baseline for planning, generating code, testing, reviewing designs, and responding to future instructions:

@[Carbon Field Sales Master Guide](docs/ANTIGRAVITY_MASTER_PROMPT.md)

## Rules for every request

1. **Read the project guide and check the latest approved PRD first.** If `docs/Carbon_Field_Sales_Tracker_PRD_v1.2_MVP_Updated.pdf` is readable, it is the authoritative functional specification. Never pretend to have read it if parsing is unavailable.
2. **Maintain the approved phase boundary.** Unless I explicitly approve the next stage, work only within the currently approved stage. Initial stage is planning and frontend with mock data; do not implement live backend operations initially.
3. **Observe MVP exclusions.** No quotation management, follow-up tasks/reminders, orders, pipeline, revenue analytics, invoicing, or ERP/CRM integration in MVP.
4. **Preserve business permissions.** Only salespeople create visit, missed-visit, GPS-failure, and device-failure logs. Managers review/approve/reject but cannot create them for salespeople.
5. **Apply official branding.** Use the supplied Carbon Car Care logo from `public/brand/carbon_logo.png`; blue `#21409A`, green `#1B9A4A`, yellow `#E8CF2F`. Never invent or redraw the logo.
6. **Prefer durable implementations, not superficial demos.** Clearly identify mock data versus real functionality; preserve code quality, accessibility, and testing.
7. **Keep security and evidence honest.** GPS does not conclusively prove a meeting; no claims of tamper-proof browser data, spoof-proof geolocation, or uninterrupted offline sync.
8. **At the end of every task:** report what changed, files modified, tests performed, limitations, and whether approval is needed before advancing.
9. **If new user instructions conflict with the guide**, identify the discrepancy, request clarification when material, and update the relevant project document after approval rather than silently changing scope.
10. **Direct Salesperson → HQ Admin Device Replacement Workflow.** Per approved architectural decision, salespeople submit company device replacement requests directly to HQ Admin under Profile → My Device → Report Device Issue. Country Sales Heads have read-only visibility where operationally appropriate and do not act as an approval intermediary. Hardware replacement requests are administrative records and remain strictly separate from field visit exception logs.
11. **Mandatory Documentation & Milestone Completion Standard.** Every Antigravity development milestone must include:
    - Implementation of approved functionality.
    - Automated and applicable manual testing.
    - Security and permission verification.
    - Documentation updates (`README.md`, `CHANGELOG.md`, `ROADMAP.md`, ADRs, and test reports).
    - Updated development status and roadmap.
    - Implementation completion report.
    - GitHub commit only after required approval.
    *Never mark a development stage complete without updating its documentation.* Future agents must read the existing project documentation (`docs/`, ADRs, architecture plans) before modifying the application, and must preserve all approved business rules without contradictory revisions.
12. **Real vs. Mock Operational Demarcation.** Live features backed by Supabase persistence (Stage 3A Auth, Stage 3B Attendance, Stage 3C Client Visits, Authoritative PostGIS Geofencing, Private Premises Photos & Meeting Logs) must be clearly distinguished from mock or simulated components (Stage 3D Offline Journal, Stage 3E Manager Queues). Real backend services must never silently fall back to mock data or fabricate GPS/selfie/premises evidence upon failure.
13. **Strict Deployment, Git Push & Cloud Boundaries.** Never push code to remote Git repositories (`origin/main`) or trigger Vercel production deployments without explicit user review and written approval of the completed milestone report. Do not begin Stage 3D implementation without explicit user instruction.

> Keep this file at the project root. Do not move the referenced guide unless you also update the include path above.
