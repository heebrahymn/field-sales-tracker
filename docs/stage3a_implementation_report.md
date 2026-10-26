# Stage 3A Implementation Report: Real Supabase Authentication & RBAC

**Document Type:** Milestone Implementation & Architecture Report  
**Project:** Carbon Field Sales Tracker  
**Milestone:** Stage 3A — Real Supabase Authentication & Role-Based Access Control  
**Date:** October 26, 2026  
**Status:** Implemented, Hardened & Verified  
**Hosted Project:** `https://[SUPABASE_PROJECT_ID].supabase.co`  
**Reference:** PRD v1.2 (MVP Updated) §2, §6, §11 | ADR 0009  

---

## 1. Stage Objective

Stage 3A is the first sub-stage of Stage 3 (Core Operational Workflows). The objective of Stage 3A was to replace in-browser simulated authentication with **real, cryptographic Supabase GoTrue authentication**, binding user sessions directly to PostgreSQL identity and database profile roles across **Nigeria (NG)**, **Zambia (ZM)**, and **Malawi (MW)**.

---

## 2. Implemented Functionality

1. **Official GoTrue Authentication:**
   - Password-based authentication via `supabase.auth.signInWithPassword({ email, password })`.
   - Public publishable key architecture; zero service-role keys exposed to the client.
   - Clean, production-hardened sign-in form with Carbon brand identity and privacy notices.
   - Development test accounts helper drawer completely excised from the login screen.

2. **Authoritative Profile Role & Market Derivation:**
   - On successful authentication, queries `public.profiles` for `id = auth.uid()`.
   - Derives application role (`salesperson`, `country_sales_head`, `hq_admin`) and country assignment (`NG`, `ZM`, `MW`).
   - Prevents client-side role or market spoofing via PostgreSQL Row-Level Security (RLS) `WITH CHECK` triggers.

3. **Role-Based Protected Navigation:**
   - **Field Salesperson (`salesperson`):** Access to mobile PWA shell, attendance management, client directory, visit workflows, exception reporting, and device issue reporting.
   - **Country Sales Head (`country_sales_head`):** Access to country team attendance, client/location approvals, visit reviews, risk flags, client audit workbench, and safe CSV export. Strictly confined to assigned market.
   - **HQ Administrator (`hq_admin`):** Access to multi-market regional oversight, company device inventory custody, replacement approvals, ERP client master imports, and audit log inspection.

4. **Session Lifecycle & User-Switching State Isolation:**
   - Dynamic session restoration on page reload via `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()`.
   - React operational context providers (`FieldSessionProvider`, `AuditProvider`, `DeviceReplacementProvider`) are dynamically keyed to `currentUser.id` (`key={`field-${currentUser.id}`}`).
   - Signing out immediately unmounts context providers and clears in-memory state with zero data leakage between different users.

5. **Account Suspension & Profile Guardrails:**
   - Active account check: Accounts where `profile.is_active = false` are denied access with an explicit security notice ("Your Carbon Car Care account has been suspended").
   - Missing profile check: Accounts with no matching `public.profiles` record are rejected safely without exposing protected dashboards.

6. **Assigned Company Handset Display:**
   - Salesperson profile screens query active handset assignments (`public.device_assignments` / `public.devices`).
   - Displays database inventory asset tags (e.g. `CAR-SPR-117352` — Samsung Galaxy A15).
   - Explicitly clarifies hardware attestation as *Future Knox MDM (Unattested in MVP)* without claiming cryptographic device attestation.

7. **Operational Data Demarcation:**
   - Distinct badges differentiate authenticated sessions (*"Signed in securely"*) from simulated operational field data (*"Demo Field Data"*).

---

## 3. Files Created and Modified

### Source Code Modifications
- `src/context/AuthContext.tsx`: Core authentication provider refactored to use Supabase GoTrue, profile loading, device assignment retrieval, and session listener.
- `src/features/auth/LoginView.tsx`: Production-grade login view; removed test account helper drawer, state, and test arrays; added enterprise password assistance modal.
- `src/App.tsx`: Session-scoped context providers keyed by `currentUser.id`; authenticated layout routing.
- `src/components/layout/AppShell.tsx`: Role navigation bar, mobile logout button accessibility.
- `src/components/feedback/DemoDataBanner.tsx`: Replaced generic badges with "Signed in securely" + prominent "Demo Field Data" indicator.
- `src/features/field/ProfileView.tsx`: Asset ID display (`CAR-SPR-117352`) and Knox MDM un-attestation disclosure.
- `src/features/field/VisitWorkflowView.tsx`: Cleaned duplicate check-in action buttons; consolidated to single accessible mobile sticky footer.

### Test Suites & Scripts Added
- `src/test/stage-3a-auth.test.tsx`: 16 comprehensive unit & integration tests (auth lifecycle, market isolation, privilege escalation prevention, account suspension, dev helper absence, session scoping).
- `scripts/test-stage-3a-live.ts`: Live GoTrue authentication test script validating all 7 seed accounts.
- `scripts/test-stage-3a-direct-api-auth.ts`: 13 direct API RLS negative security tests using public publishable key.
- `scripts/verify_stage_3a_browser.py`: 11 Playwright browser verification scenarios across mobile and desktop viewports.
- `scripts/list-profiles.ts`: Administrative profile verification script.
- `scripts/test-auth-profile.ts`: Direct profile and device assignment smoke-test script.

---

## 4. Authentication & Profile Retrieval Flow

```
[User Input: Email + Password]
               │
               ▼
   [supabase.auth.signInWithPassword]
               │
       ┌───────┴───────┐
       ▼               ▼
   [Failure]       [Success]
       │               │
  Error Alert          ▼
               [Fetch public.profiles where id = auth.uid()]
                       │
               ┌───────┴───────────────────────┐
               ▼                               ▼
       [Profile Missing OR]            [Profile Valid & Active]
       [profile.is_active = false]             │
               │                               ▼
         Sign Out User                [Fetch Active Device Assignment]
         Display Security Banner               │
                                               ▼
                                      [Mount AppShell with]
                                      [key={`field-${currentUser.id}`}]
```

---

## 5. Security Restrictions & Boundaries Enforced

1. **Zero Service-Role Exposure:** Browser bundle and client assets contain only `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. **PostgreSQL RLS Enforcement:**
   - Country Sales Heads: Locked to assigned country via `auth_market()`.
   - Salespeople: Locked to assigned country and own operational records.
   - Direct API attempts to modify `profiles.role` or `profiles.market_code` fail via `WITH CHECK` constraint.
3. **Password Security:** Zero plaintext passwords stored in Git, migrations, or client bundles.
4. **No Dev Shortcuts in Production:** `LoginView` contains no account pickers or credentials.

---

## 6. Known Limitations & Remaining Mock Modules

1. **Self-Service Password Recovery:** Disabled per enterprise mobile fleet policy. Employees must request credential resets from HQ IT.
2. **Hardware Attestation:** Company device asset tags are database-assigned, not cryptographically verified by Knox MDM in MVP.
3. **Operational Field Writes (Simulated):**
   - Daily attendance (Start Day selfie / End Day).
   - GPS geofencing calculations against client pins.
   - Live premises camera captures.
   - Meeting log records.
   - Exception reports and approvals.
   *These operational workflows remain simulated in-memory until Stage 3B activates live database write procedures.*

---

## 7. Stage 3B Dependencies

Stage 3B will implement:
- Live database writes to `public.attendance_days` (Start Day selfie upload to private storage, GPS accuracy capture).
- Live GPS check-in/out writes to `public.visits`.
- Rear-camera premises photo upload to `premises-photos` bucket.
- Meeting log submission to `public.meeting_logs`.
- Real-time geofence calculation RPC (`check_geofence_status`).
