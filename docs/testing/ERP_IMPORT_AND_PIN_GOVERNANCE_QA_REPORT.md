# Carbon Field Sales Tracker — ERP Client Master Import Without GPS & Pin Governance QA Report

**Document Date:** October 31, 2026  
**Status:** 100% Verified (10/10 Acceptance Points Passing)  
**Test Suites:** 15/15 Vitest Files (207/207 Tests Passing), Live Supabase Integration Suite Passing, Production Vite Build Succeeded (0 Errors)

---

## 1. Executive Summary

This QA report documents the end-to-end verification of the **ERP Client Master Import Without GPS Coordinates & Field Pin Proposal Governance** workflow for Carbon Car Care.

The existing corporate ERP database contains client organisations, physical depots, street addresses, and telephone contacts, but omits GPS coordinates. The application has been updated to treat latitude and longitude as strictly optional during import while maintaining full compliance with PRD v1.2 anti-spoofing and location verification boundaries.

---

## 2. 10/10 Acceptance Criteria Matrix

| # | Acceptance Requirement | Implementation / Architectural Component | Automated & Live Verification | Status |
|---|---|---|---|---|
| **1** | HQ Admin can import valid ERP organisations and physical locations without coordinates. | `HqClientMasterImport.tsx` (`parseClientMasterCsv`), `adminService.processClientMasterImport` | Tested with RFC-4180 parser & live PostgREST API ingestion | **VERIFIED** |
| **2** | Imported physical locations are stored as `location_pending` and remain selectable by authorised salespeople. | `public.branches.operating_status = 'location_pending'`, `FieldSessionContext.tsx` | Verified via Supabase dev project query & rep branch selector dropdown | **VERIFIED** |
| **3** | Rep visiting an unpinned location captures fresh GPS on physical phone and submits pin proposal with accuracy, timestamp, and supporting premises photo. | `RegisterBranchModal.tsx` (`mode="propose_pin"`), live camera viewfinder & GPS sensor fix | Verified via camera preview capture & `propose_branch_location_pin` RPC | **VERIFIED** |
| **4** | GPS proposal is linked to correct organisation and physical location. | `branch_location_pins.branch_id = branchId`, `branch_location_pins.proposed_by = auth.uid()` | Confirmed foreign key linkage and version increment in Supabase | **VERIFIED** |
| **5** | Country Sales Head approves or rejects proposal through real Supabase approval queue. | `BranchApprovalsQueue.tsx`, RPC `approve_branch_location_pin` / `reject_branch_location_pin` | Tested live with Country Sales Head (`babatunde.adeleke@carboncarcare.com`) session | **VERIFIED** |
| **6** | Approval activates versioned GPS pin without modifying historical visit evidence. | RPC `approve_branch_location_pin` deactivates older pins, sets `is_active = true`, updates `operating_status = 'active'`, preserves historical visits | Verified row immutability and `approval_audit` event logging | **VERIFIED** |
| **7** | Salespeople have authorized method to record first meeting at unpinned location as location-unverified using approved exception process. | `VisitWorkflowView.tsx` ("Record Meeting via Exception"), `CreateExceptionModal.tsx`, RPC `review_salesperson_exception` | Confirmed resulting visit has `verification_status = 'manager_approved_unverified'` | **VERIFIED** |
| **8** | Pending GPS proposal never automatically counts as `location_verified`. | DB trigger `trg_validate_visit_location_verification`, PostGIS geofence evaluation | Verified check-in blocked in UI and rejected by DB trigger if unapproved | **VERIFIED** |
| **9** | Future visits can use approved GPS pin for backend-authoritative geofence verification. | `branch_location_pins.is_active = true`, PostGIS `ST_Distance(geom, pin_geom)` | Confirmed active pin is returned to rep for standard 200m geofence evaluation | **VERIFIED** |
| **10** | Client records without confirmed physical location are never assigned fabricated locations or GPS pins. | `adminService.ts`, `HqClientMasterImport.tsx` | Verified 0 pins created during unpinned import; lat/lng remain null | **VERIFIED** |

---

## 3. Automated Test Evidence

### 3.1 Vitest Suite (Local Unit & Component Integration)
```bash
> carbon-field-sales-tracker@0.1.0 test
> vitest run

Test Files  15 passed (15)
     Tests  207 passed (207)
  Duration  17.37s
```
- **New Test Suite:** `src/test/erp-import-and-pin-proposal.test.tsx` (8/8 scenarios passing).
- **Regression Suites:** `stage-3e-manager-hq.test.tsx` (26/26 passing), `stage-3c-client-visits.test.tsx` (20/20 passing), `salesperson-client-selection.test.tsx` (10/10 passing), `pre-stage-3-corrections.test.tsx` (15/15 passing).

### 3.2 Live Supabase Dev Project Integration Test (`scripts/test_erp_import_live_workflow.py`)
```text
================================================================================
CARBON FIELD SALES TRACKER — ERP CLIENT IMPORT WITHOUT GPS LIVE DB TEST
================================================================================

[Step 1] Authenticating Role Sessions against Supabase Dev Project...
  Authenticated HQ Admin, Country Sales Head (NG), and Field Salesperson (NG).

[Step 2] Acceptance Point 1 & 2: Importing ERP Client without GPS Coordinates...
  Created Organisation: Apex Industrial Transit 25bfa7 (ID: b9eedf58-b51a-4e17-ae4a-c256a0f17af2)
  Created Unpinned Branch: Apapa Port Gate 25bfa7 (ID: e746dd54-10b7-4f80-a05d-d60a5acd02b7)
  Confirmed operating_status is 'location_pending'
  Acceptance Point 10 Verified: 0 pins exist (no fabricated GPS coordinates assigned).

[Step 3] Acceptance Point 2: Salesperson Selects Unpinned Branch...
  Confirmed branch is visible and selectable by salesperson (Status: location_pending)

[Step 4] Acceptance Point 3 & 4: Salesperson Proposes Physical GPS Pin...
  Submitted Pin Proposal via RPC propose_branch_location_pin (Pin ID: 2770b933-43a7-4ad9-9750-8b35981ca806)
  Confirmed pin record created: status='pending_review', is_active=false, version=1

[Step 5] Acceptance Point 8: Enforcing Pending Proposal Invariant...
  Confirmed pending pin is is_active=false; trigger trg_validate_visit_location_verification blocks verified check-in.

[Step 6] Acceptance Point 7: Recording First Meeting via Exception Process...
  Submitted Visit Exception for Unpinned Meeting (ID: 64537f24-5e12-47a7-a6e2-23588e2bec9a)

[Step 7] Acceptance Point 5 & 6: Country Sales Head Approves GPS Pin...
  Country Sales Head approved GPS pin via RPC approve_branch_location_pin.
  Acceptance Point 6 Verified: Pin is active (version 1), branch is active.

[Step 8] Acceptance Point 7 & 8: Country Sales Head Approves Exception...
  Country Sales Head approved exception via RPC review_salesperson_exception.
  Confirmed visit record created: verification_status='manager_approved_unverified' (NEVER location_verified).

[Step 9] Acceptance Point 9: Future Visits Use Approved Pin for Geofencing...
  Confirmed active pin is available for rep geofence check (Pin: 6.4474, 3.3591)

[Step 10] Cleaning up synthetic test artifacts from dev database...
  Cleaned up synthetic test records.

================================================================================
ALL 10 ACCEPTANCE POINTS SUCCESSFULLY VERIFIED AGAINST LIVE SUPABASE DEV PROJECT!
================================================================================
```

### 3.3 TypeScript & Vite Production Build
```bash
> carbon-field-sales-tracker@0.1.0 build
> tsc -b && vite build

vite v6.4.4 building for production...
✓ 2043 modules transformed.
✓ built in 6.33s
```
0 TypeScript compilation errors; production bundles generated without defects.

---

## 4. Manual Testing Walkthrough Protocol for Stakeholder

When verifying this feature locally:

1. **HQ Admin Import:**
   - Log in as HQ Admin (`hq.admin@carboncarcare.com`).
   - Navigate to **Client Master Import** (`/admin/clients`).
   - Click **Download Template** to inspect the RFC-4180 CSV layout with optional `Latitude` and `Longitude` headers.
   - Click **Choose CSV File** or **Load Sample ERP Data (NG)**.
   - Observe rows without GPS display amber badge `[Location Pending: Missing GPS Pin]`.
   - Click **Validate & Ingest Batch**.
   - Verify unpinned branches are saved with `operating_status = 'location_pending'`.

2. **Salesperson Pin Proposal:**
   - Log in as Salesperson (`tunde.adebayo@carboncarcare.com`).
   - Navigate to **Client Visits** (`/field/visits`).
   - Search for the imported client and select the unpinned location.
   - Observe warning card: *"Pending Manager Approval: This imported ERP location does not have an approved GPS pin yet."*
   - Click **Propose Physical GPS Pin**.
   - The modal opens in **Propose Physical Location Pin** mode with client details locked.
   - Click **Recalibrate GPS** and **Open Live Camera** (or **Generate Snapshot**).
   - Click **Submit Physical Pin Proposal (Stage 3E Queue)**.
   - Observe confirmation dialog and return to visit view.

3. **Record Meeting via Exception (Location-Unverified):**
   - On the same unpinned location screen, click **Record Meeting via Exception (Location-Unverified)**.
   - The exception claim modal opens pre-populated with the unpinned branch and initial rationale.
   - Submit the exception claim.

4. **Country Sales Head Review:**
   - Log in as Country Sales Head (`babatunde.adeleke@carboncarcare.com`).
   - Navigate to **GPS Pin Approvals** (`/review/approvals`).
   - Inspect the pending proposal with its live premises photo and GPS coordinates.
   - Enter mandatory justification and click **Approve Pin**.
   - Navigate to **Exceptions Queue** (`/review/exceptions`).
   - Approve the unpinned meeting exception; verify the resulting visit is classified as **Manager Approved — Location Unverified**.

