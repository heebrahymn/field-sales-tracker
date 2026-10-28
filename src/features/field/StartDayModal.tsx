import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFieldSession } from '@/context/FieldSessionContext';
import { attendanceService, getMarketWorkDate } from '@/services/attendanceService';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  X,
  Camera,
  CheckCircle2,
  Sparkles,
  Info,
  RotateCw,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface StartDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StartDayModal: React.FC<StartDayModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, setAttendanceStatus } = useAuth();
  const { onAttendanceStarted, workdayStatus, isOnline, enqueueOfflineStartDay } = useFieldSession();

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'captured' | 'error'>('requesting');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);

  // GPS State
  const [gpsState, setGpsState] = useState<'acquiring' | 'acquired' | 'error'>('acquiring');
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    name: string;
    workDate: string;
    startTime: string;
    accuracy: number;
    provisionalOffline?: boolean;
  } | null>(null);

  // Stable Submission Identifier (reused across retry attempts of the same capture)
  const submissionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );

  // Cleanup active camera media tracks
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        const tracks = typeof streamRef.current.getTracks === 'function' ? streamRef.current.getTracks() : [];
        if (Array.isArray(tracks)) {
          tracks.forEach((track) => {
            if (track && typeof track.stop === 'function') {
              track.stop();
            }
          });
        }
      } catch {
        // Safe catch for mocked or non-standard media streams
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMediaStream(null);
    setIsVideoReady(false);
  }, []);

  // Initialize Camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraState('requesting');
    setIsVideoReady(false);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access API (getUserMedia) is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setMediaStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          const playPromise = videoRef.current.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((playErr) => {
              console.warn('[StartDayModal] video.play() error:', playErr);
            });
          }
        } catch {
          // Ignore synchronous play rejection in environments without full media playback
        }
      }

      setCameraState('active');
      setIsVideoReady(true);
    } catch (err: any) {
      console.warn('[StartDayModal] Camera start error:', err);
      setCameraState('error');
      setIsVideoReady(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission was denied. Please allow camera access in your browser or device permissions to capture your live attendance selfie.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No front-facing camera hardware was detected on this device.');
      } else {
        setCameraError(err.message || 'Unable to access front camera.');
      }
    }
  }, [stopCamera]);

  // Synchronize stream with video element
  useEffect(() => {
    const video = videoRef.current;
    if (video && mediaStream) {
      if (video.srcObject !== mediaStream) {
        video.srcObject = mediaStream;
      }
      try {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            console.warn('[StartDayModal] video.play() error:', err);
          });
        }
      } catch {
        // Safe catch for environments where play is not supported
      }
    }
  }, [mediaStream]);

  // Capture Live Snapshot from Video Stream
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (width === 0 || height === 0) {
      setCameraError('Unable to capture photo: video frame dimensions are not valid.');
      setCameraState('error');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror image horizontally to match natural selfie preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) {
          setSelfieBlob(blob);
          const preview = URL.createObjectURL(blob);
          setSelfiePreviewUrl(preview);
          setCameraState('captured');
          // Immediately release hardware camera resource
          stopCamera();
        } else {
          setCameraError('Failed to generate image from camera frame. Please try again.');
          setCameraState('error');
        }
      },
      'image/jpeg',
      0.85
    );
  };

  // Retake Photo
  const handleRetake = () => {
    if (selfiePreviewUrl && selfiePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selfiePreviewUrl);
    }
    setSelfiePreviewUrl(null);
    setSelfieBlob(null);
    setIsVideoReady(false);
    // Refresh submission identifier for the fresh photo attempt
    submissionIdRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    startCamera();
  };

  // Acquire Fresh GPS Coordinates (Reject Cached Fixes: maximumAge: 0)
  const acquireGps = useCallback(() => {
    setGpsState('acquiring');
    setGpsError(null);

    if (!navigator.geolocation?.getCurrentPosition) {
      setGpsState('error');
      setGpsError('Geolocation API is not supported by your browser environment.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsCoords({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy,
          timestamp: pos.timestamp || Date.now(),
        });

        // PRD §6.1 / §7: GPS Accuracy Threshold for attendance is <= 100 metres
        if (accuracy > 100) {
          setGpsState('error');
          setGpsError(
            `Reported accuracy (±${Math.round(accuracy)}m) exceeds maximum allowable threshold (100m). Please move away from obstructions and retry.`
          );
        } else {
          setGpsState('acquired');
        }
      },
      (err) => {
        console.warn('[StartDayModal] Geolocation error:', err);
        setGpsState('error');
        if (err.code === 1) {
          setGpsError('Location permission denied. Please enable GPS permissions in browser/device settings.');
        } else if (err.code === 2) {
          setGpsError('GPS position unavailable. Please ensure device location is switched on.');
        } else if (err.code === 3) {
          setGpsError('GPS acquisition timed out. Please retry with a clear view of the sky.');
        } else {
          setGpsError(err.message || 'Failed to acquire fresh GPS coordinate.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Mandatory: Reject stale cached coordinates (PRD §3 Step 3)
      }
    );
  }, []);

  // Modal open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      setSuccessInfo(null);
      setSubmitError(null);
      startCamera();
      acquireGps();
    } else {
      stopCamera();
      if (selfiePreviewUrl && selfiePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(selfiePreviewUrl);
        setSelfiePreviewUrl(null);
      }
      setSelfieBlob(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, acquireGps, stopCamera]);

  if (!isOpen) return null;

  // Confirm and Save to Supabase (or Durable Offline IndexedDB Queue when offline)
  const handleConfirmStart = async () => {
    if (!selfieBlob || !gpsCoords) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const localWorkDate = getMarketWorkDate(currentUser.marketCode);

      if (!isOnline || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
        const offlineRes = await enqueueOfflineStartDay({
          latitude: gpsCoords.lat,
          longitude: gpsCoords.lng,
          accuracy: gpsCoords.accuracy,
          selfieBlob,
          submissionId: submissionIdRef.current,
        });

        if (!offlineRes.success) {
          setSubmitError(offlineRes.error || 'Failed to queue offline Start Day.');
          setIsSubmitting(false);
          return;
        }

        setAttendanceStatus('started');
        const startTime = new Date(
          offlineRes.record?.started_at || Date.now()
        ).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });

        setSuccessInfo({
          name: currentUser.name,
          workDate: localWorkDate,
          startTime: `${startTime} ${currentUser.marketCode === 'NG' ? 'WAT' : 'CAT'}`,
          accuracy: Math.round(gpsCoords.accuracy),
          provisionalOffline: true,
        });

        setTimeout(() => {
          onClose();
        }, 1800);
        return;
      }

      const result = await attendanceService.startDayAttendance({
        userId: currentUser.id,
        marketCode: currentUser.marketCode,
        deviceId: currentUser.assignedDevice?.deviceId || '',
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lng,
        accuracy: gpsCoords.accuracy,
        selfieBlob: selfieBlob,
        submissionId: submissionIdRef.current,
      });

      if (result.error) {
        setSubmitError(result.error.message);
        setIsSubmitting(false);
        return;
      }

      if (result.data) {
        onAttendanceStarted(result.data);
        setAttendanceStatus('started');

        const startTime = new Date(result.data.started_at).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });

        setSuccessInfo({
          name: currentUser.name,
          workDate: localWorkDate,
          startTime: `${startTime} ${currentUser.marketCode === 'NG' ? 'WAT' : 'CAT'}`,
          accuracy: Math.round(gpsCoords.accuracy),
          provisionalOffline: false,
        });

        // Automatically close modal after brief confirmation view
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Unexpected error during attendance submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormReady =
    cameraState === 'captured' &&
    selfieBlob !== null &&
    gpsState === 'acquired' &&
    gpsCoords !== null &&
    !isSubmitting;

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
              Start Workday &amp; Attendance
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Salesperson: {currentUser.name} • {currentUser.marketName}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Workday Already Completed Warning */}
          {workdayStatus === 'ended' && !successInfo && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                Workday Already Completed For Today
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Per Carbon Car Care operating rules, only one attendance session is permitted per calendar date. Today&apos;s workday has already been ended.
              </p>
            </div>
          )}

          {/* Success View */}
          {successInfo ? (
            <div
              className={`p-6 rounded-2xl text-center space-y-3 animate-in fade-in zoom-in-95 border ${
                successInfo.provisionalOffline
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-emerald-50 border-emerald-300'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-xs ${
                  successInfo.provisionalOffline
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4
                  className={`text-base font-bold ${
                    successInfo.provisionalOffline ? 'text-amber-950' : 'text-emerald-950'
                  }`}
                >
                  {successInfo.provisionalOffline
                    ? 'Start Day Saved on Device (Provisional)'
                    : 'Start Day Successful'}
                </h4>
                <p
                  className={`text-xs font-medium mt-0.5 ${
                    successInfo.provisionalOffline ? 'text-amber-800' : 'text-emerald-800'
                  }`}
                >
                  {successInfo.provisionalOffline
                    ? 'Selfie & GPS queued in durable IndexedDB journal. Will synchronise to server when online.'
                    : 'Attendance recorded securely to Carbon Car Care Supabase operational ledger.'}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-bold text-slate-900">{successInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Work Date:</span>
                  <span className="font-mono font-bold text-slate-900">{successInfo.workDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Start Time:</span>
                  <span className="font-mono font-bold text-brand-blue">{successInfo.startTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GPS Accuracy:</span>
                  <span className="font-mono font-bold text-emerald-700">±{successInfo.accuracy}m</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Attendance Status:</span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      successInfo.provisionalOffline ? 'text-amber-800' : 'text-emerald-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full animate-pulse ${
                        successInfo.provisionalOffline ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    {successInfo.provisionalOffline
                      ? 'Pending Sync (Provisional on Device)'
                      : 'Started (Active on Field)'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Privacy and Policy Notice */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-700 leading-relaxed">
                  <strong className="text-slate-900 font-semibold">Company Phone Attendance Check:</strong> Front-camera live photo and fresh GPS coordinate verify attendance time. <em>No automated biometric/face-matching used in MVP (PRD §12).</em>
                </div>
              </div>

              {/* Front-Camera Viewfinder / Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-brand-blue" />
                    Live Front Camera
                  </span>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1',
                      cameraState === 'captured'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : cameraState === 'active' && isVideoReady
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : cameraState === 'error'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {cameraState === 'captured' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Captured • Ready
                      </>
                    ) : cameraState === 'active' && isVideoReady ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Stream • Ready
                      </>
                    ) : cameraState === 'error' ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Camera Error
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                        Initializing Camera...
                      </>
                    )}
                  </span>
                </div>

                <div className="relative w-full h-56 bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-300 flex flex-col items-center justify-center text-white">
                  {/* The video element is ALWAYS mounted to guarantee videoRef is bound */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={() => {
                      const v = videoRef.current;
                      if (v && (v.videoWidth > 0 || typeof window !== 'undefined')) {
                        setIsVideoReady(true);
                        setCameraState('active');
                      }
                    }}
                    onPlaying={() => {
                      const v = videoRef.current;
                      if (v && (v.videoWidth > 0 || typeof window !== 'undefined')) {
                        setIsVideoReady(true);
                        setCameraState('active');
                      }
                    }}
                    onError={(e) => {
                      console.warn('[StartDayModal] Video element error:', e);
                      setCameraState('error');
                      setCameraError('Live video feed playback encountered an error.');
                    }}
                    className={cn(
                      'w-full h-full object-cover -scale-x-100 absolute inset-0',
                      cameraState === 'active' && isVideoReady ? 'block' : 'hidden'
                    )}
                  />

                  {/* Active Live Video Controls & Dotted Face Outline */}
                  {cameraState === 'active' && isVideoReady && (
                    <>
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-36 h-44 rounded-full border-2 border-dashed border-white/70 shadow-sm" />
                      </div>
                      <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs border border-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live Stream
                      </div>
                      <div className="absolute bottom-2.5 left-0 right-0 flex justify-center">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCapturePhoto}
                          disabled={!isVideoReady || isSubmitting}
                          className="bg-brand-blue hover:bg-brand-blue-700 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-md"
                        >
                          <Camera className="w-3.5 h-3.5" /> Capture Live Photo
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Captured State */}
                  {cameraState === 'captured' && selfiePreviewUrl && (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      <img
                        src={selfiePreviewUrl}
                        alt="Captured Attendance Selfie"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 right-2.5">
                        <button
                          type="button"
                          onClick={handleRetake}
                          disabled={isSubmitting}
                          className="px-2.5 py-1 bg-black/70 hover:bg-black text-white rounded-md text-[10px] font-semibold flex items-center gap-1 border border-white/20 backdrop-blur-xs"
                        >
                          <RotateCw className="w-3 h-3" /> Retake
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-xs text-white p-1.5 rounded-lg text-[10px] flex items-center justify-between">
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Live Selfie Captured
                        </span>
                        <span className="font-mono text-slate-300">
                          {currentUser.employeeId}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Initializing / Requesting State */}
                  {(cameraState === 'requesting' || (cameraState === 'active' && !isVideoReady)) && (
                    <div className="flex flex-col items-center gap-2 p-4 text-center z-10">
                      <Loader2 className="w-7 h-7 text-brand-blue animate-spin" />
                      <span className="text-xs font-semibold text-slate-100">Initializing front camera...</span>
                      <span className="text-[10px] text-slate-400">Please allow browser camera permissions</span>
                    </div>
                  )}

                  {/* Error State */}
                  {cameraState === 'error' && (
                    <div className="flex flex-col items-center gap-2 p-4 text-center z-10">
                      <AlertTriangle className="w-7 h-7 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-300">Camera Unavailable</span>
                      <p className="text-[11px] text-slate-300 max-w-xs">{cameraError}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={startCamera}
                        className="text-xs h-8 bg-white/10 hover:bg-white/20 text-white border-white/20 mt-1"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Retry Camera Access
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Fresh GPS Satellite Fix Status */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Fresh GPS Accuracy Check
                  </span>
                  {gpsState === 'acquired' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Fix Acquired
                    </span>
                  )}
                  {gpsState === 'acquiring' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Acquiring...
                    </span>
                  )}
                  {gpsState === 'error' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      Fix Failed
                    </span>
                  )}
                </div>

                {gpsState === 'acquired' && gpsCoords && (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Reported Accuracy</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        ±{Math.round(gpsCoords.accuracy)} metres
                      </span>
                      <span className="text-[9px] text-slate-500 block">(Max allowed: 100m)</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Captured Coordinates</span>
                      <span className="font-mono font-bold text-slate-800 text-[10px] block truncate">
                        {gpsCoords.lat.toFixed(5)}°, {gpsCoords.lng.toFixed(5)}°
                      </span>
                      <span className="text-[9px] text-slate-500 block">Fresh satellite reading</span>
                    </div>
                  </div>
                )}

                {gpsState === 'error' && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5">
                    <p className="text-[11px] text-amber-900 leading-snug">{gpsError}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={acquireGps}
                      className="text-xs h-7 px-2.5 border-amber-300 bg-white hover:bg-amber-100 text-amber-900"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Retry GPS Fix
                    </Button>
                  </div>
                )}
              </div>

              {/* Submission Error Banner */}
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-[11px]">
                    <strong>Submission Failed:</strong> {submitError}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!successInfo && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 rounded-b-2xl shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-11 px-4 border-slate-300"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              disabled={!isFormReady || workdayStatus === 'ended'}
              onClick={handleConfirmStart}
              className={`text-xs h-11 px-5 font-bold shadow-sm ${
                isFormReady && workdayStatus !== 'ended'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Recording Attendance...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  Confirm &amp; Start Workday
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
