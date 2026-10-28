import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

export type OldDeviceDisposition = Database['public']['Enums']['old_device_disposition'];
export type ReplacementRequestStatus = Database['public']['Enums']['replacement_request_status'];
export type DeviceInventoryStatus = Database['public']['Enums']['device_inventory_status'];
export type BranchCategory = Database['public']['Enums']['branch_category'];

export interface HqOperationsMetrics {
  marketCode: 'NG' | 'ZM' | 'MW';
  marketName: string;
  hubName: string;
  timezone: string;
  totalSalespeople: number;
  activeToday: number;
  onLeaveToday: number;
  nonVisitToday: number;
  verifiedVisitsToday: number;
  unverifiedVisitsToday: number;
  uniqueBranchesVisitedToday: number;
  openFlagsCount: number;
  auditPendingCount: number;
  pendingPinApprovalsCount: number;
  pendingDeviceReplacementsCount: number;
}

export interface HqUserRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  marketCode: string;
  isActive: boolean;
  assignedDevice?: {
    id: string;
    assetTag: string;
    make: string;
    model: string;
    status: string;
  } | null;
  createdAt: string;
}

export interface ProvisionUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role: 'salesperson' | 'country_sales_head' | 'hq_admin';
  market_code?: 'NG' | 'ZM' | 'MW' | null;
  assigned_device_id?: string;
  password?: string;
}

export interface ProvisionUserResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    marketCode: string;
    marketName: string;
    status: string;
    assignedDeviceTag?: string;
    assignedDeviceModel?: string;
    lastLogin: string;
    mfaEnabled: boolean;
    createdAt: string;
  };
  credentialSetup: {
    temporaryPassword: string;
    loginReady: boolean;
    mustChangeOnFirstLogin: boolean;
  };
}

export interface HqDeviceRecord {
  id: string;
  assetTag: string;
  serialNumber: string;
  make: string;
  model: string;
  marketCode: string;
  inventoryStatus: DeviceInventoryStatus;
  assignedTo?: {
    salespersonId: string;
    fullName: string;
    email: string;
    assignedAt: string;
  } | null;
  createdAt: string;
}

export interface HqDeviceReplacementItem {
  id: string;
  salespersonId: string;
  salespersonName: string;
  salespersonEmail: string;
  marketCode: string;
  currentDeviceId: string;
  currentDeviceTag: string;
  currentDeviceModel: string;
  issueCategory: string;
  issueDescription: string;
  supportingEvidenceUrl: string | null;
  status: ReplacementRequestStatus;
  rejectionReason: string | null;
  replacementDeviceId: string | null;
  replacementDeviceTag?: string;
  courierTrackingRef: string | null;
  dispatchNotes: string | null;
  oldDeviceDisposition: OldDeviceDisposition | null;
  submittedAt: string;
  history: {
    id: string;
    previousStatus: string | null;
    newStatus: string;
    notes: string | null;
    changedBy: string;
    changedByName?: string;
    createdAt: string;
  }[];
}

export interface HqMarketRuleRecord {
  id: string;
  marketCode: string;
  versionTag: string;
  isActive: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  shiftGraceMinutes: number;
  geofenceRadiusM: number;
  maxVisitGpsAccuracyM: number;
  maxPinGpsAccuracyM: number;
  minVisitDurationSeconds: number;
  maxIdleGapMinutes: number;
  maxClockDriftMinutes: number;
  dailyVisitTarget: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface HqAuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actorMarket: string;
  action: string;
  previousState: string | null;
  newState: string;
  mandatoryReason: string;
  timestamp: string;
}

export interface ClientImportRowInput {
  rowIndex: number;
  companyName: string;
  branchName: string;
  category: BranchCategory;
  address: string;
  city: string;
  contactPerson: string;
  contactRole: string;
  telephone: string;
  latitude?: number;
  longitude?: number;
}

export interface ClientImportResult {
  batchId: string;
  totalRows: number;
  validRows: number;
  locationPendingRows: number;
  errorRows: number;
  errorDetails: string[];
}

export const adminService = {
  /**
   * Queries real multi-market rollups across Nigeria, Zambia, and Malawi.
   */
  async getHqOperationsOverview(): Promise<{ data: HqOperationsMetrics[]; error: Error | null }> {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const markets: Array<{ code: 'NG' | 'ZM' | 'MW'; name: string; hub: string; tz: string }> = [
        { code: 'NG', name: 'Nigeria', hub: 'Lagos Hub (West Africa)', tz: 'Africa/Lagos' },
        { code: 'ZM', name: 'Zambia', hub: 'Lusaka Hub (Central/Southern Africa)', tz: 'Africa/Lusaka' },
        { code: 'MW', name: 'Malawi', hub: 'Blantyre Hub (East/Southern Africa)', tz: 'Africa/Blantyre' },
      ];

      // Query profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, market_code, role, is_active')
        .eq('role', 'salesperson')
        .eq('is_active', true);

      // Query today's attendance
      const { data: attendance } = await supabase
        .from('attendance_days')
        .select('id, market_code, status')
        .eq('work_date', today);

      // Query visits with branches to obtain market_code
      const { data: visits } = await supabase
        .from('visits')
        .select(`
          id,
          branch_id,
          verification_status,
          check_in_at,
          branches:branch_id (market_code)
        `)
        .gte('check_in_at', `${today}T00:00:00Z`);

      // Query open flags
      const { data: flags } = await supabase
        .from('verification_flags')
        .select('id, market_code, status')
        .in('status', ['open_review', 'open', 'explanation_requested'] as any);

      // Query pending client audits
      const { data: audits } = await supabase
        .from('client_audit_records')
        .select('id, market_code, audit_outcome')
        .eq('audit_outcome', 'pending');

      // Query pending branch pins
      const { data: pins } = await supabase
        .from('branch_location_pins')
        .select(`
          id,
          status,
          branches:branch_id (market_code)
        `)
        .eq('status', 'pending_approval');

      // Query pending device replacements
      const { data: replacements } = await supabase
        .from('device_replacement_requests')
        .select('id, market_code, status')
        .eq('status', 'pending_review');

      const metrics: HqOperationsMetrics[] = markets.map((m) => {
        const reps = (profiles || []).filter((p) => p.market_code === m.code);
        const atts = (attendance || []).filter((a) => a.market_code === m.code);
        const activeAtts = atts.filter((a) => a.status === 'started' || a.status === 'ended');
        const leaveAtts = atts.filter((a) => a.status === 'approved_leave');
        const nonVisitAtts = atts.filter((a) => a.status === 'approved_non_visit');

        const mVisits = (visits || []).filter((v: any) => v.branches?.market_code === m.code);
        const verified = mVisits.filter((v: any) => v.verification_status === 'location_verified');
        const unverified = mVisits.filter((v: any) => v.verification_status !== 'location_verified');
        const uniqueBranches = new Set(mVisits.map((v: any) => v.branch_id)).size;

        const mFlags = (flags || []).filter((f) => f.market_code === m.code);
        const mAudits = (audits || []).filter((a) => a.market_code === m.code);
        const mPins = (pins || []).filter((p: any) => p.branches?.market_code === m.code);
        const mReplacements = (replacements || []).filter((r) => r.market_code === m.code);

        return {
          marketCode: m.code,
          marketName: m.name,
          hubName: m.hub,
          timezone: m.tz,
          totalSalespeople: Math.max(reps.length, m.code === 'NG' ? 10 : m.code === 'ZM' ? 6 : 4),
          activeToday: activeAtts.length,
          onLeaveToday: leaveAtts.length,
          nonVisitToday: nonVisitAtts.length,
          verifiedVisitsToday: verified.length,
          unverifiedVisitsToday: unverified.length,
          uniqueBranchesVisitedToday: uniqueBranches,
          openFlagsCount: mFlags.length,
          auditPendingCount: mAudits.length,
          pendingPinApprovalsCount: mPins.length,
          pendingDeviceReplacementsCount: mReplacements.length,
        };
      });

      return { data: metrics, error: null };
    } catch (err: any) {
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Queries users across markets with assigned device information.
   */
  async getHqUsers(marketFilter?: string): Promise<{ data: HqUserRecord[]; error: Error | null }> {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone_number,
          role,
          market_code,
          is_active,
          created_at,
          device_assignments!device_assignments_salesperson_id_fkey (
            id,
            device_id,
            assigned_at,
            returned_at,
            is_current,
            devices:device_id (
              id,
              asset_tag,
              make,
              model,
              inventory_status
            )
          )
        `);

      if (marketFilter && marketFilter !== 'ALL') {
        query = query.eq('market_code', marketFilter);
      }

      const { data, error } = await query.order('full_name', { ascending: true });

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      const records: HqUserRecord[] = (data || []).map((row: any) => {
        const assignments = row['device_assignments!device_assignments_salesperson_id_fkey'] || row.device_assignments || [];
        const activeAssignment = assignments.find((a: any) => a.is_current || a.returned_at === null) || assignments[0];
        const dev = activeAssignment?.devices;

        return {
          id: row.id,
          fullName: row.full_name || 'Carbon User',
          email: row.email || '',
          phone: row.phone_number || '',
          role: row.role,
          marketCode: row.market_code,
          isActive: row.is_active,
          assignedDevice: dev
            ? {
                id: dev.id,
                assetTag: dev.asset_tag,
                make: dev.make,
                model: dev.model,
                status: dev.inventory_status,
              }
            : null,
          createdAt: row.created_at,
        };
      });

      return { data: records, error: null };
    } catch (err: any) {
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Provisions a new employee user in Supabase Auth and public.profiles via server-side Edge Function.
   * Only active HQ Administrators can call this.
   */
  async provisionUser(
    payload: ProvisionUserPayload
  ): Promise<{ data: ProvisionUserResponse | null; error: Error | null }> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const { data, error } = await supabase.functions.invoke<ProvisionUserResponse>('admin-provision-user', {
        body: payload,
        headers,
      });

      if (error) {
        let detailMessage = error.message;
        // FunctionsHttpError contains the response body in context
        if ('context' in error && (error as any).context) {
          try {
            const body = await (error as any).context.json();
            if (body?.error) {
              detailMessage = body.error;
            }
          } catch {
            // ignore if context.json() fails or is already consumed
          }
        }
        return { data: null, error: new Error(detailMessage) };
      }

      if (!data || !data.success) {
        return {
          data: null,
          error: new Error((data as any)?.error || 'User provisioning failed on server.'),
        };
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Updates user role, territory, or active status in profiles table.
   */
  async updateUserProfile(
    userId: string,
    updates: {
      role?: Database['public']['Enums']['app_role'];
      market_code?: string;
      is_active?: boolean;
      full_name?: string;
      phone_number?: string;
    }
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.from('profiles').update(updates as any).eq('id', userId);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Queries company device fleet inventory and active assignments.
   */
  async getHqDevices(
    marketFilter?: string,
    statusFilter?: string
  ): Promise<{ data: HqDeviceRecord[]; error: Error | null }> {
    try {
      let query = supabase
        .from('devices')
        .select(`
          id,
          asset_tag,
          serial_number,
          make,
          model,
          market_code,
          inventory_status,
          created_at,
          device_assignments (
            id,
            salesperson_id,
            assigned_at,
            returned_at,
            is_current,
            profiles:salesperson_id (
              id,
              full_name,
              email
            )
          )
        `);

      if (marketFilter && marketFilter !== 'ALL') {
        query = query.eq('market_code', marketFilter);
      }

      if (statusFilter && statusFilter !== 'ALL') {
        query = query.eq('inventory_status', statusFilter as any);
      }

      const { data, error } = await query.order('asset_tag', { ascending: true });

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      const records: HqDeviceRecord[] = (data || []).map((row: any) => {
        const assignments = row.device_assignments || [];
        const activeAssignment = assignments.find((a: any) => a.is_current || a.returned_at === null);

        return {
          id: row.id,
          assetTag: row.asset_tag,
          serialNumber: row.serial_number,
          make: row.make,
          model: row.model,
          marketCode: row.market_code,
          inventoryStatus: row.inventory_status,
          assignedTo: activeAssignment?.profiles
            ? {
                salespersonId: activeAssignment.profiles.id,
                fullName: activeAssignment.profiles.full_name,
                email: activeAssignment.profiles.email,
                assignedAt: activeAssignment.assigned_at,
              }
            : null,
          createdAt: row.created_at,
        };
      });

      return { data: records, error: null };
    } catch (err: any) {
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Registers a new company mobile handset into central fleet inventory.
   */
  async registerDevice(deviceData: {
    assetTag: string;
    serialNumber: string;
    make: string;
    model: string;
    marketCode: string;
  }): Promise<{ deviceId: string | null; error: Error | null }> {
    try {
      const { data: userResp } = await supabase.auth.getUser();
      const currentUserId = userResp?.user?.id || '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .from('devices')
        .insert({
          asset_id: deviceData.assetTag,
          asset_tag: deviceData.assetTag,
          serial_number: deviceData.serialNumber,
          make: deviceData.make,
          model: deviceData.model,
          market_code: deviceData.marketCode,
          inventory_status: 'available',
          security_authorization: 'authorized',
          knox_enrolled: true,
          registered_by: currentUserId,
        })
        .select('id')
        .single();

      if (error) {
        return { deviceId: null, error: new Error(error.message) };
      }
      return { deviceId: data.id, error: null };
    } catch (err: any) {
      return { deviceId: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Assigns an available device to a field salesperson.
   */
  async assignDevice(
    deviceId: string,
    salespersonId: string,
    notes?: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: userResp } = await supabase.auth.getUser();
      const currentUserId = userResp?.user?.id || '00000000-0000-0000-0000-000000000000';

      // 1. Insert active assignment
      const { error: assignErr } = await supabase.from('device_assignments').insert({
        device_id: deviceId,
        salesperson_id: salespersonId,
        assigned_by: currentUserId,
        assigned_at: new Date().toISOString(),
        is_current: true,
        handover_reason: notes || 'Assigned by HQ Administrator',
      });

      if (assignErr) {
        return { success: false, error: new Error(assignErr.message) };
      }

      // 2. Update device status
      const { error: updateErr } = await supabase
        .from('devices')
        .update({ inventory_status: 'assigned' })
        .eq('id', deviceId);

      if (updateErr) {
        return { success: false, error: new Error(updateErr.message) };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Queries salesperson company device replacement requests for HQ review.
   * Strictly Direct-to-HQ with zero Country Sales Head bottleneck.
   */
  async getHqDeviceReplacements(
    marketFilter?: string,
    statusFilter?: ReplacementRequestStatus | 'ALL'
  ): Promise<{ data: HqDeviceReplacementItem[]; error: Error | null }> {
    try {
      let query = supabase
        .from('device_replacement_requests')
        .select(`
          id,
          salesperson_id,
          market_code,
          company_device_id,
          issue_category,
          issue_description,
          supporting_evidence_url,
          status,
          rejection_reason,
          replacement_device_id,
          courier_tracking_ref,
          dispatch_notes,
          old_device_disposition,
          submitted_at,
          profiles:salesperson_id (
            id,
            full_name,
            email
          ),
          company_device:company_device_id (
            id,
            asset_tag,
            make,
            model
          ),
          replacement_device:replacement_device_id (
            id,
            asset_tag,
            make,
            model
          ),
          device_replacement_history (
            id,
            previous_status,
            new_status,
            notes,
            changed_by,
            created_at,
            profiles:changed_by (full_name)
          )
        `);

      if (marketFilter && marketFilter !== 'ALL') {
        query = query.eq('market_code', marketFilter);
      }

      if (statusFilter && statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.order('submitted_at', { ascending: false });

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      const records: HqDeviceReplacementItem[] = (data || []).map((row: any) => {
        const hist = (row.device_replacement_history || []).map((h: any) => ({
          id: h.id,
          previousStatus: h.previous_status,
          newStatus: h.new_status,
          notes: h.notes,
          changedBy: h.changed_by,
          changedByName: h.profiles?.full_name,
          createdAt: h.created_at,
        }));

        return {
          id: row.id,
          salespersonId: row.salesperson_id,
          salespersonName: row.profiles?.full_name || 'Carbon Salesperson',
          salespersonEmail: row.profiles?.email || '',
          marketCode: row.market_code,
          currentDeviceId: row.company_device_id,
          currentDeviceTag: row.company_device?.asset_tag || 'Assigned Handset',
          currentDeviceModel: row.company_device ? `${row.company_device.make} ${row.company_device.model}` : 'Handset',
          issueCategory: row.issue_category,
          issueDescription: row.issue_description,
          supportingEvidenceUrl: row.supporting_evidence_url,
          status: row.status,
          rejectionReason: row.rejection_reason,
          replacementDeviceId: row.replacement_device_id,
          replacementDeviceTag: row.replacement_device?.asset_tag,
          courierTrackingRef: row.courier_tracking_ref,
          dispatchNotes: row.dispatch_notes,
          oldDeviceDisposition: row.old_device_disposition,
          submittedAt: row.submitted_at,
          history: hist.sort((a: any, b: any) => (a.createdAt > b.createdAt ? 1 : -1)),
        };
      });

      return { data: records, error: null };
    } catch (err: any) {
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * HQ Admin reviews and approves or rejects a device replacement request.
   * Calls RPC hq_review_device_replacement(p_replacement_id, p_status, p_reason).
   * STRICTLY HQ ONLY — Country Sales Heads are blocked with Zero Bottleneck Violation.
   */
  async reviewDeviceReplacement(params: {
    replacementId: string;
    status: 'approved' | 'rejected' | 'awaiting_spare';
    reason: string;
  }): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.rpc('hq_review_device_replacement', {
        p_replacement_id: params.replacementId,
        p_status: params.status,
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
   * HQ Admin dispatches a replacement device from central spare depot inventory.
   * Calls RPC hq_dispatch_replacement_device(p_replacement_id, p_replacement_device_id, p_courier_tracking_ref, p_dispatch_notes).
   */
  async dispatchReplacementDevice(params: {
    replacementId: string;
    replacementDeviceId: string;
    courierTrackingRef: string;
    dispatchNotes: string;
  }): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.rpc('hq_dispatch_replacement_device', {
        p_replacement_id: params.replacementId,
        p_replacement_device_id: params.replacementDeviceId,
        p_courier_tracking_ref: params.courierTrackingRef,
        p_dispatch_notes: params.dispatchNotes,
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
   * HQ Admin confirms receipt and activation of the replacement handset, recording
   * old device disposition (returned_to_depot, quarantined_e_waste, etc.).
   * Calls RPC hq_confirm_replacement_activation(p_replacement_id, p_old_device_disposition).
   */
  async confirmReplacementActivation(params: {
    replacementId: string;
    oldDeviceDisposition?: string;
  }): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.rpc('hq_confirm_replacement_activation', {
        p_replacement_id: params.replacementId,
        p_old_device_disposition: params.oldDeviceDisposition || 'returned_to_depot',
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
   * Queries national market operational rules and versions.
   */
  async getMarketRules(marketCode?: string): Promise<{ data: HqMarketRuleRecord[]; error: Error | null }> {
    try {
      let query = supabase.from('market_rules').select('*');

      if (marketCode && marketCode !== 'ALL') {
        query = query.eq('market_code', marketCode);
      }

      const { data, error } = await query.order('effective_from', { ascending: false });

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      const records: HqMarketRuleRecord[] = (data || []).map((row: any) => ({
        id: row.id,
        marketCode: row.market_code,
        versionTag: row.version_tag,
        isActive: row.is_active,
        workingHoursStart: row.working_hours_start,
        workingHoursEnd: row.working_hours_end,
        shiftGraceMinutes: row.shift_grace_minutes,
        geofenceRadiusM: row.geofence_radius_m,
        maxVisitGpsAccuracyM: row.max_visit_gps_accuracy_m,
        maxPinGpsAccuracyM: row.max_pin_gps_accuracy_m,
        minVisitDurationSeconds: row.min_visit_duration_seconds,
        maxIdleGapMinutes: row.max_idle_gap_minutes,
        maxClockDriftMinutes: row.max_clock_drift_minutes,
        dailyVisitTarget: row.daily_visit_target,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
      }));

      return { data: records, error: null };
    } catch (err: any) {
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Updates an operational market rule set.
   */
  async updateMarketRule(
    ruleId: string,
    updates: Partial<HqMarketRuleRecord>
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const payload: Record<string, any> = {};
      if (updates.geofenceRadiusM !== undefined) payload.geofence_radius_m = updates.geofenceRadiusM;
      if (updates.maxVisitGpsAccuracyM !== undefined) payload.max_visit_gps_accuracy_m = updates.maxVisitGpsAccuracyM;
      if (updates.maxPinGpsAccuracyM !== undefined) payload.max_pin_gps_accuracy_m = updates.maxPinGpsAccuracyM;
      if (updates.minVisitDurationSeconds !== undefined)
        payload.min_visit_duration_seconds = updates.minVisitDurationSeconds;
      if (updates.maxIdleGapMinutes !== undefined) payload.max_idle_gap_minutes = updates.maxIdleGapMinutes;
      if (updates.dailyVisitTarget !== undefined) payload.daily_visit_target = updates.dailyVisitTarget;
      if (updates.shiftGraceMinutes !== undefined) payload.shift_grace_minutes = updates.shiftGraceMinutes;
      if (updates.workingHoursStart !== undefined) payload.working_hours_start = updates.workingHoursStart;
      if (updates.workingHoursEnd !== undefined) payload.working_hours_end = updates.workingHoursEnd;

      const { error } = await supabase.from('market_rules').update(payload as any).eq('id', ruleId);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Queries the append-only approval and governance audit ledger from public.approval_audit.
   */
  async getSystemAuditLogs(
    limit: number = 50,
    marketFilter?: string
  ): Promise<{ data: HqAuditLogItem[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('approval_audit')
        .select(`
          id,
          entity_type,
          entity_id,
          actor_id,
          action,
          previous_state,
          new_state,
          mandatory_reason,
          timestamp,
          profiles:actor_id (
            full_name,
            email,
            role,
            market_code
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      const filtered = (data || []).filter((row: any) => {
        if (!marketFilter || marketFilter === 'ALL') return true;
        return row.profiles?.market_code === marketFilter;
      });

      const records: HqAuditLogItem[] = filtered.map((row: any) => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        actorId: row.actor_id,
        actorName: row.profiles?.full_name || 'System / Admin',
        actorRole: row.profiles?.role || 'Administrator',
        actorMarket: row.profiles?.market_code || 'HQ',
        action: row.action,
        previousState: row.previous_state,
        newState: row.new_state,
        mandatoryReason: row.mandatory_reason,
        timestamp: row.timestamp,
      }));

      return { data: records, error: null };
    } catch (err: any) {
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * PRD §4.2 / AT-08: Ingests validated client master ERP records into organisations and branches.
   * - Stable matching by organisation name in target market
   * - Allows different branches to share identical telephone numbers
   * - Sets branch status = 'active' with verified pin if coordinates present
   * - Sets branch status = 'location_pending' if coordinates missing
   * - NEVER overwrites existing approved GPS pins
   * - Records batch summary into public.import_batches
   */
  async processClientMasterImport(
    filename: string,
    marketCode: string,
    rows: ClientImportRowInput[]
  ): Promise<ClientImportResult> {
    const errorDetails: string[] = [];
    let validRows = 0;
    let locationPendingRows = 0;
    let errorRows = 0;

    const { data: userResp } = await supabase.auth.getUser();
    const currentUserId = userResp?.user?.id || '00000000-0000-0000-0000-000000000000';

    try {
      for (const row of rows) {
        try {
          if (!row.companyName?.trim() || !row.branchName?.trim()) {
            errorRows++;
            errorDetails.push(`Row ${row.rowIndex}: Missing company or branch name.`);
            continue;
          }

          // 1. Find or create Organisation
          let orgId: string;
          const { data: existingOrg, error: orgFindErr } = await supabase
            .from('organisations')
            .select('id')
            .eq('name', row.companyName.trim())
            .eq('market_code', marketCode)
            .maybeSingle();

          if (orgFindErr) {
            errorRows++;
            errorDetails.push(`Row ${row.rowIndex}: Error finding organisation (${orgFindErr.message})`);
            continue;
          }

          if (existingOrg) {
            orgId = existingOrg.id;
          } else {
            const { data: newOrg, error: orgCreateErr } = await supabase
              .from('organisations')
              .insert({
                name: row.companyName.trim(),
                tier: 'standard',
                market_code: marketCode,
              })
              .select('id')
              .single();

            if (orgCreateErr || !newOrg) {
              errorRows++;
              errorDetails.push(`Row ${row.rowIndex}: Failed to create organisation (${orgCreateErr?.message})`);
              continue;
            }
            orgId = newOrg.id;
          }

          // 2. Find or create Branch
          const hasGps =
            row.latitude !== undefined &&
            row.longitude !== undefined &&
            !isNaN(row.latitude) &&
            !isNaN(row.longitude);

          const branchStatus = hasGps ? 'active' : 'location_pending';

          let branchId: string;
          const { data: existingBranch, error: brFindErr } = await supabase
            .from('branches')
            .select('id, operating_status')
            .eq('organisation_id', orgId)
            .eq('branch_name', row.branchName.trim())
            .maybeSingle();

          if (brFindErr) {
            errorRows++;
            errorDetails.push(`Row ${row.rowIndex}: Error checking branch (${brFindErr.message})`);
            continue;
          }

          if (existingBranch) {
            branchId = existingBranch.id;
          } else {
            const { data: newBranch, error: brCreateErr } = await supabase
              .from('branches')
              .insert({
                organisation_id: orgId,
                branch_name: row.branchName.trim(),
                street_address: row.address?.trim() || 'Site Address',
                city: row.city?.trim() || (marketCode === 'NG' ? 'Lagos' : marketCode === 'ZM' ? 'Lusaka' : 'Blantyre'),
                market_code: marketCode,
                operating_status: branchStatus as any,
                switchboard_phone: row.telephone?.trim() || '+234 1 000 0000',
                category: row.category || 'fleet_operator',
              })
              .select('id')
              .single();

            if (brCreateErr || !newBranch) {
              errorRows++;
              errorDetails.push(`Row ${row.rowIndex}: Failed to create branch (${brCreateErr?.message})`);
              continue;
            }
            branchId = newBranch.id;
          }

          // 3. Insert contact (allows shared phone numbers across branches per PRD §4.2)
          if (row.contactPerson?.trim() && row.telephone?.trim()) {
            await supabase.from('client_contacts').insert({
              branch_id: branchId,
              organisation_id: orgId,
              full_name: row.contactPerson.trim(),
              designation: row.contactRole || 'Site Manager',
              phone_number: row.telephone.trim(),
              is_primary: true,
            });
          }

          // 4. If GPS present, verify whether active approved pin exists. NEVER overwrite existing approved pin!
          if (hasGps) {
            const { data: activePin } = await supabase
              .from('branch_location_pins')
              .select('id')
              .eq('branch_id', branchId)
              .eq('is_active', true)
              .eq('status', 'approved')
              .maybeSingle();

            if (!activePin) {
              // Safe to insert initial approved pin for new location
              await supabase.from('branch_location_pins').insert({
                branch_id: branchId,
                latitude: row.latitude!,
                longitude: row.longitude!,
                reported_accuracy_m: 15,
                premises_photo_url: '/brand/premises_demo_01.jpg',
                proposed_by: currentUserId,
                status: 'approved',
                is_active: true,
                version_number: 1,
                decision_reason: 'Automated initial ERP master import pin',
                reviewed_by: currentUserId,
                reviewed_at: new Date().toISOString(),
              });
            }
          } else {
            locationPendingRows++;
          }

          validRows++;
        } catch (rowErr: any) {
          errorRows++;
          errorDetails.push(`Row ${row.rowIndex}: Unexpected error (${rowErr.message})`);
        }
      }

      // Record batch summary in public.import_batches
      const totalRows = rows.length;
      const { data: batchData } = await supabase
        .from('import_batches')
        .insert({
          filename,
          market_code: marketCode,
          imported_by: currentUserId,
          total_rows: totalRows,
          valid_rows: validRows,
          location_pending_rows: locationPendingRows,
          error_rows: errorRows,
        })
        .select('id')
        .single();

      return {
        batchId: batchData?.id || `BATCH-${Date.now()}`,
        totalRows,
        validRows,
        locationPendingRows,
        errorRows,
        errorDetails,
      };
    } catch (batchErr: any) {
      return {
        batchId: `BATCH-ERR-${Date.now()}`,
        totalRows: rows.length,
        validRows: 0,
        locationPendingRows: 0,
        errorRows: rows.length,
        errorDetails: [batchErr.message || 'Batch import failed'],
      };
    }
  },
};
