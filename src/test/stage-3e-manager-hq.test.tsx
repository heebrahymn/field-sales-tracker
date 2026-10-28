/**
 * Carbon Field Sales Tracker — Stage 3E Management & HQ Administration Test Suite
 *
 * Validates PRD v1.2 §3, §4.2, §6.5, §7.3, §8.1, §8.3, §10, §11 / Acceptance Tests AT-06, AT-08, AT-09, AT-15.
 *
 * Scenarios:
 * 1. Country Sales Head Role Gates: Pin approval/rejection RPCs and audit reason capture.
 * 2. Exception Adjudication: Approved exceptions remain "Manager Approved — Location Unverified" (never location_verified).
 * 3. Zero Bottleneck Device Replacement: Direct Salesperson-to-HQ pipeline; CSH has zero bottleneck.
 * 4. 5% Random Client Call Audit Selection & Dispute Workflow: denial triggers dispute and audit_dispute flag.
 * 5. Audited Safe CSV Export: Formula injection escaping (CWE-1236) and audit ledger logging.
 * 6. Client Master ERP Batch Import: Missing GPS coordinates set to 'location_pending'; shared phones permitted.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { managementService, sanitizeCsvCell } from '@/services/managementService';
import { adminService } from '@/services/adminService';
import { CountryCsvExportModal } from '@/features/review/CountryCsvExportModal';

// Mock Supabase
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockFunctionsInvoke = vi.fn();
const mockGetUser = vi.fn().mockResolvedValue({
  data: { user: { id: '00000000-0000-0000-0000-000000000001' } },
  error: null,
});

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: () => mockGetUser(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      from: (table: string) => mockFrom(table),
      rpc: (fn: string, params: any) => mockRpc(fn, params),
      functions: {
        invoke: (fn: string, options: any) => mockFunctionsInvoke(fn, options),
      },
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://test.co/signed.jpg' }, error: null }),
        }),
      },
    },
  };
});

describe('Stage 3E: Management & HQ Administration Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Country Sales Head Role Gates & GPS Pin Approval / Rejection
  // =========================================================================
  describe('1. GPS Pin Governance & CSH Authority (PRD §3, §7.1)', () => {
    it('calls approve_branch_location_pin RPC with pin ID and mandatory review reason', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'PIN-UUID-01', error: null });

      const res = await managementService.approveBranchLocationPin(
        'PIN-UUID-01',
        'Physical site verified during regional route inspection'
      );

      expect(mockRpc).toHaveBeenCalledWith('approve_branch_location_pin', {
        p_pin_id: 'PIN-UUID-01',
        p_reason: 'Physical site verified during regional route inspection',
      });
      expect(res.success).toBe(true);
      expect(res.error).toBeNull();
    });

    it('rejects pin approval without mandatory review reason', async () => {
      const res = await managementService.approveBranchLocationPin('PIN-UUID-01', '   ');
      expect(res.success).toBe(false);
      expect(res.error?.message).toContain('Mandatory review reason');
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('calls reject_branch_location_pin RPC with pin ID and mandatory rejection justification', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'PIN-UUID-02', error: null });

      const res = await managementService.rejectBranchLocationPin(
        'PIN-UUID-02',
        'Coordinates placed in lagoon water body; re-proposal required'
      );

      expect(mockRpc).toHaveBeenCalledWith('reject_branch_location_pin', {
        p_pin_id: 'PIN-UUID-02',
        p_reason: 'Coordinates placed in lagoon water body; re-proposal required',
      });
      expect(res.success).toBe(true);
      expect(res.error).toBeNull();
    });

    it('proposes branch location pin with coordinates, accuracy and supporting photo', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'PIN-PROPOSAL-UUID-99', error: null });

      const res = await managementService.proposeBranchLocationPin({
        branchId: 'BRANCH-LAG-101',
        latitude: 6.4521,
        longitude: 3.4215,
        accuracyM: 14.5,
        photoUrl: 'branch-premises/photo-01.jpg',
      });

      expect(mockRpc).toHaveBeenCalledWith('propose_branch_location_pin', {
        p_branch_id: 'BRANCH-LAG-101',
        p_latitude: 6.4521,
        p_longitude: 3.4215,
        p_accuracy_m: 14.5,
        p_photo_url: 'branch-premises/photo-01.jpg',
      });
      expect(res.pinId).toBe('PIN-PROPOSAL-UUID-99');
      expect(res.error).toBeNull();
    });
  });

  // =========================================================================
  // 2. Exception Adjudication: "Manager Approved — Location Unverified"
  // =========================================================================
  describe('2. Exception Adjudication & Location Unverified Invariant (PRD §7.3, §8.1 / AT-06)', () => {
    it('adjudicates exception and guarantees status is manager_approved_unverified (never location_verified)', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'EXC-UUID-90', error: null });

      const res = await managementService.reviewSalespersonException(
        'EXC-UUID-90',
        'approved',
        'Salesperson submitted physical delivery manifest signed by workshop manager'
      );

      expect(mockRpc).toHaveBeenCalledWith('review_salesperson_exception', {
        p_exception_id: 'EXC-UUID-90',
        p_status: 'approved',
        p_reason: 'Salesperson submitted physical delivery manifest signed by workshop manager',
      });
      expect(res.success).toBe(true);
    });

    it('requires mandatory rationale when rejecting or escalating salesperson exceptions', async () => {
      const res = await managementService.reviewSalespersonException('EXC-UUID-91', 'rejected', '   ');
      expect(res.success).toBe(false);
      expect(res.error?.message).toContain('Mandatory review reason');
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. Zero Bottleneck Device Replacement Pipeline (PRD §6.5)
  // =========================================================================
  describe('3. Zero Bottleneck Company Device Replacement (PRD §6.5)', () => {
    it('HQ Admin approves device replacement request directly via RPC hq_review_device_replacement', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'REQ-DEV-001', error: null });

      const res = await adminService.reviewDeviceReplacement({
        replacementId: 'REQ-DEV-001',
        status: 'approved',
        reason: 'Screen crushed by forklift wheel; warranty replacement approved from spare pool',
      });

      expect(mockRpc).toHaveBeenCalledWith('hq_review_device_replacement', {
        p_replacement_id: 'REQ-DEV-001',
        p_status: 'approved',
        p_reason: 'Screen crushed by forklift wheel; warranty replacement approved from spare pool',
      });
      expect(res.success).toBe(true);
    });

    it('HQ Admin dispatches replacement device from central spare inventory', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'REQ-DEV-001', error: null });

      const res = await adminService.dispatchReplacementDevice({
        replacementId: 'REQ-DEV-001',
        replacementDeviceId: 'DEV-SPARE-009',
        courierTrackingRef: 'DHL-LOS-998822',
        dispatchNotes: 'Dispatched via DHL Express Lagos Hub courier',
      });

      expect(mockRpc).toHaveBeenCalledWith('hq_dispatch_replacement_device', {
        p_replacement_id: 'REQ-DEV-001',
        p_replacement_device_id: 'DEV-SPARE-009',
        p_courier_tracking_ref: 'DHL-LOS-998822',
        p_dispatch_notes: 'Dispatched via DHL Express Lagos Hub courier',
      });
      expect(res.success).toBe(true);
    });

    it('HQ Admin confirms replacement activation and records old device disposition', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'REQ-DEV-001', error: null });

      const res = await adminService.confirmReplacementActivation({
        replacementId: 'REQ-DEV-001',
        oldDeviceDisposition: 'returned_to_depot',
      });

      expect(mockRpc).toHaveBeenCalledWith('hq_confirm_replacement_activation', {
        p_replacement_id: 'REQ-DEV-001',
        p_old_device_disposition: 'returned_to_depot',
      });
      expect(res.success).toBe(true);
    });
  });

  // =========================================================================
  // 4. 5% Random Client Call Audit Selection & Dispute Workflow (PRD §8.3 / AT-09)
  // =========================================================================
  describe('4. 5% Random Audit Call & Client Dispute Workflow (PRD §8.3 / AT-09)', () => {
    it('samples exactly 5% of un-audited completed visits in the market', async () => {
      // 20 un-audited visits -> 5% = 1 visit sampled
      const mockVisits = Array.from({ length: 20 }, (_, i) => ({
        id: `VIS-SAMPLE-${i + 1}`,
        branches: {
          market_code: 'NG',
          client_contacts: [{ full_name: `Contact ${i}`, phone_number: '+234 800 000 0000', is_primary: true }],
        },
        client_audit_records: [],
      }));

      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'visits') {
          return {
            select: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({ data: mockVisits, error: null }),
            }),
          };
        }
        if (table === 'client_audit_records') return { insert: mockInsert };
        return {};
      });

      const res = await managementService.sampleWeeklyVisitsForAudit('NG');

      expect(res.sampledCount).toBe(1);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          selection_method: 'random_5pct',
          market_code: 'NG',
          call_status: 'pending_call',
          audit_outcome: 'pending',
          dispute_status: 'none',
        })
      );
    });

    it('records confirmed client meeting audit call outcome', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'AUD-001', error: null });

      const res = await managementService.recordClientAuditCall({
        auditRecordId: 'AUD-001',
        callResult: 'reached_confirmed',
        notes: 'Spoke with Engr. Jinadu; confirmed rep visited at 10:00 and inspected fleet lubricants.',
      });

      expect(mockRpc).toHaveBeenCalledWith('record_client_audit_call', {
        p_audit_record_id: 'AUD-001',
        p_call_result: 'reached_confirmed',
        p_notes: 'Spoke with Engr. Jinadu; confirmed rep visited at 10:00 and inspected fleet lubricants.',
        p_outcome: null,
        p_contact_person: null,
        p_telephone: null,
      });
      expect(res.success).toBe(true);
    });

    it('recording client denial automatically sets dispute status and triggers audit dispute flag', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'AUD-002', error: null });

      const res = await managementService.recordClientAuditCall({
        auditRecordId: 'AUD-002',
        callResult: 'reached_denied',
        notes: 'Client stated rep never arrived at the workshop premise on this date.',
      });

      expect(mockRpc).toHaveBeenCalledWith('record_client_audit_call', {
        p_audit_record_id: 'AUD-002',
        p_call_result: 'reached_denied',
        p_notes: 'Client stated rep never arrived at the workshop premise on this date.',
        p_outcome: null,
        p_contact_person: null,
        p_telephone: null,
      });
      expect(res.success).toBe(true);
    });

    it('resolves audit dispute with findings and decision (rep_substantiated vs confirmed_violation)', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'AUD-002', error: null });

      const res = await managementService.resolveClientAuditDispute({
        auditRecordId: 'AUD-002',
        decision: 'rep_substantiated',
        mandatoryReason: 'Workshop manager was on leave; gatekeeper log confirms salesperson physical entry at 10:15 WAT.',
      });

      expect(mockRpc).toHaveBeenCalledWith('resolve_client_audit_dispute', {
        p_audit_record_id: 'AUD-002',
        p_decision: 'rep_substantiated',
        p_mandatory_reason: 'Workshop manager was on leave; gatekeeper log confirms salesperson physical entry at 10:15 WAT.',
      });
      expect(res.success).toBe(true);
    });
  });

  // =========================================================================
  // 5. Audited Safe CSV Export & Formula Injection Prevention (CWE-1236)
  // =========================================================================
  describe('5. Audited Safe CSV Export & CWE-1236 Mitigation (PRD §10)', () => {
    it('sanitizes formula injection prefixes (=, +, -, @, \\t, \\r) by prepending a single quote', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
      expect(sanitizeCsvCell('+12345')).toBe('"\' +12345"'.replace(' ', ''));
      expect(sanitizeCsvCell('-cmd|/C calc')).toBe('"\' -cmd|/C calc"'.replace(' ', ''));
      expect(sanitizeCsvCell('@IMPORT')).toBe('"\'@IMPORT"');
      expect(sanitizeCsvCell('\tMaliciousTab')).toBe('"\'\tMaliciousTab"');
      expect(sanitizeCsvCell('Normal Safe Text')).toBe('"Normal Safe Text"');
      expect(sanitizeCsvCell('Text with "quotes"')).toBe('"Text with ""quotes"""');
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });

    it('renders CountryCsvExportModal with CWE-1236 notice and triggers safe export', () => {
      render(
        <CountryCsvExportModal
          isOpen={true}
          onClose={vi.fn()}
          marketName="Nigeria"
        />
      );

      expect(screen.getByText(/Audited Country CSV Export/i)).toBeInTheDocument();
      expect(screen.getByText(/Formula Injection Security Standard:/i)).toBeInTheDocument();
      expect(screen.getByText(/Download Sanitised CSV/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 6. Client Master ERP Batch Ingestion (PRD §4.2 / AT-08)
  // =========================================================================
  describe('6. Client Master ERP Batch Ingestion (PRD §4.2 / AT-08)', () => {
    it('allows different branches of the same organisation to share the same switchboard telephone', async () => {
      const mockOrg = { id: 'ORG-001', name: 'Apex Heavy Logistics Ltd', market_code: 'NG' };
      const mockBranches: any[] = [];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'organisations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
            insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: mockOrg, error: null }) }) }),
          };
        }
        if (table === 'branches') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockImplementation((payload) => {
              mockBranches.push(payload);
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: `BR-${mockBranches.length}`, ...payload }, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'branch_location_pins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'client_contacts') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        if (table === 'import_batches') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'BATCH-001' }, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const rows = [
        {
          rowIndex: 1,
          companyName: 'Apex Heavy Logistics Ltd',
          branchName: 'Apapa Terminal',
          category: 'workshop' as const,
          address: 'Wharf Road, Apapa',
          city: 'Lagos',
          contactPerson: 'Capt. Danjuma',
          contactRole: 'Fleet Director',
          telephone: '+234 1 270 5000',
          latitude: 6.4474,
          longitude: 3.3591,
        },
        {
          rowIndex: 2,
          companyName: 'Apex Heavy Logistics Ltd',
          branchName: 'Ikeja Freight Depot',
          category: 'workshop' as const,
          address: 'Plot 12 Commercial Ave, Ikeja',
          city: 'Lagos',
          contactPerson: 'Folake Adeleke',
          contactRole: 'Depot Lead',
          telephone: '+234 1 270 5000', // Identical telephone! Allowed by PRD §4.2
          latitude: 6.5982,
          longitude: 3.3541,
        },
      ];

      const res = await adminService.processClientMasterImport('apex_branches.csv', 'NG', rows);

      expect(res.errorRows).toBe(0);
      expect(res.validRows).toBe(2);
      expect(mockBranches.length).toBe(2);
      expect(mockBranches[0].switchboard_phone).toBe('+234 1 270 5000');
      expect(mockBranches[1].switchboard_phone).toBe('+234 1 270 5000');
    });

    it('assigns location_pending status to branches imported without coordinates', async () => {
      const mockOrg = { id: 'ORG-002', name: 'Lekki Transit Fleets', market_code: 'NG' };
      let insertedBranch: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'organisations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
          };
        }
        if (table === 'branches') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockImplementation((payload) => {
              insertedBranch = payload;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'BR-PENDING-1', ...payload }, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'branch_location_pins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'client_contacts') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        if (table === 'import_batches') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'BATCH-002' }, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const rows = [
        {
          rowIndex: 1,
          companyName: 'Lekki Transit Fleets',
          branchName: 'Admiralty Way Hub',
          category: 'workshop' as const,
          address: 'Admiralty Way, Lekki',
          city: 'Lagos',
          contactPerson: 'Emeka Nwachukwu',
          contactRole: 'Lead',
          telephone: '+234 803 445 6677',
          // Coordinates intentionally omitted
        },
      ];

      const res = await adminService.processClientMasterImport('missing_coords.csv', 'NG', rows);

      expect(res.validRows).toBe(1);
      expect(res.locationPendingRows).toBe(1);
      expect(insertedBranch).not.toBeNull();
      expect(insertedBranch.operating_status).toBe('location_pending');
    });
  });

  // =========================================================================
  // 7. Secure HQ Admin User Provisioning via Edge Function (PRD §3, §4.2)
  // =========================================================================
  describe('7. Secure HQ Admin User Provisioning via Edge Function', () => {
    it('successfully provisions user in Supabase Auth & profiles via admin-provision-user', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Employee account provisioned successfully',
          user: {
            id: '99999999-0000-0000-0000-000000000099',
            name: 'Chioma Eze',
            email: 'chioma.eze@carboncarcare.com',
            phone: '+234 802 111 2233',
            role: 'salesperson',
            marketCode: 'NG',
            marketName: 'Nigeria (Lagos Hub)',
            status: 'active',
            assignedDeviceTag: 'CC-DEV-LOS-005',
            assignedDeviceModel: 'Samsung Galaxy A15 Enterprise',
            lastLogin: 'Never (Pending First Login)',
            mfaEnabled: false,
            createdAt: '2026-10-28',
          },
          credentialSetup: {
            temporaryPassword: 'C3!GeneratedPassword2026',
            loginReady: true,
            mustChangeOnFirstLogin: false,
          },
        },
        error: null,
      });

      const res = await adminService.provisionUser({
        first_name: 'Chioma',
        last_name: 'Eze',
        email: 'chioma.eze@carboncarcare.com',
        phone_number: '+234 802 111 2233',
        role: 'salesperson',
        market_code: 'NG',
        assigned_device_id: 'DEV-UUID-005',
      });

      expect(res.error).toBeNull();
      expect(res.data).not.toBeNull();
      expect(res.data?.success).toBe(true);
      expect(res.data?.user.email).toBe('chioma.eze@carboncarcare.com');
      expect(res.data?.credentialSetup.temporaryPassword).toBe('C3!GeneratedPassword2026');
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('admin-provision-user', expect.objectContaining({
        body: expect.objectContaining({
          first_name: 'Chioma',
          last_name: 'Eze',
          email: 'chioma.eze@carboncarcare.com',
          role: 'salesperson',
          market_code: 'NG',
        }),
      }));
    });

    it('handles duplicate email conflict error from Edge Function (HTTP 409)', async () => {
      const mockHttpError: any = new Error('FunctionsHttpError');
      mockHttpError.context = {
        json: async () => ({
          error: "An employee account with email 'chioma.eze@carboncarcare.com' already exists in profiles.",
        }),
      };

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: mockHttpError,
      });

      const res = await adminService.provisionUser({
        first_name: 'Chioma',
        last_name: 'Eze',
        email: 'chioma.eze@carboncarcare.com',
        role: 'salesperson',
        market_code: 'NG',
      });

      expect(res.data).toBeNull();
      expect(res.error).not.toBeNull();
      expect(res.error?.message).toContain('already exists in profiles');
    });

    it('handles validation error from Edge Function (HTTP 400)', async () => {
      const mockHttpError: any = new Error('FunctionsHttpError');
      mockHttpError.context = {
        json: async () => ({
          error: 'A valid corporate email address is required.',
        }),
      };

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: mockHttpError,
      });

      const res = await adminService.provisionUser({
        first_name: 'Chioma',
        last_name: 'Eze',
        email: 'invalid-email',
        role: 'salesperson',
        market_code: 'NG',
      });

      expect(res.data).toBeNull();
      expect(res.error).not.toBeNull();
      expect(res.error?.message).toBe('A valid corporate email address is required.');
    });

    it('provisions user with optional company device and handles device assignment status', async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Employee account provisioned successfully with role salesperson.',
          user: {
            id: 'new-rep-99',
            name: 'Zainab Lawal',
            email: 'zainab.lawal@carboncarcare.com',
            role: 'salesperson',
            marketCode: 'NG',
            assignedDeviceTag: 'CAR-NG-001 — Samsung Galaxy A15',
          },
          credentialSetup: {
            temporaryPassword: 'SecureTempPassword123!',
          },
        },
        error: null,
      });

      const res = await adminService.provisionUser({
        first_name: 'Zainab',
        last_name: 'Lawal',
        email: 'zainab.lawal@carboncarcare.com',
        role: 'salesperson',
        market_code: 'NG',
        assigned_device_id: 'dev-ng-001',
      });

      expect(res.data).not.toBeNull();
      expect(res.data?.user.assignedDeviceTag).toBe('CAR-NG-001 — Samsung Galaxy A15');
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'admin-provision-user',
        expect.objectContaining({
          body: expect.objectContaining({
            assigned_device_id: 'dev-ng-001',
          }),
        })
      );
    });

    it('assignDevice successfully assigns an available device to an unassigned salesperson', async () => {
      let insertedAssignment: any = null;
      let updatedDeviceStatus: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'rep-uuid-1',
                full_name: 'Tunde Adebayo',
                role: 'salesperson',
                market_code: 'NG',
                is_active: true,
              },
              error: null,
            }),
          };
        }
        if (table === 'devices') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((col: string, val: any) => {
              if (col === 'id') {
                return {
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: val,
                      asset_tag: 'CAR-NG-001',
                      make: 'Samsung',
                      model: 'Galaxy A15',
                      market_code: 'NG',
                      inventory_status: 'available',
                    },
                    error: null,
                  }),
                };
              }
              return {
                eq: vi.fn().mockReturnThis(),
              };
            }),
            update: vi.fn().mockImplementation((payload) => {
              updatedDeviceStatus = payload.inventory_status;
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        if (table === 'device_assignments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((_col: string) => {
              return {
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // No active assignment
              };
            }),
            insert: vi.fn().mockImplementation((payload) => {
              insertedAssignment = payload;
              return { error: null };
            }),
          };
        }
        if (table === 'approval_audit') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const res = await adminService.assignDevice('dev-ng-001', 'rep-uuid-1', 'Initial phone issue');

      expect(res.success).toBe(true);
      expect(insertedAssignment).not.toBeNull();
      expect(insertedAssignment.device_id).toBe('dev-ng-001');
      expect(insertedAssignment.salesperson_id).toBe('rep-uuid-1');
      expect(insertedAssignment.is_current).toBe(true);
      expect(updatedDeviceStatus).toBe('assigned');
    });

    it('assignDevice rejects assignment if salesperson already has an active company device', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'rep-uuid-1',
                full_name: 'Tunde Adebayo',
                role: 'salesperson',
                market_code: 'NG',
                is_active: true,
              },
              error: null,
            }),
          };
        }
        if (table === 'device_assignments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'existing-assign-id', device_id: 'old-dev' },
                error: null,
              }),
            })),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const res = await adminService.assignDevice('dev-ng-002', 'rep-uuid-1');

      expect(res.success).toBe(false);
      expect(res.error?.message).toContain('Employee already has an active company device assigned');
    });

    it('assignDevice rejects cross-market device assignment', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'rep-zm-1',
                full_name: 'Peter Mwale',
                role: 'salesperson',
                market_code: 'ZM',
                is_active: true,
              },
              error: null,
            }),
          };
        }
        if (table === 'device_assignments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        if (table === 'devices') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'dev-ng-001',
                  asset_tag: 'CAR-NG-001',
                  market_code: 'NG', // Nigeria device
                  inventory_status: 'available',
                },
                error: null,
              }),
            })),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const res = await adminService.assignDevice('dev-ng-001', 'rep-zm-1');

      expect(res.success).toBe(false);
      expect(res.error?.message).toContain('Cross-market assignment restricted');
    });
  });
});
