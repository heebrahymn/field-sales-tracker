import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  FileSpreadsheet,
  Download,
  ShieldCheck,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { managementService } from '@/services/managementService';

interface CountryCsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketName: string;
  defaultRep?: string;
  defaultDateRange?: 'today' | 'current_week' | 'quarter_to_date' | 'custom';
}

/**
 * Escapes CSV cell values against CSV / Formula Injection (CWE-1236).
 * Prepends a single quote (') if the value starts with '=', '+', '-', '@', tab, or carriage return.
 */
export function sanitizeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  let str = String(value);

  // Check for formula injection triggers
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  // Escape inner quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export const CountryCsvExportModal: React.FC<CountryCsvExportModalProps> = ({
  isOpen,
  onClose,
  marketName,
  defaultRep = 'all',
  defaultDateRange = 'current_week',
}) => {
  const [dateRange, setDateRange] = useState<'today' | 'current_week' | 'quarter_to_date' | 'custom'>(defaultDateRange);
  const [selectedRep, setSelectedRep] = useState<string>(defaultRep);
  const [includeUnverifiedExceptions, setIncludeUnverifiedExceptions] = useState(true);
  const [includeProvisionalWarning, setIncludeProvisionalWarning] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedRowCount, setExportedRowCount] = useState<number>(0);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  // Resolve marketCode from marketName
  const resolveMarketCode = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('nigeria') || lower.includes('lagos') || lower.includes('ng')) return 'NG';
    if (lower.includes('zambia') || lower.includes('lusaka') || lower.includes('zm')) return 'ZM';
    if (lower.includes('malawi') || lower.includes('blantyre') || lower.includes('mw')) return 'MW';
    return 'ALL';
  };

  const handleTriggerCsvDownload = async () => {
    setIsExporting(true);
    setExportError(null);

    const marketCode = resolveMarketCode(marketName);
    const { rowCount, error } = await managementService.exportCountryVisitsCsv({
      marketCode,
      repId: selectedRep,
    });

    setIsExporting(false);

    if (error) {
      setExportError(error.message);
      return;
    }

    setExportedRowCount(rowCount);
    setExportSuccess(true);
    setTimeout(() => {
      setExportSuccess(false);
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Audited Country CSV Export</h3>
              <p className="text-xs text-slate-500">Market: {marketName} • Safe Formula Escaping Active</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {exportError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-[11px] space-y-0.5">
                <span className="font-bold block">CSV Export Failed:</span>
                <p>{exportError}</p>
              </div>
            </div>
          )}

          {exportSuccess ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
              <h4 className="text-sm font-bold text-slate-900">CSV Export Generated &amp; Downloaded!</h4>
              <p className="text-xs text-slate-600 font-medium">
                {exportedRowCount} visit records with CWE-1236 formula sanitisation saved to download. Export logged in audit ledger.
              </p>
            </div>
          ) : (
            <>
              {/* Security Warning Notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-slate-700 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div className="text-[11px] space-y-0.5">
                  <span className="font-bold text-slate-900 block">Formula Injection Security Standard:</span>
                  <p>
                    All values beginning with <code>=</code>, <code>+</code>, <code>-</code>, <code>@</code>, or tab characters are escaped with leading single quotes to prevent CSV execution attacks in spreadsheet software.
                  </p>
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">Export Period / Scope:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDateRange('today')}
                    className={`p-2.5 rounded-lg text-xs font-bold border transition-colors ${
                      dateRange === 'today'
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Today (Provisional)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateRange('current_week')}
                    className={`p-2.5 rounded-lg text-xs font-bold border transition-colors ${
                      dateRange === 'current_week'
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Current Workweek
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateRange('quarter_to_date')}
                    className={`p-2.5 rounded-lg text-xs font-bold border transition-colors ${
                      dateRange === 'quarter_to_date'
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Quarter-to-Date (Q4 2026)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateRange('custom')}
                    className={`p-2.5 rounded-lg text-xs font-bold border transition-colors ${
                      dateRange === 'custom'
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Custom Date Range
                  </button>
                </div>
              </div>

              {/* Salesperson Filter */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">Filter Sales Reps:</label>
                <select
                  value={selectedRep}
                  onChange={(e) => setSelectedRep(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="all">All Country Sales Reps ({marketName})</option>
                  <option value="CC-REP-042">Tunde Adebayo (Lagos Island / Lekki)</option>
                  <option value="CC-REP-038">Chinyere Nwosu (Apapa Port)</option>
                  <option value="CC-REP-039">Emeka Nwosu (Ibeju-Lekki Hub)</option>
                  <option value="CC-REP-044">Ibrahim Sani (Kano North Depot)</option>
                </select>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeUnverifiedExceptions}
                    onChange={(e) => setIncludeUnverifiedExceptions(e.target.checked)}
                    className="rounded text-brand-blue"
                  />
                  <span>Include Manager Approved — Location Unverified records as distinct rows</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeProvisionalWarning}
                    onChange={(e) => setIncludeProvisionalWarning(e.target.checked)}
                    className="rounded text-brand-blue"
                  />
                  <span>Attach provisional disclaimer column for unresolved daily sync events</span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!exportSuccess && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={isExporting}
              className="text-xs font-bold bg-brand-green-700 hover:bg-brand-green-800 text-white flex items-center gap-1.5"
              onClick={handleTriggerCsvDownload}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating CSV...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Download Sanitised CSV
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
