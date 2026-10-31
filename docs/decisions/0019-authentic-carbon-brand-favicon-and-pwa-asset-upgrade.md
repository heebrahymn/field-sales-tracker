# Architectural Decision Record (ADR) 0019

## Authentic Carbon Brand Favicon Suite, Apple Touch Icon & PWA Manifest Upgrade

**Date:** 2026-10-31  
**Status:** Approved & Applied  
**Context:** Visual Brand Identity Compliance, Browser Tab Legibility & PWA Installation  
**Baseline Documents:** PRD v1.2 / `AGENTS.md` §5 (Official Brand Identity & Tokens)  

---

### 1. Context & Problem Statement

During initial scaffolding, a placeholder geometric SVG favicon (`public/favicon.svg` comprising a generic blue rounded square, yellow triangle outline, and green circle) was used in `index.html`. While visually functional during early frontend stages, it did not reflect the authentic Carbon Car Care brand mark. Furthermore, the application lacked a complete modern multi-resolution favicon suite (`favicon.ico`, multi-density PNGs for desktop shortcuts and mobile tab switchers, Apple Touch Icons, and Web App Manifest icons).

The objectives for this upgrade were:
1. Replace the geometric placeholder with the **authentic dynamic Carbon brand mark** (Green wing `#1B9A4A`, Blue chevron `#21409A`, Yellow accent `#E8CF2F`).
2. Preserve the crisp white divider stripes separating each color element while ensuring 100% transparent canvas outside the mark boundaries.
3. Build a white base silhouette so the brand mark and its separation stripes retain high contrast and visual sharpness across both light (`#FFFFFF` / `#F1F5F9`) and dark (`#0F172A` / `#1E293B`) browser tab themes.
4. Generate a complete, production-ready multi-resolution suite according to modern web and PWA standards:
   - `favicon.svg` (infinite-resolution scalable vector for modern browsers)
   - `favicon.ico` (multi-resolution 16x16, 32x32, 48x48 for legacy desktop bookmarks)
   - `favicon-16x16.png`, `favicon-32x32.png`, `favicon-96x96.png` (calibrated standard and HiDPI tab icons)
   - `apple-touch-icon.png` (180x180 for Apple iOS Safari home screen bookmarking)
   - `web-app-manifest-192x192.png` & `web-app-manifest-512x512.png` (maskable PWA icons)
   - `site.webmanifest` (standalone PWA configuration with theme color `#21409A`)
5. Integrate link tags into `index.html` and precache brand assets in `public/sw.js` for offline PWA operation.

---

### 2. Decision & Implementation Details

#### 2.1 Brand Mark Extraction & Dual-Theme Contrast Modeling
Using a dedicated Python asset generator (`scripts/generate_favicons.py`), the authentic brand mark was extracted with morphological closing across the interior divider stripes to establish the external unified contour:
- **Base Silhouette (`.carbon-base`):** Solid `#FFFFFF` underlay following the unified contour. This ensures that on dark browser tabs (e.g. Chrome dark mode, Edge dark theme), the interior divider stripes remain prominent white, preventing colors from visually collapsing against dark chrome surfaces.
- **Brand Colors:**
  - Carbon Green: `#1B9A4A` (aerodynamic upper wing)
  - Carbon Primary Blue: `#21409A` (central directional chevron)
  - Carbon Yellow: `#E8CF2F` (lower accent swoop)

#### 2.2 Scalable Vector SVG Favicon (`public/favicon.svg`)
The SVG favicon uses an exact polygonal vector path approximation (`approxPolyDP` with calibrated arc length epsilon `0.0006`) maintaining lightweight file size (under 3 KB) with smooth curved rendering at arbitrary Retina and 4K scaling factors.

#### 2.3 Calibrated Margin for Ultra-Small Favicon Sizes
Standard downsampling often renders thin divider lines faintly at 16x16 pixels. We calibrated the margins to 1px padding at 16x16 and 2px at 32x32, maximizing the brand mark's active footprint and legibility in real browser tabs.

#### 2.4 Precache & Offline PWA Alignment
`public/sw.js` was updated to include the newly generated brand assets in `PRECACHE_URLS`:
```javascript
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/brand/carbon_logo.png',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/favicon.ico',
  '/site.webmanifest',
];
```
This guarantees that company handsets operating in low or zero connectivity retain authentic branding during initial load and home-screen launches.

---

### 3. Consequences & Verification

- **Visual Fidelity:** Verified through high-resolution comparison screenshots against both light and dark backgrounds ([`CARBON_FAVICON_UPDATE_BEFORE_AFTER_PROOF.png`](file:///C:/Users/Ayodele%20Ibraheem/.gemini/antigravity/brain/fc573132-6d8d-4550-b06f-9eb28f426230/CARBON_FAVICON_UPDATE_BEFORE_AFTER_PROOF.png)).
- **Automated Regression Testing:** 199 / 199 tests passing across all 14 Vitest suites, including brand logo test assertions.
- **Type Safety:** `npx tsc --noEmit` passed with 0 errors.
- **Production Bundle:** `npm run build` compiled in 6.21s with all assets bundled into `dist/`.
- **Git & GitHub:** Synchronized with remote repository on branch `main`.
