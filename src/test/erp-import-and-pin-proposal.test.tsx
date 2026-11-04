import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { parseClientMasterCsv, generateErpClientMasterTemplate } from '@/features/admin/HqClientMasterImport';
import { adminService } from '@/services/adminService';
import { managementService } from '@/services/managementService';
import { RegisterBranchModal } from '@/features/field/RegisterBranchModal';
import { CreateExceptionModal } from '@/features/field/CreateExceptionModal';
import { FieldSessionProvider, ClientBranch } from '@/context/FieldSessionContext';
import { MarketConfigProvider } from '@/context/MarketConfigContext';
import { AuthProvider } from '@/context/AuthContext';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-usr-01' } }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
          createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://test.supabase.co/signed' }, error: null }),
        }),
      },
    },
  };
});

import { supabase } from '@/lib/supabase';

describe('ERP Client Master Import Without GPS & Pin Governance', () => {

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock HTMLCanvasElement for JSDOM
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
    });
    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback: any) => {
      callback(new Blob(['fake-img'], { type: 'image/jpeg' }));
    });
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,fake');
  });

  // =========================================================================
  // 1. CSV Parsing & Optional GPS Handling (Acceptance Points 1, 2, 10)
  // =========================================================================
  describe('1. CSV Parsing & Template Generation', () => {
    it('parses CSV rows with omitted GPS coordinates as warning_location_pending (Point 1, 2)', () => {
      const csv = `Company Name,Branch Name,Category,Street Address,City,Contact Person,Contact Role,Telephone,Latitude,Longitude
Apex Heavy Logistics Ltd,Apapa Port Terminal,Haulage Depot,"Wharf Road, Port Gate 2",Lagos,Capt. Danjuma,Fleet Director,+234 1 270 5000,,
Bua Cement Fleets,Epe Weighbridge Depot,Transport Depot,"Km 42 Lekki-Epe Expressway",Lagos,Alhaji Musa,Supervisor,+234 809 332 1100,6.5841,3.9832
`;
      const parsed = parseClientMasterCsv(csv);
      expect(parsed.length).toBe(2);

      // Row 1: Missing GPS -> location_pending
      expect(parsed[0].companyName).toBe('Apex Heavy Logistics Ltd');
      expect(parsed[0].branchName).toBe('Apapa Port Terminal');
      expect(parsed[0].status).toBe('warning_location_pending');
      expect(parsed[0].latitude).toBeUndefined();
      expect(parsed[0].longitude).toBeUndefined();
      expect(parsed[0].validationMessage).toContain('Location Pending');

      // Row 2: Has GPS -> valid
      expect(parsed[1].companyName).toBe('Bua Cement Fleets');
      expect(parsed[1].status).toBe('valid');
      expect(parsed[1].latitude).toBe(6.5841);
      expect(parsed[1].longitude).toBe(3.9832);
    });

    it('generates valid ERP template with optional GPS columns (Point 1)', () => {
      const template = generateErpClientMasterTemplate('NG');
      expect(template).toContain('Company Name,Branch Name');
      expect(template).toContain('Latitude,Longitude');
      expect(template).toContain('Apex Heavy Logistics Ltd');
      // Verify sample row has omitted GPS
      const lines = template.split('\n');
      const unpinnedRow = lines.find((l) => l.includes('Ikeja Freight Depot'));
      expect(unpinnedRow).toBeDefined();
      expect(unpinnedRow?.endsWith(',,')).toBe(true);
    });

    it('rejects rows missing mandatory Company or Branch name (Point 1)', () => {
      const csv = `Company Name,Branch Name,Category,Street Address,City,Contact Person,Contact Role,Telephone,Latitude,Longitude
,Apapa Port Terminal,Haulage Depot,"Wharf Road",Lagos,Contact,Role,+234 1 270 5000,,
Apex Logistics,,Haulage Depot,"Wharf Road",Lagos,Contact,Role,+234 1 270 5000,,
`;
      const parsed = parseClientMasterCsv(csv);
      expect(parsed[0].status).toBe('error');
      expect(parsed[1].status).toBe('error');
    });
  });

  // =========================================================================
  // 2. Admin Service Import Execution (Acceptance Points 1, 2, 8, 10)
  // =========================================================================
  describe('2. Backend Admin Service Import Execution', () => {
    it('creates branches with operating_status=location_pending and skips pin creation when GPS is omitted', async () => {
      const insertedBranches: any[] = [];
      const insertedPins: any[] = [];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'organisations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'org-123' }, error: null }),
          };
        }
        if (table === 'branches') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockImplementation((payload) => {
              insertedBranches.push(payload);
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'br-new-01', ...payload }, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'branch_location_pins') {
          return {
            insert: vi.fn().mockImplementation((payload) => {
              insertedPins.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        if (table === 'client_contacts') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        if (table === 'import_batches') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'batch-001' }, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await adminService.processClientMasterImport('unpinned_clients.csv', 'NG', [
        {
          rowIndex: 1,
          companyName: 'Apex Heavy Logistics Ltd',
          branchName: 'Apapa Marine Depot',
          category: 'workshop',
          address: 'Wharf Road, Gate 3',
          city: 'Lagos',
          contactPerson: 'Adewale Adeleke',
          contactRole: 'Depot Manager',
          telephone: '+234 1 270 5000',
          // Coordinates omitted
        },
      ]);

      expect(res.errorRows).toBe(0);
      expect(res.validRows).toBe(1);
      expect(res.locationPendingRows).toBe(1);

      // Verify branch was created with location_pending status
      expect(insertedBranches.length).toBe(1);
      expect(insertedBranches[0].operating_status).toBe('location_pending');

      // Verify NO fake or fabricated pin was created
      expect(insertedPins.length).toBe(0);
    });
  });

  // =========================================================================
  // 3. Salesperson Pin Proposal for Unpinned Location (Acceptance Points 3, 4)
  // =========================================================================
  describe('3. Salesperson Pin Proposal for Unpinned Location', () => {
    it('renders RegisterBranchModal in propose_pin mode with locked branch details and calls propose_branch_location_pin', async () => {
      (supabase.rpc as any).mockResolvedValue({ data: 'new-pin-id-999', error: null });

      const unpinnedBranch: ClientBranch = {
        id: 'br-unpinned-42',
        companyName: 'Lekki Transit Fleets',
        branchName: 'Admiralty Hub',
        branchCode: 'LEK-ADM',
        category: 'Haulage Fleet Depot',
        address: 'Admiralty Way, Lekki Phase 1',
        landmark: 'Near Lekki Gate',
        contacts: [{ name: 'Emeka Nwachukwu', role: 'Maintenance Lead', phone: '+234 803 445 6677' }],
        hasSharedPhone: false,
        distanceMeters: 500,
        approvedGpsLat: 0,
        approvedGpsLng: 0,
        status: 'pending_approval',
      };

      const handleSuccess = vi.fn();
      const handleClose = vi.fn();

      render(
        <AuthProvider>
          <MarketConfigProvider>
            <FieldSessionProvider>
              <RegisterBranchModal
                isOpen={true}
                onClose={handleClose}
                onSuccess={handleSuccess}
                defaultBranch={unpinnedBranch}
                mode="propose_pin"
              />
            </FieldSessionProvider>
          </MarketConfigProvider>
        </AuthProvider>
      );

      // Verify title & locked details
      expect(screen.getByText(/Propose Physical Location Pin/i)).toBeInTheDocument();
      expect(screen.getByText(/Lekki Transit Fleets — Admiralty Hub/i)).toBeInTheDocument();
      expect(screen.getByText(/Admiralty Way, Lekki Phase 1/i)).toBeInTheDocument();

      // Generate photo snapshot first
      const snapshotBtn = screen.getByRole('button', { name: /Generate Snapshot/i });
      fireEvent.click(snapshotBtn);

      // Submit pin proposal
      const submitBtn = screen.getByRole('button', { name: /Submit Physical Pin Proposal/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith(
          'propose_branch_location_pin',
          expect.objectContaining({
            p_branch_id: 'br-unpinned-42',
            p_latitude: expect.any(Number),
            p_longitude: expect.any(Number),
            p_accuracy_m: expect.any(Number),
          })
        );
      });
    });
  });

  // =========================================================================
  // 4. Visit Workflow & Exception Recording (Acceptance Points 7, 8)
  // =========================================================================
  describe('4. Visit Workflow & Exception Recording', () => {
    it('pre-selects unpinned branch in CreateExceptionModal for location-unverified first meeting', () => {
      const handleClose = vi.fn();

      render(
        <AuthProvider>
          <MarketConfigProvider>
            <FieldSessionProvider>
              <CreateExceptionModal
                isOpen={true}
                onClose={handleClose}
                defaultBranchId="br-01"
                initialReason="First client meeting at unpinned ERP location prior to GPS pin approval."
                initialType="gps_failure"
              />
            </FieldSessionProvider>
          </MarketConfigProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/Submit Operational Exception Claim/i)).toBeInTheDocument();
      expect(
        screen.getByDisplayValue(/First client meeting at unpinned ERP location prior to GPS pin approval/i)
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. Country Sales Head Pin Review (Acceptance Points 5, 6, 9)
  // =========================================================================
  describe('5. Country Sales Head Pin Approval & Activation', () => {
    it('calls approve_branch_location_pin RPC with mandatory justification', async () => {
      (supabase.rpc as any).mockResolvedValue({ data: null, error: null });

      const res = await managementService.approveBranchLocationPin(
        'pin-uuid-1234',
        'Verified physical facility signage and perimeter gates match company records.'
      );

      expect(res.error).toBeNull();
      expect(supabase.rpc).toHaveBeenCalledWith('approve_branch_location_pin', {
        p_pin_id: 'pin-uuid-1234',
        p_reason: 'Verified physical facility signage and perimeter gates match company records.',
      });
    });

    it('calls reject_branch_location_pin RPC with rejection rationale', async () => {
      (supabase.rpc as any).mockResolvedValue({ data: null, error: null });

      const res = await managementService.rejectBranchLocationPin(
        'pin-uuid-5678',
        'Captured premises image shows unrelated residential property.'
      );

      expect(res.error).toBeNull();
      expect(supabase.rpc).toHaveBeenCalledWith('reject_branch_location_pin', {
        p_pin_id: 'pin-uuid-5678',
        p_reason: 'Captured premises image shows unrelated residential property.',
      });
    });
  });
});
