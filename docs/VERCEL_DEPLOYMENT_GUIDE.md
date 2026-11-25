# Carbon Field Sales Tracker — Vercel Deployment Guide

**Document type:** Manual Deployment & Operations Guide  
**Project:** Carbon Field Sales Tracker  
**Target Platform:** Vercel (Edge Network)  
**Applicable Stages:** Stage 1 Frontend & Stage 2 Backend Architecture  
**Status:** Approved for Manual Deployment  

---

## 1. Overview

This guide provides step-by-step instructions for manually deploying the **Carbon Field Sales Tracker** to [Vercel](https://vercel.com) from the approved GitHub repository ([heebrahymn/field-sales-tracker](https://github.com/heebrahymn/field-sales-tracker)).

The project is configured as a high-performance **Vite Single Page Application (SPA)** with client-side rewrites, immutable static asset caching, and HTTP security headers configured in [`vercel.json`](../vercel.json).

> [!IMPORTANT]
> **Environment Scope:** The application is currently approved for **development and staging preview**, operating on verified mock frontend state with backend schemas and RLS policies active on the hosted Supabase development database. Live frontend-to-backend wiring commences in Stage 3 upon your authorization.

---

## 2. Importing the Repository into Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New…** → **Project**.
3. Under **Import Git Repository**, select your GitHub account and choose:
   ```text
   heebrahymn/field-sales-tracker
   ```
4. Click **Import**.

---

## 3. Recommended Vercel Project Settings

When prompted to configure your project, verify that the build and output settings match the repository standard:

| Setting | Recommended Value | Notes |
|---|---|---|
| **Framework Preset** | `Vite` | Automatically detected by Vercel |
| **Root Directory** | `./` | Project lives at the repository root |
| **Build Command** | `npm run build` | Runs `tsc -b && vite build` |
| **Output Directory** | `dist` | Standard Vite production artifact output |
| **Install Command** | `npm install` | Uses `package-lock.json` for deterministic dependency resolution |
| **Production Branch** | `main` | Default production deployment branch |

> [!NOTE]
> [`vercel.json`](../vercel.json) at the repository root already defines `framework`, `buildCommand`, `outputDirectory`, and SPA rewrites. Leaving the Vercel dashboard fields at their defaults will inherit these verified settings automatically.

---

## 4. Environment Variables Configuration

In the Vercel project configuration screen (or later under **Settings** → **Environment Variables**), add the following client environment variables:

| Variable Name | Environment | Example Value / Placeholder | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Production, Preview, Dev | `https://your-project-ref.supabase.co` | Hosted Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Dev | `your-supabase-publishable-anon-key` | Public anonymous client API key |

### Critical Security Rules:
- **Client-Safe Variables Only:** Only variables prefixed with `VITE_` are bundled into the client browser. Never configure `SUPABASE_SERVICE_ROLE_KEY`, database passwords, or personal access tokens in Vercel.
- **Resilient Fallback:** If environment variables are not supplied initially, [`src/lib/supabase.ts`](../src/lib/supabase.ts) falls back gracefully to a placeholder client mode to prevent white-screen crashes, allowing the Stage 1 mock UI to function immediately.

---

## 5. Deployment Protection (Internal Security)

Because the Carbon Field Sales Tracker is an internal company operational tool, protect the deployment from unauthorized public access before sharing links:

1. In your Vercel Project Dashboard, navigate to **Settings** → **Deployment Protection**.
2. Enable one of the following protection methods:
   - **Vercel Authentication (Recommended for Teams):** Restricts access to team members logged in with verified Vercel accounts.
   - **Password Protection (Recommended for Quick Stakeholder Review):**
     - Toggle on **Password Protection**.
     - Set a strong, shared demonstration password.
     - All visitors must enter this password before any application bundle or asset is served.
   - **Trusted IP Allowlist:** If accessing strictly from company offices or static VPN ranges.

---

## 6. Post-Deployment Verification Checklist

Once the deployment completes and Vercel assigns a live URL (e.g., `https://field-sales-tracker.vercel.app`):

1. **Root Load:** Navigate to the root URL and confirm the application shell renders cleanly.
2. **Brand Identity:** Verify the authentic Carbon Car Care logo renders correctly from `/brand/carbon_logo.png` (not stretched or distorted).
3. **SPA Deep-Linking & Refresh Test:**
   - Navigate to `/` and select the **Clients** tab (`?tab=clients`).
   - Refresh the browser (`F5` / `Ctrl+R`).
   - Confirm the page reloads the Clients view and does **not** return a Vercel 404 error (verified via SPA rewrite rule in `vercel.json`).
4. **Role Switching:**
   - Click the interactive Role Switcher in the top banner.
   - Switch between **Salesperson (Nigeria)**, **Country Sales Head (Nigeria)**, and **HQ Administrator**.
   - Confirm layouts, navigation bars, and review workbenches adapt immediately.
5. **Console Check:** Open browser Developer Tools (`F12` → Console) and ensure zero unhandled JavaScript exceptions.

---

## 7. Supabase Authentication URL Configuration (Stage 3 Preparation)

When connecting live Supabase authentication in Stage 3:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard/project/_/auth/url-configuration).
2. Navigate to **Authentication** → **URL Configuration**.
3. Update the following fields:
   - **Site URL:** Set to your production Vercel domain (e.g., `https://field-sales-tracker.vercel.app`).
   - **Redirect URLs:** Add:
     - `https://field-sales-tracker.vercel.app/**`
     - `https://field-sales-tracker-*.vercel.app/**` (allows preview PR deployments to authenticate).

---

## 8. Common Deployment Errors & Troubleshooting

### Issue 1: Page Refresh Results in 404 Not Found
- **Root Cause:** A client-side route was requested directly from Vercel's edge without an SPA rewrite rule.
- **Solution:** Ensured by [`vercel.json`](../vercel.json) rewrite:
  ```json
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
  ```

### Issue 2: Build Fails with TypeScript Errors (`tsc -b`)
- **Root Cause:** Strict type checking detected unhandled types or missing imports.
- **Solution:** Run `npx tsc -b` locally before pushing. The repository is verified with 0 TypeScript compilation errors.

### Issue 3: Blank Screen on Initial Load
- **Root Cause:** Missing environment variables causing initialization exceptions in third-party SDKs.
- **Solution:** [`src/lib/supabase.ts`](../src/lib/supabase.ts) uses a safe placeholder fallback to ensure the app mounts even if environment variables are not yet defined in the Vercel dashboard.

### Issue 4: Stale Assets After New Deployments
- **Root Cause:** Browser caching old JavaScript bundles.
- **Solution:** [`vercel.json`](../vercel.json) configures immutable caching (`max-age=31536000, immutable`) for hashed `/assets/*` files, while `index.html` is revalidated dynamically on every request.
