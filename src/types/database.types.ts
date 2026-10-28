export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      absence_requests: {
        Row: {
          absence_date: string
          category: Database["public"]["Enums"]["absence_category"]
          created_at: string
          id: string
          justification: string
          market_code: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["absence_request_status"]
          user_id: string
        }
        Insert: {
          absence_date: string
          category: Database["public"]["Enums"]["absence_category"]
          created_at?: string
          id?: string
          justification: string
          market_code: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["absence_request_status"]
          user_id: string
        }
        Update: {
          absence_date?: string
          category?: Database["public"]["Enums"]["absence_category"]
          created_at?: string
          id?: string
          justification?: string
          market_code?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["absence_request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_requests_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "absence_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_events: {
        Row: {
          client_timestamp: string
          created_at: string
          dependency_event_id: string | null
          device_id: string
          event_type: string
          id: string
          idempotency_key: string
          market_code: string
          payload: Json
          processing_notes: string | null
          processing_status: Database["public"]["Enums"]["event_processing_status"]
          sequence_number: number
          server_received_at: string
          user_id: string
        }
        Insert: {
          client_timestamp: string
          created_at?: string
          dependency_event_id?: string | null
          device_id: string
          event_type: string
          id: string
          idempotency_key: string
          market_code: string
          payload: Json
          processing_notes?: string | null
          processing_status?: Database["public"]["Enums"]["event_processing_status"]
          sequence_number: number
          server_received_at?: string
          user_id: string
        }
        Update: {
          client_timestamp?: string
          created_at?: string
          dependency_event_id?: string | null
          device_id?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          market_code?: string
          payload?: Json
          processing_notes?: string | null
          processing_status?: Database["public"]["Enums"]["event_processing_status"]
          sequence_number?: number
          server_received_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "activity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_audit: {
        Row: {
          action: string
          actor_id: string
          entity_id: string
          entity_type: string
          id: string
          mandatory_reason: string
          new_state: string
          previous_state: string | null
          timestamp: string
        }
        Insert: {
          action: string
          actor_id: string
          entity_id: string
          entity_type: string
          id?: string
          mandatory_reason: string
          new_state: string
          previous_state?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          actor_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          mandatory_reason?: string
          new_state?: string
          previous_state?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_absences: {
        Row: {
          absence_date: string
          approved_at: string
          approved_by: string
          category: Database["public"]["Enums"]["absence_category"]
          counts_as_attendance: boolean
          counts_as_visit_target: boolean
          created_at: string
          id: string
          justification: string
          market_code: string
          user_id: string
        }
        Insert: {
          absence_date: string
          approved_at?: string
          approved_by: string
          category: Database["public"]["Enums"]["absence_category"]
          counts_as_attendance?: boolean
          counts_as_visit_target?: boolean
          created_at?: string
          id?: string
          justification: string
          market_code: string
          user_id: string
        }
        Update: {
          absence_date?: string
          approved_at?: string
          approved_by?: string
          category?: Database["public"]["Enums"]["absence_category"]
          counts_as_attendance?: boolean
          counts_as_visit_target?: boolean
          created_at?: string
          id?: string
          justification?: string
          market_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_absences_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_absences_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "approved_absences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_days: {
        Row: {
          captured_offline: boolean
          created_at: string
          device_id: string
          end_accuracy_m: number | null
          end_geom: unknown
          end_latitude: number | null
          end_longitude: number | null
          ended_at: string | null
          id: string
          market_code: string
          server_received_at: string
          start_accuracy_m: number
          start_geom: unknown
          start_latitude: number
          start_longitude: number
          start_selfie_url: string
          started_at: string
          status: Database["public"]["Enums"]["attendance_status"]
          user_id: string
          work_date: string
        }
        Insert: {
          captured_offline?: boolean
          created_at?: string
          device_id: string
          end_accuracy_m?: number | null
          end_geom?: unknown
          end_latitude?: number | null
          end_longitude?: number | null
          ended_at?: string | null
          id?: string
          market_code: string
          server_received_at?: string
          start_accuracy_m: number
          start_geom?: unknown
          start_latitude: number
          start_longitude: number
          start_selfie_url: string
          started_at?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          user_id: string
          work_date: string
        }
        Update: {
          captured_offline?: boolean
          created_at?: string
          device_id?: string
          end_accuracy_m?: number | null
          end_geom?: unknown
          end_latitude?: number | null
          end_longitude?: number | null
          ended_at?: string | null
          id?: string
          market_code?: string
          server_received_at?: string
          start_accuracy_m?: number
          start_geom?: unknown
          start_latitude?: number
          start_longitude?: number
          start_selfie_url?: string
          started_at?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_days_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_days_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "attendance_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_location_pins: {
        Row: {
          branch_id: string
          created_at: string
          decision_reason: string | null
          geom: unknown
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          premises_photo_url: string
          proposed_at: string
          proposed_by: string
          reported_accuracy_m: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          version_number: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          decision_reason?: string | null
          geom?: unknown
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          premises_photo_url: string
          proposed_at?: string
          proposed_by: string
          reported_accuracy_m: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          version_number: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          decision_reason?: string | null
          geom?: unknown
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          premises_photo_url?: string
          proposed_at?: string
          proposed_by?: string
          reported_accuracy_m?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "branch_location_pins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_location_pins_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_location_pins_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          branch_name: string
          category: Database["public"]["Enums"]["branch_category"]
          city: string
          created_at: string
          created_by: string | null
          estimated_fleet_size: number | null
          id: string
          market_code: string
          operating_status: Database["public"]["Enums"]["branch_operating_status"]
          organisation_id: string
          street_address: string
          switchboard_phone: string
          updated_at: string
        }
        Insert: {
          branch_name: string
          category: Database["public"]["Enums"]["branch_category"]
          city: string
          created_at?: string
          created_by?: string | null
          estimated_fleet_size?: number | null
          id?: string
          market_code: string
          operating_status?: Database["public"]["Enums"]["branch_operating_status"]
          organisation_id: string
          street_address: string
          switchboard_phone: string
          updated_at?: string
        }
        Update: {
          branch_name?: string
          category?: Database["public"]["Enums"]["branch_category"]
          city?: string
          created_at?: string
          created_by?: string | null
          estimated_fleet_size?: number | null
          id?: string
          market_code?: string
          operating_status?: Database["public"]["Enums"]["branch_operating_status"]
          organisation_id?: string
          street_address?: string
          switchboard_phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "branches_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_audit_attempts: {
        Row: {
          attempt_number: number
          audit_record_id: string
          auditor_id: string
          call_notes: string | null
          call_result: Database["public"]["Enums"]["audit_call_status"]
          created_at: string
          dialed_at: string
          id: string
        }
        Insert: {
          attempt_number: number
          audit_record_id: string
          auditor_id: string
          call_notes?: string | null
          call_result: Database["public"]["Enums"]["audit_call_status"]
          created_at?: string
          dialed_at?: string
          id?: string
        }
        Update: {
          attempt_number?: number
          audit_record_id?: string
          auditor_id?: string
          call_notes?: string | null
          call_result?: Database["public"]["Enums"]["audit_call_status"]
          created_at?: string
          dialed_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_audit_attempts_audit_record_id_fkey"
            columns: ["audit_record_id"]
            isOneToOne: false
            referencedRelation: "client_audit_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_audit_attempts_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_audit_records: {
        Row: {
          audit_outcome: Database["public"]["Enums"]["audit_outcome"]
          call_status: Database["public"]["Enums"]["audit_call_status"]
          contact_name: string
          contact_phone: string
          created_at: string
          dispute_notes: string | null
          dispute_status: Database["public"]["Enums"]["dispute_resolution_status"]
          id: string
          market_code: string
          meeting_confirmed: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          selection_method: Database["public"]["Enums"]["audit_selection_method"]
          visit_id: string
        }
        Insert: {
          audit_outcome?: Database["public"]["Enums"]["audit_outcome"]
          call_status?: Database["public"]["Enums"]["audit_call_status"]
          contact_name: string
          contact_phone: string
          created_at?: string
          dispute_notes?: string | null
          dispute_status?: Database["public"]["Enums"]["dispute_resolution_status"]
          id?: string
          market_code: string
          meeting_confirmed?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          selection_method: Database["public"]["Enums"]["audit_selection_method"]
          visit_id: string
        }
        Update: {
          audit_outcome?: Database["public"]["Enums"]["audit_outcome"]
          call_status?: Database["public"]["Enums"]["audit_call_status"]
          contact_name?: string
          contact_phone?: string
          created_at?: string
          dispute_notes?: string | null
          dispute_status?: Database["public"]["Enums"]["dispute_resolution_status"]
          id?: string
          market_code?: string
          meeting_confirmed?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          selection_method?: Database["public"]["Enums"]["audit_selection_method"]
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_audit_records_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "client_audit_records_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_audit_records_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          branch_id: string
          created_at: string
          designation: string
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          organisation_id: string
          phone_number: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          designation: string
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          organisation_id: string
          phone_number: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          designation?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          organisation_id?: string
          phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string
          device_id: string
          handover_reason: string | null
          id: string
          is_current: boolean
          returned_at: string | null
          salesperson_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          created_at?: string
          device_id: string
          handover_reason?: string | null
          id?: string
          is_current?: boolean
          returned_at?: string | null
          salesperson_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          device_id?: string
          handover_reason?: string | null
          id?: string
          is_current?: boolean
          returned_at?: string | null
          salesperson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_assignments_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_assignments_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_replacement_history: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["replacement_request_status"]
          notes: string | null
          previous_status:
            | Database["public"]["Enums"]["replacement_request_status"]
            | null
          request_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["replacement_request_status"]
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["replacement_request_status"]
            | null
          request_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["replacement_request_status"]
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["replacement_request_status"]
            | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_replacement_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_replacement_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "device_replacement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      device_replacement_requests: {
        Row: {
          activation_confirmed_at: string | null
          approval_reason: string | null
          company_device_id: string
          courier_tracking_ref: string | null
          dispatch_notes: string | null
          id: string
          issue_category: Database["public"]["Enums"]["device_issue_category"]
          issue_description: string
          market_code: string
          old_device_disposition:
            | Database["public"]["Enums"]["old_device_disposition"]
            | null
          rejection_reason: string | null
          replacement_device_id: string | null
          salesperson_id: string
          status: Database["public"]["Enums"]["replacement_request_status"]
          submitted_at: string
          supporting_evidence_url: string | null
          updated_at: string
        }
        Insert: {
          activation_confirmed_at?: string | null
          approval_reason?: string | null
          company_device_id: string
          courier_tracking_ref?: string | null
          dispatch_notes?: string | null
          id?: string
          issue_category: Database["public"]["Enums"]["device_issue_category"]
          issue_description: string
          market_code: string
          old_device_disposition?:
            | Database["public"]["Enums"]["old_device_disposition"]
            | null
          rejection_reason?: string | null
          replacement_device_id?: string | null
          salesperson_id: string
          status?: Database["public"]["Enums"]["replacement_request_status"]
          submitted_at?: string
          supporting_evidence_url?: string | null
          updated_at?: string
        }
        Update: {
          activation_confirmed_at?: string | null
          approval_reason?: string | null
          company_device_id?: string
          courier_tracking_ref?: string | null
          dispatch_notes?: string | null
          id?: string
          issue_category?: Database["public"]["Enums"]["device_issue_category"]
          issue_description?: string
          market_code?: string
          old_device_disposition?:
            | Database["public"]["Enums"]["old_device_disposition"]
            | null
          rejection_reason?: string | null
          replacement_device_id?: string | null
          salesperson_id?: string
          status?: Database["public"]["Enums"]["replacement_request_status"]
          submitted_at?: string
          supporting_evidence_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_replacement_requests_company_device_id_fkey"
            columns: ["company_device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_replacement_requests_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "device_replacement_requests_replacement_device_id_fkey"
            columns: ["replacement_device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_replacement_requests_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          asset_id: string
          asset_tag: string
          battery_health: number | null
          created_at: string
          id: string
          imei: string | null
          inventory_status: Database["public"]["Enums"]["device_inventory_status"]
          knox_enrolled: boolean
          last_sync_at: string | null
          make: string
          market_code: string
          model: string
          notes: string | null
          os_version: string | null
          purchase_date: string | null
          registered_by: string
          security_authorization: Database["public"]["Enums"]["security_authorization_status"]
          serial_number: string
          supplier: string | null
          updated_at: string
          warranty_expiry_date: string | null
        }
        Insert: {
          asset_id: string
          asset_tag: string
          battery_health?: number | null
          created_at?: string
          id?: string
          imei?: string | null
          inventory_status?: Database["public"]["Enums"]["device_inventory_status"]
          knox_enrolled?: boolean
          last_sync_at?: string | null
          make: string
          market_code: string
          model: string
          notes?: string | null
          os_version?: string | null
          purchase_date?: string | null
          registered_by: string
          security_authorization?: Database["public"]["Enums"]["security_authorization_status"]
          serial_number: string
          supplier?: string | null
          updated_at?: string
          warranty_expiry_date?: string | null
        }
        Update: {
          asset_id?: string
          asset_tag?: string
          battery_health?: number | null
          created_at?: string
          id?: string
          imei?: string | null
          inventory_status?: Database["public"]["Enums"]["device_inventory_status"]
          knox_enrolled?: boolean
          last_sync_at?: string | null
          make?: string
          market_code?: string
          model?: string
          notes?: string | null
          os_version?: string | null
          purchase_date?: string | null
          registered_by?: string
          security_authorization?: Database["public"]["Enums"]["security_authorization_status"]
          serial_number?: string
          supplier?: string | null
          updated_at?: string
          warranty_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "devices_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exceptions: {
        Row: {
          actual_submission_time: string
          attendance_day_id: string | null
          branch_id: string | null
          claimed_visit_time: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          exception_type: Database["public"]["Enums"]["exception_type"]
          id: string
          reason: string
          resulting_visit_id: string | null
          status: Database["public"]["Enums"]["exception_review_status"]
          supporting_evidence_url: string | null
          user_id: string
        }
        Insert: {
          actual_submission_time?: string
          attendance_day_id?: string | null
          branch_id?: string | null
          claimed_visit_time: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          exception_type: Database["public"]["Enums"]["exception_type"]
          id?: string
          reason: string
          resulting_visit_id?: string | null
          status?: Database["public"]["Enums"]["exception_review_status"]
          supporting_evidence_url?: string | null
          user_id: string
        }
        Update: {
          actual_submission_time?: string
          attendance_day_id?: string | null
          branch_id?: string | null
          claimed_visit_time?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          exception_type?: Database["public"]["Enums"]["exception_type"]
          id?: string
          reason?: string
          resulting_visit_id?: string | null
          status?: Database["public"]["Enums"]["exception_review_status"]
          supporting_evidence_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exceptions_attendance_day_id_fkey"
            columns: ["attendance_day_id"]
            isOneToOne: false
            referencedRelation: "attendance_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exceptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exceptions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exceptions_resulting_visit_id_fkey"
            columns: ["resulting_visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exceptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          downloaded_at: string
          downloaded_by: string
          export_type: string
          formula_escaped: boolean
          id: string
          market_code: string | null
          row_count: number
        }
        Insert: {
          downloaded_at?: string
          downloaded_by: string
          export_type: string
          formula_escaped?: boolean
          id?: string
          market_code?: string | null
          row_count: number
        }
        Update: {
          downloaded_at?: string
          downloaded_by?: string
          export_type?: string
          formula_escaped?: boolean
          id?: string
          market_code?: string | null
          row_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_downloaded_by_fkey"
            columns: ["downloaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          error_rows: number
          filename: string
          id: string
          imported_by: string
          location_pending_rows: number
          market_code: string
          total_rows: number
          valid_rows: number
        }
        Insert: {
          created_at?: string
          error_rows: number
          filename: string
          id?: string
          imported_by: string
          location_pending_rows: number
          market_code: string
          total_rows: number
          valid_rows: number
        }
        Update: {
          created_at?: string
          error_rows?: number
          filename?: string
          id?: string
          imported_by?: string
          location_pending_rows?: number
          market_code?: string
          total_rows?: number
          valid_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
        ]
      }
      market_rules: {
        Row: {
          created_at: string
          created_by: string | null
          daily_visit_target: number
          effective_from: string
          effective_to: string | null
          geofence_radius_m: number
          id: string
          is_active: boolean
          market_code: string
          max_clock_drift_minutes: number
          max_idle_gap_minutes: number
          max_pin_gps_accuracy_m: number
          max_visit_gps_accuracy_m: number
          min_visit_duration_seconds: number
          shift_grace_minutes: number
          version_tag: string
          working_hours_end: string
          working_hours_start: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          daily_visit_target?: number
          effective_from?: string
          effective_to?: string | null
          geofence_radius_m?: number
          id?: string
          is_active?: boolean
          market_code: string
          max_clock_drift_minutes?: number
          max_idle_gap_minutes?: number
          max_pin_gps_accuracy_m?: number
          max_visit_gps_accuracy_m?: number
          min_visit_duration_seconds?: number
          shift_grace_minutes?: number
          version_tag: string
          working_hours_end?: string
          working_hours_start?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          daily_visit_target?: number
          effective_from?: string
          effective_to?: string | null
          geofence_radius_m?: number
          id?: string
          is_active?: boolean
          market_code?: string
          max_clock_drift_minutes?: number
          max_idle_gap_minutes?: number
          max_pin_gps_accuracy_m?: number
          max_visit_gps_accuracy_m?: number
          min_visit_duration_seconds?: number
          shift_grace_minutes?: number
          version_tag?: string
          working_hours_end?: string
          working_hours_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_market_rules_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_rules_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
        ]
      }
      markets: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          iana_timezone: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code: string
          iana_timezone: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          iana_timezone?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      meeting_logs: {
        Row: {
          business_card_photo_url: string | null
          contact_id: string | null
          created_at: string
          fleet_size_volume: number | null
          id: string
          is_late: boolean
          next_step_text: string
          outcome_narrative: string
          products_discussed: string[]
          purpose: Database["public"]["Enums"]["visit_purpose"]
          submitted_at: string
          visit_id: string
        }
        Insert: {
          business_card_photo_url?: string | null
          contact_id?: string | null
          created_at?: string
          fleet_size_volume?: number | null
          id?: string
          is_late?: boolean
          next_step_text: string
          outcome_narrative: string
          products_discussed?: string[]
          purpose: Database["public"]["Enums"]["visit_purpose"]
          submitted_at?: string
          visit_id: string
        }
        Update: {
          business_card_photo_url?: string | null
          contact_id?: string | null
          created_at?: string
          fleet_size_volume?: number | null
          id?: string
          is_late?: boolean
          next_step_text?: string
          outcome_narrative?: string
          products_discussed?: string[]
          purpose?: Database["public"]["Enums"]["visit_purpose"]
          submitted_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_logs_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          id: string
          market_code: string
          name: string
          tier: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          market_code: string
          name: string
          tier?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          market_code?: string
          name?: string
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organisations_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_sign_in_at: string | null
          market_code: string | null
          phone_number: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_sign_in_at?: string | null
          market_code?: string | null
          phone_number: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_sign_in_at?: string | null
          market_code?: string | null
          phone_number?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      system_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          diff_summary: string | null
          id: string
          market_code: string | null
          security_severity: string
          target_entity: string
          target_id: string
          timestamp: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: string
          diff_summary?: string | null
          id?: string
          market_code?: string | null
          security_severity?: string
          target_entity: string
          target_id: string
          timestamp?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          diff_summary?: string | null
          id?: string
          market_code?: string | null
          security_severity?: string
          target_entity?: string
          target_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_flags: {
        Row: {
          attendance_day_id: string | null
          created_at: string
          details: Json
          flag_code: Database["public"]["Enums"]["flag_code"]
          id: string
          market_code: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          severity: Database["public"]["Enums"]["flag_severity"]
          status: Database["public"]["Enums"]["flag_status"]
          user_id: string
          visit_id: string | null
        }
        Insert: {
          attendance_day_id?: string | null
          created_at?: string
          details?: Json
          flag_code: Database["public"]["Enums"]["flag_code"]
          id?: string
          market_code: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          severity: Database["public"]["Enums"]["flag_severity"]
          status?: Database["public"]["Enums"]["flag_status"]
          user_id: string
          visit_id?: string | null
        }
        Update: {
          attendance_day_id?: string | null
          created_at?: string
          details?: Json
          flag_code?: Database["public"]["Enums"]["flag_code"]
          id?: string
          market_code?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          severity?: Database["public"]["Enums"]["flag_severity"]
          status?: Database["public"]["Enums"]["flag_status"]
          user_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_flags_attendance_day_id_fkey"
            columns: ["attendance_day_id"]
            isOneToOne: false
            referencedRelation: "attendance_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_flags_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "verification_flags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_flags_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          attendance_day_id: string
          branch_id: string
          branch_pin_id: string | null
          captured_offline: boolean
          check_in_accuracy_m: number
          check_in_at: string
          check_in_geom: unknown
          check_in_latitude: number
          check_in_longitude: number
          check_out_accuracy_m: number | null
          check_out_at: string | null
          check_out_geom: unknown
          check_out_latitude: number | null
          check_out_longitude: number | null
          created_at: string
          device_id: string
          distance_to_pin_m: number | null
          id: string
          kind: Database["public"]["Enums"]["visit_kind"]
          location_classification: Database["public"]["Enums"]["location_classification"]
          premises_photo_hash: string | null
          premises_photo_url: string | null
          rule_version_id: string | null
          server_received_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["visit_verification_status"]
        }
        Insert: {
          attendance_day_id: string
          branch_id: string
          branch_pin_id?: string | null
          captured_offline?: boolean
          check_in_accuracy_m: number
          check_in_at: string
          check_in_geom?: unknown
          check_in_latitude: number
          check_in_longitude: number
          check_out_accuracy_m?: number | null
          check_out_at?: string | null
          check_out_geom?: unknown
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          created_at?: string
          device_id: string
          distance_to_pin_m?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["visit_kind"]
          location_classification: Database["public"]["Enums"]["location_classification"]
          premises_photo_hash?: string | null
          premises_photo_url?: string | null
          rule_version_id?: string | null
          server_received_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["visit_verification_status"]
        }
        Update: {
          attendance_day_id?: string
          branch_id?: string
          branch_pin_id?: string | null
          captured_offline?: boolean
          check_in_accuracy_m?: number
          check_in_at?: string
          check_in_geom?: unknown
          check_in_latitude?: number
          check_in_longitude?: number
          check_out_accuracy_m?: number | null
          check_out_at?: string | null
          check_out_geom?: unknown
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          created_at?: string
          device_id?: string
          distance_to_pin_m?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["visit_kind"]
          location_classification?: Database["public"]["Enums"]["location_classification"]
          premises_photo_hash?: string | null
          premises_photo_url?: string | null
          rule_version_id?: string | null
          server_received_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["visit_verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "visits_attendance_day_id_fkey"
            columns: ["attendance_day_id"]
            isOneToOne: false
            referencedRelation: "attendance_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_branch_pin_id_fkey"
            columns: ["branch_pin_id"]
            isOneToOne: false
            referencedRelation: "branch_location_pins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "market_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      approve_branch_location_pin: {
        Args: { p_pin_id: string; p_reason: string }
        Returns: undefined
      }
      auth_market: { Args: never; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      auth_uid: { Args: never; Returns: string }
      check_bucket_privacy: { Args: never; Returns: Json }
      check_geofence_status: {
        Args: {
          p_branch_pin_id: string
          p_geofence_radius_m?: number
          p_gps_accuracy_m: number
          p_user_lat: number
          p_user_lng: number
        }
        Returns: string
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      hq_allocate_spare_device: {
        Args: { p_request_id: string; p_spare_device_id: string }
        Returns: undefined
      }
      hq_approve_device_replacement: {
        Args: { p_reason: string; p_request_id: string }
        Returns: undefined
      }
      hq_confirm_device_activation: {
        Args: {
          p_old_disposition: Database["public"]["Enums"]["old_device_disposition"]
          p_request_id: string
        }
        Returns: undefined
      }
      hq_confirm_replacement_activation: {
        Args: { p_old_device_disposition?: string; p_replacement_id: string }
        Returns: undefined
      }
      hq_dispatch_replacement_device: {
        Args: {
          p_courier_tracking_ref: string
          p_dispatch_notes: string
          p_replacement_device_id: string
          p_replacement_id: string
        }
        Returns: undefined
      }
      hq_record_device_dispatch: {
        Args: {
          p_dispatch_notes: string
          p_request_id: string
          p_tracking_ref: string
        }
        Returns: undefined
      }
      hq_review_device_replacement: {
        Args: { p_reason: string; p_replacement_id: string; p_status: string }
        Returns: undefined
      }
      ingest_activity_events:
        | { Args: { events: Json[] }; Returns: Json }
        | { Args: { p_events: Json }; Returns: Json }
      is_hq: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      propose_branch_location_pin: {
        Args: {
          p_accuracy_m: number
          p_branch_id: string
          p_latitude: number
          p_longitude: number
          p_photo_url: string
        }
        Returns: string
      }
      record_approved_leave: {
        Args: {
          p_category: string
          p_date: string
          p_justification: string
          p_user_id: string
        }
        Returns: string
      }
      record_client_audit_call:
        | {
            Args: {
              p_audit_record_id: string
              p_call_result?: string
              p_contact_person?: string
              p_notes?: string
              p_outcome?: string
              p_telephone?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_audit_record_id: string
              p_call_result: string
              p_notes: string
            }
            Returns: undefined
          }
      reject_branch_location_pin: {
        Args: { p_pin_id: string; p_reason: string }
        Returns: undefined
      }
      request_device_replacement: {
        Args: {
          p_current_device_id: string
          p_failure_description: string
          p_failure_type: string
          p_incident_location: string
          p_incident_timestamp: string
        }
        Returns: string
      }
      request_non_visit_workday: {
        Args: { p_category: string; p_date: string; p_justification: string }
        Returns: string
      }
      resolve_client_audit_dispute: {
        Args: {
          p_audit_record_id: string
          p_decision: string
          p_mandatory_reason: string
        }
        Returns: undefined
      }
      review_branch_location_pin: {
        Args: { p_action: string; p_pin_id: string; p_review_notes: string }
        Returns: undefined
      }
      review_device_replacement: {
        Args: {
          p_action: string
          p_admin_notes: string
          p_courier_name?: string
          p_replacement_device_id?: string
          p_replacement_id: string
          p_waybill_number?: string
        }
        Returns: undefined
      }
      review_non_visit_workday: {
        Args: { p_decision: string; p_reason: string; p_request_id: string }
        Returns: undefined
      }
      review_salesperson_exception: {
        Args: {
          p_exception_id: string
          p_reason: string
          p_status: Database["public"]["Enums"]["exception_review_status"]
        }
        Returns: undefined
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      storage_owner_market: { Args: { p_path: string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      absence_category:
        | "annual_leave"
        | "sick_leave"
        | "compassionate_leave"
        | "proposal_preparation_office"
        | "training_development"
        | "virtual_client_meeting"
        | "internal_operations"
      absence_request_status: "pending" | "approved" | "rejected"
      app_role: "salesperson" | "country_sales_head" | "hq_admin"
      attendance_status:
        | "started"
        | "ended"
        | "auto_closed"
        | "approved_non_visit"
        | "approved_leave"
        | "pending_sync"
      audit_call_status:
        | "pending_call"
        | "connected"
        | "busy"
        | "no_answer"
        | "disconnected"
      audit_outcome:
        | "pending"
        | "confirmed_valid"
        | "disputed_denied"
        | "unreachable"
      audit_selection_method: "random_5pct" | "risk_targeted"
      branch_category:
        | "fleet_operator"
        | "workshop"
        | "dealer"
        | "distributor"
        | "retail"
        | "logistics"
      branch_operating_status:
        | "location_pending"
        | "pending_approval"
        | "active"
        | "rejected"
        | "inactive"
      device_inventory_status:
        | "available"
        | "assigned"
        | "active"
        | "pending_inspection"
        | "under_maintenance"
        | "lost_stolen"
        | "returned"
        | "revoked"
        | "retired"
      device_issue_category:
        | "camera_defect"
        | "gps_failure"
        | "screen_damage"
        | "battery_charging"
        | "lost_stolen"
        | "other"
      dispute_resolution_status:
        | "none"
        | "under_investigation"
        | "resolved_cleared"
        | "resolved_violation"
      event_processing_status:
        | "accepted"
        | "needs_review"
        | "rejected"
        | "processed"
      exception_review_status:
        | "pending_review"
        | "approved"
        | "rejected"
        | "escalated"
      exception_type:
        | "gps_failure"
        | "camera_failure"
        | "device_depletion"
        | "missed_visit"
        | "non_visit_day"
      flag_code:
        | "short_visit"
        | "checkout_outside_geofence"
        | "implausible_speed"
        | "idle_gap"
        | "late_meeting_log"
        | "near_origin_visit"
        | "duplicate_photo"
        | "late_sync"
        | "clock_discrepancy"
        | "high_offline_share"
        | "unassigned_device_used"
        | "auto_closed_day"
        | "audit_dispute"
      flag_severity: "low" | "medium" | "high" | "critical"
      flag_status:
        | "open"
        | "under_review"
        | "cleared"
        | "confirmed_violation"
        | "escalated"
      location_classification:
        | "inside_confident"
        | "uncertain"
        | "outside"
        | "no_fix"
      old_device_disposition:
        | "quarantined"
        | "returned_to_depot"
        | "revoked"
        | "lost_reported"
      replacement_request_status:
        | "pending_review"
        | "approved"
        | "rejected"
        | "awaiting_spare"
        | "dispatched"
        | "awaiting_activation"
        | "completed"
      security_authorization_status:
        | "authorized"
        | "quarantined"
        | "revoked"
        | "pending_activation"
      visit_kind: "normal" | "exception_visit"
      visit_purpose:
        | "routine_visit"
        | "new_business"
        | "technical_support"
        | "relationship"
        | "follow_up"
      visit_verification_status:
        | "capturing"
        | "pending_sync"
        | "pending_review"
        | "location_verified"
        | "location_unverified"
        | "manager_approved_unverified"
        | "pending_client"
        | "disputed_pending_review"
        | "confirmed_violation"
        | "rejected"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      absence_category: [
        "annual_leave",
        "sick_leave",
        "compassionate_leave",
        "proposal_preparation_office",
        "training_development",
        "virtual_client_meeting",
        "internal_operations",
      ],
      absence_request_status: ["pending", "approved", "rejected"],
      app_role: ["salesperson", "country_sales_head", "hq_admin"],
      attendance_status: [
        "started",
        "ended",
        "auto_closed",
        "approved_non_visit",
        "approved_leave",
        "pending_sync",
      ],
      audit_call_status: [
        "pending_call",
        "connected",
        "busy",
        "no_answer",
        "disconnected",
      ],
      audit_outcome: [
        "pending",
        "confirmed_valid",
        "disputed_denied",
        "unreachable",
      ],
      audit_selection_method: ["random_5pct", "risk_targeted"],
      branch_category: [
        "fleet_operator",
        "workshop",
        "dealer",
        "distributor",
        "retail",
        "logistics",
      ],
      branch_operating_status: [
        "location_pending",
        "pending_approval",
        "active",
        "rejected",
        "inactive",
      ],
      device_inventory_status: [
        "available",
        "assigned",
        "active",
        "pending_inspection",
        "under_maintenance",
        "lost_stolen",
        "returned",
        "revoked",
        "retired",
      ],
      device_issue_category: [
        "camera_defect",
        "gps_failure",
        "screen_damage",
        "battery_charging",
        "lost_stolen",
        "other",
      ],
      dispute_resolution_status: [
        "none",
        "under_investigation",
        "resolved_cleared",
        "resolved_violation",
      ],
      event_processing_status: [
        "accepted",
        "needs_review",
        "rejected",
        "processed",
      ],
      exception_review_status: [
        "pending_review",
        "approved",
        "rejected",
        "escalated",
      ],
      exception_type: [
        "gps_failure",
        "camera_failure",
        "device_depletion",
        "missed_visit",
        "non_visit_day",
      ],
      flag_code: [
        "short_visit",
        "checkout_outside_geofence",
        "implausible_speed",
        "idle_gap",
        "late_meeting_log",
        "near_origin_visit",
        "duplicate_photo",
        "late_sync",
        "clock_discrepancy",
        "high_offline_share",
        "unassigned_device_used",
        "auto_closed_day",
        "audit_dispute",
      ],
      flag_severity: ["low", "medium", "high", "critical"],
      flag_status: [
        "open",
        "under_review",
        "cleared",
        "confirmed_violation",
        "escalated",
      ],
      location_classification: [
        "inside_confident",
        "uncertain",
        "outside",
        "no_fix",
      ],
      old_device_disposition: [
        "quarantined",
        "returned_to_depot",
        "revoked",
        "lost_reported",
      ],
      replacement_request_status: [
        "pending_review",
        "approved",
        "rejected",
        "awaiting_spare",
        "dispatched",
        "awaiting_activation",
        "completed",
      ],
      security_authorization_status: [
        "authorized",
        "quarantined",
        "revoked",
        "pending_activation",
      ],
      visit_kind: ["normal", "exception_visit"],
      visit_purpose: [
        "routine_visit",
        "new_business",
        "technical_support",
        "relationship",
        "follow_up",
      ],
      visit_verification_status: [
        "capturing",
        "pending_sync",
        "pending_review",
        "location_verified",
        "location_unverified",
        "manager_approved_unverified",
        "pending_client",
        "disputed_pending_review",
        "confirmed_violation",
        "rejected",
      ],
    },
  },
} as const
