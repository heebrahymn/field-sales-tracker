import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketCode } from '@/context/AuthContext';

export interface ExportHistoryRecord {
  id: string;
  reportName: string;
  marketCode: MarketCode | 'ALL';
  marketName: string;
  requestedBy: string;
  timestamp: string;
  status: 'Ready' | 'Processing';
  fileType: string;
  fileSizeBytes: string;
  rowCount: number;
}

const REPORT_TYPES = [
  {
    id: 'attendance_master',
    name: 'Consolidated Attendance & Work Schedule Report',
    desc: 'Daily check-in timestamps, GPS accuracy, front-camera selfie hashes, and approved non-visit days.',
    category: 'Operational Personnel',
  },
  {
    id: 'visit_activity_master',
    name: 'Physical Visit Activity & Verification Audit',
    desc: 'Complete check-in/out logs, 200m geofence outcomes, premises photo metadata, and meeting log narrative.',
    category: 'Field Operations',
  },
  {
    id: 'country_performance_comparison',
    name: 'Tri-Market Country Performance & Coverage Rollup',
    desc: 'Nigeria, Zambia, and Malawi weekly KPI comparisons: unique branches, verified share, offline rates.',
    category: 'Executive Oversight',
  },
  {
    id: 'exceptions_and_disputes',
    name: 'GPS Failures, Device Exceptions & Audit Disputes',
    desc: 'Manager Approved — Location Unverified cases, delay durations, and client phone audit denial records.',
    category: 'Governance & Risk',
  },
  {
    id: 'device_inventory_mdm',
    name: 'Company Handset Fleet & Custody Assignment',
    desc: 'Serial numbers, IMEIs, Knox enrollment telemetry, battery health %, and replacement RMA history.',
    category: 'Hardware & MDM',
  },
  {
    id: 'system_admin_audit',
    name: 'System Administration Audit Ledger',
    desc: 'User role changes, market threshold revisions, client master CSV batches, and export access logs.',
    category: 'Compliance & Audit',
  },
];

const INITIAL_EXPORT_HISTORY: ExportHistoryRecord[] = [
  {
    id: 'EXP-2026-10-881',
    reportName: 'Consolidated Attendance & Work Schedule Report',
    marketCode: 'ALL',
    marketName: 'Tri-Market Regional',
    requestedBy: 'HQ Administrator (HQ Admin)',
    timestamp: '2026-10-19 18:30 WAT',
    status: 'Ready',
    fileType: 'CSV (RFC 4180 / CWE-1236 Escaped)',
    fileSizeBytes: '142 KB',
    rowCount: 640,
  },
  {
    id: 'EXP-2026-10-879',
    reportName: 'Physical Visit Activity & Verification Audit',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    requestedBy: 'HQ Administrator (HQ Admin)',
    timestamp: '2026-10-18 19:15 WAT',
    status: 'Ready',
    fileType: 'CSV (RFC 4180 / CWE-1236 Escaped)',
    fileSizeBytes: '318 KB',
    rowCount: 1420,
  },
  {
    id: 'EXP-2026-10-874',
    reportName: 'Company Handset Fleet & Custody Assignment',
    marketCode: 'ALL',
    marketName: 'Tri-Market Regional',
    requestedBy: 'HQ Administrator (HQ Admin)',
    timestamp: '2026-10-15 14:00 WAT',
    status: 'Ready',
    fileType: 'CSV (RFC 4180 / CWE-1236 Escaped)',
    fileSizeBytes: '28 KB',
    rowCount: 20,
  },
];

export const HqReportingExport: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<string>('visit_activity_master');
  const [selectedMarket, setSelectedMarket] = useState<MarketCode | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<'today' | 'this_week' | 'this_month' | 'quarter'>('this_week');
  const [history, setHistory] = useState<ExportHistoryRecord[]>(INITIAL_EXPORT_HISTORY);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Helper to escape formula injection per CWE-1236
  const escapeCsvCell = (val: string): string => {
    if (!val) return '""';
    const trimmed = String(val);
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      return `"'${trimmed.replace(/"/g, '""')}"`;
    }
    return `"${trimmed.replace(/"/g, '""')}"`;
  };

  const handleGenerateExport = () => {
    setIsExporting(true);
    setDownloadNotice(null);

    const reportDef = REPORT_TYPES.find((r) => r.id === selectedReportId)!;

    setTimeout(() => {
      // Build safe simulated CSV content
      const headers = ['Record_ID', 'Country_Code', 'Timestamp_ISO', 'Entity_Name', 'Status_Classification', 'GPS_Verification_Type', 'Author_Role'];
      const sampleRows = [
        ['REC-001', selectedMarket === 'ALL' ? 'NG' : selectedMarket, '2026-10-19T09:15:00Z', 'Apex Heavy Logistics Ltd', 'Completed', 'Location Verified', 'salesperson'],
        ['REC-002', selectedMarket === 'ALL' ? 'ZM' : selectedMarket, '2026-10-19T10:30:00Z', 'Zambezi Freight Transit', 'Completed', 'Manager Approved - Location Unverified', 'salesperson'],
        ['REC-003', selectedMarket === 'ALL' ? 'MW' : selectedMarket, '2026-10-19T11:45:00Z', 'Nyasa Express Couriers', 'Completed', 'Location Verified', 'salesperson'],
      ];

      const csvContent = [
        headers.map(escapeCsvCell).join(','),
        ...sampleRows.map((row) => row.map(escapeCsvCell).join(',')),
      ].join('\r\n');

      // Trigger client-side file download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedReportId}_${selectedMarket}_${dateRange}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Add to history
      const newHistoryRecord: ExportHistoryRecord = {
        id: `EXP-2026-10-${Math.floor(100 + Math.random() * 900)}`,
        reportName: reportDef.name,
        marketCode: selectedMarket,
        marketName: selectedMarket === 'ALL' ? 'Tri-Market Regional' : selectedMarket === 'NG' ? 'Nigeria (Lagos)' : selectedMarket === 'ZM' ? 'Zambia (Lusaka)' : 'Malawi (Blantyre)',
        requestedBy: 'HQ Administrator (HQ Admin)',
        timestamp: 'Just now (Today)',
        status: 'Ready',
        fileType: 'CSV (RFC 4180 / CWE-1236 Escaped)',
        fileSizeBytes: '42 KB',
        rowCount: 120,
      };

      setHistory([newHistoryRecord, ...history]);
      setIsExporting(false);
      setDownloadNotice(`Generated and downloaded ${reportDef.name} for ${newHistoryRecord.marketName}. All cells sanitized against formula injection.`);
    }, 1000);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Enterprise Reporting & Audited Data Exports
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Sanitized CSV extracts for cross-market executive audits, payroll reconciliation, and operational oversight
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-slate-800 border border-slate-700 px-3 py-1 rounded-md text-slate-200 font-mono font-semibold">
            CWE-1236 Sanitization Active
          </span>
        </div>
      </div>

      {/* SECURITY / SANITIZATION NOTICE */}
      <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-slate-800 text-xs flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <span className="font-bold text-brand-blue">CWE-1236 Formula Injection Defense Standards</span>
          <p className="text-slate-600">
            Per PRD §10, all generated spreadsheet extracts automatically neutralize dynamic execution characters (<code>=</code>, <code>+</code>, <code>-</code>, <code>@</code>, tab, and carriage return) by prepending a single quote before RFC-4180 quotation.
            Reports do <strong>NOT</strong> include commercial sales quotas, quotation monetary values, or pipeline metrics.
          </p>
        </div>
      </div>

      {downloadNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* Export Generation Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Select Report */}
        <Card className="border-slate-200/90 shadow-xs lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100 p-4 sm:p-5">
            <CardTitle className="text-sm font-bold text-slate-900">
              1. Select Standard Operational Report
            </CardTitle>
            <p className="text-[11px] text-slate-500 font-medium">
              Choose from standardized, audited data definitions
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {REPORT_TYPES.map((rep) => {
                const isSelected = selectedReportId === rep.id;
                return (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReportId(rep.id)}
                    className={cn(
                      'p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[110px]',
                      isSelected
                        ? 'border-brand-blue bg-blue-50/60 ring-2 ring-brand-blue/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {rep.category}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-brand-blue shrink-0" />
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs leading-snug">{rep.name}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{rep.desc}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Scope & Download */}
        <Card className="border-slate-200/90 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 p-4 sm:p-5">
            <CardTitle className="text-sm font-bold text-slate-900">
              2. Filter Scope & Generate
            </CardTitle>
            <p className="text-[11px] text-slate-500 font-medium">
              Specify territory and time period
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
            {/* Territory */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
                Regional Market Scope
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { code: 'ALL' as const, label: 'All Markets' },
                  { code: 'NG' as const, label: 'Nigeria' },
                  { code: 'ZM' as const, label: 'Zambia' },
                  { code: 'MW' as const, label: 'Malawi' },
                ].map((m) => (
                  <button
                    key={m.code}
                    onClick={() => setSelectedMarket(m.code)}
                    className={cn(
                      'py-2 px-2.5 rounded-lg font-bold text-xs border text-center transition-all',
                      selectedMarket === m.code
                        ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
                Reporting Timeframe
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'today' as const, label: "Today's Activity" },
                  { id: 'this_week' as const, label: 'Current Week' },
                  { id: 'this_month' as const, label: 'Current Month' },
                  { id: 'quarter' as const, label: 'Quarter to Date' },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDateRange(d.id)}
                    className={cn(
                      'py-2 px-2.5 rounded-lg font-bold text-xs border text-center transition-all',
                      dateRange === d.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleGenerateExport}
                disabled={isExporting}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs py-2.5 shadow-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Escaping & Generating CSV...' : 'Generate & Download CSV'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export History Table */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 p-4 sm:p-5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-blue" />
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Audit Trail & Download History
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Log of requested administrative extractions and compliance runs
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Export ID & Report</th>
                  <th className="py-3 px-3">Market Territory</th>
                  <th className="py-3 px-3">Requested By</th>
                  <th className="py-3 px-3">Rows & Size</th>
                  <th className="py-3 px-3">Format Standard</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-mono font-bold text-brand-blue text-xs">{h.id}</p>
                        <p className="text-[11px] font-semibold text-slate-800">{h.reportName}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{h.marketName}</td>
                    <td className="py-3 px-3 text-slate-600">{h.requestedBy}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {h.rowCount} rows ({h.fileSizeBytes})
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                        {h.fileType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500">
                      {h.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
