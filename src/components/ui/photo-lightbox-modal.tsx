import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface LightboxPhoto {
  url: string;
  title: string;
  subtitle?: string;
}

interface PhotoLightboxModalProps {
  photo: LightboxPhoto | null;
  onClose: () => void;
}

/**
 * Shared full-size photo lightbox modal used across Admin and Country Sales Head
 * review consoles so captured premises photos, selfies, and business cards display uncropped.
 */
export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({ photo, onClose }) => {
  useEffect(() => {
    if (!photo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, onClose]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl overflow-hidden max-w-3xl w-full border border-slate-800 shadow-2xl space-y-2 p-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 px-2 gap-3">
          <div className="font-bold text-xs truncate">{photo.title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close full photo view"
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[80vh] min-h-[200px] overflow-hidden rounded-lg flex items-center justify-center bg-black">
          <img
            src={photo.url}
            alt={photo.title}
            className="max-h-[80vh] max-w-full w-auto h-auto object-contain"
          />
        </div>
        {photo.subtitle && (
          <div className="text-[11px] text-slate-400 text-center pt-1 px-2">
            {photo.subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
