# ADR 0022: HQ Admin Central Client & Site Directory, Managerial Parity & Correction Governance

**Status:** Approved & Implemented  
**Date:** 2026-11-01  
**Deciders:** Project Architect, HQ Administrator, Engineering Team  
**Scope:** HQ Administration Interface, Enterprise Registry, Administrative Corrections, RLS Governance  

---

## 1. Context & Business Problem

During role-based acceptance testing and multi-market administrative reviews, HQ Administrators identified that while the Country Sales Head had access to client approval queues, HQ Administrators had no unified, dedicated screen to view the complete cross-border registry of corporate clients, physical branches, site contacts, and geofence pins across Nigeria (NG), Zambia (ZM), and Malawi (MW). 

Furthermore:
1. **Managerial Action Parity:** Under least-privilege enterprise governance, HQ Administrators require supervisory oversight to approve or reject proposed GPS location pins with mandatory audit justifications across any operating market.
2. **Salesperson Mistake Correction:** Salespeople operating in the field occasionally make typographic errors when registering client facilities on mobile handsets (e.g. slight misspellings in corporate entities, incorrect landmark designations, or inverted contact phone digits). HQ Admin required the operational authority to safely edit company names, branch designations, category classifications, and primary contact details without disrupting audit trails.
3. **Erroneous / Duplicate Deletion with Audit Safeguards:** Test entries or duplicate client submissions required an administrative deletion mechanism, governed by strict enterprise audit integrity: sites with recorded field visits or salesperson exceptions cannot be deleted (to preserve immutable history) and are instead transitioned to *Inactive (Decommissioned)* status.

---

## 2. Architectural Decisions & Implementation

### 2.1 Dedicated HQ Client Directory Module (`HqClientDirectory.tsx`)
- Integrated a new module **"Clients & Sites"** (`clients`) into `HQ_MODULE_TABS` in `HqAdminDashboardPreview.tsx` and the desktop sidebar navigation under **"Clients & Master Data"** (`DesktopSidebar.tsx`).
- Connected live status badges displaying exact pending branch and pin approvals count.
- Structured with real-time KPI ribbon: Total Sites (cross-market), Active & Approved Sites, Pending Manager/HQ Review, Location Pending (awaiting field fix), and Inactive / Rejected Sites.
- Filterable by Market (`ALL`, `🇳🇬 Nigeria`, `🇿🇲 Zambia`, `🇲🇼 Malawi`), Operational Status (`active`, `pending_approval`, `location_pending`, `rejected`, `inactive`), Facility Category (`logistics`, `fleet_operator`, `workshop`, `retail`, `dealer`, `distributor`, `other`), and free-text search (matching company name, branch, landmark address, contact name, contact telephone).

### 2.2 Managerial Action Parity for HQ Admin
- HQ Administrators can review pending location pins directly from the directory cards using the integrated `ApprovalDecisionModal`.
- Approvals invoke the authoritative PostGIS database RPC `public.approve_branch_location_pin`, setting `status = 'approved'`, updating `branches.operating_status = 'active'`, creating `branches.location_pin_id`, and generating immutable audit logs in `public.approval_audit`.
- Rejections invoke `public.reject_branch_location_pin`, requiring a mandatory justification for audit trails.

### 2.3 Administrative Edit & Correction Governance
- Created `adminService.updateClientBranch(payload)` and API endpoint `/api/admin/clients` (with dev server middleware in `vite.config.ts` and Vercel serverless function support).
- Allows editing:
  - Corporate Organisation Name
  - Branch / Site Name
  - Facility Category
  - Street Address & Landmark
  - City / Town
  - Switchboard Telephone
  - Primary Site Contact (Full Name, Designation, Direct Phone, Email)
- Requires a mandatory administrative rationale recorded directly in `public.approval_audit` with `action = 'client_details_updated'`, actor identity, and timestamp.

### 2.4 Controlled Deletion vs. Deactivation Safeguard
- Created `adminService.deleteClientBranch(branchId, reason)` with strict audit check:
  - If a branch has associated records in `public.visits` or `public.exceptions`, permanent deletion is strictly blocked with `hasHistory: true`. The UI prompts the admin to mark the facility as **Inactive (Decommissioned)** instead.
  - If no historical operational visits exist (e.g. erroneous test registration), the branch is safely deleted (cascading `client_contacts` and `branch_location_pins`). If the parent organisation has no remaining branches, the orphan organisation record is cleanly removed.
  - All deletions and deactivations record mandatory reasons in `public.approval_audit`.

### 2.5 User / Salesperson Filtering, Date Filtering & Configurable Pagination
- **Salesperson / User Filter:** Dynamic dropdown populated with distinct creators of registered client sites, allowing HQ Admin to filter records submitted by a specific salesperson or rep.
- **Registration Date Picker:** ISO date picker (`input[type="date"]`) allowing admins to filter sites registered on a specific calendar day (`YYYY-MM-DD`), with a one-click clear button.
- **Configurable Pagination:**
  - Default page size: **3 items per page** (specifically configured for high-density administrative oversight).
  - Page size options: `3 per page`, `5 per page`, `10 per page`, and `50 per page`.
  - Dual top and bottom navigation bars with responsive display: `"Showing X to Y of Z client sites"`, `"Page X of Y"`, and previous/next page navigation buttons.
  - Automatically resets to Page 1 upon changing any search term, status, category, salesperson, date, or page size.

---

## 3. Verification & Compliance Evidence

1. **TypeScript Compilation:** `npx tsc --noEmit` exited cleanly with 0 errors.
2. **Automated Unit & Integration Tests:** 16 test files passed cleanly (213/213 tests passing, 0 failures), including 6 dedicated tests in `src/test/hq-client-directory.test.tsx`.
3. **Full Playwright Browser Verification (`scratch/verify_hq_client_directory_e2e.py`):**
   - Logged in as an HQ Admin test account.
   - Navigated to `Clients & Sites` directory (`hq_clients_directory_view.png`).
   - Filtered by Nigeria market (`hq_clients_nigeria_filter.png`).
   - Searched for "Oshodi" (`hq_clients_search_oshodi.png`).
   - Opened Edit Client Details modal (`hq_clients_edit_modal.png`).
   - Verified Delete Site confirmation dialog with audit notice (`hq_clients_delete_dialog.png`).
   - Verified Review Pin Proposal modal (`hq_clients_pin_review_modal.png`).

