# ADR 0021: Live Supabase Market Rules Persistence, Prospective Immutability & Dynamic Attendance GPS Uncertainty Thresholds

## Context
During manual localhost UAT across the HQ Admin and Salesperson roles:
1. **HQ Admin Operational Parameter Adjustment**: The HQ Admin "National Market Configuration & Operational Rule Sets" view (`HqMarketConfiguration.tsx`) operated in simulation mode ("Simulating Configuration Changes: Clicking save will generate a new immutable version record for Nigeria"). Modifications to geofence radii and GPS uncertainty limits were only updated in local React state and never persisted to Supabase `public.market_rules`.
2. **Salesperson Attendance GPS Failure**: Salesperson attendance (`StartDayModal.tsx` and `attendanceService.ts`) enforced a hardcoded `100m` GPS accuracy threshold (`accuracy > 100`). In real-world urban environments (e.g. Lagos, Nigeria) where indoor or obstructed satellite reception yielded ±323m accuracy, the modal marked the check as "Fix Failed" and permanently disabled the "Confirm & Start Workday" CTA, despite a successfully captured live front-camera selfie.

## Decision
1. **Authoritative Market Rules Versioning in Supabase**:
   - Implemented `adminService.commitMarketRuleVersion` adhering to PRD §11 immutability and non-retroactivity:
     - Archives the current active rule for the specified market (`effective_to = now()`, `is_active = false`).
     - Inserts the new rule version with incremented tag (`version_tag = 'v1.2.xx'`), `effective_to = null`, and `is_active = true`.
     - Inserts an append-only governance record into `public.approval_audit` with `mandatory_reason`, `actor_id`, and parameter snapshot.
2. **Dynamic UI in HQ Admin**:
   - Replaced "Simulate Rule Update" with "Edit Operational Rules".
   - Added an editable input field for `defaultGeofenceRadiusMeters`.
   - Replaced simulation messaging with production rule governance copy.
   - Connected `useMarketConfig` to fetch live rules from Supabase `public.market_rules` on mount and persist version commits asynchronously.
3. **Dynamic Salesperson Attendance GPS Gate**:
   - Updated `StartDayModal.tsx` to dynamically query the active market rule via `visitService.getActiveMarketRules(user.marketCode)`.
   - Bounded GPS fix validation to `maxGpsAccuracyM` from the active rule instead of a hardcoded `100m`.
   - Added reactive re-evaluation: if market rules or GPS coordinates update while the modal is open, the fix status reactively recalculates, immediately enabling "Confirm & Start Workday" when accuracy is within the active threshold.
   - Updated `attendanceService.startDayAttendance` and `offlineSyncService.enqueueStartDay` to check against the active database rule, returning dynamic threshold error messages.

## Consequences
- **Positive**: HQ Admin parameter adjustments take effect immediately in Supabase for each market.
- **Positive**: Territory-specific GPS accuracy adaptations (e.g. relaxing to 350m or 500m during adverse atmospheric or indoor testing in Lagos) immediately permit field representatives to start workdays without compromising live selfie evidence.
- **Positive**: Historical visit records remain immutable and bonded to their original version tag per PRD §11.
- **Verification**: 207/207 Vitest tests passing, 0 TypeScript errors, live Supabase version commit and attendance acceptance verified.

