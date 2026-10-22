import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Check,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketCode } from '@/context/AuthContext';

export interface CsvClientRow {
  rowIndex: number;
  companyName: string;
  branchName: string;
  category: string;
  address: string;
  contactPerson: string;
  contactRole: string;
  telephone: string;
  latitude?: number;
  longitude?: number;
  status: 'valid' | 'warning_location_pending' | 'warning_shared_phone' | 'error';
  validationMessage: string;
}

export interface ImportBatchSummary {
  batchId: string;
  marketCode: MarketCode;
  marketName: string;
  filename: string;
  importedBy: string;
  timestamp: string;
  totalRows: number;
  approvedPins: number;
  locationPending: number;
  status: 'Validated & Merged' | 'Requires Branch Pin Verification';
}

const SAMPLE_CSV_DATA_NIGERIA: CsvClientRow[] = [
  {
    rowIndex: 1,
    companyName: 'Apex Heavy Logistics Ltd',
    branchName: 'Apapa Port Terminal Hub',
    category: 'Haulage & Logistics',
    address: 'Wharf Road, Apapa Port Gate 2, Lagos',
    contactPerson: 'Capt. Ibrahim Danjuma',
    contactRole: 'Fleet Director',
    telephone: '+234 1 270 5000',
    latitude: 6.4474,
    longitude: 3.3591,
    status: 'valid',
    validationMessage: 'Valid record with GPS coordinates (verified within 50m accuracy)',
  },
  {
    rowIndex: 2,
    companyName: 'Apex Heavy Logistics Ltd',
    branchName: 'Ikeja Freight Depot',
    category: 'Haulage & Logistics',
    address: 'Plot 12 Commercial Avenue, Ikeja, Lagos',
    contactPerson: 'Folake Adeleke',
    contactRole: 'Depot Operations Manager',
    telephone: '+234 1 270 5000', // SAME TELEPHONE AS ROW 1 - PRD §4.2 Rule!
    latitude: 6.5982,
    longitude: 3.3541,
    status: 'warning_shared_phone',
    validationMessage: 'PRD §4.2 Compliant: Shares switchboard telephone with Apapa branch. Allowed.',
  },
  {
    rowIndex: 3,
    companyName: 'Lekki Transit Commercial Fleets',
    branchName: 'Admiralty Way Express Hub',
    category: 'Transit & Fleet',
    address: 'Admiralty Way, Lekki Phase 1, Lagos',
    contactPerson: 'Emeka Nwachukwu',
    contactRole: 'Maintenance Superintendent',
    telephone: '+234 803 445 6677',
    latitude: undefined, // MISSING GPS
    longitude: undefined, // MISSING GPS
    status: 'warning_location_pending',
    validationMessage: 'Location Pending: Missing GPS pin. Rep must propose physical pin during first visit.',
  },
  {
    rowIndex: 4,
    companyName: 'Bua Haulage & Cement Logistics',
    branchName: 'Epe Transit Weighbridge',
    category: 'Mining & Heavy Transport',
    address: 'Kilometre 42 Lekki-Epe Expressway',
    contactPerson: 'Alhaji Musa Bello',
    contactRole: 'Dispatch Supervisor',
    telephone: '+234 809 332 1100',
    latitude: 6.5841,
    longitude: 3.9832,
    status: 'valid',
    validationMessage: 'Valid record with verified coordinates.',
  },
  {
    rowIndex: 5,
    companyName: 'Dangote Industrial Transport',
    branchName: '', // MISSING REQUIRED BRANCH NAME
    category: 'Manufacturing & Fleet',
    address: 'Victoria Island, Lagos',
    contactPerson: 'Kazeem Oladipo',
    contactRole: 'Fleet General Manager',
    telephone: '+234 1 448 8800',
    latitude: 6.4281,
    longitude: 3.4219,
    status: 'error',
    validationMessage: 'Fatal Error: Missing mandatory Branch Name. Record cannot be imported.',
  },
];

const INITIAL_BATCHES: ImportBatchSummary[] = [
  {
    batchId: 'IMP-2026-10-NG-01',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    filename: 'apex_logistics_oct_batch.csv',
    importedBy: 'Ayodele Ibraheem (HQ Admin)',
    timestamp: '2026-10-12 11:24',
    totalRows: 412,
    approvedPins: 388,
    locationPending: 24,
    status: 'Validated & Merged',
  },
  {
    batchId: 'IMP-2026-09-ZM-02',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka Hub)',
    filename: 'equatorial_energy_network.csv',
    importedBy: 'Ayodele Ibraheem (HQ Admin)',
    timestamp: '2026-09-28 14:10',
    totalRows: 148,
    approvedPins: 130,
    locationPending: 18,
    status: 'Validated & Merged',
  },
  {
    batchId: 'IMP-2026-09-MW-01',
    marketCode: 'MW',
    marketName: 'Malawi (Blantyre Hub)',
    filename: 'blantyre_sugar_transit.csv',
    importedBy: 'Ayodele Ibraheem (HQ Admin)',
    timestamp: '2026-09-15 09:45',
    totalRows: 76,
    approvedPins: 64,
    locationPending: 12,
    status: 'Validated & Merged',
  },
];

export const HqClientMasterImport: React.FC = () => {
  const [selectedMarket, setSelectedMarket] = useState<MarketCode>('NG');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvClientRow[]>([]);
  const [batches, setBatches] = useState<ImportBatchSummary[]>(INITIAL_BATCHES);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Load Demonstration Sample CSV
  const handleLoadSampleData = () => {
    setFileName(`carbon_b2b_client_master_${selectedMarket.toLowerCase()}_sample.csv`);
    setParsedRows(SAMPLE_CSV_DATA_NIGERIA);
    setStep(2);
  };

  // Execute Simulated Import
  const handleCommitImport = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const validAndWarningRows = parsedRows.filter((r) => r.status !== 'error');
      const approvedWithPins = validAndWarningRows.filter((r) => r.latitude !== undefined).length;
      const locationPendingCount = validAndWarningRows.filter((r) => r.latitude === undefined).length;

      const newBatch: ImportBatchSummary = {
        batchId: `IMP-2026-10-${selectedMarket}-0${batches.length + 1}`,
        marketCode: selectedMarket,
        marketName:
          selectedMarket === 'NG'
            ? 'Nigeria (Lagos Hub)'
            : selectedMarket === 'ZM'
            ? 'Zambia (Lusaka Hub)'
            : 'Malawi (Blantyre Hub)',
        filename: fileName || 'client_import.csv',
        importedBy: 'Ayodele Ibraheem (HQ Admin)',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        totalRows: validAndWarningRows.length,
        approvedPins: approvedWithPins,
        locationPending: locationPendingCount,
        status: locationPendingCount > 0 ? 'Requires Branch Pin Verification' : 'Validated & Merged',
      };

      setBatches([newBatch, ...batches]);
      setIsProcessing(false);
      setStep(4);
      setImportSuccess(
        `Successfully merged ${validAndWarningRows.length} clients into ${newBatch.marketName}. ${locationPendingCount} records flagged as Location Pending awaiting field pin proposal.`
      );
    }, 1200);
  };

  const handleReset = () => {
    setStep(1);
    setFileName(null);
    setParsedRows([]);
    setImportSuccess(null);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Client Master Batch Import & Geocode Ingestion
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Standardised CSV pipeline for bulk onboarding commercial fleets, transport depots, and dealerships
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-slate-800 border border-slate-700 px-3 py-1 rounded-md text-slate-200 font-mono font-semibold">
            RFC 4180 CSV Compliant
          </span>
        </div>
      </div>

      {/* PRD MANDATORY VALIDATION RULES BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <span className="font-bold text-emerald-900">PRD §4.2 Rule: Shared Corporate Telephones Permitted</span>
            <p className="text-emerald-800">
              Multiple physical locations belonging to the same parent organization sharing a switchboard phone number are <strong>explicitly allowed</strong>.
              The parser never automatically rejects valid locations for sharing phone credentials.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-slate-800 text-xs flex items-start gap-3">
          <MapPin className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <span className="font-bold text-brand-blue">Missing Coordinates $\to$ "Location Pending" Status</span>
            <p className="text-slate-600">
              Clients imported without GPS coordinates are assigned status <strong>Location Pending</strong>.
              They can be scheduled for visits, but cannot count as <em>Location Verified</em> until a salesperson proposes physical GPS coordinates and the Sales Head approves the pin.
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Step Wizard Card */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Step-by-Step Master Import Pipeline
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Step {step} of 4: {step === 1 ? 'Target Market & File Selection' : step === 2 ? 'Raw Row Preview' : step === 3 ? 'Validation Audit' : 'Import Complete'}
              </p>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all',
                    step === s
                      ? 'bg-brand-blue text-white shadow-xs'
                      : step > s
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-6">
          {/* STEP 1: SELECT COUNTRY & UPLOAD */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Select Target Country */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Select Target Operating Country
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { code: 'NG' as MarketCode, name: 'Nigeria', hub: 'Lagos Hub (West Africa)' },
                    { code: 'ZM' as MarketCode, name: 'Zambia', hub: 'Lusaka Hub (Central/Southern)' },
                    { code: 'MW' as MarketCode, name: 'Malawi', hub: 'Blantyre Hub (East/Southern)' },
                  ].map((m) => (
                    <button
                      key={m.code}
                      onClick={() => setSelectedMarket(m.code)}
                      className={cn(
                        'p-3.5 rounded-xl border text-left transition-all',
                        selectedMarket === m.code
                          ? 'border-brand-blue bg-blue-50/50 ring-2 ring-brand-blue/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 text-xs">{m.name}</span>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                          {m.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{m.hub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. Select CSV File (B2B Client Master)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-brand-blue flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Upload B2B Accounts Spreadsheet</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Accepts standard RFC-4180 CSV files with company, branch, contact, and GPS fields
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                    <Button
                      onClick={handleLoadSampleData}
                      className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold h-8 shadow-xs"
                    >
                      Load Fictional B2B Sample CSV ({selectedMarket})
                    </Button>
                    <span className="text-xs text-slate-400 font-medium">or drop file here</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW RAW ROWS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs">
                  <FileSpreadsheet className="w-4 h-4 text-brand-blue" />
                  <span className="font-bold text-slate-900">{fileName}</span>
                  <span className="text-slate-500 font-mono">({parsedRows.length} rows detected)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleReset}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-600 h-7"
                  >
                    Change File
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    size="sm"
                    className="text-xs bg-brand-blue hover:bg-blue-700 text-white font-semibold h-7"
                  >
                    Validate Rows <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Rows Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Company Name</th>
                        <th className="py-2.5 px-3">Branch Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Contact Person</th>
                        <th className="py-2.5 px-3">Telephone</th>
                        <th className="py-2.5 px-3">Coordinates (Lat, Lng)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((r) => (
                        <tr key={r.rowIndex} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{r.rowIndex}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{r.companyName}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {r.branchName || <span className="text-rose-500 font-bold">[Missing]</span>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{r.category}</td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {r.contactPerson} <span className="text-slate-400">({r.contactRole})</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{r.telephone}</td>
                          <td className="py-2.5 px-3 font-mono">
                            {r.latitude ? (
                              <span className="text-emerald-700 font-semibold">
                                {r.latitude}, {r.longitude}
                              </span>
                            ) : (
                              <span className="text-amber-700 italic font-medium">None (Pending)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: VALIDATION AUDIT */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Total Rows</p>
                  <p className="text-xl font-black text-slate-900">{parsedRows.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">Valid & Geocoded</p>
                  <p className="text-xl font-black text-emerald-800">
                    {parsedRows.filter((r) => r.status === 'valid').length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-[10px] font-bold text-brand-blue uppercase">PRD Compliant / Pending</p>
                  <p className="text-xl font-black text-brand-blue">
                    {parsedRows.filter((r) => r.status === 'warning_location_pending' || r.status === 'warning_shared_phone').length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <p className="text-[10px] font-bold text-rose-800 uppercase">Fatal Errors</p>
                  <p className="text-xl font-black text-rose-800">
                    {parsedRows.filter((r) => r.status === 'error').length}
                  </p>
                </div>
              </div>

              {/* Row-by-Row Audit */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Validation Log & Policy Checks
                </h4>
                <div className="space-y-2">
                  {parsedRows.map((r) => (
                    <div
                      key={r.rowIndex}
                      className={cn(
                        'p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2',
                        r.status === 'valid'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : r.status === 'warning_shared_phone'
                          ? 'bg-blue-50/50 border-blue-200'
                          : r.status === 'warning_location_pending'
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-rose-50/50 border-rose-200'
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400">Row {r.rowIndex}:</span>
                          <span className="font-bold text-slate-900">{r.companyName}</span>
                          <span className="text-slate-600 font-medium">— {r.branchName || '[Missing Name]'}</span>
                        </div>
                        <p
                          className={cn(
                            'text-[11px] font-medium',
                            r.status === 'valid'
                              ? 'text-emerald-800'
                              : r.status === 'warning_shared_phone'
                              ? 'text-brand-blue'
                              : r.status === 'warning_location_pending'
                              ? 'text-amber-800'
                              : 'text-rose-800'
                          )}
                        >
                          {r.validationMessage}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {r.status === 'valid' && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">
                            Valid
                          </span>
                        )}
                        {r.status === 'warning_shared_phone' && (
                          <span className="text-[10px] font-bold text-brand-blue bg-blue-100/70 px-2 py-0.5 rounded border border-blue-300">
                            Shared Phone Allowed
                          </span>
                        )}
                        {r.status === 'warning_location_pending' && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300">
                            Location Pending
                          </span>
                        )}
                        {r.status === 'error' && (
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-100/70 px-2 py-0.5 rounded border border-rose-300">
                            Excluded (Fatal)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Back to Preview
                </Button>

                <Button
                  onClick={handleCommitImport}
                  disabled={isProcessing}
                  size="sm"
                  className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  {isProcessing ? 'Merging Records...' : 'Confirm & Commit Batch Import'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS SUMMARY */}
          {step === 4 && (
            <div className="space-y-4 text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Client Master Ingestion Complete</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                  {importSuccess}
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleReset}
                  size="sm"
                  className="bg-slate-900 hover:bg-black text-white text-xs font-semibold"
                >
                  Upload Another CSV File
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Batch Imports Table */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 p-4 sm:p-5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-blue" />
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Historical Master Import Batches
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Immutable audit trail of customer data merged across operating markets
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Batch ID & Source</th>
                  <th className="py-3 px-3">Market</th>
                  <th className="py-3 px-3">Operator</th>
                  <th className="py-3 px-3">Total Branches</th>
                  <th className="py-3 px-3">Pin Status Breakdown</th>
                  <th className="py-3 px-3">Import Status</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.batchId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-mono font-bold text-brand-blue text-xs">{b.batchId}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{b.filename}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{b.marketName}</td>
                    <td className="py-3 px-3 text-slate-600">{b.importedBy}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{b.totalRows} branches</td>
                    <td className="py-3 px-3">
                      <div className="space-y-0.5 text-[11px]">
                        <span className="text-emerald-700 font-medium">✓ {b.approvedPins} Pins Active</span>
                        {b.locationPending > 0 && (
                          <p className="text-amber-700 font-medium">• {b.locationPending} Location Pending</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500">
                      {b.timestamp}
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
