-- =============================================================================
-- Migration 00030: Add Dynamic Meeting Log SLA Hours to public.market_rules
-- Carbon Field Sales Tracker
-- =============================================================================

SET search_path = public, extensions;

-- 1. Add configurable meeting_log_sla_hours (default 2 hours) to versioned market_rules
ALTER TABLE public.market_rules
    ADD COLUMN IF NOT EXISTS meeting_log_sla_hours NUMERIC(4, 2) NOT NULL DEFAULT 2.00;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_market_rules_meeting_log_sla_hours'
    ) THEN
        ALTER TABLE public.market_rules
            ADD CONSTRAINT chk_market_rules_meeting_log_sla_hours
            CHECK (meeting_log_sla_hours >= 0.5 AND meeting_log_sla_hours <= 72);
    END IF;
END $$;

-- 2. Evaluate meeting_logs.is_late dynamically against the visit's market rule version
CREATE OR REPLACE FUNCTION public.enforce_meeting_log_sla_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_visit RECORD;
    v_sla_hours NUMERIC(4, 2);
BEGIN
    SELECT v.id, v.user_id, v.check_out_at, v.rule_version_id, p.market_code
    INTO v_visit
    FROM public.visits v
    LEFT JOIN public.profiles p ON p.id = v.user_id
    WHERE v.id = NEW.visit_id;

    IF FOUND AND v_visit.check_out_at IS NOT NULL THEN
        IF v_visit.rule_version_id IS NOT NULL THEN
            SELECT mr.meeting_log_sla_hours INTO v_sla_hours
            FROM public.market_rules mr
            WHERE mr.id = v_visit.rule_version_id;
        END IF;

        IF v_sla_hours IS NULL AND v_visit.market_code IS NOT NULL THEN
            SELECT mr.meeting_log_sla_hours INTO v_sla_hours
            FROM public.market_rules mr
            WHERE mr.market_code = v_visit.market_code
              AND mr.is_active = true
              AND mr.effective_to IS NULL
            ORDER BY mr.effective_from DESC
            LIMIT 1;
        END IF;

        v_sla_hours := coalesce(v_sla_hours, 2.00);
        NEW.submitted_at := coalesce(NEW.submitted_at, now());
        NEW.is_late := (NEW.submitted_at > (v_visit.check_out_at + (v_sla_hours * interval '1 hour')));
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_meeting_log_sla ON public.meeting_logs;
CREATE TRIGGER trg_enforce_meeting_log_sla
    BEFORE INSERT ON public.meeting_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_meeting_log_sla_trigger();
