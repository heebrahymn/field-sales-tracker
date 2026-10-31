# ADR 0018: HQ Admin Handset Custody Reassignment Supersession, Spare Allocation RPC Alignment & Central Inventory Governance

- **Status:** Approved & Verified in Dev / Staging
- **Date:** 2026-10-30
- **Authors:** Senior Full-Stack Architect, Security Engineer & QA Lead
- **Deciders:** Project Owner, Architecture Team, Field QA Lead
- **Related ADRs:** ADR 0005 (Stage 1D HQ Admin Interface), ADR 0008 (Stage 2B Supabase Backend), ADR 0013 (Stage 3E Management & HQ Integration), ADR 0014 (Stage 3F Staging), ADR 0015 (Supabase Dev SSoT), ADR 0016 (Admin Governance), ADR 0017 (Country Reviews & Sync)

---

## 1. Context & Operational Problem Description

During comprehensive operational walkthroughs of the HQ Admin Handset Management and Salesperson Device Replacement workflows, several critical data synchronization and UX blockers were identified:

1. **Depot Spare Allocation Persistence Failure:**
   - In the **"Allocate Spare Handset from Depot"** modal (`ca5d7e5b-106e-41e7-81c4-92c0ed049d52`, recipient Tunde Adebayo, defective `CC-DEV-LOS-SPARE-01`), selecting spare handset `CAR-TST-121585` and clicking **"Assign Spare Handset"** failed to persist in Supabase.
   - Investigation revealed `handleConfirmAssignSpare` in `HqDeviceManagement.tsx` only updated local component state without invoking Supabase RPCs. The 10-second polling cycle then re-fetched the untouched Supabase row (`status: 'approved'`, `replacement_device_id: null`), immediately overwriting the UI.
   - In addition, the modal radio buttons passed string asset tags (e.g. `'CAR-TST-121585'`) instead of PostgreSQL device UUIDs, causing PostgreSQL UUID type errors (`22P02`).

2. **Hard-Blocked Direct Handset Reassignment:**
   - When an HQ Administrator attempted to assign an available or returned handset (e.g. `CAR-SPR-495283`) to an active salesperson (e.g. `Merusha Kisten`), the system hard-blocked with an error:
     > *"Salesperson Merusha Kisten is already assigned to active device EHNO-123. Please reassign or return the existing device first."*
   - This trapped administrators in an unintuitive 10-step manual loop: closing the modal, paging through 40+ devices to find the old phone, opening lifecycle status, marking it `Returned`, navigating back to the depot phone, and re-opening the assignment modal.
   - Furthermore, lifecycle status updates submitted via the table sliders modal were only stored in local context and never persisted to Supabase `public.devices`.

3. **Client-Side Profile Hardware Caching Detached from Database Changes:**
   - `AuthContext.tsx` cached user profiles in `localStorage` (`carbon_cached_profile_${userId}`) without exposing an invalidation mechanism. A salesperson whose handset was replaced or reassigned continued to see their former device until a hard logout.

4. **Country Sales Head Attendance Table Detached from Latest Custody:**
   - `attendanceService.getMarketAttendance` read only the snapshot `attendance_days.device_id` recorded at Start Day. Reassigned devices or activated replacements during the workday were not visible in the Country Sales Head team attendance table.

---

## 2. Decision & Architectural Implementations

### Decision 1: Remote RPC & Table Fallback Spare Handset Allocation
- Implemented `adminService.allocateSpareDevice({ replacementId, spareDeviceId })`:
  - Automatically resolves string asset tags to PostgreSQL device UUIDs against `public.devices`.
  - Dispatches RPC `hq_allocate_spare_device` with seamless direct table mutation fallback (`device_replacement_requests.replacement_device_id = spare_uuid`, `status = 'awaiting_spare'`, `devices.inventory_status = 'assigned'`).
  - Updated `dispatchReplacementDevice` and `confirmReplacementActivation` to resolve asset tags to UUIDs, insert new `device_assignments` records (`is_current = true`), activate replacement handsets, and record old device disposition (`returned_to_depot`, `quarantined`, or `revoked`).

### Decision 2: Handset Custody Reassignment Supersession (Zero-Blocker Reassignment)
- Enhanced `adminService.reassignDevice` and `DeviceReplacementContext.assignDevice` with automatic custody supersession:
  - When assigning a handset to a salesperson who already holds an active company device, the system supersedes the prior assignment (`is_current = false, returned_at = now()`), updates the old handset's status to `returned`, activates the newly assigned handset (`inventory_status = 'active'`), and updates today's `attendance_days.device_id`.
  - Preserves PRD §2 & §11 company security policy (**strict 1:1 hardware custody**: a representative never holds multiple active handsets simultaneously).
- Enhanced the **"Assign Handset to Salesperson"** modal in `HqDeviceManagement.tsx`:
  - Dynamically detects when the chosen representative holds an active handset.
  - Displays a clear **Custody Reassignment Notice** and pre-checked option:
    > ☑️ **Return [OLD-DEVICE] to depot & reassign handset**
  - Updates the primary action button to **"Confirm Handover & Reassign"** (enabled), allowing 1-click custody handover without navigating away.

### Decision 3: Central Inventory Lifecycle Status Supabase Persistence
- Updated `handleStatusUpdateSubmit` in `HqDeviceManagement.tsx` to call `adminService.updateDevice(devId, { inventoryStatus: dbStatus, notes })`.
- If a device is marked `returned`, `retired`, or `lost_stolen`, active assignments in `public.device_assignments` are automatically terminated (`is_current = false, returned_at = now()`).

### Decision 4: Real-Time Hardware Profile Refresh & Country Sales Head Alignment
- Added `refreshProfile()` to `AuthContext.tsx` to bust `localStorage` cache and reload active hardware bindings from Supabase profiles.
- Integrated `refreshProfile()` into `ProfileView.tsx` on mount and following replacement activations.
- Enriched `attendanceService.getMarketAttendance` with `device_assignments` join where `is_current = true`, ensuring Country Sales Head Team Attendance reflects the salesperson's current active company device in real time.

---

## 3. PRD & Security Governance Compliance

1. **Zero Country Sales Head Bottleneck (PRD v1.2):**
   - Company hardware replacement requests remain strictly direct from Salesperson to HQ Admin with zero manager intermediary approval step.
2. **1:1 Hardware Custody Rule:**
   - Enforces single active handset custody at both the database and UI layers; no rep can operate multiple active handsets concurrently.
3. **Immutable Audit History:**
   - Every handover, reassignment, spare allocation, dispatch, and old device disposition is permanently logged in `public.device_assignments` and `public.device_replacement_history`.

---

## 4. Verification & Validation Proof

1. **Static Analysis & Type Checking:**
   - `npx tsc --noEmit` passed with 0 errors.
2. **Vitest Unit & Integration Suites:**
   - 199 / 199 tests passing across all 14 test suites.
3. **Multi-Role Browser E2E Validation:**
   - Verified spare allocation from depot (`fix_step1_hq_admin_allocate_modal_open.png`, `fix_step2_hq_admin_spare_allocated.png`).
   - Verified real-time salesperson profile spare badge (`fix_step3_salesperson_profile_spare_allocated.png`).
   - Verified dispatch and handover confirmation (`fix_step5_hq_admin_dispatched.png`, `fix_step6_hq_admin_activation_confirmed.png`).
   - Verified active handset activation on salesperson profile (`fix_step7_salesperson_profile_activated.png`).
   - Verified synchronized handset on Country Sales Head team attendance (`fix_step8_sales_head_team_handset_activated.png`).
   - Verified direct handset reassignment with automatic supersession notice and instant table success (`fix_reassign_modal_supersede_notice.png`, `fix_reassign_modal_post_success.png`).

