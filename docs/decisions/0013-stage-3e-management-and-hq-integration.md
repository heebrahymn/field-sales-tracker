# ADR 0013: Stage 3E Management Console, Country Sales Head & HQ Administration Integration

- **Status:** Accepted & Checkpointed (187/187 Passing Vitest Tests including 17 Stage 3E Integration Tests + Complete Live Supabase Integrity Suite + 15 Multi-Viewport Browser Screenshots)
- **Date:** 2026-10-28
- **Project:** Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
- **Reference:** PRD v1.2 (MVP Updated) §3, §4.2, §6.2, §6.5, §7.1, §7.3, §7.5, §8.1, §8.2, §8.3, §10; Acceptance Tests AT-06, AT-07, AT-08, AT-09, AT-10, AT-13, AT-14, AT-15
- **Database Ref:** `[SUPABASE_PROJECT_ID]` (Hosted Supabase Development Project)
- **Preceding Checkpoint:** Stage 3D (`9ded0987ff737902e03c21876e5559066b254d05`, annotated tag `stage-3d-offline-sync-approved`)

---

## 1. Context & Objectives

In Stages 3A–3D, the salesperson mobile-first experience was connected to real Supabase authentication, attendance, PostGIS geofencing, camera evidence, meeting logs, and a durable offline IndexedDB journal (`Dexie.js`).

Stage 3E connects the **Country Sales Head (CSH) management console** and the **Enterprise HQ Administrator console** to real Supabase tables, views, RPCs, private storage buckets, and PostgreSQL Row-Level Security (RLS) policies.

The core objectives of Stage 3E are:
1. Connect Country Sales Head operational review queues to real data (attendance review, visit evidence inspection with signed URLs, GPS pin approvals, exception adjudication, risk flags review, and client audit calls).
2. Guarantee strict security and data-integrity boundaries: managers and HQ admins **never** originate salesperson attendance, GPS fixes, visit records, or camera photographs.
3. Enforce the invariant that approved missing-GPS visit exceptions remain `manager_approved_unverified` and are **never** converted into GPS/location verified.
4. Implement the **Zero Bottleneck Company Device Replacement** workflow (PRD §6.5), where salespeople submit hardware replacement requests directly to HQ Admin with zero Country Sales Head approval or intermediary gate.
5. Provide safe, audited country CSV exports protected against CSV formula injection (CWE-1236) and logged into `public.export_jobs`.
6. Implement the Client Master ERP CSV import pipeline logging to `public.import_batches`, where branches without GPS coordinates are marked `location_pending` and multiple branches of the same organisation may legitimately share switchboard phone numbers per PRD §4.2.

---

## 2. Architectural Decisions

### Decision 1: Strict Country Sandboxing & Non-Origination Invariant
Country Sales Heads are strictly locked to their assigned national market (`profiles.market_code = branches.market_code`). Database RLS policies and API layer functions verify that CSH cannot query or mutate records from other countries.

Furthermore, management roles possess review and adjudication authority only. Neither Country Sales Heads nor HQ Administrators can create rows in `public.attendance_days`, `public.visits`, or `public.meeting_logs` on behalf of salespeople. If a field salesperson experiences a complete device failure or GPS outage, the salesperson must author the exception log once their device access is restored.

### Decision 2: Location Unverified Invariant on Approved Exceptions (PRD §7.3, §8.1 / AT-06)
When a Country Sales Head approves a salesperson's GPS-failure, camera-defect, or device-depletion exception via RPC `review_salesperson_exception(p_exception_id, p_status, p_reason)`:
- The associated visit's `verification_status` is explicitly set to `manager_approved_unverified`.
- Under no circumstance does manager approval alter `verification_status` to `location_verified`.
- Location verification is exclusively granted by backend PostGIS ellipsoidal geofence computation against verified premises photos. Manager approval represents an administrative pardon, not physical location proof.

### Decision 3: GPS Pin Governance & Versioned Immutability (PRD §7.1)
- Salespeople in the field propose GPS coordinates for new or unpinned branches via `propose_branch_location_pin(p_branch_id, p_latitude, p_longitude, p_accuracy_m, p_evidence_photo_url, p_notes)`. Proposals are inserted with status `pending_approval`.
- Country Sales Heads inspect proposals in `BranchApprovalsQueue.tsx`, verifying coordinates against reported GPS uncertainty (threshold $\le 50\text{m}$) and premises photographs.
- Calling `approve_branch_location_pin(p_pin_id, p_reason)` deactivates previously active pins for that branch, increments the pin version number, sets `is_active = true`, and logs the manager rationale to `public.branch_pin_history`.
- Calling `reject_branch_location_pin(p_pin_id, p_reason)` rejects the proposal with mandatory audit feedback.
- Historical visits retain foreign-key references to the `branch_pin_id` active at the time of check-in; approving a new pin version never retroactively alters past visit geofence results.

### Decision 4: Zero Bottleneck Company Device Replacement (PRD §6.5)
Hardware management is strictly administrative:
- Field salespeople submit device replacement requests directly to HQ Admin via `device_replacement_requests` (`company_device_id`, `issue_category`, `issue_description`, `status = 'pending_review'`).
- Country Sales Heads have **zero** approval or submission authority over company device replacements. Any attempt by a CSH to approve a device replacement is blocked by PostgreSQL check `NOT is_hq()` with error code `P0001: Zero Bottleneck Violation`.
- HQ Admin reviews requests in `HqDeviceManagement.tsx` via `hq_review_device_replacement(p_replacement_id, p_status, p_reason)`.
- HQ Admin dispatches a replacement handset from central depot spare inventory via `hq_dispatch_replacement_device(p_replacement_id, p_replacement_device_id, p_courier_tracking_ref, p_dispatch_notes)`.
- Upon delivery, HQ Admin confirms activation in Knox MDM via `hq_confirm_replacement_activation(p_replacement_id, p_old_device_disposition)`:
  - Deactivates previous device assignment (`is_current = false, returned_at = now()`).
  - Updates old device inventory status to `returned` or `revoked`.
  - Creates new custody assignment for the replacement handset (`is_current = true`).
  - Marks request as `completed` and records old device disposition (`returned_to_depot`, `quarantined`, `lost_reported`).
  - Uniqueness constraint `uq_single_active_device_per_rep` is strictly preserved throughout the transition.

### Decision 5: 5% Random Weekly Audit Sampling & Dispute Workflow (PRD §8.3 / AT-09, AT-10)
- The Country Sales Head workbench runs weekly 5% random sampling (`sampleWeeklyVisitsForAudit`) across completed visits in the market not yet audited.
- Location verification and client meeting confirmation remain independent audit dimensions: a visit can be `location_verified` by PostGIS geofencing and live photo without requiring client confirmation.
- CSH calls the client contact and records the result via `record_client_audit_call(p_audit_record_id, p_call_result, p_notes, p_outcome, p_contact_person, p_telephone)`:
  - `reached_confirmed`: Audit passes; status set to `confirmed`.
  - `reached_denied`: The client denies the salesperson visited. The RPC automatically transitions dispute status to `under_investigation` and inserts an `audit_dispute` row into `public.verification_flags`.
  - Client denials prompt managerial inquiry; they **never** trigger automatic disciplinary action or fraud conclusions.
- CSH or HQ resolves disputes via `resolve_client_audit_dispute(p_audit_record_id, p_decision, p_mandatory_reason)`:
  - `rep_substantiated`: Evidence validates salesperson (e.g. site visitor gate register, secondary workshop foreman confirmation). Flag is cleared.
  - `confirmed_violation`: Confirmed policy violation; escalated to HQ Admin and HR with mandatory written findings.

### Decision 6: Audited Safe CSV Export & CWE-1236 Formula Injection Mitigation (PRD §10)
When Country Sales Heads or HQ Admins export visit data:
- All cell values starting with `=, +, -, @, \t, \r` are sanitized by prepending a single quote (`'`), neutralizing spreadsheet formula execution attacks.
- Each export invocation logs an audit record into `public.export_jobs` capturing `export_type`, `market_code`, `row_count`, `downloaded_by`, `downloaded_at`, and `formula_escaped = true`.

### Decision 7: Client Master ERP Batch Ingestion (PRD §4.2 / AT-08)
- Enterprise CSV onboarding parses parent organizations and branch locations.
- **Shared Telephone Rule:** Different branches of the same client (e.g., Apex Logistics Apapa Hub vs Ikeja Hub) may share the same central company telephone number. Ingestion records an informational review note but **never** auto-rejects valid client locations for shared switchboard phone numbers.
- **Location Pending:** Branches imported without confirmed GPS coordinates are stored with `location_pending = true` and `approved_pin_id = null`. Normal location-verified visits are blocked until a salesperson proposes coordinates from the field and the Country Sales Head approves the pin.
- Each import operation records an immutable record in `public.import_batches` with row counts and validation errors.

---

## 3. Verification & Validation Summary

1. **Vitest Automated Suite:** 187/187 tests passing across all 14 test files, including 17 dedicated tests in `src/test/stage-3e-manager-hq.test.tsx`.
2. **Live Supabase Dev Project Suite (`scripts/test_stage_3e_db_integrity.py`):**
   - Market scoping and RLS isolation verified against live Nigeria branches.
   - GPS pin proposal, self-approval block (`P0001`), and CSH approval RPC verified.
   - Zero Bottleneck device replacement pipeline verified (salesperson submission -> CSH approval blocked -> HQ Admin approval -> spare dispatch -> Knox MDM activation -> single active device constraint preserved).
   - 5% random audit call selection, client denial dispute triggering, `audit_dispute` flag creation, and dispute resolution verified.
   - Audited CSV export logged into `public.export_jobs`.
3. **Multi-Viewport Browser Suite (`scripts/verify_stage_3e_browser.py`):**
   - 15 high-fidelity screenshots captured across Desktop (1280px), Mobile (390px), and Compact (360px).
   - 0 horizontal overflows.
4. **Build & Type Check:**
   - `npx tsc --noEmit`: 0 errors.
   - `npm run lint`: 0 errors.
   - `npm run build`: Production bundle completed in 9.24s.
