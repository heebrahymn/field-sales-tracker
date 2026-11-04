# ADR 0020: ERP Client Master Import Without GPS Coordinates & Field Pin Proposal Governance

## Status
Accepted

## Context
In Carbon Car Care's operational enterprise landscape, B2B client organizations and branches extracted from the legacy Enterprise Resource Planning (ERP) database frequently omit GPS coordinates (latitude and longitude). Historically, ERP records contain company legal names, branch trading titles, street addresses, landmarks, and contact phone numbers, but lack verified physical coordinates.

Prior to this decision, the client master CSV importer expected coordinates for all entries or treated unpinned branches inconsistently across the field visit workflow. 

To maintain strict alignment with PRD v1.2 (§4.2 Client and Branch Registration, §7.1 Physical Visit Verification, §7.4 Salesperson-Originated Exceptions, and §8.4 Anti-Spoofing & PostGIS Validation), the application required complete end-to-end governance ensuring:
1. Coordinates are strictly optional during HQ Admin CSV import.
2. Imported branches without coordinates are persisted with `operating_status = 'location_pending'`.
3. Reps visiting unpinned branches can capture fresh GPS readings on company-issued phones and propose physical location pins.
4. Country Sales Heads review and activate pins via authoritative Supabase RPCs.
5. First client meetings at unpinned locations can be recorded through the salesperson exception process as `manager_approved_unverified`.
6. Client records without confirmed physical locations must NEVER be assigned fabricated GPS coordinates.

## Decision
1. **RFC-4180 Compliant CSV Ingestion with Optional GPS:**
   - Implemented `parseClientMasterCsv` in `src/features/admin/HqClientMasterImport.tsx`.
   - Recognizes optional `Latitude` and `Longitude` columns; rows lacking valid floating-point coordinates are parsed with `status = 'warning_location_pending'` and validation message: `"Location Pending: Missing GPS pin. Rep must propose physical pin during first visit."`
   - Added real file picker `<input type="file" accept=".csv,text/csv" />` with "Choose CSV File" button and "Download Template" button exporting `generateErpClientMasterTemplate`.

2. **Database Ingestion & Pin Governance Invariant:**
   - Enhanced `adminService.processClientMasterImport` in `src/services/adminService.ts`.
   - For rows without GPS, the branch is created with `operating_status = 'location_pending'` and NO record is inserted into `public.branch_location_pins`.
   - If an existing branch already has an approved active pin, re-importing without GPS does not downgrade or alter its active status.
   - For rows with valid GPS, `operating_status` is `'active'`, and an initial pin is created only if no active approved pin already exists.

3. **Field Salesperson Physical Pin Proposal Mode:**
   - Enhanced `RegisterBranchModal.tsx` to support `mode?: 'register' | 'propose_pin'` and `defaultBranch?: ClientBranch | null`.
   - In `propose_pin` mode, the modal locks company name, branch name, category, and street address to the unpinned branch.
   - Focuses the salesperson on capturing fresh GPS coordinates (requiring accuracy ≤ 50m) and capturing a live premises photo using the camera viewfinder.
   - On submission, uploads the live photo to `visit-premises-photos` and invokes PostgreSQL RPC `public.propose_branch_location_pin(p_branch_id, p_latitude, p_longitude, p_accuracy_m, p_photo_url)`.
   - Computes `v_next_version` dynamically, marks the proposed pin as `status = 'pending_review'`, `is_active = false`, and links it directly to the branch.

4. **Visit Screen Unpinned Location Handling:**
   - In `src/features/field/VisitWorkflowView.tsx`, unpinned branches and pending pin locations display prominent guidance with two dedicated actions:
     - **Propose Physical GPS Pin (Stage 3E Queue):** Opens `RegisterBranchModal` in `propose_pin` mode with target branch pre-selected.
     - **Record Meeting via Exception (Location-Unverified):** Opens `CreateExceptionModal` with `defaultBranchId` pre-selected and pre-filled rationale for first meetings at unpinned locations.
   - Normal verified check-in is strictly blocked until Country Sales Head approval.

5. **Authoritative Country Sales Head Approval & Exception Adjudication:**
   - Country Sales Heads inspect proposed pins in `src/features/review/BranchApprovalsQueue.tsx` with high-resolution premises photos and coordinates.
   - Approval invokes RPC `approve_branch_location_pin(p_pin_id, p_reason)` which deactivates prior pins, activates the new pin (`is_active = true`), updates `branches.operating_status = 'active'`, and records audit history.
   - Reviewing the unpinned meeting exception invokes RPC `review_salesperson_exception(p_exception_id, p_status, p_reason)`. If approved, an exception visit is recorded with `verification_status = 'manager_approved_unverified'`, strictly preventing unpinned visits from becoming `location_verified`.

## Consequences
- **Positive:** Full compatibility with ERP systems lacking GPS coordinates without compromising anti-spoofing or audit rigor.
- **Positive:** Reps have an intuitive, authorized path to propose pins and log initial meetings on company devices.
- **Positive:** Zero fabrication of coordinates; branches without pins remain explicitly unpinned until physically verified on site.
- **Verification:** Verified via 207/207 Vitest unit and integration tests (including 8 new ERP import scenarios) and 100% pass across all 10 acceptance points in live Supabase dev project testing (`scripts/test_erp_import_live_workflow.py`).

