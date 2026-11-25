import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFieldSession, FieldExceptionRecord, ClientBranch } from '@/context/FieldSessionContext';
import { getMarketWorkDate, formatMarketTime } from '@/services/attendanceService';
import { formatUserFriendlyError } from '@/utils/errorMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhotoLightboxModal, LightboxPhoto } from '@/components/ui/photo-lightbox-modal';
import {
  X,
  ShieldAlert,
  Info,
  Building2,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Eye,
  Loader2,
  MapPin,
  Search,
  ChevronDown,
  Clock,
  RefreshCw,
  SwitchCamera,
} from 'lucide-react';

interface CreateExceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBranchId?: string;
  initialReason?: string;
  initialType?: FieldExceptionRecord['type'];
}

export const CreateExceptionModal: React.FC<CreateExceptionModalProps> = ({
  isOpen,
  onClose,
  defaultBranchId,
  initialReason,
  initialType,
}) => {
  const { currentUser } = useAuth();
  const { branches, refreshBranches, submitException } = useFieldSession();

  const [type, setType] = useState<FieldExceptionRecord['type']>(initialType || 'gps_failure');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(defaultBranchId || branches[0]?.id || '');
  const [branchName, setBranchName] = useState<string>(
    branches.find((b) => b.id === defaultBranchId)?.branchName || branches[0]?.branchName || 'Apex Heavy Logistics Fleet Depot'
  );
  const [branchSearchQuery, setBranchSearchQuery] = useState('');
  const [branchStatusFilter, setBranchStatusFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isRefreshingBranches, setIsRefreshingBranches] = useState(false);

  const [claimedDate, setClaimedDate] = useState<string>(() => getMarketWorkDate(currentUser?.marketCode));
  const [claimedTime, setClaimedTime] = useState<string>(() =>
    formatMarketTime(new Date().toISOString(), currentUser?.marketCode)
  );
  const [reason, setReason] = useState<string>(
    initialReason ||
      'Client facility workshop is located in an underground basement loading bay; severe concrete attenuation prevented satellite acquisition (GPS accuracy degraded beyond 140m).'
  );
  const [evidencePhotoBlob, setEvidencePhotoBlob] = useState<File | null>(null);
  const [evidencePhotoPreviewUrl, setEvidencePhotoPreviewUrl] = useState<string | null>(null);
  const [evidencePhotoError, setEvidencePhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<LightboxPhoto | null>(null);

  // Live camera capture states for Snap Photo
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const isPhotoRequired = type !== 'camera_failure';

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMediaStream(null);
    setIsCameraActive(false);
  };

  const clearAttachedPhoto = () => {
    stopCamera();
    if (evidencePhotoPreviewUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(evidencePhotoPreviewUrl);
    }
    setEvidencePhotoBlob(null);
    setEvidencePhotoPreviewUrl(null);
    setEvidencePhotoError(null);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      if (evidencePhotoPreviewUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(evidencePhotoPreviewUrl);
      }
    };
  }, [evidencePhotoPreviewUrl]);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setIsBranchDropdownOpen(false);
      return;
    }
    let active = true;
    if (typeof refreshBranches === 'function') {
      setIsRefreshingBranches(true);
      Promise.resolve(refreshBranches())
        .catch(() => {})
        .finally(() => {
          if (active && isMountedRef.current && typeof window !== 'undefined') {
            setIsRefreshingBranches(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [isOpen, refreshBranches]);

  useEffect(() => {
    if (videoRef.current && mediaStream && isCameraActive) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(() => {});
    }
  }, [mediaStream, isCameraActive]);

  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => {
      const nameCmp = (a.branchName || '').localeCompare(b.branchName || '');
      if (nameCmp !== 0) return nameCmp;
      return (a.address || '').localeCompare(b.address || '');
    });
  }, [branches]);

  const verifiedBranchesCount = useMemo(
    () => sortedBranches.filter((b) => b.status === 'approved').length,
    [sortedBranches]
  );
  const unverifiedBranchesCount = useMemo(
    () => sortedBranches.filter((b) => b.status !== 'approved').length,
    [sortedBranches]
  );

  const filteredBranches = useMemo(() => {
    const q = branchSearchQuery.trim().toLowerCase();
    return sortedBranches.filter((b) => {
      const isVerified = b.status === 'approved';
      if (branchStatusFilter === 'verified' && !isVerified) return false;
      if (branchStatusFilter === 'unverified' && isVerified) return false;
      if (!q) return true;
      const orgName = b.companyName || (b as any).organisationName || '';
      return (
        (b.branchName || '').toLowerCase().includes(q) ||
        orgName.toLowerCase().includes(q) ||
        (b.address || '').toLowerCase().includes(q) ||
        (b.branchCode || '').toLowerCase().includes(q)
      );
    });
  }, [sortedBranches, branchSearchQuery, branchStatusFilter]);

  const selectedBranchObj: ClientBranch | undefined = useMemo(
    () => sortedBranches.find((b) => b.id === selectedBranchId),
    [sortedBranches, selectedBranchId]
  );

  useEffect(() => {
    if (defaultBranchId && sortedBranches.length > 0) {
      const match = sortedBranches.find((b) => b.id === defaultBranchId);
      if (match) {
        setSelectedBranchId(match.id);
        setBranchName(match.branchName);
        return;
      }
    }
    if (sortedBranches.length > 0) {
      if (!selectedBranchId || !sortedBranches.some((b) => b.id === selectedBranchId)) {
        setSelectedBranchId(sortedBranches[0].id);
        setBranchName(sortedBranches[0].branchName);
      }
    }
  }, [sortedBranches, selectedBranchId, defaultBranchId]);

  const handleCloseModal = () => {
    stopCamera();
    onClose();
  };

  const getBranchVerificationMeta = (status: ClientBranch['status']) => {
    if (status === 'approved') {
      return {
        isVerified: true,
        label: 'Verified',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    }
    if (status === 'rejected') {
      return {
        isVerified: false,
        label: 'Unverified • Pin Rejected',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
      };
    }
    return {
      isVerified: false,
      label: 'Unverified • Pending',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  };

  useEffect(() => {
    if (initialReason) setReason(initialReason);
    if (initialType) setType(initialType);
  }, [initialReason, initialType]);

  if (!isOpen) return null;

  const attachPhotoFile = (file: File) => {
    if (evidencePhotoPreviewUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(evidencePhotoPreviewUrl);
    }

    setEvidencePhotoError(null);
    setCameraError(null);
    setSubmitError(null);
    setEvidencePhotoBlob(file);

    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      setEvidencePhotoPreviewUrl(URL.createObjectURL(file));
    } else {
      setEvidencePhotoPreviewUrl('data:image/jpeg;base64,');
    }
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setEvidencePhotoError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Live camera access is unavailable in this browser. Please allow camera permissions or select Camera Hardware / Capture Failure if camera hardware failed.'
      );
      return;
    }

    stopCamera();

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback for desktop webcams without facingMode constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      setMediaStream(stream);
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('[CreateExceptionModal] Camera start failed:', err);
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please enable camera access in browser settings and retry.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError(
          'No active camera detected on this device. Select Camera Hardware / Capture Failure if your device camera failed.'
        );
      } else {
        setCameraError(
          formatUserFriendlyError(err, 'camera', 'Unable to open your device camera. Please tap Retry Camera.')
        );
      }
      setIsCameraActive(false);
    }
  };

  const switchCamera = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await startCamera(nextMode);
  };

  const handleCaptureCameraPhoto = () => {
    const video = videoRef.current;
    if (!video || !mediaStreamRef.current) {
      setCameraError('Camera stream is not ready. Please click Retry Camera.');
      return;
    }

    setIsCapturingPhoto(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setCameraError('Unable to initialize capture frame.');
        return;
      }

      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setCameraError('Failed to capture image from camera stream.');
            return;
          }
          const capturedFile = new File([blob], `exception_evidence_${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          stopCamera();
          attachPhotoFile(capturedFile);
        },
        'image/jpeg',
        0.88
      );
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isPhotoRequired && !evidencePhotoBlob) {
      setEvidencePhotoError('Live picture evidence via Snap Photo is required before submitting.');
      return;
    }

    let title = 'GPS Signal Failure Exception';
    if (type === 'camera_failure') title = 'Camera Hardware / Capture Failure';
    if (type === 'device_breakdown') title = 'New Client Approval Delay';
    if (type === 'missed_visit_claim') title = 'Missed Visit Activity Claim';

    setIsSubmitting(true);
    try {
      await submitException({
        type,
        title,
        branchName,
        branchCode: selectedBranchId,
        claimedDate,
        claimedTime,
        reason,
        evidenceNote: evidencePhotoBlob
          ? `Picture evidence attached (${evidencePhotoBlob.name || 'exception_photo.jpg'})`
          : reason.trim() || 'Narrative exception claim submitted',
        evidencePhotoBlob,
      });

      clearAttachedPhoto();
      onClose();
    } catch (err: any) {
      setSubmitError(
        formatUserFriendlyError(err, 'exception', 'Unable to submit your exception claim right now. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Salesperson-Originated Exception
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base mt-1">
              Submit Operational Exception Claim
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Salesperson: {currentUser.name} • Strictly Rep-Created
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* PRD Authority Rule */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-950 leading-relaxed">
              <strong className="text-amber-900 font-semibold">Mandatory Business Rule:</strong> Salesperson creates and submits every missed-visit, GPS-failure, or device-failure record. Managers review and approve/reject, but <strong>never</strong> create logs on your behalf.
            </div>
          </div>

          {/* Exception Type */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900">
              Failure / Exception Category <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as any);
                setEvidencePhotoError(null);
              }}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none"
            >
              <option value="gps_failure">GPS Signal Failure (Basement / Multipath / Obstruction)</option>
              <option value="camera_failure">Camera Hardware / Capture Failure</option>
              <option value="device_breakdown">New Client Approval Delay</option>
              <option value="missed_visit_claim">Missed Physical Visit Activity Claim</option>
            </select>
          </div>

          {/* Target Branch & Registered Client Address Selector (Verified + Unverified) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="block font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-brand-blue" />
                Target Client Branch / Address <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (typeof refreshBranches === 'function') {
                    setIsRefreshingBranches(true);
                    Promise.resolve(refreshBranches())
                      .catch(() => {})
                      .finally(() => {
                        if (isMountedRef.current && typeof window !== 'undefined') {
                          setIsRefreshingBranches(false);
                        }
                      });
                  }
                }}
                className="text-[10px] font-bold text-brand-blue hover:underline inline-flex items-center gap-1 cursor-pointer"
                title="Reload all verified and unverified client addresses"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingBranches ? 'animate-spin' : ''}`} />
                {isRefreshingBranches
                  ? 'Detecting...'
                  : `${sortedBranches.length} Loaded (${verifiedBranchesCount} Verified • ${unverifiedBranchesCount} Unverified)`}
              </button>
            </div>

            {/* Active Selection Trigger */}
            <button
              type="button"
              onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
              aria-expanded={isBranchDropdownOpen}
              className="w-full text-left px-3 py-2.5 border border-slate-300 rounded-lg bg-white hover:border-brand-blue/60 focus:ring-2 focus:ring-brand-blue focus:outline-none flex items-center justify-between gap-2 transition-colors"
            >
              {selectedBranchObj ? (
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs truncate">
                      {selectedBranchObj.branchName}
                      {selectedBranchObj.branchCode ? ` (${selectedBranchObj.branchCode})` : ''}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${
                        getBranchVerificationMeta(selectedBranchObj.status).badgeClass
                      }`}
                    >
                      {getBranchVerificationMeta(selectedBranchObj.status).label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>
                      {selectedBranchObj.companyName || (selectedBranchObj as any).organisationName || 'Registered Client'}
                      {selectedBranchObj.address ? ` — ${selectedBranchObj.address}` : ''}
                    </span>
                  </p>
                </div>
              ) : (
                <span className="text-slate-500 text-xs">
                  {isRefreshingBranches
                    ? 'Detecting all verified and unverified registered client addresses...'
                    : 'Select registered client address...'}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                  isBranchDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Expandable Searchable Branch & Address List */}
            {isBranchDropdownOpen && (
              <div className="border border-slate-300 rounded-xl bg-white shadow-md overflow-hidden">
                <div className="p-2.5 border-b border-slate-200 bg-slate-50 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    <Input
                      value={branchSearchQuery}
                      onChange={(e) => setBranchSearchQuery(e.target.value)}
                      placeholder="Search by client name, branch, or registered address..."
                      className="pl-8 pr-7 h-8 text-xs bg-white border-slate-300"
                    />
                    {branchSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setBranchSearchQuery('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                        aria-label="Clear branch search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setBranchStatusFilter('all')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                        branchStatusFilter === 'all'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      All ({sortedBranches.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBranchStatusFilter('verified')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                        branchStatusFilter === 'verified'
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      Verified ({verifiedBranchesCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBranchStatusFilter('unverified')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                        branchStatusFilter === 'unverified'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      Unverified ({unverifiedBranchesCount})
                    </button>
                  </div>
                </div>

                <div
                  role="listbox"
                  aria-label="Registered Client Branches and Addresses"
                  className="max-h-56 overflow-y-auto divide-y divide-slate-100"
                >
                  {filteredBranches.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-slate-500">
                      No registered client addresses match your search/filter.
                    </div>
                  ) : (
                    filteredBranches.map((b) => {
                      const isSelected = b.id === selectedBranchId;
                      const meta = getBranchVerificationMeta(b.status);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setSelectedBranchId(b.id);
                            setBranchName(b.branchName);
                            setIsBranchDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-start justify-between gap-2 transition-colors ${
                            isSelected ? 'bg-blue-50/90' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">
                                {b.branchName}
                                {b.branchCode ? ` (${b.branchCode})` : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-700 font-medium truncate">
                              {b.companyName || (b as any).organisationName || 'Registered Client'}
                            </p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{b.address}</span>
                            </p>
                          </div>

                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 whitespace-nowrap mt-0.5 inline-flex items-center gap-0.5 ${meta.badgeClass}`}
                          >
                            {meta.isVerified ? (
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            ) : (
                              <Clock className="w-2.5 h-2.5" />
                            )}
                            {meta.label}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Claimed Date & Time Window */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-900">
                Claimed Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={claimedDate}
                onChange={(e) => setClaimedDate(e.target.value)}
                className="text-xs h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-900">
                Claimed Meeting Time <span className="text-red-500">*</span>
              </label>
              <Input
                value={claimedTime}
                onChange={(e) => setClaimedTime(e.target.value)}
                placeholder="e.g. 13:40 - 14:15 WAT"
                className="text-xs h-10 font-mono"
              />
            </div>
          </div>

          {/* Detailed Narrative Reason */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900">
              Operational Failure Narrative <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State exactly why automated GPS or camera capture could not be obtained..."
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue focus:outline-none font-medium text-slate-900"
            />
          </div>

          {/* Picture Evidence Live Camera Capture */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                {isPhotoRequired ? (
                  <>
                    Picture Evidence <span className="text-red-500">*</span>
                  </>
                ) : (
                  'Picture Evidence (Optional for Camera Failure)'
                )}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {isPhotoRequired ? 'Live Camera Required • Max 15 MB' : 'Live Camera Only • Max 15 MB'}
              </span>
            </div>

            {isCameraActive ? (
              <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-4/3 border-2 border-brand-blue shadow-inner flex flex-col items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={switchCamera}
                    className="h-8 px-2.5 text-[11px] font-bold bg-slate-900/80 hover:bg-slate-900 text-white border-slate-700 backdrop-blur-xs flex items-center gap-1.5"
                    title="Switch between front and rear camera"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span>{facingMode === 'environment' ? 'Switch to Front' : 'Switch to Back'}</span>
                  </Button>
                </div>

                <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={stopCamera}
                    className="h-8 px-3 text-[11px] bg-slate-900/80 hover:bg-slate-900 text-slate-200 border-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    id="btn-capture-exception-photo"
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleCaptureCameraPhoto}
                    disabled={isCapturingPhoto}
                    className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isCapturingPhoto ? 'Capturing...' : 'Capture Photo'}</span>
                  </Button>
                </div>
              </div>
            ) : evidencePhotoPreviewUrl && evidencePhotoBlob ? (
              <div className="bg-white p-2.5 rounded-lg border border-emerald-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxPhoto({
                        url: evidencePhotoPreviewUrl,
                        title: `Exception Evidence — ${branchName}`,
                        subtitle: `${evidencePhotoBlob.name || 'evidence_photo.jpg'} (${Math.max(1, Math.round(evidencePhotoBlob.size / 1024))} KB)`,
                      })
                    }
                    aria-label="Preview uploaded exception picture"
                    className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 bg-slate-900 shrink-0 cursor-pointer group"
                  >
                    <img
                      src={evidencePhotoPreviewUrl}
                      alt="Exception Evidence Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </button>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Picture Evidence Attached</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">
                      {evidencePhotoBlob.name || 'exception_photo.jpg'} •{' '}
                      {Math.max(1, Math.round(evidencePhotoBlob.size / 1024))} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startCamera('environment')}
                    className="text-[10px] h-7 px-2 font-semibold text-brand-blue border-brand-blue/30 bg-white"
                  >
                    Retake
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAttachedPhoto}
                    className="text-[10px] h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-3 rounded-lg border border-dashed border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-[11px] text-slate-600">
                  <p className="font-semibold text-slate-900">Attach gate pass, signage or visitor book photo</p>
                  <p className="text-[10px] text-slate-500">
                    {isPhotoRequired
                      ? 'Required: snap a live photo with camera for Country Sales Head review.'
                      : 'Snap a live photo with camera if available for Country Sales Head review.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    id="btn-snap-exception-photo"
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startCamera('environment')}
                    className="text-[11px] h-8 px-3 font-bold border-brand-blue text-brand-blue hover:bg-blue-50 flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Snap Photo</span>
                  </Button>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 flex items-center justify-between gap-2">
                <span>{cameraError}</span>
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="font-bold underline shrink-0"
                >
                  Retry Camera
                </button>
              </div>
            )}

            {evidencePhotoError && (
              <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{evidencePhotoError}</span>
              </p>
            )}
          </div>

          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Manager Audit Dimension Warning */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <p className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Audit Dimension Reminder:
            </p>
            <p className="text-[10px] text-slate-600 leading-tight">
              Approved records become <strong className="text-slate-900">Manager Approved — Location Unverified</strong>. They are never converted into GPS Verified visits, preserving audit integrity.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="p-4 -mx-4 -mb-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="text-xs h-11 px-4 border-slate-300"
            >
              Cancel
            </Button>
            <Button
              id="btn-submit-exception-claim"
              type="submit"
              disabled={isSubmitting || !reason.trim() || (isPhotoRequired && !evidencePhotoBlob)}
              className="text-xs h-11 px-5 font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading &amp; Submitting...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" /> Submit Exception Claim
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <PhotoLightboxModal photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
    </>
  );
};
