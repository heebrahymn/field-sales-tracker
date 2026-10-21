-- =============================================================================
-- Migration 00001: Extensions and Core Domain Enums
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. App Roles (PRD §2 & §6)
CREATE TYPE public.app_role AS ENUM (
    'salesperson',
    'country_sales_head',
    'hq_admin'
);

-- 2. Absence Categories (PRD §6.2)
CREATE TYPE public.absence_category AS ENUM (
    'annual_leave',
    'sick_leave',
    'compassionate_leave',
    'proposal_preparation_office',
    'training_development',
    'virtual_client_meeting',
    'internal_operations'
);

-- 3. Device Lifecycle & Security Authorization (Stage 1D Approved Architecture)
CREATE TYPE public.device_inventory_status AS ENUM (
    'available',
    'assigned',
    'active',
    'pending_inspection',
    'under_maintenance',
    'lost_stolen',
    'returned',
    'revoked',
    'retired'
);

CREATE TYPE public.security_authorization_status AS ENUM (
    'authorized',
    'quarantined',
    'revoked',
    'pending_activation'
);

-- 4. Device Replacement Enums (Approved Direct Salesperson -> HQ Flow)
CREATE TYPE public.device_issue_category AS ENUM (
    'camera_defect',
    'gps_failure',
    'screen_damage',
    'battery_charging',
    'lost_stolen',
    'other'
);

CREATE TYPE public.replacement_request_status AS ENUM (
    'pending_review',
    'approved',
    'rejected',
    'awaiting_spare',
    'dispatched',
    'awaiting_activation',
    'completed'
);

CREATE TYPE public.old_device_disposition AS ENUM (
    'quarantined',
    'returned_to_depot',
    'revoked',
    'lost_reported'
);

-- 5. Branch Categories & Operating Statuses (PRD §4.2)
CREATE TYPE public.branch_category AS ENUM (
    'fleet_operator',
    'workshop',
    'dealer',
    'distributor',
    'retail',
    'logistics'
);

CREATE TYPE public.branch_operating_status AS ENUM (
    'location_pending',
    'pending_approval',
    'active',
    'rejected',
    'inactive'
);

-- 6. Attendance & Workday Status (PRD §6.1)
CREATE TYPE public.attendance_status AS ENUM (
    'started',
    'ended',
    'auto_closed',
    'approved_non_visit',
    'approved_leave',
    'pending_sync'
);

-- 7. Visit Kinds, Spatial Classifications & Verification Statuses (PRD §7.1 & §8.4)
CREATE TYPE public.visit_kind AS ENUM (
    'normal',
    'exception_visit'
);

CREATE TYPE public.location_classification AS ENUM (
    'inside_confident', -- d + a <= r
    'uncertain',        -- d <= r < d + a
    'outside',          -- d - a > r or d > r
    'no_fix'            -- GPS unavailable/permission denied
);

CREATE TYPE public.visit_verification_status AS ENUM (
    'capturing',
    'pending_sync',
    'pending_review',
    'location_verified',
    'location_unverified',
    'manager_approved_unverified',
    'pending_client',
    'disputed_pending_review',
    'confirmed_violation',
    'rejected'
);

-- 8. Meeting Purpose (PRD §7.3)
CREATE TYPE public.visit_purpose AS ENUM (
    'routine_visit',
    'new_business',
    'technical_support',
    'relationship',
    'follow_up'
);

-- 9. Offline Event Ingestion Status (PRD §9.3)
CREATE TYPE public.event_processing_status AS ENUM (
    'accepted',
    'needs_review',
    'rejected'
);

-- 10. Exception Types & Review Statuses (PRD §7.4)
CREATE TYPE public.exception_type AS ENUM (
    'gps_failure',
    'camera_failure',
    'device_depletion',
    'missed_visit',
    'non_visit_day'
);

CREATE TYPE public.exception_review_status AS ENUM (
    'pending_review',
    'approved',
    'rejected',
    'escalated'
);

-- 11. Anomaly Tripwires & Verification Flags (PRD §6.3 & §6.4)
CREATE TYPE public.flag_code AS ENUM (
    'short_visit',
    'checkout_outside_geofence',
    'implausible_speed',
    'idle_gap',
    'late_meeting_log',
    'near_origin_visit',
    'duplicate_photo',
    'late_sync',
    'clock_discrepancy',
    'high_offline_share',
    'unassigned_device_used',
    'auto_closed_day'
);

CREATE TYPE public.flag_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

CREATE TYPE public.flag_status AS ENUM (
    'open',
    'under_review',
    'cleared',
    'confirmed_violation',
    'escalated'
);

-- 12. Client Audit Phone Call Statuses (PRD §8.3 / AT-10)
CREATE TYPE public.audit_selection_method AS ENUM (
    'random_5pct',
    'risk_targeted'
);

CREATE TYPE public.audit_call_status AS ENUM (
    'pending_call',
    'connected',
    'busy',
    'no_answer',
    'disconnected'
);

CREATE TYPE public.audit_outcome AS ENUM (
    'pending',
    'confirmed_valid',
    'disputed_denied',
    'unreachable'
);

CREATE TYPE public.dispute_resolution_status AS ENUM (
    'none',
    'under_investigation',
    'resolved_cleared',
    'resolved_violation'
);
