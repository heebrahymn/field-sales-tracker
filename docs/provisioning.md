# Supabase Account Provisioning & Credential Security Guide

**Document type:** Operational Security Guide  
**Project:** Carbon Field Sales Tracker  
**Applicability:** Development, Staging, and Production Environments  
**Status:** Approved & Implemented  

---

## 1. Overview & Remediation Background

During early backend prototyping (Migrations 13 & 14), development seed users were temporarily inserted via direct SQL scripts (`auth.users`, `auth.identities`) containing fixed demonstration credentials. 

To comply with enterprise security standards and Supabase best practices, **direct SQL manipulation of Auth schema tables has been permanently superseded by an authenticated Supabase Auth Admin API provisioning workflow**.

Applied migration history has been preserved without destructive rewriting to maintain migration ledger integrity across deployed environments. Future account provisioning, staging initialization, and credential rotation are exclusively executed via the secure Admin API.

---

## 2. Authenticated Admin API Provisioning (`scripts/provision-users.ts`)

Account provisioning is automated using `@supabase/supabase-js` Auth Admin client (`supabaseAdmin.auth.admin`), requiring elevated `service_role` privileges executed in trusted runtime environments (CI/CD secret runners or authenticated administrative consoles).

### Key Architectural Characteristics

1. **Official Auth Admin API:** Uses `admin.createUser` and `admin.updateUserById`, ensuring full Supabase Auth lifecycle hooks, confirmation markers (`email_confirm: true`), and identity constraints are properly established.
2. **Runtime-Generated Secure Credentials:** If a password is not explicitly supplied via the `PROVISION_PASSWORD` environment variable, the provisioning script automatically generates a cryptographically secure 24-character random password using Node.js `crypto.randomBytes(18).toString('base64url')`.
3. **Zero Hardcoded Passwords:** Neither migration scripts nor tracked source code contain plaintext passwords.
4. **Git-Ignored Local Credential Storage:** In development mode, runtime passwords are automatically written to the git-ignored `.env.local` (`DEV_USER_PASSWORD`), ensuring seamless local testing without committing credentials.
5. **Automatic Profile Synchronization:** The script ensures that every created or updated user has corresponding profile attributes (`app_role`, `market_code`, `full_name`, `phone_number`) properly linked in `public.profiles`.

---

## 3. Provisioning Seed Accounts Across Markets

The standard seed accounts for tri-market development and testing are:

| Role | Market | Email | Auth ID | Profile Linkage |
|---|---|---|---|---|
| **Salesperson** | Nigeria (`NG`) | `tunde.adebayo@carboncarcare.com` | `11111111-1111-4111-a111-111111111111` | Sales Rep, Lagos Depot |
| **Country Sales Head** | Nigeria (`NG`) | `babatunde.adeleke@carboncarcare.com` | `22222222-2222-4222-a222-222222222222` | National Sales Manager (NG) |
| **HQ Administrator** | HQ (`NG`) | `hq.admin@carboncarcare.com` | `33333333-3333-4333-a333-333333333333` | Global Operations Director |
| **Salesperson** | Zambia (`ZM`) | `peter.mwale@carboncarcare.com` | `44444444-4444-4444-a444-444444444444` | Sales Rep, Lusaka Depot |
| **Country Sales Head** | Zambia (`ZM`) | `chileshe.mwape@carboncarcare.com` | `55555555-5555-4555-a555-555555555555` | Country Sales Manager (ZM) |
| **Salesperson** | Malawi (`MW`) | `kondwani.banda@carboncarcare.com` | `66666666-6666-4666-a666-666666666666` | Sales Rep, Blantyre Depot |
| **Country Sales Head** | Malawi (`MW`) | `tamika.phiri@carboncarcare.com` | `77777777-7777-4777-a777-777777777777` | Country Sales Manager (MW) |

---

## 4. How to Provision a Fresh Development or Staging Environment

To provision accounts in a newly deployed Supabase environment:

1. **Link Project & Apply Migrations:**
   ```bash
   npx supabase link --project-ref <target-project-ref>
   npx supabase db push
   ```

2. **Configure Environment Variables:**
   Ensure `.env.local` contains:
   ```env
   VITE_SUPABASE_URL=https://<target-project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-secret-key>
   # Optional: PROVISION_PASSWORD=<secure-custom-password>
   ```

3. **Execute Provisioning Script:**
   ```bash
   npm run provision:users
   ```
   The script will:
   - Identify existing users or provision new Auth records with deterministic UUIDs.
   - Assign the runtime-generated password to all accounts.
   - Synchronize `public.profiles` metadata.
   - Store the runtime password in `.env.local` (`DEV_USER_PASSWORD`) for testing.

4. **Verify Backend Security:**
   ```bash
   npm run test:backend
   ```
   Confirms 100% test pass across tri-market authentication, RLS isolation, sole-author field evidence, 5-minute clock drift, media storage security, and device fleet lifecycles.

---

## 5. Production Credential Rotation Protocol

For production and staging deployments:
1. **Never use shared passwords across accounts.** In production, users must be invited via Supabase Auth Invite Email (`admin.inviteUserByEmail`) or receive unique, hardware-token-backed enterprise credentials.
2. **Credential Rotation:** Run `npm run provision:users` with a rotated `PROVISION_PASSWORD` secret in secure CI/CD pipelines to invalidate prior development sessions.
3. **Audit Validation:** Inspect `auth.audit_log_entries` to verify administrative password updates and session revocations.

---

## 6. Migration History Reconciliation & Credential Sanitisation Strategy

To ensure zero fixed reusable credentials are introduced into GitHub while maintaining absolute migration-ledger consistency with the hosted Supabase development project:

1. **Elimination of Fixed Reusable Passwords:**
   Historical seed migrations (`20261022000013_seed_data.sql` and `20261022000018_security_audit_hardening.sql`) have been sanitized: the hardcoded demo password was replaced with `extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))`. This creates non-reusable, unguessable locked password hashes.
2. **Preservation of Existing Hosted Database Accounts:**
   The hosted development project (`[SUPABASE_PROJECT_ID]`) has already applied migrations 1 through 25 in `supabase_migrations.schema_migrations`. Live test accounts have already been provisioned with dynamic cryptographic passwords via `npm run provision:users`. No accounts or operational seed records are modified or destroyed.
3. **Fresh Database Reproducibility:**
   On a new or staging database, `supabase db push` succeeds without foreign-key errors (`public.profiles.id REFERENCES auth.users(id)`), after which `npm run provision:users` configures active accounts with secure runtime credentials.
4. **Environment Deployment Boundary:**
   > **IMPORTANT NOTICE:** The backend implementation is **approved for development, not production deployment**. Production deployment requires enterprise VPC isolation, custom KMS key management, corporate email invite onboarding, and Samsung Knox MDM attestation.
