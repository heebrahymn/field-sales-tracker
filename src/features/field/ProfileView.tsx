import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  useDeviceReplacement,
  DeviceReplacementRequest,
  ReplacementRequestStatus,
} from '@/context/DeviceReplacementContext';
import { ReportDeviceIssueModal } from './ReportDeviceIssueModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  History,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  RotateCw,
  Info,
  BatteryCharging,
  Wifi,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileViewProps {
  onNavigateTab?: (tab: 'home' | 'clients' | 'visit' | 'exceptions' | 'sync') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigateTab }) => {
  const { currentUser, refreshProfile } = useAuth();
  const { replacementRequests, refreshRequests } = useDeviceReplacement();

  useEffect(() => {
    refreshRequests?.();
    refreshProfile?.();
  }, [refreshRequests, refreshProfile]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedRequestForHistory, setSelectedRequestForHistory] =
    useState<DeviceReplacementRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

  const assignedDeviceTag = currentUser.assignedDevice?.assetTag || 'CC-DEV-LOS-001';
  const assignedDeviceModel =
    currentUser.assignedDevice?.model || 'Samsung Galaxy A15 Enterprise';

  // Get requests for current salesperson or requests matching current user employee ID / ID
  const myRequests = replacementRequests.filter(
    (r) =>
      r.salespersonId === currentUser.employeeId ||
      r.salespersonId === currentUser.id ||
      r.salespersonName.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0])
  );

  const filteredRequests = myRequests.filter((r) => {
    if (statusFilter === 'ACTIVE') {
      return (
        r.status === 'Pending Review' ||
        r.status === 'Approved' ||
        r.status === 'Awaiting Spare' ||
        r.status === 'Dispatched' ||
        r.status === 'Awaiting Activation'
      );
    }
    if (statusFilter === 'RESOLVED') {
      return r.status === 'Completed' || r.status === 'Rejected';
    }
    return true;
  });

  const getStatusBadge = (status: ReplacementRequestStatus) => {
    switch (status) {
      case 'Pending Review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" /> Pending HQ Review
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <CheckCircle2 className="w-3 h-3 text-blue-600" /> Approved by HQ
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" /> Rejected by HQ
          </span>
        );
      case 'Awaiting Spare':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
            <Smartphone className="w-3 h-3 text-indigo-600" /> Spare Allocated
          </span>
        );
      case 'Dispatched':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 animate-pulse">
            <Truck className="w-3 h-3 text-purple-600" /> In Transit / Dispatched
          </span>
        );
      case 'Awaiting Activation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
            <RotateCw className="w-3 h-3 text-cyan-600" /> Awaiting Handset Activation
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Replacement Completed
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'camera_defect':
        return 'Camera Defect';
      case 'gps_failure':
        return 'GPS Sensor Failure';
      case 'screen_damage':
        return 'Screen / Digitizer Damage';
      case 'battery_charging_fault':
        return 'Battery / Charging Fault';
      case 'lost_or_stolen':
        return 'Lost or Stolen Device';
      default:
        return 'Other Hardware Issue';
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto select-none">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
            Salesperson Profile & MDM
          </span>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            My Device & Custody
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Company-issued hardware, MDM telemetry, and replacement tracking
          </p>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            {currentUser.employeeId}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Knox Protected
          </span>
        </div>
      </div>

      {/* Salesperson Identity Summary */}
      <Card className="border-slate-200 shadow-xs bg-linear-to-br from-white to-slate-50/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{currentUser.name}</h3>
              <p className="text-xs text-slate-500">{currentUser.email}</p>
            </div>
            <span className="text-[10px] font-bold bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-2.5 py-1 rounded-full uppercase">
              {currentUser.role.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
              <span className="text-[10px] text-slate-500 font-medium block">Market Territory</span>
              <span className="font-semibold text-slate-800">{currentUser.marketName}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
              <span className="text-[10px] text-slate-500 font-medium block">Timezone</span>
              <span className="font-mono font-semibold text-slate-800">{currentUser.timezone}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION: My Assigned Company Device */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-2 p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Assigned Company Handset
                </CardTitle>
                <p className="text-[11px] text-slate-500">100% Company-Provided Field Tool</p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" /> Active Custody
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3.5">
          {/* Handset Technical Specs */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Assigned Asset ID:</span>
              <span className="font-mono font-bold text-slate-900">{assignedDeviceTag}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Device Model:</span>
              <span className="font-semibold text-slate-800">{assignedDeviceModel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Inventory Assignment:</span>
              <span className="text-slate-800 font-semibold flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-brand-blue" /> HQ Database Assigned
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Hardware Attestation:</span>
              <span className="text-slate-500 text-[11px] italic">
                Future Knox MDM (Unattested in MVP)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Battery Health:</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <BatteryCharging className="w-3 h-3 text-emerald-600" /> 94% (Good)
              </span>
            </div>
          </div>

          {/* Primary Action: Report Device Issue */}
          <div className="space-y-1.5 pt-1">
            <Button
              onClick={() => setIsReportModalOpen(true)}
              className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Report Device Issue (Request Replacement)
            </Button>
            <p className="text-[10px] text-slate-500 text-center">
              Dispatches directly to HQ Admin. No Country Sales Head approval bottleneck.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Scope Separation Clarification */}
      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1">
        <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
          <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>Strict Scope Separation: Hardware vs Field Visit Exceptions</span>
        </div>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Reporting a broken phone is an administrative request for replacement hardware. If device
          failure caused missed check-ins or visit capture, also file a visit exception under{' '}
          <strong className="underline cursor-pointer" onClick={() => onNavigateTab?.('exceptions')}>
            My Exceptions
          </strong>{' '}
          upon regaining access. HQ Admin never creates or modifies salesperson visit evidence.
        </p>
      </div>

      {/* SECTION: Submitted Replacement Requests Tracking */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              My Replacement Requests ({myRequests.length})
            </h3>
            <p className="text-[10px] text-slate-400">
              Live lifecycle tracking from HQ review to spare dispatch & activation
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[10px]">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={cn(
                'px-2 py-0.5 rounded-md font-bold transition-all',
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={cn(
                'px-2 py-0.5 rounded-md font-bold transition-all',
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-brand-blue shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              className={cn(
                'px-2 py-0.5 rounded-md font-bold transition-all',
                statusFilter === 'RESOLVED'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Closed
            </button>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 space-y-1">
            <CheckCircle2 className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No replacement requests in this filter.</p>
            <p className="text-[11px] text-slate-400">
              Your company handset is operating under normal field conditions.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-xs">{req.id}</span>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                        {getCategoryLabel(req.issueCategory)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Submitted: {req.submittedAt}
                    </span>
                  </div>
                  <div>{getStatusBadge(req.status)}</div>
                </div>

                {/* Body: Issue Details */}
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Problem Description
                    </span>
                    <p className="text-slate-700 font-medium leading-relaxed text-[11px]">
                      {req.issueDescription}
                    </p>
                  </div>

                  {req.supportingEvidence && (
                    <div className="bg-slate-50 p-2 rounded-lg text-[10px] text-slate-600 border border-slate-200/70">
                      <strong>Attachment / Supporting Evidence:</strong> {req.supportingEvidence}
                    </div>
                  )}
                </div>

                {/* HQ Feedback / Action Box */}
                {req.status === 'Approved' && (
                  <div className="bg-blue-50/80 border border-blue-200 p-2.5 rounded-lg text-[11px] space-y-1">
                    <span className="font-bold text-brand-blue flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> HQ Admin Approved
                    </span>
                    <p className="text-slate-700">
                      <strong>Reason:</strong> {req.approvalReason}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Next Step: Spare device allocation and logistics dispatch in progress.
                    </p>
                  </div>
                )}

                {req.status === 'Rejected' && (
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-[11px] space-y-1">
                    <span className="font-bold text-rose-700 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> HQ Admin Rejected
                    </span>
                    <p className="text-rose-900 font-medium">
                      <strong>Mandatory Reason:</strong> {req.rejectionReason}
                    </p>
                  </div>
                )}

                {req.status === 'Awaiting Spare' && (
                  <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-lg text-[11px] space-y-1">
                    <span className="font-bold text-indigo-900 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" /> Replacement Handset Allocated
                    </span>
                    <p className="text-slate-700">
                      Allocated Asset Tag: <strong>{req.replacementDeviceAssetId}</strong> ({req.replacementDeviceModel})
                    </p>
                  </div>
                )}

                {req.status === 'Dispatched' && (
                  <div className="bg-purple-50 border border-purple-200 p-2.5 rounded-lg text-[11px] space-y-1">
                    <span className="font-bold text-purple-900 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-purple-700" /> Handset Dispatched to Territory
                    </span>
                    <p className="text-purple-950 font-medium">
                      Logistics: {req.dispatchNotes}
                    </p>
                    <p className="text-[10px] text-purple-700">
                      Replacement Asset: <strong>{req.replacementDeviceAssetId}</strong>
                    </p>
                  </div>
                )}

                {req.status === 'Awaiting Activation' && (
                  <div className="bg-cyan-50 border border-cyan-200 p-2.5 rounded-lg text-[11px] space-y-1">
                    <span className="font-bold text-cyan-900 flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5 text-cyan-700" /> Ready for Device Activation
                    </span>
                    <p className="text-cyan-950">
                      Replacement phone {req.replacementDeviceAssetId} is configured in MDM. Original device {req.companyDeviceAssetId} has been designated as {req.oldDeviceDisposition?.replace(/_/g, ' ')}.
                    </p>
                  </div>
                )}

                {req.status === 'Completed' && (
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-[11px] space-y-1">
                    <span className="font-bold text-emerald-900 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Replacement Complete
                    </span>
                    <p className="text-emerald-950 text-[10px]">
                      Chain-of-custody transfer closed by HQ Admin. Replacement active.
                    </p>
                  </div>
                )}

                {/* Action: View Append-Only Audit History */}
                <div className="pt-1 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRequestForHistory(req)}
                    className="text-[11px] font-semibold h-7 border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <History className="w-3 h-3 text-slate-500" />
                    View Timeline & History ({req.history.length})
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Offline Queue Quick Link */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Wifi className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Offline Queue & Sync</h4>
            <p className="text-[10px] text-slate-500">IndexedDB local storage resilience</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigateTab?.('sync')}
          className="text-xs font-semibold border-slate-200 h-7"
        >
          View Queue
        </Button>
      </div>

      {/* Report Issue Modal */}
      <ReportDeviceIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* Append-Only History Modal */}
      {selectedRequestForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {selectedRequestForHistory.id} History
                  </h3>
                  <p className="text-[11px] text-slate-500">Append-Only Audit Log</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequestForHistory(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {selectedRequestForHistory.history.map((entry, idx) => (
                <div key={idx} className="relative pl-8 space-y-0.5 text-xs">
                  <span className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-brand-blue ring-4 ring-white" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{entry.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{entry.timestamp}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">{entry.actorName}</span>{' '}
                    <span className="text-slate-400">({entry.actorRole})</span>
                  </div>
                  {entry.notes && (
                    <div className="bg-slate-50 p-2 rounded text-[11px] text-slate-700 border border-slate-200/70 mt-1">
                      {entry.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRequestForHistory(null)}
                className="text-xs"
              >
                Close Timeline
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
