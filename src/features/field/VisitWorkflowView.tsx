import React, { useState, useEffect } from 'react';
import { useFieldSession, ClientBranch } from '@/context/FieldSessionContext';
import { MeetingLogModal } from '@/features/field/MeetingLogModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  MapPin,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Info,
} from 'lucide-react';

interface VisitWorkflowViewProps {
  selectedBranchFromDirectory?: ClientBranch | null;
  onNavigateToClients?: () => void;
  onNavigateToExceptions?: () => void;
}

export const VisitWorkflowView: React.FC<VisitWorkflowViewProps> = ({
  selectedBranchFromDirectory,
  onNavigateToClients,
  onNavigateToExceptions,
}) => {
  const {
    activeVisit,
    branches,
    checkInVisit,
    checkOutVisit,
    cancelVisit,
    simulatedGpsAccuracy,
    simulatedGeofenceDistance,
    setSimulatedGps,
  } = useFieldSession();

  // Selected branch for new visit check-in
  const [selectedBranch, setSelectedBranch] = useState<ClientBranch>(
    selectedBranchFromDirectory || branches[0]
  );

  // Update if prop changes
  useEffect(() => {
    if (selectedBranchFromDirectory) {
      setSelectedBranch(selectedBranchFromDirectory);
    }
  }, [selectedBranchFromDirectory]);

  // Viewfinder camera simulation states
  const [hasCapturedPhoto, setHasCapturedPhoto] = useState<boolean>(true);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Active visit elapsed seconds ticker
  const [liveSeconds, setLiveSeconds] = useState<number>(activeVisit ? activeVisit.elapsedSeconds : 0);

  // Meeting log modal
  const [isMeetingLogOpen, setIsMeetingLogOpen] = useState<boolean>(false);
  const [checkoutOutsideWarning, setCheckoutOutsideWarning] = useState<boolean>(false);

  useEffect(() => {
    let interval: any;
    if (activeVisit) {
      interval = setInterval(() => {
        setLiveSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeVisit]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCapturePhoto = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setIsCapturing(false);
      setHasCapturedPhoto(true);
    }, 600);
  };

  const handleCheckIn = () => {
    checkInVisit(
      selectedBranch,
      '/demo/demo_apex_depot.png',
      simulatedGpsAccuracy,
      simulatedGeofenceDistance
    );
    setLiveSeconds(0);
  };

  const handleInitiateCheckOut = () => {
    if (simulatedGeofenceDistance > 200) {
      setCheckoutOutsideWarning(true);
    } else {
      setIsMeetingLogOpen(true);
    }
  };

  const handleConfirmCheckoutOutside = () => {
    setCheckoutOutsideWarning(false);
    setIsMeetingLogOpen(true);
  };

  const handleMeetingLogFinished = (onTime: boolean) => {
    checkOutVisit(simulatedGeofenceDistance > 200, onTime ? { completed: true } : undefined);
    setIsMeetingLogOpen(false);
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto select-none">
      {/* ================= SIMULATION CONTROLS FOR TESTING ================= */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs space-y-2 border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-bold flex items-center gap-1.5 text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> GPS & Geofence Simulator (Test Controls)
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
            PRD Max: 200m
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => setSimulatedGps(14, 38)}
            className={`p-2 rounded-lg text-[11px] font-bold border transition-colors ${
              simulatedGeofenceDistance <= 200 && simulatedGpsAccuracy <= 100
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Inside (38m)
            <span className="block text-[9px] font-normal opacity-80">GPS ±14m (Valid)</span>
          </button>

          <button
            onClick={() => setSimulatedGps(18, 340)}
            className={`p-2 rounded-lg text-[11px] font-bold border transition-colors ${
              simulatedGeofenceDistance > 200
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Outside (340m)
            <span className="block text-[9px] font-normal opacity-80">Flags Checkout</span>
          </button>

          <button
            onClick={() => setSimulatedGps(140, 60)}
            className={`p-2 rounded-lg text-[11px] font-bold border transition-colors ${
              simulatedGpsAccuracy > 100
                ? 'bg-red-700 text-white border-red-600'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Degraded GPS
            <span className="block text-[9px] font-normal opacity-80">Accuracy ±140m</span>
          </button>
        </div>
      </div>

      {/* ================= ACTIVE VISIT IN PROGRESS VIEW ================= */}
      {activeVisit ? (
        <div className="space-y-4">
          <Card className="border-2 border-brand-blue bg-blue-50/40 shadow-sm overflow-hidden">
            <div className="p-4 space-y-3.5">
              {/* Header Badge & Timer */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue text-white text-xs font-bold shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8CF2F] animate-pulse" />
                  Visit Session In Progress
                </span>
                <div className="flex items-center gap-1.5 bg-white border border-blue-200 px-2.5 py-1 rounded-lg text-brand-blue font-mono font-bold text-sm shadow-2xs">
                  <Clock className="w-4 h-4 text-brand-blue" />
                  {formatTimer(liveSeconds)}
                </div>
              </div>

              {/* Branch Details */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  {activeVisit.companyName}
                </span>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">
                  {activeVisit.branchName}
                </h3>
                <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{activeVisit.address} • #{activeVisit.branchCode}</span>
                </p>
              </div>

              {/* Geofence & Check-in Verification Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-blue-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 block">Check-in Location</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Within Geofence ({activeVisit.geofenceDistanceMeters}m / 200m)
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">GPS Fix: ±{activeVisit.gpsAccuracyMeters}m</span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-blue-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 block">Check-in Timestamp</span>
                  <span className="font-bold text-slate-900 font-mono text-[11px]">
                    {activeVisit.checkInTime}
                  </span>
                  <span className="text-[9px] text-emerald-700 font-semibold">Live Photo Attached</span>
                </div>
              </div>

              {/* Single Normal Visit Rule Callout (AT-04) */}
              <div className="p-2.5 bg-white/80 border border-blue-200 rounded-lg text-[11px] text-slate-600 flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-blue shrink-0" />
                <span>PRD AT-04: Only 1 active normal physical visit is permitted at a time. All other visits blocked until closure.</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={handleInitiateCheckOut}
                  className="w-full h-12 min-h-[48px] font-bold text-xs bg-brand-blue hover:bg-brand-blue-700 text-white shadow-sm flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" /> Check Out & Document Visit
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsMeetingLogOpen(true)}
                    className="w-1/2 h-11 text-xs font-bold border-slate-300 bg-white"
                  >
                    Draft Meeting Log
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={cancelVisit}
                    className="w-1/2 h-11 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Cancel Session
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* ================= NEW VISIT CHECK-IN FLOW ================= */
        <div className="space-y-4">
          {/* Step 1: Branch Selected */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
                  Step 1: Target Client Branch
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNavigateToClients}
                  className="text-xs text-brand-blue hover:underline h-8 font-semibold"
                >
                  Change Branch
                </Button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  {selectedBranch.companyName}
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  {selectedBranch.branchName}
                </h3>
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {selectedBranch.address}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Geofence & GPS Accuracy Validation */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
                  Step 2: Geofence Validation
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Radius limit: 200m
                </span>
              </div>

              {/* Geofence Meter Graphic */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Distance to Pin:</span>
                  <span className={`font-mono font-bold ${
                    simulatedGeofenceDistance <= 200 ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {simulatedGeofenceDistance} metres
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      simulatedGeofenceDistance <= 200 ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, (simulatedGeofenceDistance / 400) * 100)}%` }}
                  />
                </div>

                {simulatedGpsAccuracy > 100 ? (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">GPS Accuracy Degraded (±{simulatedGpsAccuracy}m)</p>
                      <p className="text-[11px] text-red-800">
                        Accuracy exceeds 100m limit. Try moving outdoors, or submit a <strong>GPS Failure Exception</strong> if signal cannot be acquired.
                      </p>
                    </div>
                  </div>
                ) : simulatedGeofenceDistance <= 200 ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="font-semibold">
                      Inside Geofence ({simulatedGeofenceDistance}m / 200m) • Accuracy: ±{simulatedGpsAccuracy}m
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Outside Geofence ({simulatedGeofenceDistance}m &gt; 200m)</p>
                      <p className="text-[11px] text-amber-800">
                        Check-in will be marked as Location Unverified unless you are within 200m of the registered pin.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Mandatory Live Premises Photograph Viewfinder */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
                  Step 3: Live Premises Photo
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                  Rear Camera • Required
                </span>
              </div>

              {/* Viewfinder Frame */}
              <div className="relative w-full h-48 bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-300 flex flex-col items-center justify-center text-white">
                {isCapturing ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">Capturing Premises...</span>
                  </div>
                ) : hasCapturedPhoto ? (
                  <div className="relative w-full h-full bg-linear-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-center p-3">
                    <div className="w-16 h-16 rounded-lg bg-slate-700 border border-emerald-400 flex items-center justify-center mb-2">
                      <Building2 className="w-8 h-8 text-emerald-300" />
                    </div>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Live Premises Photo Captured
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono mt-0.5">
                      {selectedBranch.branchCode} • Gate / Signage Stamped
                    </span>

                    <button
                      onClick={() => setHasCapturedPhoto(false)}
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/60 hover:bg-black/80 text-white rounded-md text-[10px] font-semibold flex items-center gap-1 border border-white/20"
                    >
                      <RotateCw className="w-3 h-3" /> Retake
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4 text-center">
                    <Camera className="w-8 h-8 text-white/80" />
                    <p className="text-[11px] text-slate-300 max-w-[220px]">
                      Capture clear photo of branch entrance or company sign
                    </p>
                    <Button
                      onClick={handleCapturePhoto}
                      size="sm"
                      className="bg-brand-blue hover:bg-brand-blue-700 text-white font-bold text-xs h-9 px-4 mt-1"
                    >
                      <Camera className="w-3.5 h-3.5" /> Capture Photo
                    </Button>
                  </div>
                )}

                {/* Viewfinder Watermark */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono bg-black/60 px-2 py-1 rounded backdrop-blur-xs text-slate-200">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" /> {selectedBranch.approvedGpsLat}° N, {selectedBranch.approvedGpsLng}° E
                  </span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Check-in Button */}
          <div className="space-y-2">
            <Button
              onClick={handleCheckIn}
              disabled={!hasCapturedPhoto || simulatedGpsAccuracy > 100}
              className={`w-full h-12 min-h-[48px] font-bold text-xs shadow-sm flex items-center justify-center gap-2 ${
                hasCapturedPhoto && simulatedGpsAccuracy <= 100
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> Check In & Start Client Meeting
            </Button>

            {simulatedGpsAccuracy > 100 && (
              <Button
                variant="outline"
                onClick={onNavigateToExceptions}
                className="w-full text-xs h-10 border-amber-300 text-amber-900 bg-amber-50"
              >
                File GPS Failure Exception Instead
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ================= OUTSIDE GEOFENCE CHECKOUT WARNING (PRD §7.2 / AT-05) ================= */}
      {checkoutOutsideWarning && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-amber-700" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-base text-slate-900">
                Checkout Outside Geofence ({simulatedGeofenceDistance}m &gt; 200m)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                PRD §7.2 & AT-05 Rule: Check-out outside the geofence is <strong>permitted</strong>, but will raise an audit flag (<span className="font-semibold text-amber-900">Checkout Outside Geofence</span>) for Country Sales Head review.
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              Your visit session will be successfully closed and documented. The record remains reviewable by your manager.
            </div>

            <div className="space-y-2 pt-1">
              <Button
                onClick={handleConfirmCheckoutOutside}
                className="w-full font-bold h-11 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Acknowledge & Proceed to Checkout
              </Button>
              <Button
                variant="outline"
                onClick={() => setCheckoutOutsideWarning(false)}
                className="w-full text-xs h-10 border-slate-300"
              >
                Cancel Checkout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MEETING LOG MODAL ================= */}
      <MeetingLogModal
        isOpen={isMeetingLogOpen}
        onClose={() => setIsMeetingLogOpen(false)}
        branchName={activeVisit ? activeVisit.branchName : selectedBranch.branchName}
        onSubmitted={handleMeetingLogFinished}
      />
    </div>
  );
};
