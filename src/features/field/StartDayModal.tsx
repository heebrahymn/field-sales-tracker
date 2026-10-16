import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFieldSession } from '@/context/FieldSessionContext';
import { Button } from '@/components/ui/button';
import {
  X,
  Camera,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  Info,
  RotateCw,
} from 'lucide-react';

interface StartDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StartDayModal: React.FC<StartDayModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, setAttendanceStatus } = useAuth();
  const { startDay } = useFieldSession();

  const [hasCapturedPhoto, setHasCapturedPhoto] = useState<boolean>(false);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCapture = () => {
    setIsSimulatingCamera(true);
    setTimeout(() => {
      setIsSimulatingCamera(false);
      setHasCapturedPhoto(true);
    }, 600);
  };

  const handleRetake = () => {
    setHasCapturedPhoto(false);
  };

  const handleConfirmStart = () => {
    startDay('/demo/demo_selfie_silhouette.png');
    setAttendanceStatus('started');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                PRD §6.1 Workday Attendance
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base mt-1">
              Start Workday & Attendance
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Market: {currentUser.marketName} ({currentUser.marketCode})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Hardware & Privacy Notice */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-700 leading-relaxed">
              <strong className="text-slate-900 font-semibold">Company Phone Attendance Check:</strong> Front-camera live photo and fresh GPS coordinate verify attendance time. <em>No automated biometric/face-matching used in MVP (PRD §12).</em>
            </div>
          </div>

          {/* Simulated Front-Camera Viewfinder */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-brand-blue" />
                Live Front Camera (Simulated)
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                Front Facing • 1080p
              </span>
            </div>

            <div className="relative w-full h-52 bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-300 flex flex-col items-center justify-center text-white">
              {isSimulatingCamera ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold tracking-wide">Capturing Live Photo...</span>
                </div>
              ) : hasCapturedPhoto ? (
                <div className="relative w-full h-full bg-linear-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-center p-4">
                  {/* Silhouette Portrait */}
                  <div className="w-24 h-24 rounded-full bg-slate-700 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mb-2">
                    <span className="text-2xl font-bold">{currentUser.name.charAt(0)}</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Live Front Selfie Captured
                  </span>
                  <span className="text-[10px] text-slate-300 mt-0.5">
                    {currentUser.name} • {currentUser.employeeId}
                  </span>

                  {/* Retake Button */}
                  <button
                    onClick={handleRetake}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/60 hover:bg-black/80 text-white rounded-md text-[10px] font-semibold flex items-center gap-1 border border-white/20"
                  >
                    <RotateCw className="w-3 h-3" /> Retake
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-4 text-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                      <Camera className="w-7 h-7 text-white/80" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 max-w-[220px]">
                    Position your face within the framing guide and press capture
                  </p>
                  <Button
                    onClick={handleCapture}
                    size="sm"
                    className="bg-brand-blue hover:bg-brand-blue-700 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" /> Capture Live Photo
                  </Button>
                </div>
              )}

              {/* Viewfinder Coordinate Watermark Overlay */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono bg-black/60 px-2 py-1 rounded backdrop-blur-xs text-slate-200">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" /> 6.5244° N, 3.3792° E
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Fresh GPS Satellite Fix Status */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Fresh GPS Accuracy Check
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Satellite Fix Acquired
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Reported Accuracy</span>
                <span className="font-bold text-emerald-700 font-mono">±12 metres</span>
                <span className="text-[9px] text-slate-500 block">(Max allowed: 100m)</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Assigned Market</span>
                <span className="font-bold text-slate-900">{currentUser.marketName}</span>
                <span className="text-[9px] text-slate-500 block">TZ: Africa/Lagos (WAT)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 rounded-b-2xl shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs h-11 px-4 border-slate-300"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            disabled={!hasCapturedPhoto}
            onClick={handleConfirmStart}
            className={`text-xs h-11 px-5 font-bold shadow-sm ${
              hasCapturedPhoto
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            Confirm & Start Workday
          </Button>
        </div>
      </div>
    </div>
  );
};
