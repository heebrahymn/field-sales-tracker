import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateExceptionModal } from '@/features/field/CreateExceptionModal';
import { ApprovalDecisionModal, ApprovalItem } from '@/features/review/ApprovalDecisionModal';
import { SalesHeadDashboardPreview } from '@/features/review/SalesHeadDashboardPreview';
import { ExceptionReviewWorkbench } from '@/features/review/ExceptionReviewWorkbench';
import { HqExceptionOversight } from '@/features/admin/HqExceptionOversight';
import { FieldSessionContext, FieldSessionProvider } from '@/context/FieldSessionContext';
import { AuthContext } from '@/context/AuthContext';
import { MarketConfigContext } from '@/context/MarketConfigContext';
import { managementService } from '@/services/managementService';
import { visitService } from '@/services/visitService';
import { attendanceService, formatExceptionSubmissionLag, buildClaimedVisitTimestampIso } from '@/services/attendanceService';
import { supabase } from '@/lib/supabase';

describe('Exception Picture Evidence & New Client Approval Delay Label', () => {
  const mockRepUser = {
    id: 'rep-101',
    name: 'Tunde Adebayo',
    role: 'salesperson',
    marketCode: 'NG',
    marketName: 'Nigeria (Africa/Lagos)',
    deviceLabel: 'Samsung Galaxy A15',
  };

  const mockSalesHead = {
    id: 'sh-101',
    name: 'Babajide Adeleke',
    role: 'country_sales_head',
    marketCode: 'NG',
    marketName: 'Nigeria (Africa/Lagos)',
  };

  const mockBranches = [
    {
      id: 'branch-001',
      organisationId: 'org-001',
      organisationName: 'Inner Ring Engineering',
      branchName: '19 Ademola Hopewell',
      address: 'Victoria Island, Lagos',
      status: 'approved',
      pinStatus: 'approved',
      marketCode: 'NG',
    },
  ];

  const mockMarketConfig: any = {
    getActiveMarketRules: () => ({
      defaultGeofenceRadiusMeters: 200,
      maxGpsAccuracyMeters: 100,
      maxProposedPinGpsAccuracyMeters: 50,
      minVisitDurationMinutes: 5,
    }),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
    } else {
      vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:mock-preview-url');
    }
    if (!globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL = vi.fn();
    }
  });

  it('CreateExceptionModal replaces 3rd option with New Client Approval Delay and attaches picture evidence to submitException', async () => {
    const submitExceptionMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    const { container } = render(
      <AuthContext.Provider value={{ currentUser: mockRepUser as any, isAuthenticated: true } as any}>
        <FieldSessionContext.Provider
          value={{
            branches: mockBranches as any,
            submitException: submitExceptionMock,
          } as any}
        >
          <CreateExceptionModal isOpen={true} onClose={onCloseMock} />
        </FieldSessionContext.Provider>
      </AuthContext.Provider>
    );

    const categorySelect = screen.getAllByRole('combobox')[0];
    expect(screen.queryByText(/Device Depletion \/ Post-Recovery Submission/i)).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'New Client Approval Delay' })).toBeInTheDocument();

    fireEvent.change(categorySelect, { target: { value: 'device_breakdown' } });
    expect((categorySelect as HTMLSelectElement).value).toBe('device_breakdown');

    // Attach picture evidence via file upload input
    expect(screen.queryByText(/Supporting Evidence Available/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Picture Evidence \(Optional\)/i)).toBeInTheDocument();
    const uploadInput = container.querySelector('#exception-evidence-file-input') as HTMLInputElement;
    expect(uploadInput).toBeTruthy();
    const mockFile = new File(['mock-image-bytes'], 'client-gate-evidence.jpg', { type: 'image/jpeg' });
    fireEvent.change(uploadInput, { target: { files: [mockFile] } });

    // Thumbnail preview renders and opens full-view lightbox on click
    const thumbImg = await screen.findByAltText('Exception Evidence Preview');
    expect(thumbImg).toHaveAttribute('src', 'blob:mock-preview-url');
    fireEvent.click(thumbImg);
    expect(await screen.findByRole('dialog', { name: /Exception Evidence — 19 Ademola Hopewell/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Close full photo view/i }));

    // Fill required fields and submit
    const submitBtn = screen.getByRole('button', { name: /Submit Exception Claim/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitExceptionMock).toHaveBeenCalledTimes(1);
    });

    const submittedArg = submitExceptionMock.mock.calls[0][0];
    expect(submittedArg.type).toBe('device_breakdown');
    expect(submittedArg.title).toBe('New Client Approval Delay');
    expect(submittedArg.evidencePhotoBlob).toBe(mockFile);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('FieldSessionContext.submitException uploads evidence photo to exception-evidence bucket and passes supportingEvidenceUrl', async () => {
    const uploadSpy = vi
      .spyOn(visitService, 'uploadExceptionEvidencePhoto')
      .mockResolvedValue({ storagePath: 'rep-101/exc_evidence_123.jpg', error: null });
    const submitRpcSpy = vi
      .spyOn(visitService, 'submitSalespersonException')
      .mockResolvedValue({ data: 'exc-real-001', error: null } as any);

    let capturedSubmit: any;
    const Harness = () => {
      const ctx = React.useContext(FieldSessionContext);
      capturedSubmit = ctx?.submitException;
      return null;
    };

    render(
      <AuthContext.Provider value={{ currentUser: mockRepUser as any, isAuthenticated: true } as any}>
        <FieldSessionProvider>
          <Harness />
        </FieldSessionProvider>
      </AuthContext.Provider>
    );

    const mockBlob = new Blob(['photo'], { type: 'image/jpeg' });
    await waitFor(() => expect(capturedSubmit).toBeDefined());

    await capturedSubmit({
      branchId: 'branch-001',
      branchName: '19 Ademola Hopewell',
      type: 'device_breakdown',
      title: 'New Client Approval Delay',
      claimedDate: '2026-11-18',
      claimedTime: '14:15',
      narrative: 'Client approval pending HQ clearance.',
      evidenceSummary: 'Gate pass photo',
      evidencePhotoBlob: mockBlob,
    });

    expect(uploadSpy).toHaveBeenCalledWith('rep-101', expect.any(String), mockBlob);
    expect(submitRpcSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        exceptionType: 'device_depletion',
        claimedVisitTime: '2026-11-18T13:15:00.000Z',
        supportingEvidenceUrl: 'rep-101/exc_evidence_123.jpg',
      })
    );
    expect(buildClaimedVisitTimestampIso('2026-11-18', '14:15', 'ZM')).toBe('2026-11-18T12:15:00.000Z');
    expect(formatExceptionSubmissionLag('2026-11-18T14:38:00Z', '2026-11-18T14:40:00Z')).toBe('Immediate (<5 mins)');
    expect(formatExceptionSubmissionLag('2026-11-18T14:38:00Z', '2026-11-18T16:53:00Z')).toBe('2h 15m after claimed time');
  });

  it('visitService.uploadExceptionEvidencePhoto uploads to private exception-evidence bucket', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(supabase.storage, 'from').mockReturnValue({ upload: mockUpload } as any);

    const blob = new Blob(['test'], { type: 'image/png' });
    const res = await visitService.uploadExceptionEvidencePhoto('user-abc', 'exc-xyz', blob);

    expect(supabase.storage.from).toHaveBeenCalledWith('exception-evidence');
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-abc\/exc-xyz_evidence_\d+\.png$/),
      blob,
      expect.objectContaining({ contentType: 'image/png', upsert: false })
    );
    expect(res.storagePath).toMatch(/^user-abc\/exc-xyz_evidence_\d+\.png$/);
    expect(res.error).toBeNull();
  });

  it('ApprovalDecisionModal signs exception picture evidence from exception-evidence bucket and opens lightbox', async () => {
    vi.spyOn(managementService, 'getExceptionEvidenceSignedUrl').mockResolvedValue(
      'https://cdn.example.com/signed-exception-evidence.jpg'
    );

    const exceptionItem: ApprovalItem = {
      id: 'exc-001',
      type: 'exception_approval',
      title: '19 Ademola Hopewell (New Client Approval Delay)',
      subtitle: 'Inner Ring Engineering',
      repName: 'Tunde Adebayo',
      claimedTime: '18/11/2026, 14:15:00',
      accuracy: '±135m (Location Unverified)',
      evidenceNote: 'Client approval delay while pin pending.',
      premisesPhotoUrl: 'rep-101/exc_evidence.jpg',
    };

    render(
      <ApprovalDecisionModal
        item={exceptionItem}
        isOpen={true}
        onClose={vi.fn()}
        onDecision={vi.fn()}
      />
    );

    expect(await screen.findByText('Supporting Picture Evidence')).toBeInTheDocument();
    expect(screen.getByText('Picture Evidence Attached')).toBeInTheDocument();

    const thumbBtn = await screen.findByRole('button', { name: /View full premises photograph/i });
    fireEvent.click(thumbBtn);

    const lightbox = await screen.findByRole('dialog', {
      name: '19 Ademola Hopewell (New Client Approval Delay)',
    });
    expect(lightbox.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/signed-exception-evidence.jpg'
    );
    expect(lightbox.querySelector('img')).toHaveClass('object-contain');
  });

  it('SalesHeadDashboardPreview shows New Client Approval Delay badge and View Picture Evidence lightbox button', async () => {
    vi.spyOn(managementService, 'getCountryVisits').mockResolvedValue({ data: [], error: null });
    vi.spyOn(managementService, 'getCountryPendingPins').mockResolvedValue([]);
    vi.spyOn(managementService, 'getCountryVerificationFlags').mockResolvedValue({ data: [], error: null });
    vi.spyOn(managementService, 'getMarketSalespeople').mockResolvedValue([]);
    vi.spyOn(attendanceService, 'getMarketAttendance').mockResolvedValue({ data: [], error: null });
    vi.spyOn(attendanceService, 'getPendingNonVisitRequests').mockResolvedValue({ data: [], error: null });
    vi.spyOn(managementService, 'getCountryExceptions').mockResolvedValue({
      data: [
        {
          id: 'exc-dash-1234',
          userId: 'rep-101',
          repName: 'Fasakin Peter',
          repEmail: 'fasakin.peter@carboncarcare.com',
          visitId: null,
          branchId: 'branch-001',
          branchName: '19 Ademola Hopewell',
          organisationName: 'Chartered Institute of Bankers',
          marketCode: 'NG',
          exceptionType: 'device_depletion',
          claimedCheckInTime: '2026-11-18T14:36:00Z',
          claimedDurationMinutes: 30,
          failureReason: 'Awaiting pin approval confirmation at client premises.',
          supportingEvidenceUrl: 'rep-101/dash_evidence.jpg',
          status: 'pending_review',
          submittedAt: '2026-11-18T14:40:00Z',
        },
      ],
      error: null,
    });
    vi.spyOn(managementService, 'getExceptionEvidenceSignedUrl').mockResolvedValue(
      'https://cdn.example.com/dash-exception-photo.jpg'
    );

    render(
      <MarketConfigContext.Provider value={mockMarketConfig}>
        <AuthContext.Provider value={{ currentUser: mockSalesHead as any, isAuthenticated: true } as any}>
          <FieldSessionContext.Provider value={{ pendingSyncCount: 0 } as any}>
            <SalesHeadDashboardPreview />
          </FieldSessionContext.Provider>
        </AuthContext.Provider>
      </MarketConfigContext.Provider>
    );

    expect(await screen.findByText('New Client Approval Delay')).toBeInTheDocument();
    const viewPhotoBtn = await screen.findByRole('button', { name: /View Picture Evidence/i });
    fireEvent.click(viewPhotoBtn);

    const dialog = await screen.findByRole('dialog', {
      name: /19 Ademola Hopewell • Picture Evidence/i,
    });
    expect(dialog.querySelector('img')).toHaveAttribute('src', 'https://cdn.example.com/dash-exception-photo.jpg');
    expect(dialog.querySelector('img')).toHaveClass('object-contain');
  });

  it('ExceptionReviewWorkbench displays New Client Approval Delay badge and full-photo lightbox for attached evidence', async () => {
    vi.spyOn(managementService, 'getExceptionEvidenceSignedUrl').mockResolvedValue(
      'https://cdn.example.com/workbench-evidence.jpg'
    );

    render(
      <AuthContext.Provider value={{ currentUser: mockSalesHead as any, isAuthenticated: true } as any}>
        <FieldSessionContext.Provider value={{} as any}>
          <ExceptionReviewWorkbench
            initialExceptions={[
              {
                id: 'exc-wb-1',
                userId: 'rep-101',
                repName: 'Ganiyu Olorunoje',
                repEmail: 'ganiyu.olorunoje@carboncarcare.com',
                visitId: null,
                branchId: 'branch-002',
                branchName: 'Enu Owa Street',
                organisationName: 'Kazeem Amoo Enterprises',
                marketCode: 'NG',
                exceptionType: 'device_depletion',
                claimedCheckInTime: '2026-11-18T14:38:00Z',
                actualSubmissionTime: '2026-11-18T15:23:00Z',
                failureReason: 'New client pin approval still pending in queue.',
                supportingEvidenceUrl: 'rep-101/workbench_evidence.jpg',
                status: 'pending_review',
                submittedAt: '2026-11-18T15:23:00Z',
              },
            ]}
          />
        </FieldSessionContext.Provider>
      </AuthContext.Provider>
    );

    expect(await screen.findByText('New Client Approval Delay')).toBeInTheDocument();
    expect(screen.getByText(/Enu Owa Street \(New Client Approval Delay\)/i)).toBeInTheDocument();
    expect(screen.getByText('45 mins after claimed time')).toBeInTheDocument();
    expect(screen.queryByText(/Delayed Recovery Log/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Site Operations Lead/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Operational Supplies Review/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/±135m/i)).not.toBeInTheDocument();

    const viewFullBtn = await screen.findByRole('button', { name: /View full photo/i });
    fireEvent.click(viewFullBtn);

    const dialog = await screen.findByRole('dialog', { name: /Enu Owa Street • Picture Evidence/i });
    expect(dialog.querySelector('img')).toHaveAttribute('src', 'https://cdn.example.com/workbench-evidence.jpg');
  });

  it('HqExceptionOversight renders New Client Approval Delay label and Picture Evidence lightbox in inspection modal', async () => {
    vi.spyOn(managementService, 'getExceptionEvidenceSignedUrl').mockResolvedValue(
      'https://cdn.example.com/hq-evidence.jpg'
    );

    render(
      <HqExceptionOversight
        initialExceptions={[
          {
            id: 'exc-hq-1',
            exceptionType: 'device_depletion',
            salespersonId: 'rep-101',
            salespersonName: 'Ganiyu Olorunoje',
            marketCode: 'NG',
            marketName: 'Nigeria (Lagos)',
            organisationName: 'Kazeem Amoo Enterprises',
            branchName: 'Enu Owa Street',
            claimedVisitTime: '2026-11-18 14:38',
            actualSubmissionTime: '2026-11-18 14:45',
            status: 'pending_manager_review',
            salespersonRationale: 'New client branch awaiting pin approval.',
            evidenceProvided: 'Storefront photograph attached.',
            supportingEvidenceUrl: 'rep-101/hq_evidence.jpg',
          },
        ]}
      />
    );

    expect(screen.getByText('New Client Approval Delay')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Inspect & Adjudicate/i }));

    expect(await screen.findByText('Picture Evidence Uploaded')).toBeInTheDocument();
    const viewFullBtn = await screen.findByRole('button', { name: /View full photo/i });
    fireEvent.click(viewFullBtn);

    const dialog = await screen.findByRole('dialog', { name: /Enu Owa Street • Exception Evidence/i });
    expect(dialog.querySelector('img')).toHaveAttribute('src', 'https://cdn.example.com/hq-evidence.jpg');
  });

  it('visitService.getClientsAndBranches paginates past 1000 rows to load all verified and unverified client addresses', async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({
      id: `br-p1-${i}`,
      branch_name: `Branch ${i}`,
      operating_status: i % 2 === 0 ? 'active' : 'location_pending',
    }));
    const page2 = [
      {
        id: 'br-p2-1',
        branch_name: 'Zebra Unverified Site',
        operating_status: 'pending_approval',
      },
    ];

    const rangeMock = vi
      .fn()
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: page2, error: null });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      range: rangeMock,
    } as any);

    const res = await visitService.getClientsAndBranches('NG');

    expect(res.error).toBeNull();
    expect(rangeMock).toHaveBeenCalledTimes(2);
    expect(rangeMock).toHaveBeenNthCalledWith(1, 0, 999);
    expect(rangeMock).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(res.data).toHaveLength(1001);
    expect(res.data[1000].branch_name).toBe('Zebra Unverified Site');
  });

  it('CreateExceptionModal refreshes branches, lists all verified & unverified registered addresses with search/filter, and captures via live camera on Snap Photo', async () => {
    const refreshBranchesMock = vi.fn().mockResolvedValue(undefined);
    const submitExceptionMock = vi.fn().mockResolvedValue(undefined);

    const mixedBranches = [
      {
        id: 'br-ver-1',
        companyName: 'Inner Ring Engineering',
        branchName: 'Victoria Island HQ',
        branchCode: 'VIC-0001',
        category: 'workshop',
        address: '19 Ademola Hopewell, Victoria Island, Lagos',
        landmark: '',
        contacts: [],
        distanceMeters: 25,
        approvedGpsLat: 6.43,
        approvedGpsLng: 3.42,
        approvedPinId: 'pin-1',
        status: 'approved',
      },
      {
        id: 'br-unv-2',
        companyName: 'Kazeem Amoo Enterprises',
        branchName: 'Enu Owa Hub',
        branchCode: 'ENU-0002',
        category: 'dealer',
        address: '42 Enu Owa Street, Idumota, Lagos',
        landmark: '',
        contacts: [],
        distanceMeters: 500,
        approvedGpsLat: 0,
        approvedGpsLng: 0,
        status: 'pending_approval',
      },
    ];

    const stopTrackMock = vi.fn();
    const fakeStream = { getTracks: () => [{ stop: stopTrackMock }] } as unknown as MediaStream;
    const getUserMediaMock = vi.fn().mockResolvedValue(fakeStream);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: getUserMediaMock },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    } as any);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => {
      cb(new Blob(['camera-jpeg-bytes'], { type: 'image/jpeg' }));
    });

    render(
      <AuthContext.Provider value={{ currentUser: mockRepUser as any, isAuthenticated: true } as any}>
        <FieldSessionContext.Provider
          value={{
            branches: mixedBranches as any,
            refreshBranches: refreshBranchesMock,
            submitException: submitExceptionMock,
          } as any}
        >
          <CreateExceptionModal isOpen={true} onClose={vi.fn()} />
        </FieldSessionContext.Provider>
      </AuthContext.Provider>
    );

    expect(refreshBranchesMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/2 Loaded \(1 Verified • 1 Unverified\)/i)).toBeInTheDocument();

    // Open searchable branch selector and verify both verified & unverified addresses appear
    const selectorTrigger = screen.getByRole('button', { expanded: false });
    fireEvent.click(selectorTrigger);

    expect(await screen.findByRole('option', { name: /Victoria Island HQ/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Enu Owa Hub/i })).toBeInTheDocument();
    expect(screen.getByText(/42 Enu Owa Street, Idumota, Lagos/i)).toBeInTheDocument();

    // Filter to Unverified and search by registered address
    fireEvent.click(screen.getByRole('button', { name: /^Unverified \(1\)$/i }));
    expect(screen.queryByRole('option', { name: /Victoria Island HQ/i })).not.toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText(/Search by client name, branch, or registered address/i);
    fireEvent.change(searchInput, { target: { value: 'Idumota' } });

    const unverifiedOption = screen.getByRole('option', { name: /Enu Owa Hub/i });
    fireEvent.click(unverifiedOption);

    // Clicking Snap Photo opens live getUserMedia camera instead of file upload picker
    fireEvent.click(screen.getByRole('button', { name: /Snap Photo/i }));
    await waitFor(() => {
      expect(getUserMediaMock).toHaveBeenCalledTimes(1);
    });

    const captureBtn = await screen.findByRole('button', { name: /Capture Photo/i });
    fireEvent.click(captureBtn);

    expect(await screen.findByAltText('Exception Evidence Preview')).toBeInTheDocument();
    expect(stopTrackMock).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Submit Exception Claim/i }));
    await waitFor(() => {
      expect(submitExceptionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          branchCode: 'br-unv-2',
          branchName: 'Enu Owa Hub',
        })
      );
      expect(submitExceptionMock.mock.calls[0][0].evidencePhotoBlob).toBeInstanceOf(File);
    });
  });
});
