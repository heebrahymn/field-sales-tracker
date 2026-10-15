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
5. **Apply official branding.** Use the supplied Carbon Car Care logo from `public/brand/carbon-car-care-logo.png`; blue `#21409A`, green `#1B9A4A`, yellow `#E8CF2F`. Never invent or redraw the logo.
6. **Prefer durable implementations, not superficial demos.** Clearly identify mock data versus real functionality; preserve code quality, accessibility, and testing.
7. **Keep security and evidence honest.** GPS does not conclusively prove a meeting; no claims of tamper-proof browser data, spoof-proof geolocation, or uninterrupted offline sync.
8. **At the end of every task:** report what changed, files modified, tests performed, limitations, and whether approval is needed before advancing.
9. **If new user instructions conflict with the guide**, identify the discrepancy, request clarification when material, and update the relevant project document after approval rather than silently changing scope.

> Keep this file at the project root. Do not move the referenced guide unless you also update the include path above.
