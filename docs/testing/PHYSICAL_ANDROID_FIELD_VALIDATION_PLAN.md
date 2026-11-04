# Carbon Field Sales Tracker — Physical Android Field Validation Plan & Pilot Handover

**Document Version:** 1.1 (RC 1.0.0 Physical Field Pilot Handover)  
**Date:** November 4, 2026  
**Project:** Carbon Field Sales Tracker (`rc-1.0.0-uat-verified`)  
**Controlled Staging URL:** https://field-sales-tracker-b6l7.vercel.app/  
**Authorised Backend:** Hosted Supabase Development Project (`[SUPABASE_PROJECT_ID]`, 29 Migrations)  
**Target Hardware:** Samsung Galaxy A15 (Primary Company Handset) & Nokia G22 (Secondary Approved Handset)  
**Operating System:** Android 14 (One UI 6.x) / Android 13  
**Target Runtime:** Google Chrome (Latest Stable) Installed as Standalone PWA  
**Operating Markets:** Nigeria (`Africa/Lagos`), Zambia (`Africa/Lusaka`), Malawi (`Africa/Blantyre`)  
**Physical Execution Status:** **NOT TESTED ON PHYSICAL HARDWARE — AWAITING LOCAL FIELD PILOT EXECUTION**

---

## 1. Purpose, Governance & Honesty Boundaries

Automated regression suites, direct Supabase RLS/API security checks, local/staging Playwright verification, and full Project Owner manual UAT across all 19 accepted defect retests (`DEF-001`–`DEF-019`) are complete. However, **browser emulation does not replace testing on actual company-issued Android handsets**.

This document serves as the authoritative **Physical Android Pilot Handover** for local IT coordinators, pilot salespeople, Country Sales Heads, and HQ Administrators executing physical validation on **Samsung Galaxy A15** and **Nokia G22** company phones prior to unrestricted multi-market rollout.

### Mandatory Operational Rules During Pilot
- **Authorised Pilot Accounts Only:** Authenticate strictly using the securely supplied pilot test credentials for each role (HQ Admin, Country Sales Head, Salesperson) and approved pilot client/branch records. Never record passwords or tokens in test logs or screenshots.
- **Controlled Staging Scope:** `https://field-sales-tracker-b6l7.vercel.app/` is a controlled testing deployment connected to the authorised Supabase development project, not an unrestricted employee production environment.
- **Approved GPS Accuracy & Geofence Baselines (Preserved):**
  - Attendance (`Start Workday` / `End Workday`) & Normal Client Visits: **≤ 100 m** maximum reported GPS uncertainty.
  - Proposed Branch GPS Pins (Field Registration / Pin Proposal): **≤ 50 m** maximum reported GPS uncertainty.
  - Default Branch Geofence Radius: **200 m** (evaluated with reported GPS uncertainty by authoritative server-side PostGIS).
- **No Unreported Threshold Drift:** Any temporary GPS threshold adjustment may only be performed during **controlled development testing** (`GNSS-04`), must preserve prospective `market_rules` version history, and **must immediately restore the approved ≤ 100 m / ≤ 50 m / 200 m configuration** before continuing.
- **Honest Storage & Hardware Caveats:** Android battery settings, browser storage quotas, and device clocks are **not tamper-proof or guaranteed**. Never claim physical validation has passed until local field testers return actual handset results and evidence.

---

## 2. Target Handset Specifications & Commissioning Baseline

| Parameter | Primary: Samsung Galaxy A15 | Secondary: Nokia G22 |
|---|---|---|
| **Chipset** | MediaTek Helio G99 (6 nm) / Dimensity 6100+ | Unisoc T606 (12 nm) |
| **RAM / Storage** | 4 GB / 128 GB | 4 GB / 64 GB or 128 GB |
| **OS Version** | Android 14 (One UI 6.x) | Android 13 |
| **Rear Camera** | 50 MP, f/1.8 (Main) + 5 MP + 2 MP | 50 MP, f/1.8 (Main) + 2 MP |
| **Front Camera** | 13 MP, f/2.0 | 8 MP, f/2.0 |
| **GNSS Constellations** | GPS, GLONASS, GALILEO, BDS, QZSS | GPS, GLONASS, GALILEO |
| **Battery Capacity** | 5,000 mAh | 5,050 mAh |

### Handset Pre-Configuration Checklist (Local IT Coordinator)
1. **Verify Fleet Custody Status in HQ Admin:** Confirm the physical handset's Company Asset ID / Serial Number is registered in `HQ Admin → Company Devices & MDM`, cleared as **`Available`**, and formally assigned to the pilot salesperson (`Assigned` / `Active`).
2. **Standalone PWA Installation:** Open Google Chrome on the handset, navigate to `https://field-sales-tracker-b6l7.vercel.app/`, open the Chrome menu, and tap **Install app** (or **Add to Home screen**). Launch exclusively from the installed Carbon home-screen icon.
3. **OS Permission Grants:**
   - **Location:** `Settings → Apps → Chrome / Carbon Tracker → Permissions → Location` → **Allow only while using the app** + **Use precise location = ON**.
   - **Camera:** `Settings → Apps → Chrome / Carbon Tracker → Permissions → Camera` → **Allow only while using the app**.
4. **Battery Management Advisory (Important Non-Guarantee):**
   - Set `Settings → Apps → Carbon Tracker / Chrome → Battery` to **Unrestricted** to reduce aggressive background tab suspension during active shifts.
   - **Important Caveat:** Android battery optimisation settings **do not guarantee** offline IndexedDB data preservation. OEM memory cleaners (One UI / Android low-memory killer), OS updates, browser storage eviction, or manual cache clearing can still purge unsynced browser data. If unrecoverable local storage loss ever occurs, the salesperson must submit an honest post-recovery exception rather than assuming guaranteed retention.
5. **Free Flash Storage:** Confirm at least **5 GB** of free internal storage before starting offline media tests.

---

## 3. Physical Handset Validation Suites (10 Handover Areas)

### Suite 1: Real GPS Acquisition, Accuracy Rules & Temporary Dev Rule Test
*Note on Acquisition Times:* Fast Time-to-First-Fix (TTFF) figures below (`< 8s` open sky, `< 15s` urban canopy) are **hardware performance targets**, not unconditional application software failures. Cold GNSS ephemeris downloads, weather, metal roofs, and chipset variance (especially on Unisoc T606 in Nokia G22) may require longer acquisition or a manual retry. An **application failure** occurs only if the app crashes, accepts coordinates violating active accuracy rules without flagging/blocking, fabricates coordinates, or fails to offer retry/exception paths.

| Test ID | Scenario & Procedure | Target Hardware Benchmark | Application Pass Criteria |
|---|---|---|---|
| **GNSS-01** | **Open-Sky Cold GNSS Fix:** Stand outdoors with clear sky view on Samsung Galaxy A15 and Nokia G22. Launch PWA and open `Start Workday`. | TTFF `< 8s–12s`; accuracy `≤ 20 m`. | App acquires live hardware GNSS fix within approved **≤ 100 m** threshold, displays exact `±Xm` uncertainty badge, and enables submission. |
| **GNSS-02** | **Urban Canopy / Multi-Path Reflection:** Test near multi-storey commercial buildings or port container stacks. | TTFF `< 15s–25s`; accuracy `≤ 50 m`. | If initial fix exceeds threshold or times out, **Retry GPS Fix** cleanly re-queries GNSS; any reading **≤ 100 m** is accepted for attendance/visits. |
| **GNSS-03** | **Covered Metal Workshop / Poor Sky View:** Stand inside a corrugated-metal fleet bay where accuracy degrades (`> 100 m`) or times out. | Degraded or blocked GNSS expected. | App does **not** crash or invent coordinates; blocks normal verified check-in above **100 m** uncertainty, prompts moving toward sky view to retry, and permits reasoned **GPS Failure Exception** if unresolvable. |
| **GNSS-04** | **Controlled Dev Threshold Test & Mandatory Restoration:** *(Controlled development/staging test only)* HQ Admin updates market `max_visit_gps_accuracy_m` (e.g., to `120 m`), verifies versioned `market_rules` history, tests salesperson refresh, then **immediately restores `100 m`**. | Rule propagation `< 5s` on refresh. | New rule version created in `market_rules` + `approval_audit` without altering prior visits; salesperson app adopts updated threshold on refresh; **approved baseline (`≤ 100 m` visits, `≤ 50 m` pins, `200 m` geofence) confirmed restored immediately after test**. |

---

### Suite 2: Front-Camera Attendance Selfies & Rear-Camera Premises Photos

| Test ID | Scenario & Procedure | Application Pass Criteria |
|---|---|---|
| **CAM-01** | **Front-Camera Attendance Selfie (`Start Workday`):** Open `Start Workday` on Galaxy A15 and Nokia G22. Capture live selfie, tap `Retake`, capture final selfie. | Front camera (`user` facing mode) opens smoothly; privacy notice confirms visual audit only (no biometric/face-recognition claim); retake releases and re-acquires stream without WebRTC freeze; JPEG preview renders cleanly. |
| **CAM-02** | **Rear-Camera Premises Photograph (`Client Check-In`):** At an approved branch, initiate visit check-in and capture live premises signage photo. Verify camera switcher if needed. | Rear camera (`environment` facing mode) engages with working autofocus; customer signage is legible; live camera capture enforced (no gallery upload spoofing); compressed binary saved cleanly. |
| **CAM-03** | **Optional Business Card Photo (`Meeting Log`):** During check-out meeting log completion, capture a physical business card under indoor office lighting. | Rear camera focuses on card text; photo attaches to meeting log and persists to private `business-cards` storage bucket. |
| **CAM-04** | **Permission Denial Recovery:** Temporarily deny camera or location permission in Chrome site settings, attempt capture, then re-grant. | App displays clear, non-crashing recovery guidance explaining how to re-enable OS/browser permissions. |

---

### Suite 3: Approved GPS Pin Workflow (`≤ 50 m` Rule)

| Test ID | Scenario & Procedure | Application Pass Criteria |
|---|---|---|
| **PIN-01** | **Field Client/Branch Registration & Pin Proposal:** Salesperson selects an ERP-imported `location_pending` branch (or registers a new branch sharing a parent company phone number) while standing at the physical gate. Captures proposed GPS pin and premises photo. | Enforces **≤ 50 m** GPS accuracy threshold for pin proposals; allows shared parent telephone across distinct branches with duplicate-review prompt rather than hard block; saves branch/pin in `pending_approval` state. |
| **PIN-02** | **Country Sales Head Pin Review & Activation:** Country Sales Head opens `Client & Pin Approvals`, inspects map coordinates, accuracy (`≤ 50 m`), and photo, and approves the pin. | Creates versioned `branch_location_pins` active record and `approval_audit` entry; branch becomes selectable for normal geofenced visits on the salesperson's phone after sync/refresh. |

---

### Suite 4: Full Attendance, Geofencing & Visit Lifecycle

| Test ID | Scenario & Procedure | Application Pass Criteria |
|---|---|---|
| **VIS-01** | **Start Workday:** Salesperson completes `Start Workday` with front selfie + GPS (`≤ 100 m`). | `attendance_days` row created (`status = 'started'`), device session bound, local market timezone (`Africa/Lagos`, `Africa/Lusaka`, or `Africa/Blantyre`) recorded. |
| **VIS-02** | **Inside 200 m Geofence Check-In:** Stand within `200 m` (accounting for GPS uncertainty) of an active approved branch pin. Capture rear premises photo and check in. | Preliminary client check passes; server PostGIS `ST_Distance` confirms `inside_confident`; only one open normal visit permitted at a time. |
| **VIS-03** | **Active Visit Task-Kill Recovery:** With an active visit open, swipe Chrome/PWA closed from Android Recents, wait 15 seconds, and relaunch from home screen. | Active visit session, branch context, and elapsed timer restore cleanly without stranding the salesperson. |
| **VIS-04** | **Check-Out Inside & Outside Geofence:** Complete one normal check-out on site with meeting log; on a second test visit, walk `> 250 m` from the pin before tapping `Check Out`. | On-site visit finalises as `location_verified` (without requiring client confirmation). Off-site check-out is **permitted** (never blocking visit closure) and raises `checkout_outside_geofence` flag for Country Sales Head review. |
| **VIS-05** | **Non-Visit Working Day & Exception Separation:** Test submitting (a) a Non-Visit Working Day request on a fresh test date/account and (b) a missed-visit / GPS-failure exception authored by the salesperson. | Approved non-visit day counts toward attendance only, never physical visit targets. Manager-approved exception remains **`Manager Approved — Location Unverified`**, never reclassified as GPS-verified. |
| **VIS-06** | **End Workday:** Complete `End Workday` with fresh GPS coordinates. | Workday closes (`status = 'ended'`), daily visit summary updates accurately. |

---

### Suite 5: Complete Five-Operation Offline Workday, Reboot & IndexedDB Retention

Execute this suite with **real Android Airplane Mode = ON** (mobile data and Wi-Fi completely disabled, **Location / GNSS remaining ON** so hardware satellite positioning operates offline without cellular A-GPS). Note that cold offline GNSS without network A-GPS assistance may take 30–90 seconds outdoors.

| Test ID | Scenario & Procedure | Application Pass Criteria |
|---|---|---|
| **OFF-01** | **Offline Pre-Cache Readiness:** While online, log in as pilot salesperson and verify Home + Clients list load. Enable **Android Airplane Mode** (confirm Wi-Fi & cellular data are OFF). | Service Worker serves app shell offline; status banner clearly indicates **Offline**; cached market rules and approved branches remain accessible; **zero In-App Simulator controls appear**. |
| **OFF-02** | **Offline Five-Operation Workday Lifecycle:** With Airplane Mode continuously ON, execute all five field operations in sequence:<br>1. **Start Workday** (front-camera selfie + hardware GNSS fix)<br>2. **Visit Check-In** at cached approved branch (hardware GNSS + live rear-camera premises photo)<br>3. **Visit Check-Out & Meeting Log** (check-out GNSS + narrative outcome + free-text next step + optional business card photo)<br>4. **Offline Branch Pin Proposal / Registration OR Salesperson Exception** (submit one offline exception or branch registration with photo)<br>5. **End Workday** (terminal workday closure + hardware GNSS fix) | All **5 operations** succeed offline without blocking modals; binary photos (`Blob` / `Uint8Array`) and ordered events are written to Dexie IndexedDB with UUID idempotency keys, monotonic sequence numbers, and parent dependency links; UI labels records **Provisional / Pending Sync**. |
| **OFF-03** | **Handset Power-Off & Cold Reboot While Offline:** Leaving Airplane Mode ON with all 5 operations queued in IndexedDB, power off the handset completely, wait 60 seconds, power back on, and launch the installed Carbon PWA. | IndexedDB event journal and binary photo blobs remain intact across handset reboot; `Offline Queue & Sync` displays the exact pending queue count and provisional status. *(Record any OEM storage anomalies honestly if observed.)* |
| **OFF-04** | **Supabase Reconnection, Topological Sync & Duplicate Prevention:** Disable Airplane Mode to restore 4G/Wi-Fi. Observe automatic/manual `Sync Now` execution; partway through or immediately after, tap `Sync Now` again (or toggle brief network drop + retry) to test idempotency. | Private media uploads complete first, followed by topological FIFO event ingestion (`Start Day → Check-In → Check-Out/Meeting Log → Exception/Registration → End Day`). Server re-validates PostGIS geofence and timestamps. **Zero duplicate `attendance_days`, `visits`, `meeting_logs`, or `exceptions` rows** are created in Supabase (`idempotency_key` deduplication verified). |

---

### Suite 6: Device Replacement, Custody Integrity & Account Security

| Test ID | Scenario & Procedure | Application Pass Criteria |
|---|---|---|
| **SEC-01** | **Direct Salesperson → HQ Admin Device Replacement (`Zero CSH Bottleneck`):** Salesperson navigates to `Profile → My Device → Report Device Issue` and submits a replacement request. Inspect as Country Sales Head and HQ Admin. | Request routes **directly to HQ Admin**; Country Sales Head has zero approval/intermediary bottleneck and cannot approve/reject hardware replacements. |
| **SEC-02** | **Distinct Custody Lifecycle States (`Pending Inspection` vs `Returned` vs `Available`):** HQ Admin approves replacement, allocates an **`Available`** spare handset, records dispatch, and confirms activation.<br>1. First test default/unreturned old handset (`Pending Return & Inspection / Quarantined`).<br>2. Record physical receipt at IT depot (`Returned`).<br>3. Complete IT inspection/wipe clearance (`Available`).<br>Also test handset reassignment superseding an existing handset. | - Superseded or unreturned handsets transition to **`Pending Inspection`** (`quarantined`), **never** falsely marked physically `Returned` or `Available`.<br>- Physical depot receipt transitions handset to **`Returned`**, which remains **non-assignable** until IT clears it.<br>- Only **`Available`** handsets appear in HQ assignment/provisioning/spare pools. |
| **SEC-03** | **Account & Role Isolation on Handset:** Verify salesperson cannot view other reps' visits or access `/admin` or `/review` routes; verify deactivated user session loses operational write access and their handset moves to `Pending Inspection` (`revoked`). | Strict RBAC and country-scoped RLS enforced by Supabase backend on all physical handset requests. |

---

### Suite 7: Country Sales Head Desktop/Tablet Evidence Review

| Test ID | Scenario & Procedure | Application Pass Criteria |
|---|---|---|
| **CSH-01** | **End-to-End Evidence Inspection:** Country Sales Head logs in for the pilot market and reviews the physical handset submissions across:<br>- `Team Attendance` (signed URL front selfie + start/end GPS accuracy)<br>- `Visit Reviews` (signed URL rear premises photo, PostGIS distance-to-pin, Leaflet map pin vs check-in coordinate, meeting log)<br>- `Exceptions` (approves test exception and confirms status reads **`Manager Approved — Location Unverified`**)<br>- `Risk Flags` (reviews `checkout_outside_geofence` / `late_offline_sync` flags with reviewer rationale)<br>- `5% Weekly Client Audit Workbench` (logs audit call outcome; verifies client denial triggers `Disputed — Under Investigation` without automatic disciplinary action)<br>- `Country CSV Export` (verifies safe CSV download) | All signed media URLs load from private Storage buckets (`attendance-selfies`, `visit-premises-photos`, `business-cards`, `exception-evidence`, `device-issue-photos`); Country Sales Head sees strictly their assigned market; location verification, client confirmation, and manager exception states remain strictly separated. |

---

## 4. Pilot Execution Log & Sign-Off Template (To Be Completed by Field Testers)

> **Current Status:** `NOT EXECUTED` — Do not populate Pass results below until physical handset testing has been performed and evidenced by local pilot assessors.

| Handset / Role | Market Hub | Device Model & OS | Company Asset ID | Suites Executed | Actual Findings / Defects | Assessor & Date | Status |
|---|---|---|---|---|---|---|:---:|
| Pilot Handset 1 | Nigeria (`NG`) | Samsung Galaxy A15 | *To be recorded* | Suites 1–6 | *Awaiting physical pilot* | *Pending* | **NOT TESTED** |
| Pilot Handset 2 | Nigeria (`NG`) | Nokia G22 | *To be recorded* | Suites 1–6 | *Awaiting physical pilot* | *Pending* | **NOT TESTED** |
| Pilot Handset 3 | Zambia (`ZM`) | Samsung Galaxy A15 | *To be recorded* | Suites 1–6 | *Awaiting physical pilot* | *Pending* | **NOT TESTED** |
| Pilot Handset 4 | Malawi (`MW`) | Samsung Galaxy A15 | *To be recorded* | Suites 1–6 | *Awaiting physical pilot* | *Pending* | **NOT TESTED** |
| Country Review | `NG` / `ZM` / `MW` | Desktop / Tablet | N/A | Suite 7 | *Awaiting physical pilot* | *Pending* | **NOT TESTED** |
