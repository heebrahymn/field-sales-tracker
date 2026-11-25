-- =============================================================================
-- Migration 23: Add 'processed' to event_processing_status Enum
-- =============================================================================

ALTER TYPE public.event_processing_status ADD VALUE IF NOT EXISTS 'processed';
