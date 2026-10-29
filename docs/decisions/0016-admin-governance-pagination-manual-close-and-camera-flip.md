# ADR 0016: Administration Governance, Device Lifecycle Operations, Pagination, Manual Dialog Dismissal & Mobile Camera Switching

**Status:** Approved & Implemented  
**Date:** 2026-10-29  
**Deciders:** Core Engineering Team, Project Lead  
**Scope:** HQ Administration (`HqDeviceManagement`, `HqUserManagement`), Field Operations (`StartDayModal`, `VisitWorkflowView`), Reusable Components (`TablePagination`, Modal Dismissal Governance)  
**Database Project:** `[SUPABASE_PROJECT_ID].supabase.co` (Hosted Supabase Development)

---

## 1. Context and Problem Statement

Following the completion of the Supabase Single Source of Truth (SSoT) migration (ADR 0015), detailed manual review and operational field testing identified several operational enhancement requirements:

1. **Unassigned Device Market Filtering Discrepancies:**
   - In the User Provisioning modal, unassigned devices were not listing accurately across Nigeria, Zambia, and Malawi due to strict status filtering excluding valid depot handsets (`returned_to_depot` / `in_depot`).
2. **Direct Supabase Handset Registration:**
   - Registering a new handset in HQ Device Management did not store directly to Supabase `public.devices` or update reactive dropdown pools for newly created users without manual reload.
3. **HQ Administrative Device & User Governance:**
   - HQ Admin lacked granular UI actions for:
     - Editing company device metadata (model, make, market hub, OS, serial, IMEI, notes).
     - Deleting/retiring devices with safety checks on active custody.
     - Editing employee profiles (Full Name, Phone number).
     - Resetting/changing employee passwords directly with high-entropy cryptographic generation.
     - Deleting users with double-confirmation dialogs.
4. **Action Column Ergonomics:**
   - Expanding row actions in user and device tables caused horizontal crowding on narrower desktop viewports; an accessible, clean dropdown menu was required.
5. **Table Scalability & Multi-Select Operations:**
   - Large directories of devices and users lacked pagination and bulk operations, making maintenance cumbersome as fleets scale.
6. **Dialog & Banner Dismissal Control:**
   - Automated timeout closures (`setTimeout` at 1800ms–2500ms) on success banners and modals caused operators to lose context before reading confirmation details.
7. **Mobile Live Feed Camera Flipping:**
   - Field sales handsets (Samsung Galaxy A15, Nokia G22) lacked a mechanism to toggle between the front and rear cameras during live attendance check-in and premises photo capture.

---

## 2. Decision Drivers

1. **Strict Data Persistence:** All administrative actions (device registration, user profile edits, password resets, retirements) must persist to Supabase PostgreSQL and GoTrue Auth via official client and Edge Function APIs.
2. **Market Sandboxing & Data Isolation:** Device assignment pools and user lists must strictly respect national market boundaries (`NG`, `ZM`, `MW`).
3. **Ergonomic Control:** Standardized pagination (10 default, with 20/50/100 filter) and multi-select deletion for high-volume enterprise operations.
4. **User-Controlled Dismissal:** Operational confirmations must remain visible until explicitly dismissed by human user interaction.
5. **Hardware Flexibility on Company Handsets:** Salespeople must be able to seamlessly switch between front and back camera sensors in the field without losing viewfinder state or bypassing geofence checks.

---

## 3. Architecture & Implementation

### 3.1 Unassigned Device Filtering & Direct Registration
- **Dynamic Pool Expansion:** Updated `adminService.getUnassignedDevicesByMarket(marketCode)` to return handsets in `'available'`, `'in_depot'`, and `'returned_to_depot'` inventory statuses without active salesperson assignments.
- **Direct Database Registration:** `adminService.registerCompanyDevice()` inserts directly into `public.devices` with full enterprise metadata (IMEI, build version, supplier, warranty, notes). Newly registered handsets immediately reflect in both directory views and user assignment dropdowns.

### 3.2 Full HQ Device & User Administrative CRUD
- **Device Edit & Retirement:** Implemented `HqDeviceManagement.tsx` edit modal (`adminService.updateCompanyDevice()`) and delete/retire action with checks preventing deletion of devices currently deployed in the field.
- **User Profile Update:** Added `adminService.updateHqUserProfile()` allowing immediate updates to `profiles.full_name` and `profiles.phone`.
- **Administrative Password Reset:** Connected `HqUserManagement.tsx` password modal to `admin-provision-user` Supabase Edge Function (`adminService.adminResetUserPassword()`), supporting custom passwords or secure 20-character auto-generated strings.
- **User Deletion:** Implemented `adminService.deleteHqUser()` invoking GoTrue Admin `deleteUser()` and cascading profile cleanup.

### 3.3 Reusable Table Pagination & Multi-Select Deletion
- Created `src/components/ui/table-pagination.tsx` adhering to Carbon design tokens:
  - Default: 10 rows per page.
  - Page size selector: 10, 20, 50, 100 rows.
  - Range display (`Showing X to Y of Z entries`) with accessible Next/Previous controls.
- Integrated into `HqUserManagement.tsx` and `HqDeviceManagement.tsx`.
- Implemented multi-select row checkboxes with header indeterminate state, sticky selection action bar, and bulk deletion confirmation modals.

### 3.4 Elimination of Automatic Timeouts on Modals & Banners
- Removed all timer-based `setTimeout` dismissal handlers across all modules:
  - `StartDayModal.tsx` ("Acknowledge & Proceed to Field Operations")
  - `EndDayModal.tsx` ("Close & View Summary")
  - `NonVisitDayModal.tsx` ("Return to Dashboard")
  - `ReportDeviceIssueModal.tsx` ("Acknowledge & Return to Profile")
  - `RegisterBranchModal.tsx` ("Done & Select Location")
  - `CountryCsvExportModal.tsx` ("Done & Close")
  - `HqDeviceManagement.tsx`, `HqUserManagement.tsx`, `HqExceptionOversight.tsx`, and review queue workbenches.
- All modals remain persistently open until the user clicks an explicit acknowledgment or close button.

### 3.5 Mobile Live Feed Camera Switching (Front $\leftrightarrow$ Back)
- **`StartDayModal.tsx` (Attendance Selfie):**
  - Default: Front-facing camera (`facingMode: 'user'`).
  - Viewport-overlaid flip button (`#btn-switch-camera`) dynamically toggling to `'environment'`.
  - Dynamic mirroring (`-scale-x-100` on video and canvas flip for front mode; unmirrored for rear mode).
  - Toggles facial oval guide based on active sensor.
- **`VisitWorkflowView.tsx` (Premises Photo):**
  - Default: Rear camera (`facingMode: { ideal: 'environment' }`).
  - Viewfinder-overlaid flip button (`#btn-visit-switch-camera`) dynamically toggling to `'user'`.
  - Proper media stream track stopping and hardware re-acquisition without disrupting geofence validation.

---

## 4. Verification and Quality Assurance

1. **TypeScript Compilation:** Zero errors via `npx tsc --noEmit`.
2. **Automated Vitest Suite:** All 199 tests passing across 14 test suites, including dedicated camera toggle unit tests in `stage-3b-attendance.test.tsx` and `stage-3c-client-visits.test.tsx`.
3. **Production Build:** `npm run build` (`tsc -b && vite build`) passed cleanly in 11.05 seconds.
4. **Browser E2E Verification:** Playwright scripts executed against live application on mobile ($390 \times 844$) and desktop ($1440 \times 900$) viewports, validating:
   - Device registration directly persisting into Supabase and appearing in dropdowns.
   - Edit, delete, password reset, and dropdown actions on user and device tables.
   - Table pagination and bulk multi-select deletion.
   - Manual modal close retention without auto-dismissal.
   - Camera toggling and photo capture on phone viewports.
5. **Visual Evidence:** High-resolution screenshots captured in `docs/screenshots/stage3f/`:
   - `salesperson_start_day_camera_front.png`
   - `salesperson_start_day_camera_rear.png`
   - `salesperson_visit_camera_rear.png`
   - `salesperson_visit_camera_front.png`
   - `salesperson_visit_photo_captured.png`
   - `hq_device_pagination_default_10.png`
   - `hq_device_multiselect_action_bar.png`
   - `hq_device_bulk_delete_modal.png`
   - `hq_user_pagination_default_10.png`
   - `hq_user_pagination_20_per_page.png`
   - `hq_user_multiselect_action_bar.png`
   - `hq_user_bulk_delete_modal.png`
   - `hq_user_table_with_actions_dropdown.png`
   - `hq_user_actions_dropdown_open.png`
   - `hq_user_edit_modal.png`
   - `hq_user_password_reset_verified.png`
   - `hq_user_delete_modal.png`
   - `hq_device_registered_manual_close.png`
