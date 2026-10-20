import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  FileSpreadsheet,
  Download,
  ShieldCheck,
  X,
  CheckCircle2,
} from 'lucide-react';

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
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTriggerCsvDownload = () => {
    // Generate realistic sample audited CSV data
    const headers = [
      'Export Timestamp (UTC)',
      'Market',
      'Visit ID',
      'Salesperson ID',
      'Salesperson Name',
      'Client Company',
      'Branch Code',
      'Branch Address',
      'Visit Date',
      'Check-In Time (WAT)',
      'Check-Out Time (WAT)',
      'Duration (Mins)',
      'Verification Status',
      'Geofence Distance (Meters)',
      'GPS Accuracy (Meters)',
      'Meeting Log Status',
      'Contact Person Met',
      'Contact Role',
      'Products Discussed',
      'Next Steps (Free Text Narrative)',
      'Client Audit Result',
      'Provisional Data Marker',
    ];

    const mockRows = [
      [
        new Date().toISOString(),
        marketName,
        'VIS-LAG-901',
        'CC-REP-042',
        'Tunde Adebayo',
        'Apex Commercial Transit Ltd',
        'BR-LAG-108',
        'Ibeju-Lekki Hub, Lagos',
        '2026-10-19',
        '09:15',
        '09:58',
        '43',
        'Location Verified',
        '42',
        '18',
        'Complete',
        'Engr. Babatunde Jinadu',
        'Fleet Maintenance Director',
        'Heavy Duty Coolant 20L, Fleet Degreaser',
        'Send spec sheets by Tuesday for two test Volvo FH16 trucks',
        'Client Confirmed',
        'Provisional (Subject to next-day 19:00 reconciliation)',
      ],
      [
        new Date().toISOString(),
        marketName,
        'VIS-LAG-902',
        'CC-REP-038',
        'Chinyere Nwosu',
        'Equatorial Energy Hubs',
        'BR-LAG-002',
        'Apapa Marine Terminal, Lagos',
        '2026-10-19',
        '11:20',
        '12:05',
        '45',
        'Location Verified',
        '65',
        '14',
        'Complete',
        'Mrs. Chinyere Nwosu',
        'Safety & Environmental Officer',
        'Spill Containment Booms, Absorbent Pads',
        'Send environmental compliance sheet to depot director',
        'Not Sampled',
        'Provisional',
      ],
      [
        new Date().toISOString(),
        marketName,
        'VIS-LAG-903',
        'CC-REP-039',
        'Emeka Nwosu',
        'Titan Engineering Works Ltd',
        'BR-LAG-055',
        'Heavy Haulage Yard, Ibeju-Lekki',
        '2026-10-19',
        '11:15',
        '11:55',
        '40',
        'Manager Approved — Location Unverified',
        '0',
        '0',
        'Late Submitted (Delayed by phone power loss)',
        'Mr. Jude Okafor',
        'Logistics Procurement Lead',
        'Brake Fluid DOT 4, Industrial Gear Oil ISO 220',
        'Meet workshop lead to test lubricant sample on haulage axle',
        'Not Sampled',
        'Provisional (Exception Approved Without GPS)',
      ],
      [
        new Date().toISOString(),
        marketName,
        'VIS-LAG-904',
        'CC-REP-044',
        'Ibrahim Sani',
        'Zenith Logistics Express',
        'BR-LAG-019',
        'Tin Can Island Container Terminal',
        '2026-10-19',
        '14:10',
        '14:48',
        '38',
        'Location Verified',
        '185',
        '35',
        'Missing (>2h SLA)',
        'Pending Rep Entry',
        'Pending',
        'None Recorded',
        'None Recorded',
        'Pending Audit Call',
        'Provisional',
      ],
    ];

    // Build sanitised CSV string with formula injection prevention
    const csvContent = [
      headers.map((h) => sanitizeCsvCell(h)).join(','),
      ...mockRows.map((row) => row.map((cell) => sanitizeCsvCell(cell)).join(',')),
    ].join('\r\n');

    // Trigger browser download via Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `carbon_field_activity_${marketName.toLowerCase().replace(/\s+/g, '_')}_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => {
      setExportSuccess(false);
      onClose();
    }, 1800);
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
          {exportSuccess ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
              <h4 className="text-sm font-bold text-slate-900">CSV Export Generated &amp; Downloaded!</h4>
              <p className="text-xs text-slate-600 font-medium">
                Sanitised CSV file with formula injection mitigation has been saved to your downloads.
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
            <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              className="text-xs font-bold bg-brand-green-700 hover:bg-brand-green-800 text-white flex items-center gap-1.5"
              onClick={handleTriggerCsvDownload}
            >
              <Download className="w-3.5 h-3.5" />
              Download Sanitised CSV
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
