# ADR 0009: Stage 3A Real Supabase Authentication & Role-Based Access Control (RBAC)

- **Status:** Approved & Verified (Final Security & Deployment Readiness Audit Completed)
- **Date:** 2026-10-26
- **Project:** Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
- **Reference:** PRD v1.2 (MVP Updated) §2, §6, §11
- **Database Ref:** `[SUPABASE_PROJECT_ID]` (Hosted Supabase Development Project)
- **Supabase URL:** `https://[SUPABASE_PROJECT_ID].supabase.co`

---

## 1. Context & Objectives

During Stage 1 and Stage 2, the application used simulated frontend role-switching (`switchRole`, `switchMarket`) to demonstrate and validate user interfaces for Field Salespeople, Country Sales Heads, and HQ Administrators. Stage 2 established 25 database migrations and comprehensive PostgreSQL Row-Level Security (RLS) policies on the hosted Supabase project.

Stage 3A transitions the frontend from simulated authentication to **real, cryptographic Supabase GoTrue authentication**, binding user sessions directly to PostgreSQL identity and database profile roles.

The primary objectives of Stage 3A were:
1. **Live Identity Provider Integration:** Replace in-memory mock logins with authentic Supabase Auth (`supabase.auth.signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`).
2. **Server-Enforced RBAC & Market Sandboxing:** Derive permissions and market filters strictly from `public.profiles` (`auth.uid()`), completely eliminating client-side role impersonation.
3. **Session & Operational State Isolation:** Ensure that React context, memory caches, and mock operational data are strictly scoped to the active authenticated session, with zero state leakage across logouts or user transitions.
4. **Hardened Login Surface for Production:** Remove all development account drawers, test lists, and bundled passwords from client assets prior to Vercel deployment.
5. **Accurate Company Device Display:** Display database-assigned company handset inventory asset tags without claiming cryptographic device attestation.
6. **Transparent Operational State Indication:** Clearly distinguish real Supabase authentication from simulated operational field data during the transition to Stage 3B.

---

## 2. Architectural Decisions

### Decision 1: Supabase GoTrue as Enterprise Identity Provider via Publishable Key
- **Architecture:** The client connects to Supabase GoTrue exclusively using the public publishable key (`VITE_SUPABASE_PUBLISHABLE_KEY`).
- **Security Boundary:** Zero service-role credentials (`SUPABASE_SERVICE_ROLE_KEY`) are bundled into client assets or environment files exposed to the browser. Administrative actions (such as user provisioning) remain strictly confined to secure Node.js backend scripts.
- **Session Durability:** Supabase GoTrue handles JWT issuance, local storage token persistence, and automatic background refresh. Expired sessions safely redirect to the login interface.

### Decision 2: Trusted Database Profile Roles (Elimination of Client Role Impersonation)
- **Architecture:** Upon authentication, the client fetches the user's authoritative record from `public.profiles` where `id = auth.uid()`.
- **Role Derivation:** Application navigation and features are unlocked based on `profile.role` (`salesperson`, `country_sales_head`, `hq_admin`) and `profile.market_code` (`NG`, `ZM`, `MW`).
- **Immutability:** Client-side role-switching (`switchRole`) is blocked during authenticated sessions. Direct API attempts by users to alter their own `role` or `market_code` fail via PostgreSQL RLS `WITH CHECK` policies (`trg_prevent_profile_escalation` enforced in Migration 24).

### Decision 3: Country-Level Sandboxing via PostgreSQL RLS
- **Architecture:** RLS policies (`branches_select`, `attendance_select`, `visits_select`) evaluate `auth_market()` and `auth_role()`.
- **Enforcement:**
  - **Country Sales Heads:** Confined to their assigned country. Direct API queries for records belonging to other markets return 0 rows.
  - **Salespeople:** Confined to their assigned country and their own operational records. HQ administrative tables (`system_audit_logs`) return 0 rows.
  - **HQ Administrators:** Authorized for cross-market oversight across Nigeria, Zambia, and Malawi.

### Decision 4: Dynamic Session Scoping & Complete State Purge on Logout
- **Architecture:** All operational React context providers (`FieldSessionProvider`, `AuditProvider`, `DeviceReplacementProvider`) are dynamically keyed inside the authenticated shell:
  ```tsx
  <FieldSessionProvider key={`field-${currentUser.id}`}>
    <AuditProvider key={`audit-${currentUser.id}`}>
      <DeviceReplacementProvider key={`device-${currentUser.id}`}>
        {children}
      </DeviceReplacementProvider>
    </AuditProvider>
  </FieldSessionProvider>
  ```
- **Lifecycle:** Unauthenticated views (`LoginView`) do not mount operational providers. Signing out immediately unmounts all context providers, purging all temporary mock records from browser memory.
- **Future Storage Partitioning:** Future offline IndexedDB storage (Stage 4) will partition event queues by composite key `(user_id, device_id)` to prevent unsynced data loss across multiple users sharing a handset.

### Decision 5: Production-Clean Login Interface
- **Architecture:** The "Development Authorized Accounts" helper drawer and test account lists were completely excised from `LoginView.tsx`.
- **Production Asset Safety:** Zero test passwords or user directories are bundled into Rollup/Vite production build outputs (`dist/`).
- **Authentication Feedback:** Invalid credentials yield generic, safe operational notices ("Invalid login credentials") without leaking email enumeration.

### Decision 6: Company Handset Asset Tag Display vs. Hardware Attestation
- **Architecture:** Salesperson profile screens display assigned handset inventory data queried from `public.device_assignments` and `public.devices` (`CAR-SPR-117352` — Samsung Galaxy A15).
- **Security Honesty:** Hardware attestation is explicitly labelled as *Future Knox MDM (Unattested in MVP)*. The application does not claim physical handset identity has been cryptographically attested by browser code.

### Decision 7: Enterprise Password Assistance Policy
- **Architecture:** Self-service password recovery is disabled under Carbon Car Care mobile fleet policy.
- **User Experience:** Clicking "Reset" on the login screen presents an Account Assistance modal directing employees to contact their Country Sales Head or HQ IT Administrator (`support@carboncarcare.com`) with their employee ID and device asset tag.

### Decision 8: Operational Data Demarcation
- **Architecture:** While daily attendance and visit writes remain simulated prior to Stage 3B, the application displays:
  - Header badge: *"Signed in securely"* / *"Authenticated"*
  - Prominent banner: *"Demo Field Data"*
- This ensures stakeholders and testers are never confused between real cryptographic sessions and simulated field operations.

---

## 3. Verification & Compliance Evidence

Stage 3A verification was executed against the remote hosted database with 100% pass rates:
1. **TypeScript (`tsc --noEmit`):** 0 errors.
2. **ESLint:** 0 errors / 0 warnings.
3. **Automated Unit & Integration Tests (Vitest):** 10 suites, 100/100 tests passed.
4. **Live Supabase GoTrue Auth Tests:** 8/8 passed across all 3 countries and HQ Admin.
5. **Direct API RLS Negative Access Tests:** 13/13 passed (enforcing market sandboxing, role elevation prevention, and table privacy).
6. **Playwright Browser Tests:** 11/11 scenarios passed across mobile and desktop viewports.
7. **Production Build:** Clean Rollup compilation in 12.69s.

---

## 4. Consequences & Operational Impact

### Positive
- Strict, server-enforced role and country boundaries eliminate client spoofing.
- Multi-user handset handover cannot bleed operational state between reps.
- Clean production builds ready for Vercel deployment without leaking test credentials.
- Total compliance with PRD §2, §6, and §11.

### Trade-offs & Limitations
- **No In-App Role Switching:** Testing multiple roles requires authenticating with the respective employee credentials.
- **Administrative Password Resets:** Password recovery requires manual IT administrator credential rotation or email delivery configuration in production GoTrue settings.
- **Stage 3B Dependency:** Daily attendance check-in, GPS geofencing, and premises photo capture remain simulated in-memory until Stage 3B database write procedures are approved and activated.
