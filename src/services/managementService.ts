import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

export type VerificationStatus =
  | 'location_verified'
  | 'manager_approved_unverified'
  | 'unverified'
  | 'flagged_investigation';

export type FlagSeverity = Database['public']['Enums']['flag_severity'];
export type FlagStatus = Database['public']['Enums']['flag_status'];
export type AuditOutcome = Database['public']['Enums']['audit_outcome'];
export type AuditCallStatus = Database['public']['Enums']['audit_call_status'];
export type DisputeResolutionStatus = Database['public']['Enums']['dispute_resolution_status'];
export type AuditSelectionMethod = Database['public']['Enums']['audit_selection_method'];
export type ExceptionReviewStatus = Database['public']['Enums']['exception_review_status'];

export interface CountryTeamAttendanceRecord {
  id: string;
  userId: string;
  repName: string;
  email: string;
  phone: string;
  marketCode: string;
  workDate: string;
  status: 'started' | 'ended' | 'auto_closed' | 'approved_non_visit' | 'approved_leave' | 'absent';
  startedAt: string | null;
  endedAt: string | null;
  startLatitude: number | null;
  startLongitude: number | null;
  startAccuracyM: number | null;
  startSelfieUrl: string | null;
  deviceId: string | null;
  deviceTag?: string;
  deviceModel?: string;
  isRealRecord: boolean;
}

export interface RealVisitVerificationRecord {
  id: string;
  repId: string;
  repName: string;
  organisationName: string;
  branchName: string;
  branchAddress: string;
  category: string;
  marketCode: string;
  workDate: string;
  checkInAt: string;
  checkOutAt: string | null;
  durationMinutes: number | null;
  verificationStatus: VerificationStatus;
  checkInLatitude: number;
  checkInLongitude: number;
  checkInAccuracyM: number;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutAccuracyM: number | null;
  pinLatitude: number | null;
  pinLongitude: number | null;
  geofenceRadiusM: number;
  distanceMeters: number | null;
  withinGeofence: boolean;
  premisesPhotoPath: string | null;
  premisesPhotoUrl?: string | null;
  meetingLog?: {
    id: string;
    contactName: string;
    contactRole: string;
    visitPurpose: string;
    productsDiscussed: string[];
    fleetSizeOrVolume: string | null;
    outcomeNarrative: string;
    nextStepText: string;
    businessCardPhotoPath: string | null;
    businessCardPhotoUrl?: string | null;
    submittedAt: string;
  } | null;
  clientAuditStatus?: {
    id: string;
    callStatus: AuditCallStatus;
    auditOutcome: AuditOutcome;
    disputeStatus: DisputeResolutionStatus;
    contactName: string;
    contactPhone: string;
  } | null;
}

export interface RealBranchPinProposal {
  id: string;
  branchId: string;
  branchName: string;
  organisationName: string;
  category: string;
  address: string;
  marketCode: string;
  latitude: number;
  longitude: number;
  reportedAccuracyM: number;
  premisesPhotoPath: string;
  premisesPhotoUrl?: string | null;
  proposedBy: string;
  proposedByName: string;
  proposedByEmail: string;
  proposedAt: string;
  status: 'pending_approval' | 'pending_review' | 'approved' | 'rejected' | 'superseded';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  decisionReason?: string | null;
  versionNumber: number;
  isActive: boolean;
}

export type RealBranchPinRecord = RealBranchPinProposal;

export interface RealExceptionItem {
  id: string;
  userId: string;
  repName: string;
  repEmail: string;
  marketCode: string;
  branchId: string | null;
  branchName: string;
  organisationName: string;
  visitId: string | null;
  exceptionType: Database['public']['Enums']['exception_type'];
  failureReason: string;
  claimedCheckInTime: string;
  claimedDurationMinutes: number;
  status: ExceptionReviewStatus;
  reviewedBy?: string | null;
  reviewedByName?: string;
  reviewedAt?: string | null;
  decisionReason?: string | null;
  submittedAt: string;
}

export interface RealVerificationFlag {
  id: string;
  visitId: string | null;
  attendanceDayId: string | null;
  userId: string;
  repName: string;
  marketCode: string;
  flagCode: string;
  severity: FlagSeverity;
  status: FlagStatus;
  details: Record<string, any>;
  reviewerNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  organisationName?: string;
  branchName?: string;
}

export interface RealAuditCallRecord {
  id: string;
  visitId: string;
  marketCode: string;
  selectionMethod: AuditSelectionMethod;
  contactName: string;
  contactPhone: string;
  callStatus: AuditCallStatus;
  meetingConfirmed: boolean | null;
  auditOutcome: AuditOutcome;
  disputeStatus: DisputeResolutionStatus;
  disputeNotes: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  visit?: {
    repName: string;
    organisationName: string;
    branchName: string;
    checkInAt: string;
    checkOutAt: string | null;
    verificationStatus: string;
    productsDiscussed?: string[];
  };
  attempts: {
    id: string;
    attemptNumber: number;
    dialedAt: string;
    callResult: AuditCallStatus;
    callNotes: string | null;
    auditorName?: string;
  }[];
}

/**
 * Escapes CSV cell values against CSV / Formula Injection (CWE-1236).
 * Prepends a single quote (') if the value starts with '=', '+', '-', '@', tab, or CR.
 */
export function sanitizeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  let str = String(value);

  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export const managementService = {
  /**
   * Queries real team attendance for Country Sales Head review, sandboxed by market.
   */
  async getCountryTeamAttendance(
    marketCode: string,
    workDate: string
  ): Promise<{ data: CountryTeamAttendanceRecord[]; error: Error | null }> {
    try {
      let query = supabase
        .from('attendance_days')
        .select(`
          id,
          user_id,
          device_id,
          market_code,
          work_date,
          status,
          started_at,
          ended_at,
          start_latitude,
          start_longitude,
          start_accuracy_m,
          start_selfie_url,
          profiles:user_id (id, full_name, email, phone_number, role, market_code),
          devices:device_id (id, asset_tag, make, model)
        `)
        .eq('work_date', workDate);

      if (marketCode && marketCode !== 'ALL') {
        query = query.eq('market_code', marketCode);
      }

      const { data, error } = await query.order('started_at', { ascending: false });

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      const records: CountryTeamAttendanceRecord[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        repName: row.profiles?.full_name || 'Carbon Field Salesperson',
        email: row.profiles?.email || '',
        phone: row.profiles?.phone_number || '',
        marketCode: row.market_code,
        workDate: row.work_date,
        status: row.status,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        startLatitude: row.start_latitude,
        startLongitude: row.start_longitude,
        startAccuracyM: row.start_accuracy_m,
        startSelfieUrl: row.start_selfie_url,
        deviceId: row.device_id,
        deviceTag: row.devices?.asset_tag,
        deviceModel: row.devices ? `${row.devices.make} ${row.devices.model}` : undefined,
        isRealRecord: true,
      }));

      return { data: records, error: null };
    } catch (err: any) {
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Generates a time-limited signed URL for private attendance selfie photos.
   */
  async getSelfieSignedUrl(storagePath: string): Promise<string | null> {
    if (!storagePath) return null;
    if (storagePath.startsWith('http') || storagePath.startsWith('blob:') || storagePath.startsWith('data:')) {
      return storagePath;
    }
    try {
      const cleanPath = storagePath.startsWith('attendance-selfies/')
        ? storagePath.replace('attendance-selfies/', '')
        : storagePath;

      const { data, error } = await supabase.storage
        .from('attendance-selfies')
        .createSignedUrl(cleanPath, 300);

      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  },

  /**
   * Country Sales Head records approved administrative leave for a salesperson.
   * Calls RPC record_approved_leave(p_user_id, p_date, p_category, p_justification).
   */
  async recordApprovedLeave(params: {
    userId: string;
    date: string;
    category: string;
    justification: string;
  }): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.rpc('record_approved_leave', {
        p_user_id: params.userId,
        p_date: params.date,
        p_category: params.category,
        p_justification: params.justification,
      });

      if (error) {
        return { success: false, error: new Error(error.message) };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Country Sales Head reviews a salesperson non-visit workday request.
   * Calls RPC review_non_visit_workday(p_request_id, p_decision, p_reason).
   */
  async reviewNonVisitWorkday(params: {
    requestId: string;
    decision: 'approved' | 'rejected';
    reason: string;
  }): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.rpc('review_non_visit_workday', {
        p_request_id: params.requestId,
        p_decision: params.decision,
        p_reason: params.reason,
      });

      if (error) {
        return { success: false, error: new Error(error.message) };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Queries real visits with meeting logs, branch pin, and client audit status.
   */
  async getCountryVisits(
    marketCode: string,
    workDate?: string,
    limit: number = 50
  ): Promise<{ data: RealVisitVerificationRecord[]; error: Error | null }> {
    try {
      let query = supabase
        .from('visits')
        .select(`
          id,
          user_id,
          attendance_day_id,
          branch_id,
          branch_pin_id,
          check_in_at,
          check_out_at,
          check_in_latitude,
          check_in_longitude,
          check_in_accuracy_m,
          check_out_latitude,
          check_out_longitude,
          check_out_accuracy_m,
          premises_photo_url,
          verification_status,
          created_at,
          profiles:user_id (id, full_name, email, role, market_code),
          branches:branch_id (
            id,
            branch_name,
            street_address,
            market_code,
            category,
            organisations:organisation_id (id, name)
          ),
          branch_location_pins:branch_pin_id (
            id,
            latitude,
            longitude,
            reported_accuracy_m,
            version_number
          ),
          meeting_logs (
            id,
            purpose,
            products_discussed,
            fleet_size_volume,
            outcome_narrative,
            next_step_text,
            business_card_photo_url,
            submitted_at,
            client_contacts:contact_id (
              id,
              full_name,
              phone_number,
              designation
            )
          ),
          client_audit_records (
            id,
            call_status,
            audit_outcome,
            dispute_status,
            contact_name,
            contact_phone
          )
        `);

      if (workDate) {
        query = query.gte('check_in_at', `${workDate}T00:00:00Z`).lte('check_in_at', `${workDate}T23:59:59Z`);
      }

      const { data, error } = await query
        .order('check_in_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      const filteredRows = (data || []).filter((row: any) => {
        if (!marketCode || marketCode === 'ALL') return true;
        const bMarket = row.branches?.market_code || row.profiles?.market_code;
        return bMarket === marketCode;
      });

      const records: RealVisitVerificationRecord[] = filteredRows.map((row: any) => {
        const pin = row.branch_location_pins;
        let distanceMeters: number | null = null;
        let withinGeofence = false;

        if (pin?.latitude && pin?.longitude && row.check_in_latitude && row.check_in_longitude) {
          const R = 6371e3;
          const lat1 = (row.check_in_latitude * Math.PI) / 180;
          const lat2 = (pin.latitude * Math.PI) / 180;
          const dLat = ((pin.latitude - row.check_in_latitude) * Math.PI) / 180;
          const dLon = ((pin.longitude - row.check_in_longitude) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distanceMeters = Math.round(R * c);
          withinGeofence = distanceMeters <= 200;
        }

        let durationMins: number | null = null;
        if (row.check_in_at && row.check_out_at) {
          const diffMs = new Date(row.check_out_at).getTime() - new Date(row.check_in_at).getTime();
          durationMins = Math.max(0, Math.round(diffMs / 60000));
        }

        const log = Array.isArray(row.meeting_logs) ? row.meeting_logs[0] : row.meeting_logs;
        const contact = log?.client_contacts;
        const audit = Array.isArray(row.client_audit_records)
          ? row.client_audit_records[0]
          : row.client_audit_records;

        return {
          id: row.id,
          repId: row.user_id,
          repName: row.profiles?.full_name || 'Carbon Field Salesperson',
          organisationName: row.branches?.organisations?.name || 'Client Organisation',
          branchName: row.branches?.branch_name || 'Client Branch',
          branchAddress: row.branches?.street_address || 'Branch Address',
          category: row.branches?.category || 'fleet_operator',
          marketCode: row.branches?.market_code || row.profiles?.market_code || marketCode,
          workDate: row.check_in_at ? row.check_in_at.slice(0, 10) : '',
          checkInAt: row.check_in_at,
          checkOutAt: row.check_out_at,
          durationMinutes: durationMins,
          verificationStatus: row.verification_status,
          checkInLatitude: row.check_in_latitude,
          checkInLongitude: row.check_in_longitude,
          checkInAccuracyM: row.check_in_accuracy_m,
          checkOutLatitude: row.check_out_latitude,
          checkOutLongitude: row.check_out_longitude,
          checkOutAccuracyM: row.check_out_accuracy_m,
          pinLatitude: pin?.latitude || null,
          pinLongitude: pin?.longitude || null,
          geofenceRadiusM: 200,
          distanceMeters,
          withinGeofence,
          premisesPhotoPath: row.premises_photo_url,
          meetingLog: log
            ? {
                id: log.id,
                contactName: contact?.full_name || 'Client Contact',
                contactRole: contact?.designation || 'Staff',
                visitPurpose: log.purpose,
                productsDiscussed: Array.isArray(log.products_discussed) ? log.products_discussed : [],
                fleetSizeOrVolume: log.fleet_size_volume,
                outcomeNarrative: log.outcome_narrative,
                nextStepText: log.next_step_text,
                businessCardPhotoPath: log.business_card_photo_url,
                submittedAt: log.submitted_at,
              }
            : null,
          clientAuditStatus: audit
            ? {
                id: audit.id,
                callStatus: audit.call_status,
                auditOutcome: audit.audit_outcome,
                disputeStatus: audit.dispute_status,
                contactName: audit.contact_name,
                contactPhone: audit.contact_phone,
              }
            : null,
        };
      });

      return { data: records, error: null };
    } catch (err: any) {
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Generates a time-limited signed URL for premises photo in visit-premises-photos bucket.
   */
  async getPremisesPhotoSignedUrl(storagePath: string): Promise<string | null> {
    if (!storagePath) return null;
    if (storagePath.startsWith('http') || storagePath.startsWith('blob:') || storagePath.startsWith('data:')) {
      return storagePath;
    }
    try {
      const cleanPath = storagePath.startsWith('visit-premises-photos/')
        ? storagePath.replace('visit-premises-photos/', '')
        : storagePath;

      const { data, error } = await supabase.storage
        .from('visit-premises-photos')
        .createSignedUrl(cleanPath, 300);

      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  },

  /**
   * Generates a time-limited signed URL for business card photo in 'business-cards' bucket.
   */
  async getBusinessCardSignedUrl(storagePath: string): Promise<string | null> {
    if (!storagePath) return null;
    if (storagePath.startsWith('http') || storagePath.startsWith('blob:') || storagePath.startsWith('data:')) {
      return storagePath;
    }
    try {
      let cleanPath = storagePath;
      if (cleanPath.startsWith('business-cards/')) {
        cleanPath = cleanPath.replace('business-cards/', '');
      } else if (cleanPath.startsWith('visit-business-cards/')) {
        cleanPath = cleanPath.replace('visit-business-cards/', '');
      }

      const { data, error } = await supabase.storage
        .from('business-cards')
        .createSignedUrl(cleanPath, 300);

      if (error || !data?.signedUrl) {
        console.warn('[managementService] Error creating signed URL for business-cards:', error?.message);
        return null;
      }
      return data.signedUrl;
    } catch (err) {
      console.warn('[managementService] Exception creating signed URL for business-cards:', err);
      return null;
    }
  },

  /**
   * Queries branch location pins for approval queue or directory inspection.
   */
  async getBranchLocationPins(
    marketCode: string,
    statusFilter?: 'pending_approval' | 'approved' | 'rejected' | 'all'
  ): Promise<{ data: RealBranchPinProposal[]; error: Error | null }> {
    try {
      let query = supabase
        .from('branch_location_pins')
        .select(`
          id,
          branch_id,
          latitude,
          longitude,
          reported_accuracy_m,
          premises_photo_url,
          proposed_by,
          proposed_at,
          status,
          reviewed_by,
          reviewed_at,
          decision_reason,
          version_number,
          is_active,
          branches:branch_id (
            id,
            branch_name,
            street_address,
            market_code,
            category,
            organisations:organisation_id (name)
          ),
          profiles:proposed_by (full_name, email)
        `);

      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'pending_approval') {
          query = query.in('status', ['pending_approval', 'pending_review']);
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      const { data, error } = await query.order('proposed_at', { ascending: false });

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      const filtered = (data || []).filter((row: any) => {
        if (!marketCode || marketCode === 'ALL') return true;
        return row.branches?.market_code === marketCode;
      });

      const records: RealBranchPinProposal[] = filtered.map((row: any) => ({
        id: row.id,
        branchId: row.branch_id,
        branchName: row.branches?.branch_name || 'Client Branch',
        organisationName: row.branches?.organisations?.name || 'Organisation',
        category: row.branches?.category || 'fleet_operator',
        address: row.branches?.street_address || 'Site Address',
        marketCode: row.branches?.market_code || marketCode,
        latitude: row.latitude,
        longitude: row.longitude,
        reportedAccuracyM: row.reported_accuracy_m,
        premisesPhotoPath: row.premises_photo_url,
        proposedBy: row.proposed_by,
        proposedByName: row.profiles?.full_name || 'Carbon Salesperson',
        proposedByEmail: row.profiles?.email || '',
        proposedAt: row.proposed_at,
        status: row.status,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        decisionReason: row.decision_reason,
        versionNumber: row.version_number,
        isActive: row.is_active,
      }));

      return { data: records, error: null };
    } catch (err: any) {
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Country Sales Head approves a branch location pin proposal.
   * Calls RPC approve_branch_location_pin(p_pin_id, p_reason).
   */
  async approveBranchLocationPin(pinId: string, reason: string): Promise<{ success: boolean; error: Error | null }> {
    if (!reason || !reason.trim()) {
      return { success: false, error: new Error('Mandatory review reason is required.') };
    }
    try {
      const { error } = await supabase.rpc('approve_branch_location_pin', {
        p_pin_id: pinId,
        p_reason: reason.trim(),
      });

      if (error) {
        return { success: false, error: new Error(error.message) };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Country Sales Head rejects a branch location pin proposal.
   * Calls RPC reject_branch_location_pin(p_pin_id, p_reason).
   */
  async rejectBranchLocationPin(pinId: string, reason: string): Promise<{ success: boolean; error: Error | null }> {
    if (!reason || !reason.trim()) {
      return { success: false, error: new Error('Mandatory review reason is required.') };
    }
    try {
      const { error } = await supabase.rpc('reject_branch_location_pin', {
        p_pin_id: pinId,
        p_reason: reason.trim(),
      });

      if (error) {
        return { success: false, error: new Error(error.message) };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Proposes a new GPS pin for a branch location.
   * Calls RPC propose_branch_location_pin.
   */
  async proposeBranchLocationPin(params: {
    branchId: string;
    latitude: number;
    longitude: number;
    accuracyM: number;
    photoUrl: string;
  }): Promise<{ pinId: string | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('propose_branch_location_pin', {
        p_branch_id: params.branchId,
        p_latitude: params.latitude,
        p_longitude: params.longitude,
        p_accuracy_m: params.accuracyM,
        p_photo_url: params.photoUrl,
      });

      if (error) {
        return { pinId: null, error: new Error(error.message) };
      }
      return { pinId: data as string, error: null };
    } catch (err: any) {
      return { pinId: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Queries salesperson exception requests for country review.
   */
  async getCountryExceptions(
    marketCode: string,
    statusFilter?: ExceptionReviewStatus | 'all'
  ): Promise<{ data: RealExceptionItem[]; error: Error | null }> {
    try {
      let query = supabase
        .from('exceptions')
        .select(`
          id,
          user_id,
          branch_id,
          resulting_visit_id,
          exception_type,
          reason,
          claimed_visit_time,
          status,
          reviewed_by:decided_by,
          reviewed_at:decided_at,
          decision_reason,
          created_at,
          profiles:user_id (full_name, email, market_code),
          branches:branch_id (
            branch_name,
            market_code,
            organisations:organisation_id (name)
          )
        `);

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      const filtered = (data || []).filter((row: any) => {
        if (!marketCode || marketCode === 'ALL') return true;
        const m = row.branches?.market_code || row.profiles?.market_code;
        return m === marketCode;
      });

      const records: RealExceptionItem[] = filtered.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        repName: row.profiles?.full_name || 'Carbon Salesperson',
        repEmail: row.profiles?.email || '',
        marketCode: row.branches?.market_code || row.profiles?.market_code || marketCode,
        branchId: row.branch_id,
        branchName: row.branches?.branch_name || 'Field Client Location',
        organisationName: row.branches?.organisations?.name || 'Client Organisation',
        visitId: row.resulting_visit_id,
        exceptionType: row.exception_type,
        failureReason: row.reason,
        claimedCheckInTime: row.claimed_visit_time,
        claimedDurationMinutes: 30,
        status: row.status,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        decisionReason: row.decision_reason,
        submittedAt: row.created_at,
      }));

      return { data: records, error: null };
    } catch (err: any) {
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Country Sales Head reviews a salesperson exception.
   * Calls RPC review_salesperson_exception(p_exception_id, p_status, p_reason).
   * Approved exceptions automatically update the visit to manager_approved_unverified.
   */
  async reviewSalespersonException(
    exceptionId: string,
    status: ExceptionReviewStatus,
    reason: string
  ): Promise<{ success: boolean; error: Error | null }> {
    if (!reason || !reason.trim()) {
      return { success: false, error: new Error('Mandatory review reason is required.') };
    }
    try {
      const { error } = await supabase.rpc('review_salesperson_exception', {
        p_exception_id: exceptionId,
        p_status: status,
        p_reason: reason.trim(),
      });

      if (error) {
        return { success: false, error: new Error(error.message) };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Queries verification flags for managerial inspection and resolution.
   */
  async getCountryVerificationFlags(
    marketCode: string,
    statusFilter?: FlagStatus | 'all'
  ): Promise<{ data: RealVerificationFlag[]; error: Error | null }> {
    try {
      let query = supabase
        .from('verification_flags')
        .select(`
          id,
          visit_id,
          attendance_day_id,
          user_id,
          market_code,
          flag_code,
          severity,
          status,
          details,
          reviewer_notes,
          reviewed_by,
          reviewed_at,
          created_at,
          profiles:user_id (full_name, email),
          visits:visit_id (
            id,
            branches:branch_id (
              branch_name,
              organisations:organisation_id (name)
            )
          )
        `);

      if (marketCode && marketCode !== 'ALL') {
        query = query.eq('market_code', marketCode);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      const records: RealVerificationFlag[] = (data || []).map((row: any) => ({
        id: row.id,
        visitId: row.visit_id,
        attendanceDayId: row.attendance_day_id,
        userId: row.user_id,
        repName: row.profiles?.full_name || 'Carbon Salesperson',
        marketCode: row.market_code,
        flagCode: row.flag_code,
        severity: row.severity,
        status: row.status,
        details: (row.details as Record<string, any>) || {},
        reviewerNotes: row.reviewer_notes,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at,
        organisationName: row.visits?.branches?.organisations?.name,
        branchName: row.visits?.branches?.branch_name,
      }));

      return { data: records, error: null };
    } catch (err: any) {
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Reviews and adjudicates a verification risk flag.
   */
  async reviewVerificationFlag(params: {
    flagId: string;
    status: FlagStatus;
    reviewerNotes: string;
  }): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: userResp } = await supabase.auth.getUser();
      const currentUserId = userResp?.user?.id;

      const { error } = await supabase
        .from('verification_flags')
        .update({
          status: params.status,
          reviewer_notes: params.reviewerNotes,
          reviewed_by: currentUserId || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', params.flagId);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Queries client audit records and call history for Country Sales Head workbench.
   */
  async getClientAuditRecords(marketCode: string): Promise<{ data: RealAuditCallRecord[]; error: Error | null }> {
    try {
      let query = supabase
        .from('client_audit_records')
        .select(`
          id,
          visit_id,
          market_code,
          selection_method,
          contact_name,
          contact_phone,
          call_status,
          meeting_confirmed,
          audit_outcome,
          dispute_status,
          dispute_notes,
          resolved_by,
          resolved_at,
          created_at,
          visits:visit_id (
            id,
            check_in_at,
            check_out_at,
            verification_status,
            profiles:user_id (full_name),
            branches:branch_id (
              branch_name,
              organisations:organisation_id (name)
            ),
            meeting_logs (products_discussed)
          ),
          client_audit_attempts (
            id,
            attempt_number,
            dialed_at,
            call_result,
            call_notes,
            auditor_id,
            profiles:auditor_id (full_name)
          )
        `);

      if (marketCode && marketCode !== 'ALL') {
        query = query.eq('market_code', marketCode);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      const records: RealAuditCallRecord[] = (data || []).map((row: any) => {
        const v = row.visits;
        const attempts = (row.client_audit_attempts || []).map((att: any) => ({
          id: att.id,
          attemptNumber: att.attempt_number,
          dialedAt: att.dialed_at,
          callResult: att.call_result,
          callNotes: att.call_notes,
          auditorName: att.profiles?.full_name,
        }));

        const mLog = Array.isArray(v?.meeting_logs) ? v?.meeting_logs[0] : v?.meeting_logs;

        return {
          id: row.id,
          visitId: row.visit_id,
          marketCode: row.market_code,
          selectionMethod: row.selection_method,
          contactName: row.contact_name,
          contactPhone: row.contact_phone,
          callStatus: row.call_status,
          meetingConfirmed: row.meeting_confirmed,
          auditOutcome: row.audit_outcome,
          disputeStatus: row.dispute_status,
          disputeNotes: row.dispute_notes,
          resolvedBy: row.resolved_by,
          resolvedAt: row.resolved_at,
          createdAt: row.created_at,
          visit: v
            ? {
                repName: v.profiles?.full_name || 'Carbon Salesperson',
                organisationName: v.branches?.organisations?.name || 'Organisation',
                branchName: v.branches?.branch_name || 'Branch Location',
                checkInAt: v.check_in_at,
                checkOutAt: v.check_out_at,
                verificationStatus: v.verification_status,
                productsDiscussed: Array.isArray(mLog?.products_discussed) ? mLog.products_discussed : [],
              }
            : undefined,
          attempts: attempts.sort((a: any, b: any) => a.attemptNumber - b.attemptNumber),
        };
      });

      return { data: records, error: null };
    } catch (err: any) {
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Country Sales Head records the outcome of a client verification phone call.
   * Calls RPC record_client_audit_call. If client denies the visit, triggers dispute investigation.
   */
  async recordClientAuditCall(params: {
    auditRecordId: string;
    callResult: 'reached_confirmed' | 'reached_denied' | 'no_answer' | 'busy' | 'disconnected';
    notes: string;
    outcome?: 'confirmed' | 'denied' | 'unreachable';
    contactPerson?: string;
    telephone?: string;
  }): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.rpc('record_client_audit_call', {
        p_audit_record_id: params.auditRecordId,
        p_call_result: params.callResult,
        p_notes: params.notes,
        p_outcome: params.outcome ?? null,
        p_contact_person: params.contactPerson ?? null,
        p_telephone: params.telephone ?? null,
      });

      if (error) {
        return { success: false, error: new Error(error.message) };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Country Sales Head or HQ resolves a client audit dispute.
   * Calls RPC resolve_client_audit_dispute(p_audit_record_id, p_decision, p_mandatory_reason).
   */
  async resolveClientAuditDispute(params: {
    auditRecordId: string;
    decision: 'rep_substantiated' | 'confirmed_violation';
    mandatoryReason: string;
  }): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.rpc('resolve_client_audit_dispute', {
        p_audit_record_id: params.auditRecordId,
        p_decision: params.decision,
        p_mandatory_reason: params.mandatoryReason,
      });

      if (error) {
        return { success: false, error: new Error(error.message) };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * PRD §8.3 / AT-10: Samples 5% of completed location-verified visits for weekly audit.
   * Finds visits in the market not yet queued in client_audit_records.
   */
  async sampleWeeklyVisitsForAudit(
    marketCode: string
  ): Promise<{ sampledCount: number; error: Error | null }> {
    try {
      const { data: visits, error: vErr } = await supabase
        .from('visits')
        .select(`
          id,
          verification_status,
          client_audit_records (id),
          branches:branch_id (
            market_code,
            client_contacts (id, full_name, phone_number, is_primary)
          )
        `)
        .not('check_out_at', 'is', null);

      if (vErr) {
        return { sampledCount: 0, error: new Error(vErr.message) };
      }

      // Filter visits in the target market that do not already have an audit record
      const unAudited = (visits || []).filter((v: any) => {
        const bMarket = v.branches?.market_code;
        if (marketCode && marketCode !== 'ALL' && bMarket !== marketCode) return false;
        const hasAudit = Array.isArray(v.client_audit_records) && v.client_audit_records.length > 0;
        return !hasAudit;
      });

      if (unAudited.length === 0) {
        return { sampledCount: 0, error: null };
      }

      // Sample 5% (at least 1 if any unAudited exist)
      const sampleSize = Math.max(1, Math.round(unAudited.length * 0.05));
      const shuffled = [...unAudited].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, sampleSize);

      let createdCount = 0;
      for (const item of selected) {
        const contacts = item.branches?.client_contacts || [];
        const primaryContact = contacts.find((c: any) => c.is_primary) || contacts[0];

        const { error: insErr } = await supabase.from('client_audit_records').insert({
          visit_id: item.id,
          market_code: marketCode === 'ALL' ? item.branches?.market_code || 'NG' : marketCode,
          selection_method: 'random_5pct',
          contact_name: primaryContact?.full_name || 'Site Contact',
          contact_phone: primaryContact?.phone_number || '+234 800 000 0000',
          call_status: 'pending_call',
          audit_outcome: 'pending',
          dispute_status: 'none',
        });

        if (!insErr) {
          createdCount++;
        }
      }

      return { sampledCount: createdCount, error: null };
    } catch (err: any) {
      return { sampledCount: 0, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Generates a formula-safe CSV export file (CWE-1236 protected), triggers download,
   * and logs the export event to the public.export_jobs ledger table.
   */
  async exportCountryVisitsCsv(params: {
    marketCode: string;
    repId?: string;
  }): Promise<{ rowCount: number; error: Error | null }> {
    try {
      const { data: visits, error: vErr } = await this.getCountryVisits(params.marketCode, undefined, 200);

      if (vErr) {
        return { rowCount: 0, error: vErr };
      }

      let filtered = visits;
      if (params.repId && params.repId !== 'all') {
        filtered = filtered.filter((v) => v.repId === params.repId);
      }

      const headers = [
        'Export Timestamp (UTC)',
        'Market',
        'Visit ID',
        'Salesperson ID',
        'Salesperson Name',
        'Client Organisation',
        'Branch Name',
        'Branch Address',
        'Visit Date',
        'Check-In Time',
        'Check-Out Time',
        'Duration (Mins)',
        'Verification Status',
        'Geofence Distance (M)',
        'GPS Accuracy (M)',
        'Premises Photo Attached',
        'Meeting Purpose',
        'Contact Met',
        'Contact Role',
        'Products Discussed',
        'Narrative Outcome',
        'Next Steps (Free Text Narrative)',
        'Client Audit Result',
        'Formula Escaped (CWE-1236)',
      ];

      const rows = filtered.map((v) => [
        new Date().toISOString(),
        v.marketCode,
        v.id,
        v.repId,
        v.repName,
        v.organisationName,
        v.branchName,
        v.branchAddress,
        v.workDate,
        v.checkInAt,
        v.checkOutAt || 'In Progress',
        v.durationMinutes !== null ? String(v.durationMinutes) : 'N/A',
        v.verificationStatus,
        v.distanceMeters !== null ? String(v.distanceMeters) : 'N/A',
        String(Math.round(v.checkInAccuracyM)),
        v.premisesPhotoPath ? 'Yes' : 'No',
        v.meetingLog?.visitPurpose || 'N/A',
        v.meetingLog?.contactName || 'N/A',
        v.meetingLog?.contactRole || 'N/A',
        v.meetingLog?.productsDiscussed?.join(', ') || 'N/A',
        v.meetingLog?.outcomeNarrative || 'N/A',
        v.meetingLog?.nextStepText || 'N/A',
        v.clientAuditStatus?.auditOutcome || 'Pending Audit',
        'TRUE',
      ]);

      const csvLines = [
        headers.map(sanitizeCsvCell).join(','),
        ...rows.map((row) => row.map(sanitizeCsvCell).join(',')),
      ];

      const csvContent = csvLines.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Carbon_Visits_${params.marketCode}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Record export in public.export_jobs
      const { data: userResp } = await supabase.auth.getUser();
      const currentUserId = userResp?.user?.id;
      if (currentUserId) {
        await supabase.from('export_jobs').insert({
          export_type: 'country_visits_csv',
          market_code: params.marketCode === 'ALL' ? null : params.marketCode,
          row_count: rows.length,
          downloaded_by: currentUserId,
          downloaded_at: new Date().toISOString(),
          formula_escaped: true,
        });
      }

      return { rowCount: rows.length, error: null };
    } catch (err: any) {
      return { rowCount: 0, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Queries active salespeople assigned to a market.
   */
  async getMarketSalespeople(
    marketCode: string
  ): Promise<{ id: string; full_name: string; email: string; market_code: string }[]> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, market_code')
        .eq('role', 'salesperson')
        .eq('market_code', marketCode)
        .eq('is_active', true)
        .order('full_name');

      return (data || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name || 'Field Representative',
        email: p.email || '',
        market_code: p.market_code,
      }));
    } catch (err) {
      console.warn('[managementService] Error fetching market salespeople:', err);
      return [];
    }
  },

  /**
   * Queries pending branch location pins for country review.
   */
  async getCountryPendingPins(marketCode: string): Promise<RealBranchPinProposal[]> {
    const { data } = await this.getBranchLocationPins(marketCode, 'pending_approval');
    return data || [];
  },
};
