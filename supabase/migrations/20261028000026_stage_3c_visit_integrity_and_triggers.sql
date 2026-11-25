-- =============================================================================
-- Migration 00026: Stage 3C Visit Integrity, Bi-Directional Workday Locking & Location Verification Controls
-- Carbon Field Sales Tracker (PRD §6.1, §7.1, §8.3, §8.4 / Acceptance Test AT-03, AT-04)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trigger Function: Prevent Workday Closure While a Normal Visit is Open (AT-03)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_prevent_attendance_close_with_open_visit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'ended' AND OLD.status = 'started' THEN
        -- Acquire row-level lock on any open normal visits for this attendance session
        -- Serializes with concurrent check-out or check-in operations
        IF EXISTS (
            SELECT 1 FROM public.visits
            WHERE attendance_day_id = NEW.id
              AND check_out_at IS NULL
              AND kind = 'normal'
            FOR UPDATE
        ) THEN
            RAISE EXCEPTION 'Cannot end workday: an active physical visit is currently in progress (PRD §6.1 / AT-03).'
                USING ERRCODE = '23514'; -- check_violation
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.trg_prevent_attendance_close_with_open_visit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_prevent_attendance_close_with_open_visit() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_check_open_visits_before_attendance_close ON public.attendance_days;
CREATE TRIGGER trg_check_open_visits_before_attendance_close
    BEFORE UPDATE OF status ON public.attendance_days
    FOR EACH ROW
    WHEN (NEW.status = 'ended' AND OLD.status = 'started')
    EXECUTE FUNCTION public.trg_prevent_attendance_close_with_open_visit();


-- -----------------------------------------------------------------------------
-- 2. Trigger Function: Prevent Starting a Visit Against an Inactive or Ended Workday
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_prevent_visit_start_on_ended_workday()
RETURNS TRIGGER AS $$
DECLARE
    v_status public.attendance_status;
BEGIN
    -- Only normal physical visits require an active open workday
    IF NEW.kind = 'normal' THEN
        -- Lock parent attendance row in SHARE mode to prevent concurrent End Day update from committing
        SELECT status INTO v_status
        FROM public.attendance_days
        WHERE id = NEW.attendance_day_id
        FOR SHARE;

        IF v_status IS NULL THEN
            RAISE EXCEPTION 'Cannot start visit: Associated workday record % does not exist', NEW.attendance_day_id
                USING ERRCODE = '23503'; -- foreign_key_violation
        END IF;

        IF v_status != 'started' THEN
            RAISE EXCEPTION 'Cannot start visit: Associated workday is not active (status is %)', v_status::text
                USING ERRCODE = '23514'; -- check_violation
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.trg_prevent_visit_start_on_ended_workday() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_prevent_visit_start_on_ended_workday() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_check_workday_active_before_visit_start ON public.visits;
CREATE TRIGGER trg_check_workday_active_before_visit_start
    BEFORE INSERT OR UPDATE OF attendance_day_id, kind ON public.visits
    FOR EACH ROW
    WHEN (NEW.kind = 'normal')
    EXECUTE FUNCTION public.trg_prevent_visit_start_on_ended_workday();


-- -----------------------------------------------------------------------------
-- 3. Trigger Function: Validate Visit Location Verification & Immutable Pin Rules
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_validate_visit_location_verification()
RETURNS TRIGGER AS $$
DECLARE
    v_pin_status VARCHAR(32);
    v_pin_active BOOLEAN;
    v_branch_market VARCHAR(2);
BEGIN
    -- 1. Automatically link active market rules version if rule_version_id is omitted
    IF NEW.rule_version_id IS NULL AND NEW.branch_id IS NOT NULL THEN
        SELECT market_code INTO v_branch_market FROM public.branches WHERE id = NEW.branch_id;
        IF v_branch_market IS NOT NULL THEN
            SELECT id INTO NEW.rule_version_id
            FROM public.market_rules
            WHERE market_code = v_branch_market AND is_active = true AND effective_to IS NULL
            ORDER BY created_at DESC
            LIMIT 1;
        END IF;
    END IF;

    -- 2. Automatically link active approved pin if branch_pin_id is omitted and an approved pin exists
    IF NEW.branch_pin_id IS NULL AND NEW.branch_id IS NOT NULL THEN
        SELECT id INTO NEW.branch_pin_id
        FROM public.branch_location_pins
        WHERE branch_id = NEW.branch_id AND is_active = true AND status = 'approved'
        ORDER BY version_number DESC
        LIMIT 1;
    END IF;

    -- 3. Strict PRD §7.1 / §8.4: Location Verified Integrity Guard
    -- Unapproved, pending, or inactive pins CANNOT produce location-verified visits under any circumstance
    IF NEW.verification_status = 'location_verified' THEN
        -- Must have a referenced branch pin
        IF NEW.branch_pin_id IS NULL THEN
            RAISE EXCEPTION 'Cannot mark visit as location_verified: Branch has no approved GPS pin reference'
                USING ERRCODE = '23514';
        END IF;

        -- Verify referenced pin status and active state
        SELECT status, is_active INTO v_pin_status, v_pin_active
        FROM public.branch_location_pins
        WHERE id = NEW.branch_pin_id;

        IF v_pin_status IS NULL OR v_pin_status != 'approved' OR v_pin_active IS NOT TRUE THEN
            RAISE EXCEPTION 'Cannot mark visit as location_verified: Associated branch GPS pin (%) is not approved and active (status: %, active: %)',
                NEW.branch_pin_id, COALESCE(v_pin_status, 'missing'), COALESCE(v_pin_active::text, 'false')
                USING ERRCODE = '23514';
        END IF;

        -- Location classification must be inside_confident
        IF NEW.location_classification != 'inside_confident' THEN
            RAISE EXCEPTION 'Cannot mark visit as location_verified: Location classification must be inside_confident (current: %)',
                NEW.location_classification::text
                USING ERRCODE = '23514';
        END IF;

        -- Must have live premises photo
        IF NEW.premises_photo_url IS NULL OR length(trim(NEW.premises_photo_url)) = 0 THEN
            RAISE EXCEPTION 'Cannot mark visit as location_verified: Live premises photo is mandatory for location verification (PRD §7.1)'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.trg_validate_visit_location_verification() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_validate_visit_location_verification() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_validate_visit_location_verification ON public.visits;
CREATE TRIGGER trg_validate_visit_location_verification
    BEFORE INSERT OR UPDATE OF verification_status, branch_pin_id, location_classification, premises_photo_url ON public.visits
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_validate_visit_location_verification();
