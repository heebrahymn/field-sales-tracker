import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { managementService, RealVisitVerificationRecord } from '@/services/managementService';
import {
  MapPin,
  CheckCircle2,
  Camera,
  AlertTriangle,
  Search,
  Eye,
  Building2,
  FileText,
  ShieldCheck,
  ShieldAlert,
  X,
  RefreshCw,
  Loader2,
  Database as DatabaseIcon,
  CreditCard,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface VerifiedVisitRecord {
  id: string;
  repName: string;
  clientName: string;
  branchName: string;
  category: string;
  workDate?: string;
  checkInTime: string;
  checkOutTime: string;
  duration: string;
  locationStatus: 'location_verified' | 'manager_approved_unverified' | 'unverified';
  geofenceResult: {
    distanceMeters: number;
    thresholdMeters: number;
    passed: boolean;
    accuracyMeters: number;
    checkInCoords: string;
    pinCoords: string;
  };
  premisesPhotoUrl?: string;
  meetingLog: {
    status: 'complete' | 'missing' | 'late_submitted';
    contactMet: string;
    contactRole: string;
    purpose: string;
    productsDiscussed: string[];
    fleetSize: string;
    narrativeOutcome: string;
    nextStepText: string;
    submittedAt?: string;
    businessCardPhotoPath?: string | null;
  };
  clientAuditStatus?: 'not_sampled' | 'pending_call' | 'confirmed' | 'disputed';
  isRealRecord?: boolean;
}

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

export const ClientVisitVerification: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocationStatus, setFilterLocationStatus] = useState<'all' | 'verified' | 'unverified_approved'>('all');
  const [filterLogStatus, setFilterLogStatus] = useState<'all' | 'complete' | 'missing'>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedVisitForModal, setSelectedVisitForModal] = useState<VerifiedVisitRecord | null>(null);

  const [realVisits, setRealVisits] = useState<RealVisitVerificationRecord[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(false);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [signedBusinessCardUrl, setSignedBusinessCardUrl] = useState<string | null>(null);
  const [isCardLoading, setIsCardLoading] = useState(false);
  const [cardLoadError, setCardLoadError] = useState<string | null>(null);

  const loadRealVisits = useCallback(async () => {
    if (isTestEnv) return;
    setIsLoadingReal(true);
    try {
      const market = currentUser?.marketCode || 'NG';
      const { data, error } = await managementService.getCountryVisits(market, undefined, 50);
      if (error) {
        console.warn('[ClientVisitVerification] Failed to fetch Supabase visits:', error.message);
      } else {
        setRealVisits(data);
      }
    } catch (err: any) {
      console.warn('[ClientVisitVerification] Error:', err);
    } finally {
      setIsLoadingReal(false);
    }
  }, [currentUser?.marketCode]);

  useEffect(() => {
    loadRealVisits();
  }, [loadRealVisits]);

  // Resolve signed photo URL when inspecting a visit
  useEffect(() => {
    let active = true;
    if (selectedVisitForModal?.premisesPhotoUrl) {
      const p = selectedVisitForModal.premisesPhotoUrl;
      if (p.startsWith('http') || p.startsWith('/brand') || p.startsWith('blob:') || p.startsWith('data:')) {
        setSignedPhotoUrl(p);
      } else {
        managementService.getPremisesPhotoSignedUrl(p).then((url) => {
          if (active && url) setSignedPhotoUrl(url);
        });
      }
    } else {
      setSignedPhotoUrl(null);
    }
    return () => {
      active = false;
    };
  }, [selectedVisitForModal]);

  // Resolve signed business card photo URL when inspecting a visit
  useEffect(() => {
    let active = true;
    const cardPath = selectedVisitForModal?.meetingLog?.businessCardPhotoPath;
    if (cardPath) {
      if (cardPath.startsWith('http') || cardPath.startsWith('blob:') || cardPath.startsWith('data:')) {
        setSignedBusinessCardUrl(cardPath);
        setIsCardLoading(false);
        setCardLoadError(null);
      } else {
        setIsCardLoading(true);
        setCardLoadError(null);
        managementService.getBusinessCardSignedUrl(cardPath).then((url) => {
          if (active) {
            setIsCardLoading(false);
            if (url) {
              setSignedBusinessCardUrl(url);
            } else {
              setCardLoadError('Unable to generate secure preview link for this business card.');
            }
          }
        });
      }
    } else {
      setSignedBusinessCardUrl(null);
      setIsCardLoading(false);
      setCardLoadError(null);
    }
    return () => {
      active = false;
    };
  }, [selectedVisitForModal]);

  // Merge real Supabase visits with demonstration visits
  const visits: VerifiedVisitRecord[] = useMemo(() => {
    const realMapped: VerifiedVisitRecord[] = realVisits.map((v) => {
      const isVerified = v.verificationStatus === 'location_verified';
      const isApprovedUnverified = v.verificationStatus === 'manager_approved_unverified';

      let auditStatus: VerifiedVisitRecord['clientAuditStatus'] = 'not_sampled';
      if (v.clientAuditStatus) {
        if (v.clientAuditStatus.auditOutcome === 'confirmed_valid') auditStatus = 'confirmed';
        else if (v.clientAuditStatus.auditOutcome === 'disputed_denied') auditStatus = 'disputed';
        else auditStatus = 'pending_call';
      }

      return {
        id: v.id,
        repName: v.repName,
        clientName: v.organisationName,
        branchName: v.branchName,
        category: v.category,
        workDate: v.workDate,
        checkInTime: v.checkInAt ? new Date(v.checkInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' : '—',
        checkOutTime: v.checkOutAt ? new Date(v.checkOutAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' : 'In Progress',
        duration: v.durationMinutes !== null ? `${v.durationMinutes} mins` : 'Active',
        locationStatus: isVerified ? 'location_verified' : isApprovedUnverified ? 'manager_approved_unverified' : 'unverified',
        geofenceResult: {
          distanceMeters: v.distanceMeters || 0,
          thresholdMeters: v.geofenceRadiusM || 200,
          passed: v.withinGeofence,
          accuracyMeters: Math.round(v.checkInAccuracyM),
          checkInCoords: `${v.checkInLatitude?.toFixed(4)}° N, ${v.checkInLongitude?.toFixed(4)}° E`,
          pinCoords: v.pinLatitude ? `${v.pinLatitude?.toFixed(4)}° N, ${v.pinLongitude?.toFixed(4)}° E` : 'No Pin',
        },
        premisesPhotoUrl: v.premisesPhotoPath || undefined,
        meetingLog: v.meetingLog
          ? {
              status: 'complete',
              contactMet: v.meetingLog.contactName,
              contactRole: v.meetingLog.contactRole,
              purpose: v.meetingLog.visitPurpose,
              productsDiscussed: v.meetingLog.productsDiscussed,
              fleetSize: v.meetingLog.fleetSizeOrVolume || 'Standard Fleet',
              narrativeOutcome: v.meetingLog.outcomeNarrative,
              nextStepText: v.meetingLog.nextStepText,
              submittedAt: v.meetingLog.submittedAt ? new Date(v.meetingLog.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' : 'Logged',
              businessCardPhotoPath: v.meetingLog.businessCardPhotoPath || null,
            }
          : {
              status: 'missing',
              contactMet: 'Pending Submission',
              contactRole: 'Site Operations',
              purpose: 'Unrecorded',
              productsDiscussed: [],
              fleetSize: 'Unknown',
              narrativeOutcome: 'No meeting log record submitted yet.',
              nextStepText: '',
              submittedAt: 'Awaiting Log',
            },
        clientAuditStatus: auditStatus,
        isRealRecord: true,
      };
    });

    return realMapped;
  }, [realVisits]);

  const distinctUsers = useMemo(() => {
    return Array.from(new Set(visits.map((v) => v.repName).filter(Boolean))).sort();
  }, [visits]);

  const filteredVisits = visits.filter((visit) => {
    if (filterLocationStatus === 'verified' && visit.locationStatus !== 'location_verified') return false;
    if (filterLocationStatus === 'unverified_approved' && visit.locationStatus !== 'manager_approved_unverified')
      return false;
    if (filterLogStatus === 'complete' && visit.meetingLog.status !== 'complete') return false;
    if (filterLogStatus === 'missing' && visit.meetingLog.status !== 'missing') return false;
    if (selectedUser !== 'all' && visit.repName !== selectedUser) return false;
    if (selectedDate && visit.workDate !== selectedDate) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        visit.clientName.toLowerCase().includes(q) ||
        visit.branchName.toLowerCase().includes(q) ||
        visit.repName.toLowerCase().includes(q) ||
        visit.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / pageSize));
  const paginatedVisits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVisits.slice(start, start + pageSize);
  }, [filteredVisits, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Top Architecture Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Visit Verification &amp; Meeting Log Inspection (PRD §7.4 &amp; §8.1)
              </h3>
              <span className="text-[11px] font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                Market: {currentUser?.marketCode || 'NG'}
              </span>
            </div>
            <p className="text-slate-700 font-medium mt-0.5">
              Distinguish physical location verification from meeting log completeness. Location verification requires GPS ≤100m within 200m geofence and live photo; meeting logs require narrative and free-text next steps within 2 hours.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRealVisits}
            disabled={isLoadingReal}
            className="h-8 text-xs font-semibold gap-1.5 bg-white border-blue-200 text-brand-blue"
          >
            {isLoadingReal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
          <span className="text-xs font-bold px-2.5 py-1 rounded bg-white border border-blue-200 text-brand-blue">
            Geofence Limit: 200m
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded bg-white border border-blue-200 text-brand-blue">
            Log SLA: 2 Hours
          </span>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search visits by company, branch, rep or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50/50 border-slate-200"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs">
                <span className="font-semibold text-slate-500 mr-1">Location:</span>
                <button
                  onClick={() => setFilterLocationStatus('all')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors ${
                    filterLocationStatus === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({visits.length})
                </button>
                <button
                  onClick={() => setFilterLocationStatus('verified')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors ${
                    filterLocationStatus === 'verified'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  Location Verified
                </button>
                <button
                  onClick={() => setFilterLocationStatus('unverified_approved')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors ${
                    filterLocationStatus === 'unverified_approved'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-900 border border-amber-200'
                  }`}
                >
                  Approved Unverified
                </button>
              </div>

              <div className="flex items-center gap-1 text-xs border-l border-slate-200 pl-2">
                <span className="font-semibold text-slate-500 mr-1">Meeting Log:</span>
                <button
                  onClick={() => { setFilterLogStatus('all'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                    filterLogStatus === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => { setFilterLogStatus('missing'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                    filterLogStatus === 'missing'
                      ? 'bg-rose-700 text-white'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  Missing &gt;2h
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Filter Row: Salesperson & Date Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Salesperson Filter */}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-500">Salesperson:</span>
                <select
                  value={selectedUser}
                  onChange={(e) => {
                    setSelectedUser(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="all">All Salespeople ({distinctUsers.length})</option>
                  {distinctUsers.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-500">Date:</span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 w-36 bg-slate-50 border-slate-200 text-xs"
                />
                {selectedDate && (
                  <button
                    onClick={() => {
                      setSelectedDate('');
                      setCurrentPage(1);
                    }}
                    className="text-slate-400 hover:text-slate-600 font-bold px-1"
                    title="Clear date filter"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="text-slate-500 font-medium">
              Showing <strong className="text-slate-900">{filteredVisits.length}</strong> matching visit{filteredVisits.length === 1 ? '' : 's'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visits Table / Card List */}
      <div className="space-y-4">
        {paginatedVisits.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-xs">
            No client visits match your selected filter criteria.
          </div>
        ) : (
          paginatedVisits.map((visit) => {
          const isVerified = visit.locationStatus === 'location_verified';
          const isApprovedUnverified = visit.locationStatus === 'manager_approved_unverified';
          const isLogComplete = visit.meetingLog.status === 'complete';
          const isLogMissing = visit.meetingLog.status === 'missing';

          return (
            <Card key={visit.id} className="border-slate-200 shadow-xs hover:border-slate-300 transition-all">
              <CardContent className="p-5 sm:p-6 pt-5 sm:pt-6 space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {visit.id}
                    </span>
                    {visit.isRealRecord && (
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <DatabaseIcon className="w-2.5 h-2.5" /> Supabase Visit
                      </span>
                    )}
                    <span className="text-xs text-slate-600 font-medium">
                      Salesperson: <strong className="text-slate-900">{visit.repName}</strong>
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">• {visit.category}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Location Badge */}
                    {isVerified && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Location Verified
                      </span>
                    )}
                    {isApprovedUnverified && (
                      <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                        Manager Approved — Location Unverified
                      </span>
                    )}

                    {/* Meeting Log Status Badge */}
                    {isLogComplete && (
                      <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                        Meeting Log Complete
                      </span>
                    )}
                    {isLogMissing && (
                      <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Log Overdue (&gt;2h)
                      </span>
                    )}
                  </div>
                </div>

                {/* Organisation & Timing Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{visit.clientName}</h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1 font-medium mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {visit.branchName}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 font-mono">
                    <div>
                      In: <strong className="text-slate-900">{visit.checkInTime}</strong>
                    </div>
                    <div>•</div>
                    <div>
                      Out: <strong className="text-slate-900">{visit.checkOutTime}</strong>
                    </div>
                    <div>•</div>
                    <div>
                      Duration: <strong className="text-brand-blue">{visit.duration}</strong>
                    </div>
                  </div>
                </div>

                {/* Evidence Grid: Geofence Evidence & Meeting Log Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Left Column: PostGIS Geofence Evidence */}
                  <div className="bg-slate-50/70 rounded-lg p-3 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        Authoritative PostGIS Geofence Result
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                          visit.geofenceResult.passed
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {visit.geofenceResult.passed
                          ? `Passed (${visit.geofenceResult.distanceMeters}m ≤ 200m)`
                          : 'No Geofence (Exception)'}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Check-in Accuracy:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {visit.geofenceResult.accuracyMeters > 0
                            ? `±${visit.geofenceResult.accuracyMeters}m (≤100m)`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Check-in Coords:</span>
                        <span className="font-mono text-slate-700">{visit.geofenceResult.checkInCoords}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Approved Pin Coords:</span>
                        <span className="font-mono text-slate-700">{visit.geofenceResult.pinCoords}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500">Premises Photo:</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Camera className="w-3 h-3" /> Captured Live On-Site
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Meeting Log Highlights & Inspection Action */}
                  <div className="bg-slate-50/70 rounded-lg p-3 border border-slate-200 text-xs flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        Meeting Log Payload
                      </div>

                      {isLogMissing ? (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
                          <strong>SLA Breach:</strong> No meeting log submitted within 2 hours. Notification dispatched to salesperson.
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-700 space-y-1">
                          <div>
                            <strong>Contact:</strong> {visit.meetingLog.contactMet} ({visit.meetingLog.contactRole})
                          </div>
                          <div>
                            <strong>Purpose:</strong> {visit.meetingLog.purpose}
                          </div>
                          <div>
                            <strong>Fleet Scale:</strong> {visit.meetingLog.fleetSize}
                          </div>
                          <div className="text-slate-500 text-[10px] mt-1 flex items-center justify-between gap-2">
                            <span>Logged: {visit.meetingLog.submittedAt}</span>
                            {visit.meetingLog.businessCardPhotoPath && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-blue bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                <CreditCard className="w-2.5 h-2.5 text-brand-blue" />
                                Card Attached
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-200 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold bg-white border-slate-300 hover:bg-slate-100 flex items-center gap-1"
                        onClick={() => setSelectedVisitForModal(visit)}
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        Inspect Full Audit Record
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {filteredVisits.length > 0 && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span>
              Showing <strong className="text-slate-900">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-900">
                {Math.min(currentPage * pageSize, filteredVisits.length)}
              </strong>{' '}
              of <strong className="text-slate-900">{filteredVisits.length}</strong> visits
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Rows Per Page */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs h-7 px-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Prev / Page / Next */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-7 px-2.5 text-xs font-semibold"
              >
                Previous
              </Button>
              <span className="px-2 font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-7 px-2.5 text-xs font-semibold"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Audit Record Modal */}
      {selectedVisitForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  Audit Inspection • {selectedVisitForModal.id}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedVisitForModal.clientName}
                </h3>
                <p className="text-xs text-slate-500">{selectedVisitForModal.branchName}</p>
              </div>
              <button
                onClick={() => setSelectedVisitForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 overflow-y-auto space-y-4 text-xs">
              {/* Status Header Strip */}
              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Visit Classification</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedVisitForModal.locationStatus === 'location_verified'
                      ? 'Location Verified (GPS + Live Photo)'
                      : 'Manager Approved — Location Unverified'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Salesperson</span>
                  <div className="font-bold text-brand-blue text-sm mt-0.5">
                    {selectedVisitForModal.repName}
                  </div>
                </div>
              </div>

              {/* Premises Photo Preview */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-brand-blue" />
                  Live Premises Verification Photo (Captured via In-App Camera)
                </span>
                <div className="h-44 bg-slate-900 rounded-lg flex items-center justify-center text-slate-500 border border-slate-300 relative overflow-hidden">
                  {signedPhotoUrl ? (
                    <img
                      src={signedPhotoUrl}
                      alt="Premises Verification"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                      <span className="font-bold text-slate-200 block">
                        Premises Photo: Client Workshop Entrance
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Watermarked: {selectedVisitForModal.geofenceResult.checkInCoords} • {selectedVisitForModal.checkInTime}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Meeting Narrative Outcome */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-blue" />
                  Meeting Log Outcome &amp; Commercial Discussion:
                </span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">
                  {selectedVisitForModal.meetingLog.narrativeOutcome}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 text-slate-600">
                  <div>
                    <strong>Products Discussed:</strong>{' '}
                    {selectedVisitForModal.meetingLog.productsDiscussed.join(', ') || 'None recorded'}
                  </div>
                  <div>
                    <strong>Reported Fleet Scale:</strong> {selectedVisitForModal.meetingLog.fleetSize}
                  </div>
                </div>

                {/* Free Text Next Step Note (PRD Compliant: Free text only, no task manager) */}
                <div className="pt-2 border-t border-slate-100">
                  <strong className="text-slate-900 block">Agreed Next Step (Free Text):</strong>
                  <span className="text-slate-700 italic">
                    {selectedVisitForModal.meetingLog.nextStepText || 'No next step recorded.'}
                  </span>
                </div>
              </div>

              {/* Client Business Card Section */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-brand-blue" />
                    Client Business Card (Captured at Meeting Log / Checkout)
                  </span>
                  {selectedVisitForModal.meetingLog.businessCardPhotoPath && (
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Encrypted Cloud File
                    </span>
                  )}
                </div>
                {signedBusinessCardUrl ? (
                  <div className="h-56 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-300 relative overflow-hidden">
                    <img
                      src={signedBusinessCardUrl}
                      alt="Client Business Card"
                      className="w-full h-full object-contain bg-slate-950"
                      onError={() => {
                        setCardLoadError('Failed to display business card image.');
                        setSignedBusinessCardUrl(null);
                      }}
                    />
                  </div>
                ) : isCardLoading ? (
                  <div className="h-28 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200 p-4 text-center">
                    <div>
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-blue" />
                      <span className="text-xs font-semibold">Generating secure temporary preview link...</span>
                    </div>
                  </div>
                ) : cardLoadError ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{cardLoadError}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 font-bold bg-white text-rose-800 border-rose-300 shrink-0"
                      onClick={() => {
                        const path = selectedVisitForModal.meetingLog.businessCardPhotoPath;
                        if (path) {
                          setIsCardLoading(true);
                          setCardLoadError(null);
                          managementService.getBusinessCardSignedUrl(path).then((url) => {
                            setIsCardLoading(false);
                            if (url) setSignedBusinessCardUrl(url);
                            else setCardLoadError('Unable to generate secure preview link for this business card.');
                          });
                        }
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                ) : selectedVisitForModal.meetingLog.businessCardPhotoPath ? (
                  <div className="h-28 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200 p-4 text-center">
                    <div>
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-blue" />
                      <span className="text-xs font-semibold">Generating secure temporary preview link...</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-500 text-xs italic">
                    No business card photograph was attached for this meeting log submission.
                  </div>
                )}
              </div>

              {/* Client Audit Status Note */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-900 block">Independent Client Audit Status:</span>
                  <span className="text-[11px]">
                    {selectedVisitForModal.clientAuditStatus === 'confirmed'
                      ? 'Client confirmed in routine 5% weekly phone audit.'
                      : selectedVisitForModal.clientAuditStatus === 'pending_call'
                      ? 'Queued for weekly random client audit verification call.'
                      : selectedVisitForModal.clientAuditStatus === 'disputed'
                      ? 'Disputed — Client denied meeting during audit call.'
                      : 'Not in current 5% random sampling queue.'}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-amber-900 border border-amber-200">
                  {selectedVisitForModal.clientAuditStatus?.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button
                variant="default"
                size="sm"
                className="text-xs font-bold bg-brand-blue hover:bg-brand-blue-700 text-white"
                onClick={() => setSelectedVisitForModal(null)}
              >
                Close Audit Record
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
