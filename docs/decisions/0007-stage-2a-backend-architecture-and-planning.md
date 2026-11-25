# ADR 0007: Stage 2A — Backend Architecture, Database Schema & Supabase Security Planning

**Date:** 2026-10-21  
**Status:** Completed & Ready for Review  
**Context:** Full architecture design and database specification for the Supabase backend supporting the Carbon Field Sales Tracker PWA across Nigeria (`Africa/Lagos`), Zambia (`Africa/Lusaka`), and Malawi (`Africa/Blantyre`). Built on PostgreSQL 15+, PostGIS, Supabase Auth, Row-Level Security (RLS), private Storage, and Edge Functions.

---

## 1. Executive Summary & Architectural Decisions

Stage 2A establishes the backend database schema, security policy blueprints, and event ingestion architecture for the Carbon Field Sales Tracker.

### Approved Architectural Decisions Incorporated:
1. **Three-Tier Security Scoping:**
   - **Salesperson:** Scoped strictly to own operational records, own assigned device, and authorized market clients.
   - **Country Sales Head:** Sandboxed strictly to a single national operational market (`NG`, `ZM`, or `MW`).
   - **HQ Administrator:** Multi-market governance, device inventory management, and master rule configuration across Nigeria, Zambia, and Malawi.
2. **The Sole-Author Non-Fabrication Rule (PRD §2 & §7):**
   - Salespeople are the sole creators of attendance days, physical visits, meeting documentation, and exception logs.
   - Managers and HQ Administrators can review, approve, reject, or comment, but **can never originate or fabricate** visit evidence on behalf of a salesperson. Enforced at database RLS and stored procedure level.
3. **Approved Direct-to-HQ Device Replacement Architecture:**
   - Salespeople submit hardware issues directly to HQ Admin (`Profile → My Device → Report Device Issue`).
   - Country Sales Heads have read-only visibility where operationally appropriate and **do not act as an approval intermediary**.
   - Hardware replacement requests are administrative records and remain strictly separate from field visit exception logs.
4. **9-Status Device Lifecycle & Single Active Custody Constraint:**
   - Database explicitly decouples **Inventory Status** (`available`, `assigned`, `active`, `pending_inspection`, `under_maintenance`, `lost_stolen`, `returned`, `revoked`, `retired`) from **Security Authorization** (`authorized`, `quarantined`, `revoked`, `pending_activation`).
   - Partial unique index enforces that a salesperson can hold at most one active device assignment at any time.
5. **PostGIS Geofencing & Spatial Integrity:**
   - Evaluates check-in/out GPS coordinates against versioned branch pins (`branch_location_pins`) using `ST_Distance`.
   - Accounts for reported GPS accuracy uncertainty (`d + a <= r` for confident verification).
6. **PRD §4.2 Shared Switchboard Telephone Compliance:**
   - Database permits multiple facilities/branches of the same corporate account to share a telephone number without duplicate rejection.
7. **PRD §11 Rule Immutability & Non-Retroactivity:**
   - Operational thresholds (geofence radius, GPS accuracy, idle limits) are versioned (`market_rules`). Historical visits record the rule version and pin version that applied at capture time.
8. **Strict MVP Scope Boundaries:**
   - Zero database tables, columns, or RPC functions for quotations, commercial purchase orders, sales pipeline funnels, revenue analytics, task scheduling, invoicing, payments, or live CRM connectors.

---

## 2. Complete Database Entities & Schema Mapping

The database implementation utilizes the canonical PRD data entities plus approved architectural enhancements:

| Table Name | Primary Key | Purpose & Business Logic | Security Boundary |
|---|---|---|---|
| `markets` | `code` (VARCHAR 2) | National markets: Nigeria, Zambia, Malawi with IANA timezones (`Africa/Lagos`, `Africa/Lusaka`, `Africa/Blantyre`). | Public read; HQ Admin manage. |
| `market_rules` | `id` (UUID) | Versioned spatial thresholds (geofence radius, GPS accuracy, visit duration, idle gaps). | Market read; HQ Admin update with prospective version bumping (`v1.2.04`). |
| `profiles` | `id` (UUID -> `auth.users`) | Extended user profiles, app roles (`salesperson`, `country_sales_head`, `hq_admin`), and market assignments. | Rep views self; CSH views own market; HQ manages all. |
| `approved_absences` | `id` (UUID) | Approved leave (annual/sick) and non-visit workdays (office proposal prep, training). Strictly zero visit targets. | Rep views self; CSH/HQ manage. |
| `devices` | `id` (UUID) | 100% company handset inventory. Asset ID, serial number, IMEI, Knox MDM telemetry, battery health, lifecycle status. | Rep views own assigned device; CSH views market (read-only); HQ manages fleet. |
| `device_assignments` | `id` (UUID) | Handset custody ledger. Partial unique index enforces single active handset per salesperson. | Rep views own; CSH views market; HQ manages assignments. |
| `device_replacement_requests` | `id` (UUID) | Direct salesperson-to-HQ Admin hardware replacement queue. 7-status lifecycle with mandatory approval/rejection rationale. | Rep submits & views own; CSH read-only visibility; HQ approves, allocates spares, tracks dispatch & activation. |
| `device_replacement_history` | `id` (UUID) | Append-only chronological history ledger documenting all replacement status transitions, actors, and notes. | Read-only; appended by replacement actions. |
| `organisations` | `id` (UUID) | Parent commercial client accounts. | Scoped to national market. |
| `branches` | `id` (UUID) | Physical branch facilities. Supports shared telephone switchboards across sibling branches. | Scoped to national market. |
| `branch_location_pins` | `id` (UUID) | Versioned GPS coordinates and premises photos. Proposed by rep, reviewed/approved by CSH. | Rep views active/proposed; CSH approves; historical versions immutable. |
| `client_contacts` | `id` (UUID) | On-site client contacts at branches. | Scoped to national market. |
| `attendance_days` | `id` (UUID) | Daily salesperson shift records with start selfie, start/end GPS coordinates, and accuracy meters. | Rep inserts via ingestion RPC; CSH reviews in market; HQ regional view. |
| `visits` | `id` (UUID) | Physical client visit sessions. Enforces single active open visit constraint (AT-04). PostGIS distance check against pin. | Rep inserts via ingestion RPC; CSH reviews; **NO manager INSERT/UPDATE**. |
| `meeting_logs` | `id` (UUID) | Narrative meeting documentation (products discussed, fleet volume, qualitative outcome, free-text next steps). | Rep inserts via ingestion RPC; CSH reviews; strictly zero task entities. |
| `activity_events` | `id` (UUID) | Immutable batched offline event ingestion log with client UUID idempotency and sequence monotonicity checks. | Rep inserts own; system audit ledger. |
| `exceptions` | `id` (UUID) | Salesperson-authored field visit and failure exception claims (GPS failure, camera fault, phone depletion, missed visit). | Rep creates & views own; CSH adjudicates; **NO manager INSERT**. |
| `verification_flags` | `id` (UUID) | Automated tripwires (short visits, outside checkout, high speed, idle gaps, late meeting logs). | Rep views own; CSH investigates and resolves. |
| `approval_audit` | `id` (UUID) | Immutable append-only managerial decision ledger (actor, previous state, new state, mandatory reason). | Read-only audit log. |
| `client_audit_records` | `id` (UUID) | 5% random sampling queue + risk-based client telephone call audit workbench. Confirmed vs disputed outcomes. | Rep views own; CSH records calls & resolves disputes; HQ regional oversight. |
| `client_audit_attempts` | `id` (UUID) | Call attempt tracker (Attempt 1, 2, 3: connected, busy, no answer). | Appended during audit calls. |
| `import_batches` | `id` (UUID) | Audit log for B2B client master CSV ingestion. Unverified pins default to `Location Pending`. | HQ Admin only. |
| `export_jobs` | `id` (UUID) | Audit log for operational CSV downloads with CWE-1236 formula escaping. | CSH (market) and HQ Admin (cross-market). |
| `system_audit_logs` | `id` (UUID) | Immutable enterprise administrative log tracking role changes, device handovers, and policy revisions. | HQ Admin only. |

---

## 3. Row-Level Security (RLS) Architecture & Helper Functions

### 3.1 Security Helper Functions
All helper functions are defined as `STABLE` with a fixed, secure `search_path`:
- `public.auth_uid()`: Returns `auth.uid()`.
- `public.auth_role()`: Extracts `app_role` from JWT claims (`salesperson`, `country_sales_head`, `hq_admin`).
- `public.auth_market()`: Extracts `market_code` from JWT claims (`NG`, `ZM`, `MW`).
- `public.is_hq()`: Returns true if caller is an HQ Admin.

### 3.2 Key Security Policies

```sql
-- 1. VISITS: Salesperson can only view own visits; writes only via ingestion RPC
CREATE POLICY "salesperson_view_own_visits" ON public.visits
FOR SELECT USING (
    public.auth_role() = 'salesperson' AND user_id = public.auth_uid()
);

-- 2. VISITS: Country Sales Head can view visits in assigned market; CANNOT insert or update
CREATE POLICY "sales_head_view_market_visits" ON public.visits
FOR SELECT USING (
    public.auth_role() = 'country_sales_head' 
    AND branch_id IN (SELECT id FROM public.branches WHERE market_code = public.auth_market())
);

-- 3. VISITS: HQ Admin has regional read access; CANNOT insert visit evidence
CREATE POLICY "hq_admin_view_all_visits" ON public.visits
FOR SELECT USING (public.is_hq());

-- 4. EXCEPTIONS: Salesperson creates own exception claims
CREATE POLICY "salesperson_insert_own_exceptions" ON public.exceptions
FOR INSERT WITH CHECK (
    public.auth_role() = 'salesperson' AND user_id = public.auth_uid()
);

-- 5. DEVICE REPLACEMENTS: Salesperson submits directly to HQ
CREATE POLICY "salesperson_submit_device_replacement" ON public.device_replacement_requests
FOR INSERT WITH CHECK (
    public.auth_role() = 'salesperson' AND salesperson_id = public.auth_uid()
);

-- 6. DEVICE REPLACEMENTS: Country Sales Head has read-only visibility (ZERO approval authority!)
CREATE POLICY "sales_head_view_market_device_replacements" ON public.device_replacement_requests
FOR SELECT USING (
    public.auth_role() = 'country_sales_head' AND market_code = public.auth_market()
);

-- 7. DEVICE REPLACEMENTS: Only HQ Admin can update/approve replacement requests
CREATE POLICY "hq_admin_manage_device_replacements" ON public.device_replacement_requests
FOR ALL USING (public.is_hq());
```

---

## 4. Ingestion RPC Architecture (`ingest_activity_events`)

Field captures (Start Day, Check-In, Check-Out, Meeting Log, Branch Registration, End Day) are routed exclusively through a transactional `SECURITY DEFINER` RPC function:

1. **Idempotency Guarantee:** Validates client UUID against `activity_events.id`. Duplicate submissions return `accepted_duplicate` without creating duplicate records.
2. **Device Custody Check:** Validates that the submitting salesperson holds a currently active assignment for the reporting device asset tag.
3. **Sequence Monotonicity:** Ensures events for a device arrive in strict ascending sequence.
4. **PostGIS Geofence Verification:** Calculates spatial distance between check-in coordinates and the active branch pin:
   $$\text{distance} + \text{accuracy} \le \text{geofence\_radius} \implies \text{inside\_confident}$$
5. **Read-Model Derivation:** Derives `attendance_days`, `visits`, `meeting_logs`, and raises automated `verification_flags` (e.g. `short_visit`, `checkout_outside_geofence`).
6. **Timestamp Audit:** Separates client reported capture time (`client_timestamp`) from server reception time (`server_received_at`) to expose clock anomalies.

---

## 5. Storage & Private Media Architecture

1. **Private Buckets:** `attendance-selfies`, `visit-premises-photos`, `business-cards`, `exception-evidence`, `device-issue-photos`, `client-master-imports`, `export-reports`.
2. **Path Convention:** `{market_code}/{entity_id}/{filename}.jpg` enforced via Storage RLS.
3. **Signed URLs:** Short-lived signed URLs (5-minute TTL) for manager and HQ inspection.
4. **Privacy & Integrity:** Front-camera selfies captured as authentic visual audit records without automated facial recognition or biometric scanning claims.

---

## 6. Migration Sequence for Stage 2B

Migrations will be organized into 10 clean SQL migration scripts under `supabase/migrations/`:
1. `20261022000001_extensions_and_enums.sql`
2. `20261022000002_core_markets_and_profiles.sql`
3. `20261022000003_devices_and_direct_replacement.sql`
4. `20261022000004_organisations_branches_and_pins.sql`
5. `20261022000005_attendance_and_field_visits.sql`
6. `20261022000006_offline_events_and_exceptions.sql`
7. `20261022000007_audits_flags_and_governance.sql`
8. `20261022000008_row_level_security_policies.sql`
9. `20261022000009_rpc_ingest_and_review_functions.sql`
10. `20261022000010_seed_deterministic_data.sql`

---

## 7. Stop-Gate & Governance

- **Milestone:** Stage 2A — Backend Architecture & Database Planning
- **Status:** **Completed & Stopped for User Approval**
- **Constraints Honored:**
  - Zero modifications to approved Stage 1 UI.
  - Zero production database tables created.
  - Zero commercial sales management modules introduced.
  - No Git push executed.
