-- =============================================================================
-- Migration 00027: Stage 3C Authoritative PostGIS Geofence Verification,
-- Cross-Market/Attendance Ownership Guards & Historical Evidence Immutability
-- Carbon Field Sales Tracker (PRD §6.1, §7.1, §8.3, §8.4 / Acceptance Test AT-04, AT-05)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Upgrade Workday Active Check Trigger to Enforce Attendance Ownership
--    Prevents attaching a visit to another employee's attendance_day_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_prevent_visit_start_on_ended_workday()
RETURNS TRIGGER AS $$
DECLARE
    v_status public.attendance_status;
    v_att_user_id UUID;
BEGIN
    IF NEW.kind = 'normal' THEN
        -- Lock parent attendance row in SHARE mode to serialize against concurrent End Day
        SELECT status, user_id INTO v_status, v_att_user_id
        FROM public.attendance_days
        WHERE id = NEW.attendance_day_id
        FOR SHARE;

        IF v_status IS NULL THEN
            RAISE EXCEPTION 'Cannot start visit: Associated workday record % does not exist', NEW.attendance_day_id
                USING ERRCODE = '23503'; -- foreign_key_violation
        END IF;

        IF v_att_user_id != NEW.user_id THEN
            RAISE EXCEPTION 'Cannot start visit: Associated workday record % belongs to another employee', NEW.attendance_day_id
                USING ERRCODE = '23514'; -- check_violation
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


-- -----------------------------------------------------------------------------
-- 2. Upgrade Location Verification Trigger to Compute Authoritative PostGIS
--    Distance, Enforce Cross-Market Isolation & Validate Pin/Rule References
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_validate_visit_location_verification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_market VARCHAR(2);
    v_branch_market VARCHAR(2);
    v_rule_market VARCHAR(2);
    v_geofence_radius_m NUMERIC(6, 2) := 200.00;
    v_max_gps_accuracy_m NUMERIC(6, 2) := 100.00;
    v_pin_branch_id UUID;
    v_pin_lat NUMERIC(10, 7);
    v_pin_lng NUMERIC(10, 7);
    v_pin_geom geometry(Point, 4326);
    v_pin_status VARCHAR(32);
    v_pin_active BOOLEAN;
    v_distance_m NUMERIC;
    v_computed_classification public.location_classification;
BEGIN
    -- 1. Ensure branch exists and fetch market
    SELECT market_code INTO v_branch_market 
    FROM public.branches 
    WHERE id = NEW.branch_id;

    IF v_branch_market IS NULL THEN
        RAISE EXCEPTION 'Cannot associate visit: Branch % does not exist', NEW.branch_id
            USING ERRCODE = '23503';
    END IF;

    -- 1B. Enforce salesperson market isolation against branch market
    SELECT market_code INTO v_user_market
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF v_user_market IS NOT NULL AND v_branch_market != v_user_market THEN
        RAISE EXCEPTION 'Cannot associate visit: Branch market (%) does not match salesperson assigned market (%)',
            v_branch_market, v_user_market
            USING ERRCODE = '23514';
    END IF;

    -- 2. Validate or snapshot market rule version
    IF NEW.rule_version_id IS NULL THEN
        SELECT id, geofence_radius_m, max_visit_gps_accuracy_m
        INTO NEW.rule_version_id, v_geofence_radius_m, v_max_gps_accuracy_m
        FROM public.market_rules
        WHERE market_code = v_branch_market AND is_active = true AND effective_to IS NULL
        ORDER BY created_at DESC
        LIMIT 1;
    ELSE
        SELECT market_code, geofence_radius_m, max_visit_gps_accuracy_m
        INTO v_rule_market, v_geofence_radius_m, v_max_gps_accuracy_m
        FROM public.market_rules
        WHERE id = NEW.rule_version_id;

        IF v_rule_market IS NULL THEN
            RAISE EXCEPTION 'Cannot associate visit: Market rule % does not exist', NEW.rule_version_id
                USING ERRCODE = '23503';
        END IF;

        IF v_rule_market != v_branch_market THEN
            RAISE EXCEPTION 'Cannot associate visit with market rule %: Rule market (%) does not match branch market (%)',
                NEW.rule_version_id, v_rule_market, v_branch_market
                USING ERRCODE = '23514';
        END IF;
    END IF;

    -- 3. Validate or snapshot branch GPS pin
    IF NEW.branch_pin_id IS NULL THEN
        SELECT id, latitude, longitude, geom, status, is_active
        INTO NEW.branch_pin_id, v_pin_lat, v_pin_lng, v_pin_geom, v_pin_status, v_pin_active
        FROM public.branch_location_pins
        WHERE branch_id = NEW.branch_id AND is_active = true AND status = 'approved'
        ORDER BY version_number DESC
        LIMIT 1;
    ELSE
        SELECT branch_id, latitude, longitude, geom, status, is_active
        INTO v_pin_branch_id, v_pin_lat, v_pin_lng, v_pin_geom, v_pin_status, v_pin_active
        FROM public.branch_location_pins
        WHERE id = NEW.branch_pin_id;

        IF v_pin_branch_id IS NULL THEN
            RAISE EXCEPTION 'Cannot associate visit: Branch pin % does not exist', NEW.branch_pin_id
                USING ERRCODE = '23503';
        END IF;

        IF v_pin_branch_id != NEW.branch_id THEN
            RAISE EXCEPTION 'Cannot associate visit with branch pin %: Pin belongs to another branch (%) not %',
                NEW.branch_pin_id, v_pin_branch_id, NEW.branch_id
                USING ERRCODE = '23514';
        END IF;
    END IF;

    -- 4. Validate check-in accuracy and coordinates
    IF NEW.check_in_latitude IS NULL OR NEW.check_in_longitude IS NULL THEN
        RAISE EXCEPTION 'Check-in latitude and longitude are mandatory'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.check_in_accuracy_m IS NULL OR NEW.check_in_accuracy_m <= 0 THEN
        RAISE EXCEPTION 'Check-in horizontal accuracy must be a positive number (reported: %)', NEW.check_in_accuracy_m
            USING ERRCODE = '23514';
    END IF;

    -- 5. Authoritative PostGIS Distance & Classification Calculation
    IF v_pin_geom IS NOT NULL THEN
        -- Compute precise ellipsoidal distance on WGS84 geography in metres
        v_distance_m := ST_Distance(
            ST_SetSRID(ST_MakePoint(NEW.check_in_longitude, NEW.check_in_latitude), 4326)::geography,
            v_pin_geom::geography
        );
        NEW.distance_to_pin_m := ROUND(v_distance_m::numeric, 2);

        -- Authoritative spatial classification (PRD §7.1, §8.4)
        -- inside_confident: (distance + accuracy <= radius) AND (accuracy <= max_accuracy)
        -- uncertain: (distance <= radius) OR ((distance + accuracy <= radius) AND accuracy > max_accuracy)
        -- outside: (distance > radius)
        IF (v_distance_m + NEW.check_in_accuracy_m) <= v_geofence_radius_m AND NEW.check_in_accuracy_m <= v_max_gps_accuracy_m THEN
            v_computed_classification := 'inside_confident';
        ELSIF v_distance_m <= v_geofence_radius_m THEN
            v_computed_classification := 'uncertain';
        ELSE
            v_computed_classification := 'outside';
        END IF;

        -- Server-authoritative assignment: override client-supplied classification
        NEW.location_classification := v_computed_classification;
    ELSE
        -- No approved pin exists for this branch
        NEW.distance_to_pin_m := NULL;
        NEW.location_classification := 'no_fix';
        v_computed_classification := 'no_fix';
    END IF;

    -- 6. Strict Location Verified Integrity Guard (PRD §7.1 / §8.4)
    IF NEW.verification_status = 'location_verified' THEN
        -- A. Must have branch_pin_id
        IF NEW.branch_pin_id IS NULL THEN
            RAISE EXCEPTION 'Cannot mark visit as location_verified: Branch has no approved GPS pin reference'
                USING ERRCODE = '23514';
        END IF;

        -- B. Pin must be approved and active
        IF v_pin_status IS NULL OR v_pin_status != 'approved' OR v_pin_active IS NOT TRUE THEN
            RAISE EXCEPTION 'Cannot mark visit as location_verified: Associated branch GPS pin (%) is not approved and active (status: %, active: %)',
                NEW.branch_pin_id, COALESCE(v_pin_status, 'missing'), COALESCE(v_pin_active::text, 'false')
                USING ERRCODE = '23514';
        END IF;

        -- C. Independently computed classification must be inside_confident
        IF v_computed_classification != 'inside_confident' THEN
            RAISE EXCEPTION 'Cannot mark visit as location_verified: Authoritative PostGIS distance (% m) + accuracy (% m) does not meet inside_confident threshold (% m) against pin % (computed classification is %)',
                NEW.distance_to_pin_m, NEW.check_in_accuracy_m, v_geofence_radius_m, NEW.branch_pin_id, v_computed_classification::text
                USING ERRCODE = '23514';
        END IF;

        -- D. Live premises photo is mandatory
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
    BEFORE INSERT OR UPDATE OF verification_status, branch_id, branch_pin_id, rule_version_id, check_in_latitude, check_in_longitude, check_in_accuracy_m, location_classification, premises_photo_url ON public.visits
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_validate_visit_location_verification();


-- -----------------------------------------------------------------------------
-- 3. Immutability Guard on Visit Updates (PRD §7.2, §11)
--    Preserves original check-in evidence and historical pin/rule snapshots
--    during and after visit checkout.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_preserve_visit_checkin_evidence_on_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.user_id IS DISTINCT FROM NEW.user_id
       OR OLD.device_id IS DISTINCT FROM NEW.device_id
       OR OLD.attendance_day_id IS DISTINCT FROM NEW.attendance_day_id
       OR OLD.branch_id IS DISTINCT FROM NEW.branch_id
       OR OLD.branch_pin_id IS DISTINCT FROM NEW.branch_pin_id
       OR OLD.rule_version_id IS DISTINCT FROM NEW.rule_version_id
       OR OLD.kind IS DISTINCT FROM NEW.kind
       OR OLD.check_in_at IS DISTINCT FROM NEW.check_in_at
       OR OLD.check_in_latitude IS DISTINCT FROM NEW.check_in_latitude
       OR OLD.check_in_longitude IS DISTINCT FROM NEW.check_in_longitude
       OR OLD.check_in_accuracy_m IS DISTINCT FROM NEW.check_in_accuracy_m
       OR OLD.premises_photo_url IS DISTINCT FROM NEW.premises_photo_url
       OR OLD.location_classification IS DISTINCT FROM NEW.location_classification
    THEN
        RAISE EXCEPTION 'Cannot modify immutable check-in evidence or historical pin/rule snapshots on an existing visit'
            USING ERRCODE = '23514';
    END IF;

    -- Salespeople cannot alter verification_status during checkout (e.g. outside-geofence checkout preserves original check-in verification_status)
    IF OLD.verification_status IS DISTINCT FROM NEW.verification_status
       AND public.auth_role() = 'salesperson'
    THEN
        RAISE EXCEPTION 'Salesperson cannot alter visit verification_status during checkout'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.trg_preserve_visit_checkin_evidence_on_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_preserve_visit_checkin_evidence_on_update() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_preserve_visit_checkin_evidence_on_update ON public.visits;
CREATE TRIGGER trg_preserve_visit_checkin_evidence_on_update
    BEFORE UPDATE ON public.visits
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_preserve_visit_checkin_evidence_on_update();


-- -----------------------------------------------------------------------------
-- 4. Tighten RLS Policy visits_insert_salesperson_only
--    Enforces market isolation and attendance ownership at the RLS layer too
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "visits_insert_salesperson_only" ON public.visits;
CREATE POLICY "visits_insert_salesperson_only" ON public.visits
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = public.auth_uid()
        AND public.auth_role() = 'salesperson'
        AND branch_id IN (
            SELECT id FROM public.branches WHERE market_code = public.auth_market()
        )
        AND attendance_day_id IN (
            SELECT id FROM public.attendance_days
            WHERE user_id = public.auth_uid() AND market_code = public.auth_market()
        )
    );
