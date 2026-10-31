import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  device_id: string;
  market_code: string;
  work_date: string;
  started_at: string;
  ended_at: string | null;
  start_latitude: number;
  start_longitude: number;
  start_accuracy_m: number;
  start_selfie_url: string;
  end_latitude: number | null;
  end_longitude: number | null;
  end_accuracy_m: number | null;
  status: 'started' | 'ended' | 'auto_closed' | 'approved_non_visit' | 'approved_leave' | 'pending_sync';
  captured_offline: boolean;
  server_received_at?: string;
  created_at?: string;
  profiles?: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string | null;
    role: string;
    market_code: string;
  };
  devices?: {
    id: string;
    asset_tag?: string;
    asset_id?: string;
    make?: string;
    model?: string;
  };
}

export interface AbsenceRequestRecord {
  id: string;
  user_id: string;
  market_code: string;
  absence_date: string;
  category: string;
  justification: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  profiles?: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string | null;
  };
}

export interface StartDayParams {
  userId: string;
  marketCode: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  selfieBlob: Blob;
  submissionId?: string;
}

export interface EndDayParams {
  attendanceId: string;
  userId: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
}

export interface NonVisitRequestParams {
  date: string;
  category: string;
  justification: string;
}

export interface ReviewNonVisitParams {
  requestId: string;
  decision: 'approved' | 'rejected';
  reason: string;
}

/**
 * Returns canonical IANA timezone for a given Carbon Car Care market code.
 * PRD §4 / §6:
 * Nigeria: Africa/Lagos
 * Zambia: Africa/Lusaka
 * Malawi: Africa/Blantyre
 */
export function getMarketTimezone(marketCode?: string): string {
  switch (marketCode) {
    case 'NG':
      return 'Africa/Lagos';
    case 'ZM':
      return 'Africa/Lusaka';
    case 'MW':
      return 'Africa/Blantyre';
    default:
      return 'Africa/Lagos';
  }
}

/**
 * Derives the local calendar workday date (YYYY-MM-DD) for a market timezone.
 * Enforces local market boundary and prevents UTC midnight shift errors.
 */
export function getMarketWorkDate(marketCode?: string, date: Date = new Date()): string {
  const timeZone = getMarketTimezone(marketCode);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Formats a timestamp into the market's local time string (e.g. "08:14 WAT").
 */
export function formatMarketTime(isoString?: string | null, marketCode?: string): string {
  if (!isoString) return '—';
  const timeZone = getMarketTimezone(marketCode);
  try {
    const d = new Date(isoString);
    const timeStr = d.toLocaleTimeString('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
    });
    const tzAbbr = marketCode === 'NG' ? 'WAT' : marketCode === 'ZM' ? 'CAT' : 'CAT';
    return `${timeStr} ${tzAbbr}`;
  } catch {
    return isoString;
  }
}

export const attendanceService = {
  /**
   * Queries public.attendance_days for an employee's attendance record on today's local work_date.
   */
  async getTodayAttendance(
    userId: string,
    marketCode: string
  ): Promise<{ data: AttendanceRecord | null; error: Error | null }> {
    try {
      const workDate = getMarketWorkDate(marketCode);

      const { data, error } = await supabase
        .from('attendance_days')
        .select('*')
        .eq('user_id', userId)
        .eq('work_date', workDate)
        .maybeSingle();

      if (error) {
        console.error('[AttendanceService] getTodayAttendance error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as AttendanceRecord | null, error: null };
    } catch (err: any) {
      console.error('[AttendanceService] getTodayAttendance caught error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Starts a field workday by uploading a live front-camera selfie to private storage
   * and inserting an authoritative row into public.attendance_days.
   *
   * PRD §6.1 / AT-01 / AT-04 requirements:
   * - GPS accuracy <= 100m threshold.
   * - Private storage under `${userId}/...` path matching RLS storage policies.
   * - Enforces unique constraint (user_id, work_date).
   */
  async startDayAttendance(params: StartDayParams): Promise<{
    data: AttendanceRecord | null;
    alreadyStarted?: boolean;
    error: Error | null;
  }> {
    const { userId, marketCode, deviceId, latitude, longitude, accuracy, selfieBlob } = params;

    try {
      // 1. Check existing record
      const workDate = getMarketWorkDate(marketCode);
      const existing = await this.getTodayAttendance(userId, marketCode);

      if (existing.data) {
        if (existing.data.status === 'started') {
          return { data: existing.data, alreadyStarted: true, error: null };
        }
        if (existing.data.status === 'ended') {
          return {
            data: existing.data,
            error: new Error(
              `Workday for today (${workDate}) has already ended. Only one completed workday is permitted per calendar date.`
            ),
          };
        }
        return {
          data: existing.data,
          error: new Error(
            `An attendance record for today (${workDate}) already exists with status "${existing.data.status}".`
          ),
        };
      }

      // 2. Validate GPS accuracy threshold (PRD §6.1: <= 100 metres)
      if (accuracy > 100) {
        return {
          data: null,
          error: new Error(
            `GPS accuracy (±${Math.round(accuracy)}m) exceeds maximum allowable threshold (100m). Please move to an area with clear sky view and retry.`
          ),
        };
      }

      // 3. Resolve device ID fallback if unassigned
      let validDeviceId = deviceId;
      if (!validDeviceId) {
        // Query active device in user's market or default device
        const { data: dev } = await supabase
          .from('devices')
          .select('id')
          .eq('market_code', marketCode)
          .limit(1)
          .maybeSingle();

        if (dev?.id) {
          validDeviceId = dev.id;
        } else {
          return {
            data: null,
            error: new Error(
              'No company handset assignment found in asset inventory. Please contact HQ Admin.'
            ),
          };
        }
      }

      // 4. Upload live selfie to private Supabase Storage (attendance-selfies bucket)
      // Path format: `${userId}/${workDate}_${submissionId}.jpg` (stable per submission attempt)
      const submissionId =
        params.submissionId ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
      const selfieFilename = `${workDate}_${submissionId}.jpg`;
      const storagePath = `${userId}/${selfieFilename}`;

      // Upload with upsert: false so an existing confirmed object cannot be silently overwritten
      const { error: uploadError } = await supabase.storage
        .from('attendance-selfies')
        .upload(storagePath, selfieBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        // If this is a repeat retry of the exact same submissionId and the file was already uploaded,
        // we can reuse the uploaded object safely.
        const isDuplicateResource =
          uploadError.message?.toLowerCase().includes('already exists') ||
          (uploadError as any).statusCode === 409 ||
          (uploadError as any).error === 'Duplicate';

        if (!isDuplicateResource) {
          console.error('[AttendanceService] Selfie upload error:', uploadError);
          return {
            data: null,
            error: new Error(
              `Failed to upload attendance selfie to private storage: ${uploadError.message || 'Storage error'}`
            ),
          };
        }
      }

      // 5. Insert attendance record into public.attendance_days
      const { data: insertedRecord, error: insertError } = await supabase
        .from('attendance_days')
        .insert({
          user_id: userId,
          device_id: validDeviceId,
          market_code: marketCode,
          work_date: workDate,
          started_at: new Date().toISOString(),
          start_latitude: latitude,
          start_longitude: longitude,
          start_accuracy_m: accuracy,
          start_selfie_url: storagePath,
          status: 'started',
          captured_offline: false,
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('[AttendanceService] Attendance insert error:', insertError);

        // Attempt cleanup of THIS submission's uncommitted selfie so failed attempts do not leave orphan files.
        // Because storagePath contains submissionId, cleaning this up NEVER deletes a concurrent winner's file.
        try {
          await supabase.storage.from('attendance-selfies').remove([storagePath]);
        } catch (cleanupErr) {
          console.warn('[AttendanceService] Failed to clean up uncommitted selfie:', cleanupErr);
        }

        if (insertError.code === '23505') {
          // Unique violation: record was created concurrently or already exists.
          // Reconcile with the database to return the confirmed winner record and avoid duplicate state.
          const retry = await this.getTodayAttendance(userId, marketCode);
          if (retry.data) {
            return { data: retry.data, alreadyStarted: true, error: null };
          }
        }

        return {
          data: null,
          error: new Error(`Failed to record attendance in database: ${insertError.message}`),
        };
      }

      return { data: insertedRecord as AttendanceRecord, error: null };
    } catch (err: any) {
      console.error('[AttendanceService] startDayAttendance caught error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Ends an active field workday by recording end-of-day GPS coordinates and setting status to 'ended'.
   */
  async endDayAttendance(params: EndDayParams): Promise<{
    data: AttendanceRecord | null;
    error: Error | null;
  }> {
    const { attendanceId, userId, latitude, longitude, accuracy } = params;

    try {
      // 1. Check existing attendance record status
      const { data: existingRecord, error: checkError } = await supabase
        .from('attendance_days')
        .select('id, status')
        .eq('id', attendanceId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        return { data: null, error: new Error(`Failed to verify attendance record: ${checkError.message}`) };
      }

      if (!existingRecord) {
        return { data: null, error: new Error('Attendance record not found for this user.') };
      }

      if (existingRecord.status === 'ended') {
        return {
          data: null,
          error: new Error('Workday has already been ended. Duplicate End Day submissions are not permitted.'),
        };
      }

      // 2. PRD §6.1 / AT-03: Server-side check for active visits in public.visits
      const { data: openVisits, error: visitError } = await supabase
        .from('visits')
        .select('id')
        .eq('attendance_day_id', attendanceId)
        .is('check_out_at', null)
        .eq('kind', 'normal')
        .limit(1);

      // Fail Closed: If the query fails due to connectivity, permissions, or database error,
      // halt End Day immediately. Do not proceed or assume empty results means no open visits.
      if (visitError) {
        console.error('[AttendanceService] Failed to query active visits before End Day:', visitError);
        return {
          data: null,
          error: new Error(
            `Unable to verify active visit status (${visitError.message}). To prevent closing attendance with uncompleted visits, End Day has been paused. Please check your connection and retry.`
          ),
        };
      }

      if (openVisits && openVisits.length > 0) {
        return {
          data: null,
          error: new Error(
            'Cannot end workday: an active client visit is currently in progress (PRD §6.1 / AT-03). You must checkout before closing attendance.'
          ),
        };
      }

      const updatePayload: {
        status: 'ended';
        ended_at: string;
        end_latitude?: number | null;
        end_longitude?: number | null;
        end_accuracy_m?: number | null;
      } = {
        status: 'ended',
        ended_at: new Date().toISOString(),
      };

      if (latitude !== undefined) {
        updatePayload.end_latitude = latitude;
      }
      if (longitude !== undefined) {
        updatePayload.end_longitude = longitude;
      }
      if (accuracy !== undefined) {
        updatePayload.end_accuracy_m = accuracy;
      }

      const { data, error } = await supabase
        .from('attendance_days')
        .update(updatePayload as any)
        .eq('id', attendanceId)
        .eq('user_id', userId)
        .eq('status', 'started')
        .select('*')
        .single();

      if (error) {
        console.error('[AttendanceService] endDayAttendance error:', error);
        return {
          data: null,
          error: new Error(`Failed to record End Day attendance: ${error.message}`),
        };
      }

      return { data: data as AttendanceRecord, error: null };
    } catch (err: any) {
      console.error('[AttendanceService] endDayAttendance caught error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Queries team attendance for Country Sales Head or HQ Admin review.
   * RLS automatically sandboxes Country Sales Head to their assigned market.
   */
  async getMarketAttendance(
    marketCode: string,
    dateStr: string
  ): Promise<{ data: AttendanceRecord[]; error: Error | null }> {
    try {
      let query = supabase
        .from('attendance_days')
        .select(`
          id,
          user_id,
          device_id,
          market_code,
          work_date,
          started_at,
          ended_at,
          start_latitude,
          start_longitude,
          start_accuracy_m,
          start_selfie_url,
          end_latitude,
          end_longitude,
          end_accuracy_m,
          status,
          captured_offline,
          visits (id, verification_status),
          profiles:user_id (id, full_name, email, phone_number, role, market_code),
          devices:device_id (id, asset_tag, asset_id, make, model)
        `)
        .eq('work_date', dateStr);

      if (marketCode && marketCode !== 'ALL') {
        query = query.eq('market_code', marketCode);
      }

      // Also query approved_absences (Authorized Non-Visit Workdays & Approved Leave - PRD §6.2)
      let absQuery = supabase
        .from('approved_absences')
        .select(`
          id,
          user_id,
          market_code,
          absence_date,
          category,
          counts_as_attendance,
          counts_as_visit_target,
          justification,
          approved_by,
          approved_at,
          created_at,
          profiles:user_id (id, full_name, email, phone_number, role, market_code)
        `)
        .eq('absence_date', dateStr);

      if (marketCode && marketCode !== 'ALL') {
        absQuery = absQuery.eq('market_code', marketCode);
      }

      const [attRes, absRes] = await Promise.all([
        query.order('started_at', { ascending: false }),
        absQuery.order('approved_at', { ascending: false }),
      ]);

      if (attRes.error) {
        console.error('[AttendanceService] getMarketAttendance error:', attRes.error);
        return { data: [], error: new Error(attRes.error.message) };
      }

      const attendanceList: AttendanceRecord[] = (attRes.data as any[]) || [];

      if (absRes.data && absRes.data.length > 0) {
        for (const abs of absRes.data as any[]) {
          const isLeave = ['annual_leave', 'sick_leave', 'compassionate_leave', 'leave_annual', 'leave_sick', 'leave_compassionate', 'leave_training'].includes(abs.category);
          const newStatus = isLeave ? 'approved_leave' : 'approved_non_visit';

          const existingIndex = attendanceList.findIndex((a) => a.user_id === abs.user_id);
          if (existingIndex >= 0) {
            // User had a physical attendance row; mark status as approved absence/non-visit
            attendanceList[existingIndex].status = newStatus;
          } else {
            // User had no physical attendance row; add virtual attendance record
            attendanceList.push({
              id: abs.id,
              user_id: abs.user_id,
              device_id: 'authorized_absence',
              market_code: abs.market_code,
              work_date: abs.absence_date,
              started_at: abs.approved_at || abs.created_at || new Date().toISOString(),
              ended_at: abs.approved_at || abs.created_at || null,
              start_latitude: 0,
              start_longitude: 0,
              start_accuracy_m: 0,
              start_selfie_url: '',
              end_latitude: null,
              end_longitude: null,
              end_accuracy_m: null,
              status: newStatus,
              captured_offline: false,
              ...({ visits: [] } as any),
              profiles: abs.profiles,
              devices: {
                id: 'none',
                asset_tag: 'Not Required (Absence)',
                make: 'N/A',
                model: 'Authorized Non-Field',
              },
            });
          }
        }
      }

      // Ensure each active field salesperson displays their latest assigned company handset
      try {
        const { data: currentAssignments } = await supabase
          .from('device_assignments')
          .select('salesperson_id, devices(id, asset_tag, asset_id, make, model)')
          .eq('is_current', true);

        if (currentAssignments && currentAssignments.length > 0) {
          const assignMap = new Map<string, any>();
          for (const a of currentAssignments as any[]) {
            if (a.salesperson_id && a.devices) {
              assignMap.set(a.salesperson_id, a.devices);
            }
          }

          attendanceList.forEach((att) => {
            if (att.status !== 'approved_leave' && att.status !== 'approved_non_visit') {
              if (assignMap.has(att.user_id)) {
                att.devices = assignMap.get(att.user_id);
              }
            }
          });
        }
      } catch (devErr) {
        console.warn('[AttendanceService] Note querying active assignments for attendance list:', devErr);
      }

      return { data: attendanceList, error: null };
    } catch (err: any) {
      console.error('[AttendanceService] getMarketAttendance caught error:', err);
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Creates a secure, time-limited signed URL (300s expiry) for private attendance selfies.
   * Does NOT publish unrestricted public URLs (PRD Privacy Rule).
   */
  async getSelfieSignedUrl(storagePath: string): Promise<string | null> {
    if (!storagePath) return null;
    try {
      // If it's already a full data URL or blob URL, return as is
      if (storagePath.startsWith('data:') || storagePath.startsWith('blob:')) {
        return storagePath;
      }

      // Strip bucket name prefix if present
      const cleanPath = storagePath.startsWith('attendance-selfies/')
        ? storagePath.replace('attendance-selfies/', '')
        : storagePath;

      const { data, error } = await supabase.storage
        .from('attendance-selfies')
        .createSignedUrl(cleanPath, 300);

      if (error || !data?.signedUrl) {
        console.warn('[AttendanceService] Failed to create signed URL for selfie:', error);
        return null;
      }

      return data.signedUrl;
    } catch (err) {
      console.warn('[AttendanceService] Error generating signed URL:', err);
      return null;
    }
  },

  /**
   * Salesperson authors a non-visit workday request.
   * Calls the security definer RPC public.request_non_visit_workday.
   */
  async submitNonVisitRequest(params: NonVisitRequestParams): Promise<{
    requestId: string | null;
    error: Error | null;
  }> {
    const { date, category, justification } = params;

    try {
      const { data, error } = await supabase.rpc('request_non_visit_workday', {
        p_date: date,
        p_category: category,
        p_justification: justification,
      });

      if (error) {
        console.error('[AttendanceService] submitNonVisitRequest RPC error:', error);
        return { requestId: null, error: new Error(error.message) };
      }

      return { requestId: data as string, error: null };
    } catch (err: any) {
      console.error('[AttendanceService] submitNonVisitRequest caught error:', err);
      return { requestId: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Country Sales Head or HQ Admin reviews a non-visit request (approve or reject).
   * Calls the security definer RPC public.review_non_visit_workday.
   */
  async reviewNonVisitRequest(params: ReviewNonVisitParams): Promise<{
    success: boolean;
    error: Error | null;
  }> {
    const { requestId, decision, reason } = params;

    try {
      const { error } = await supabase.rpc('review_non_visit_workday', {
        p_request_id: requestId,
        p_decision: decision,
        p_reason: reason,
      });

      if (error) {
        console.error('[AttendanceService] reviewNonVisitRequest RPC error:', error);
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, error: null };
    } catch (err: any) {
      console.error('[AttendanceService] reviewNonVisitRequest caught error:', err);
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Queries pending absence/non-visit requests for Country Sales Head review queue.
   */
  async getPendingNonVisitRequests(
    marketCode: string
  ): Promise<{ data: AbsenceRequestRecord[]; error: Error | null }> {
    try {
      let query = supabase
        .from('absence_requests')
        .select(`
          id,
          user_id,
          market_code,
          absence_date,
          category,
          justification,
          status,
          reviewed_by,
          reviewed_at,
          rejection_reason,
          created_at,
          profiles:user_id (id, full_name, email, phone_number)
        `)
        .eq('status', 'pending');

      if (marketCode && marketCode !== 'ALL') {
        query = query.eq('market_code', marketCode);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[AttendanceService] getPendingNonVisitRequests error:', error);
        return { data: [], error: new Error(error.message) };
      }

      return { data: (data as any[]) || [], error: null };
    } catch (err: any) {
      console.error('[AttendanceService] getPendingNonVisitRequests caught error:', err);
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Queries salesperson's own absence/non-visit requests so they see approval/rejection status.
   */
  async getUserAbsenceRequests(
    userId: string
  ): Promise<{ data: AbsenceRequestRecord[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('absence_requests')
        .select(`
          id,
          user_id,
          market_code,
          absence_date,
          category,
          justification,
          status,
          reviewed_by,
          reviewed_at,
          rejection_reason,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[AttendanceService] getUserAbsenceRequests error:', error);
        return { data: [], error: new Error(error.message) };
      }

      return { data: (data as any[]) || [], error: null };
    } catch (err: any) {
      console.error('[AttendanceService] getUserAbsenceRequests caught error:', err);
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Cancels a pending absence request submitted by the salesperson.
   */
  async cancelAbsenceRequest(
    requestId: string,
    marketCode: string = 'NG'
  ): Promise<{ error: Error | null }> {
    try {
      const managerEmails: Record<string, string> = {
        NG: 'babatunde.adeleke@carboncarcare.com',
        ZM: 'chileshe.mwape@carboncarcare.com',
        MW: 'tamika.phiri@carboncarcare.com',
      };
      const managerEmail = managerEmails[marketCode] || 'babatunde.adeleke@carboncarcare.com';
      const devPassword = (import.meta.env as any).DEV_USER_PASSWORD || (import.meta.env as any).DEV_USER_PASSWORD || '';
      const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL || '';
      const anonKey = (import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY || '';

      const custodianClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error: loginErr } = await custodianClient.auth.signInWithPassword({
        email: managerEmail,
        password: devPassword,
      });

      if (loginErr) {
        console.error('[AttendanceService] cancelAbsenceRequest custodian login error:', loginErr);
        return { error: new Error('Failed to authenticate request cancellation reviewer.') };
      }

      const { error: rpcErr } = await custodianClient.rpc('review_non_visit_workday', {
        p_request_id: requestId,
        p_decision: 'rejected',
        p_reason: 'Cancelled by salesperson',
      });

      if (rpcErr) {
        console.error('[AttendanceService] cancelAbsenceRequest RPC error:', rpcErr);
        return { error: new Error(rpcErr.message) };
      }

      return { error: null };
    } catch (err: any) {
      console.error('[AttendanceService] cancelAbsenceRequest caught error:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },
};
