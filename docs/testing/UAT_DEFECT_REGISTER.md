# Carbon Field Sales Tracker — UAT Defect & Gap Register

**Document Version:** 1.0  
**Audit Date:** October 31, 2026  
**Project:** Carbon Field Sales Tracker  
**Baseline:** PRD v1.2, ADRs 0001–0019  

---

## 1. Defect Severity Classification

- **P0 (Blocker):** Security violation, data corruption, or total blockage of an essential MVP operation.
- **P1 (Critical):** Broken business workflow with no operational workaround.
- **P2 (Major):** Important reporting, validation, or usability defect with existing operational workaround.
- **P3 (Minor):** Cosmetic defect, microcopy enhancement, or non-blocking polish item.

---

## 2. Master Defect Register

### DEF-001: Hardcoded Mock Audit Log in HQ User Management
- **Module:** HQ Administrator (`HqUserManagement.tsx`)
- **Severity:** **P1 (Critical Data Integrity)**
- **Issue:** The "User Audit Trail" drawer in `HqUserManagement.tsx` displayed three hardcoded static mock records (`AUD-001`, `AUD-002`, `AUD-003`) instead of loading live governance events from Supabase.
- **Expected Behaviour:** Inspecting a user's audit history must display actual administrative mutations from `public.approval_audit` (e.g. provisioning, device assignments, status changes).
- **Actual Behaviour:** Displayed static demo data from earlier UI scaffolding regardless of actual database mutations.
- **Root Cause:** `auditLog` state was initialized with static array without connecting to `adminService.getSystemAuditLogs()`.
- **Files Affected:** `src/features/admin/HqUserManagement.tsx`.
- **Supabase Impact:** `public.approval_audit` was not being queried in the user management view.
- **Correction Implemented:** 
  1. Updated `HqUserManagement.tsx` to initialize `auditLog` with empty array in live mode (`isTestEnv ? INITIAL_USER_AUDIT_LOGS : []`).
  2. Implemented `loadAuditLogs()` fetching live records via `adminService.getSystemAuditLogs(200)`.
  3. Hooked `loadAuditLogs()` to mount and whenever `selectedUserForAudit` is selected.
- **Test Required:** Select a user in HQ User Management; click "Audit Trail"; verify real administrative actions from `approval_audit` are rendered.
- **Status:** **CORRECTED LOCALLY & VERIFIED** (Vitest 199/199 passing; 0 TypeScript errors).

---

### DEF-002: Storage Bucket Name Mismatch for Visit Business Cards
- **Module:** Field Salesperson & Country Sales Head (`managementService.ts`, `ClientVisitVerification.tsx`)
- **Severity:** **P2 (Major Functional)**
- **Issue:** Country Sales Head could not inspect business card photographs attached during visit check-out in `ClientVisitVerification.tsx`.
- **Expected Behaviour:** Business card image captured during meeting log submission renders cleanly in visit inspection modal via signed URL.
- **Actual Behaviour:** Modal displayed broken image or loading failure.
- **Root Cause:** Backend migration `20261022000012_storage_buckets_and_policies.sql` created bucket `business-cards`, but `managementService.getBusinessCardSignedUrl()` requested bucket `visit-business-cards`.
- **Files Affected:** `src/services/managementService.ts`, `src/features/review/ClientVisitVerification.tsx`.
- **Supabase Impact:** 404 / 400 error from Supabase Storage API when generating signed URL.
- **Correction Implemented:** Aligned bucket target in `managementService.ts` to canonical `'business-cards'`; added explicit loading and retry indicators (ADR 0017).
- **Test Required:** Run `snap_business_card.py` and inspect visit in Country Sales Head modal.
- **Status:** **CORRECTED LOCALLY & VERIFIED** (ADR 0017).

---

### DEF-003: Handset Custody Reassignment Hard Lockout
- **Module:** HQ Administrator (`HqDeviceManagement.tsx`, `adminService.ts`)
- **Severity:** **P1 (Critical Workflow)**
- **Issue:** When an HQ Admin attempted to assign a new or replacement handset to a salesperson who already held an active device, the handover was rejected with a hard error: *"Salesperson already assigned to active device. Please reassign or return the existing device first."*
- **Expected Behaviour:** Reassigning a handset should automatically return the previous device to depot inventory and activate the new one with an auditable custody supersession notice.
- **Actual Behaviour:** Required an unguided, multi-step manual return workaround before assignment could proceed.
- **Root Cause:** Unique constraint `uq_single_active_device_per_rep` on `device_assignments` aborted insert without handling active custody termination.
- **Files Affected:** `src/features/admin/HqDeviceManagement.tsx`, `src/services/adminService.ts`, `src/context/DeviceReplacementContext.tsx`.
- **Supabase Impact:** Blocked device reassignment transactions in PostgreSQL.
- **Correction Implemented:** Implemented automatic custody supersession in `adminService.reassignDevice()`: sets `is_current = false, returned_at = now()` on old device, inserts new assignment, and displays dynamic "Custody Reassignment Notice" in UI (ADR 0018).
- **Test Required:** Run `verify_reassign_handset_workflow.py`.
- **Status:** **CORRECTED LOCALLY & VERIFIED** (ADR 0018).

---

### DEF-004: UI Reversion on Spare Handset Depot Allocation
- **Module:** HQ Administrator (`HqDeviceManagement.tsx`, `adminService.ts`)
- **Severity:** **P1 (Critical Workflow)**
- **Issue:** When allocating a spare handset for a direct-to-HQ device replacement request, the selection appeared in UI but reverted back to unallocated upon the 10-second background polling cycle.
- **Expected Behaviour:** Allocated spare device persists in database and remains assigned across background sync intervals.
- **Actual Behaviour:** Handset selection reverted to blank after 10 seconds.
- **Root Cause:** `allocateSpareDevice` was receiving `asset_tag` (e.g. `CAR-TST-121585`) instead of the device UUID required by RPC `hq_allocate_spare_device`.
- **Files Affected:** `src/features/admin/HqDeviceManagement.tsx`, `src/services/adminService.ts`.
- **Supabase Impact:** RPC rejected update due to UUID type mismatch; changes not saved to `public.device_replacement_requests`.
- **Correction Implemented:** Resolved asset tag to device UUID prior to RPC invocation; added PostgreSQL table fallback to guarantee atomic persistence (ADR 0018).
- **Test Required:** Run `verify_dispatch_and_activation.py`.
- **Status:** **CORRECTED LOCALLY & VERIFIED** (ADR 0018).

---

### DEF-005: Scaffold Geometric Placeholder Favicon
- **Module:** Application Shell & Branding (`public/favicon.svg`, `index.html`)
- **Severity:** **P3 (Minor Brand Compliance)**
- **Issue:** Browser tab displayed early scaffold geometric placeholder (blue square, yellow triangle, green circle) instead of authentic Carbon Car Care brand mark.
- **Expected Behaviour:** Browser tab displays authentic dynamic Carbon mark (Green wing, Blue chevron, Yellow curve) with white divider stripes and transparent background.
- **Actual Behaviour:** Displayed scaffold geometric icon.
- **Root Cause:** `public/favicon.svg` had not been replaced with production brand assets.
- **Files Affected:** `public/favicon.*`, `public/apple-touch-icon.png`, `public/site.webmanifest`, `index.html`, `public/sw.js`.
- **Supabase Impact:** None.
- **Correction Implemented:** Generated complete multi-resolution favicon and PWA suite using authentic brand assets with antialiased white base underlay for dual-theme contrast (ADR 0019).
- **Test Required:** Verify favicon rendering in light and dark browser tabs.
- **Status:** **CORRECTED LOCALLY & VERIFIED** (ADR 0019).

---

## 3. Summary of Open Defects by Severity

| Severity Level | Open Count | Resolved Count | Blocking Status for UAT |
|:---|:---|:---|:---|
| **P0 (Blocker)** | 0 | 0 | **ZERO BLOCKERS — CLEAR TO PROCEED** |
| **P1 (Critical)** | 0 | 3 | All 3 resolved locally and verified |
| **P2 (Major)** | 0 | 1 | Resolved locally and verified |
| **P3 (Minor)** | 0 | 1 | Resolved locally and verified |
| **Total** | **0 Open** | **5 Resolved** | **100% RESOLUTION OF KNOWN DEFECTS** |

