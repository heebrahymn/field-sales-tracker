import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HqClientDirectory } from '@/features/admin/HqClientDirectory';
import { adminService, HqClientRecord } from '@/services/adminService';

// Mock adminService
vi.mock('@/services/adminService', async () => {
  const actual = await vi.importActual<any>('@/services/adminService');
  return {
    ...actual,
    adminService: {
      ...actual.adminService,
      getAllClients: vi.fn(),
      updateClientBranch: vi.fn(),
      deleteClientBranch: vi.fn(),
      deactivateClientBranch: vi.fn(),
      reviewBranchLocationPin: vi.fn(),
    },
  };
});

// Mock Auth Context
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      id: '33333333-3333-4333-a333-333333333333',
      name: 'HQ Administrator',
      email: 'hq.admin@carboncarcare.com',
      role: 'hq_admin',
      marketCode: 'NG',
    },
  }),
}));

const mockClients: HqClientRecord[] = [
  {
    id: 'br-1111',
    organisationId: 'org-1111',
    organisationName: 'Bahtech Solutions',
    organisationTier: 'standard',
    branchName: 'Oshodi Central Branch',
    marketCode: 'NG',
    category: 'logistics',
    streetAddress: '3, Akinsoji Street',
    city: 'Lagos',
    switchboardPhone: '+234 1 270 5000',
    operatingStatus: 'active',
    createdAt: '2026-11-01T12:00:00Z',
    updatedAt: '2026-11-01T12:00:00Z',
    createdBy: 'rep-1',
    creator: { id: 'rep-1', fullName: 'Ayomide Bankole', email: 'a.bankole@carbon.com' },
    primaryContact: {
      id: 'cont-1',
      fullName: 'Site Facility Lead',
      designation: 'Site Operations',
      phoneNumber: '+234 1 270 5000',
      email: 'lead@bahtech.com',
      isPrimary: true,
    },
    locationPin: {
      id: 'pin-1',
      latitude: 6.5892,
      longitude: 3.3581,
      reportedAccuracyM: 18,
      premisesPhotoUrl: '/demo/premises.jpg',
      status: 'approved',
      isActive: true,
      proposedAt: '2026-11-01T12:00:00Z',
      proposedBy: 'rep-1',
      reviewedAt: '2026-11-01T13:00:00Z',
      reviewedBy: 'mgr-1',
      reviewerName: 'Chukwudi Okafor',
      decisionReason: 'Verified on-site coordinates and signage',
    },
  },
  {
    id: 'br-2222',
    organisationId: 'org-2222',
    organisationName: 'Zambezi Freight Ltd',
    organisationTier: 'standard',
    branchName: 'Lusaka Heavy Depot',
    marketCode: 'ZM',
    category: 'fleet_operator',
    streetAddress: 'Kafue Road Plot 12',
    city: 'Lusaka',
    switchboardPhone: '+260 211 123 456',
    operatingStatus: 'pending_approval',
    createdAt: '2026-11-01T14:00:00Z',
    updatedAt: '2026-11-01T14:00:00Z',
    createdBy: 'rep-2',
    creator: { id: 'rep-2', fullName: 'Kondwani Banda', email: 'k.banda@carbon.com' },
    primaryContact: {
      id: 'cont-2',
      fullName: 'Mr. Mwamba Phiri',
      designation: 'Fleet Superintendent',
      phoneNumber: '+260 977 888 999',
      email: 'mphiri@zambezifreight.com',
      isPrimary: true,
    },
    locationPin: {
      id: 'pin-2',
      latitude: -15.4167,
      longitude: 28.2833,
      reportedAccuracyM: 25,
      premisesPhotoUrl: '/demo/lusaka.jpg',
      status: 'pending_review',
      isActive: false,
      proposedAt: '2026-11-01T14:00:00Z',
      proposedBy: 'rep-2',
      decisionReason: null,
    },
  },
  {
    id: 'br-3333',
    organisationId: 'org-3333',
    organisationName: 'Lakeview Haulage',
    organisationTier: 'enterprise',
    branchName: 'Blantyre Main Depot',
    marketCode: 'MW',
    category: 'logistics',
    streetAddress: 'Chichiri Industrial Area',
    city: 'Blantyre',
    switchboardPhone: '+265 1 820 000',
    operatingStatus: 'active',
    createdAt: '2026-10-25T09:00:00Z',
    updatedAt: '2026-10-25T09:00:00Z',
    createdBy: 'rep-3',
    creator: { id: 'rep-3', fullName: 'Blessings Phiri', email: 'b.phiri@carbon.com' },
    primaryContact: {
      id: 'cont-3',
      fullName: 'Chimwemwe Banda',
      designation: 'Terminal Manager',
      phoneNumber: '+265 999 111 222',
      email: 'cbanda@lakeview.mw',
      isPrimary: true,
    },
    locationPin: {
      id: 'pin-3',
      latitude: -15.7861,
      longitude: 35.0058,
      reportedAccuracyM: 12,
      premisesPhotoUrl: null,
      status: 'approved',
      isActive: true,
      proposedAt: '2026-10-25T09:00:00Z',
      proposedBy: 'rep-3',
    },
  },
  {
    id: 'br-4444',
    organisationId: 'org-4444',
    organisationName: 'Kano Express Hub',
    organisationTier: 'standard',
    branchName: 'Bompai Depot',
    marketCode: 'NG',
    category: 'distributor',
    streetAddress: '12 Bompai Road',
    city: 'Kano',
    switchboardPhone: '+234 64 630 100',
    operatingStatus: 'active',
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
    createdBy: 'rep-1',
    creator: { id: 'rep-1', fullName: 'Ayomide Bankole', email: 'a.bankole@carbon.com' },
    primaryContact: {
      id: 'cont-4',
      fullName: 'Ibrahim Sani',
      designation: 'Warehouse Lead',
      phoneNumber: '+234 803 123 4567',
      email: null,
      isPrimary: true,
    },
  },
  {
    id: 'br-5555',
    organisationId: 'org-5555',
    organisationName: 'Kitwe Copper Workshop',
    organisationTier: 'standard',
    branchName: 'Heavy Workshop 1',
    marketCode: 'ZM',
    category: 'workshop',
    streetAddress: 'Martindale Way',
    city: 'Kitwe',
    switchboardPhone: '+260 212 555 666',
    operatingStatus: 'active',
    createdAt: '2026-10-15T11:00:00Z',
    updatedAt: '2026-10-15T11:00:00Z',
    createdBy: 'rep-2',
    creator: { id: 'rep-2', fullName: 'Kondwani Banda', email: 'k.banda@carbon.com' },
  },
  {
    id: 'br-6666',
    organisationId: 'org-6666',
    organisationName: 'Lilongwe Central Motors',
    organisationTier: 'standard',
    branchName: 'Area 4 Station',
    marketCode: 'MW',
    category: 'retail',
    streetAddress: 'Paul Kagame Highway',
    city: 'Lilongwe',
    switchboardPhone: '+265 1 750 333',
    operatingStatus: 'active',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
    createdBy: 'rep-3',
    creator: { id: 'rep-3', fullName: 'Blessings Phiri', email: 'b.phiri@carbon.com' },
  },
  {
    id: 'br-7777',
    organisationId: 'org-7777',
    organisationName: 'Ibadan Agro Logistics',
    organisationTier: 'enterprise',
    branchName: 'Dugbe Commercial Depot',
    marketCode: 'NG',
    category: 'logistics',
    streetAddress: 'Dugbe Commercial Area',
    city: 'Ibadan',
    switchboardPhone: '+234 2 241 0000',
    operatingStatus: 'active',
    createdAt: '2026-10-05T14:30:00Z',
    updatedAt: '2026-10-05T14:30:00Z',
    createdBy: 'rep-1',
    creator: { id: 'rep-1', fullName: 'Ayomide Bankole', email: 'a.bankole@carbon.com' },
  },
];

describe('HqClientDirectory Component & Management Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminService.getAllClients as any).mockResolvedValue({
      data: mockClients,
      error: null,
    });
  });

  it('1. Renders the client directory with KPIs and client list', async () => {
    render(<HqClientDirectory />);

    // Check title and KPIs
    expect(await screen.findByText('Clients & Sites Directory')).toBeInTheDocument();
    expect(screen.getByText('Total Sites')).toBeInTheDocument();
    expect(screen.getByText('Active & Approved')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();

    // Check rendered clients
    expect(screen.getByText('Bahtech Solutions')).toBeInTheDocument();
    expect(screen.getByText('Oshodi Central Branch')).toBeInTheDocument();
    expect(screen.getByText('Zambezi Freight Ltd')).toBeInTheDocument();
    expect(screen.getByText('Lusaka Heavy Depot')).toBeInTheDocument();
  });

  it('2. Filters client list by market (Nigeria vs Zambia)', async () => {
    render(<HqClientDirectory />);

    expect(await screen.findByText('Bahtech Solutions')).toBeInTheDocument();

    // Click Zambia filter
    const zmBtn = screen.getByRole('button', { name: /Zambia/i });
    fireEvent.click(zmBtn);

    // Zambia record should be present, Nigeria record should be filtered out
    expect(await screen.findByText('Zambezi Freight Ltd')).toBeInTheDocument();
    expect(screen.queryByText('Bahtech Solutions')).not.toBeInTheDocument();

    // Switch back to All Markets
    const allBtn = screen.getByRole('button', { name: /All Markets/i });
    fireEvent.click(allBtn);

    expect(await screen.findByText('Bahtech Solutions')).toBeInTheDocument();
    expect(screen.getByText('Zambezi Freight Ltd')).toBeInTheDocument();
  });

  it('3. Searches clients by company, branch name, or contact person', async () => {
    render(<HqClientDirectory />);

    expect(await screen.findByText('Bahtech Solutions')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search company, branch/i);
    fireEvent.change(searchInput, { target: { value: 'Oshodi' } });

    expect(screen.getByText('Oshodi Central Branch')).toBeInTheDocument();
    expect(screen.queryByText('Lusaka Heavy Depot')).not.toBeInTheDocument();
  });

  it('4. Opens Edit Modal, modifies details, and saves corrections with mandatory audit rationale', async () => {
    (adminService.updateClientBranch as any).mockResolvedValue({
      success: true,
      error: null,
    });

    render(<HqClientDirectory />);
    expect(await screen.findByText('Bahtech Solutions')).toBeInTheDocument();

    // Click Edit Details on first card
    const editBtns = screen.getAllByRole('button', { name: /Edit Details/i });
    fireEvent.click(editBtns[0]);

    // Modal opens
    expect(screen.getByText('Edit Client & Site Details')).toBeInTheDocument();

    // Find and update branch name
    const branchInput = screen.getByDisplayValue('Oshodi Central Branch');
    fireEvent.change(branchInput, { target: { value: 'Oshodi Verified Logistics Hub' } });

    // Enter mandatory audit rationale
    const rationaleInput = screen.getByPlaceholderText(/State the reason for this administrative correction/i);
    fireEvent.change(rationaleInput, { target: { value: 'Updated branch name to official registered trade facility name.' } });

    // Click Save Corrections
    const saveBtn = screen.getByRole('button', { name: /Save Corrections/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(adminService.updateClientBranch).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: 'br-1111',
          branchName: 'Oshodi Verified Logistics Hub',
          reason: 'Updated branch name to official registered trade facility name.',
        })
      );
    });
  });

  it('5. Opens Delete Confirmation dialog and submits deletion with audit rationale', async () => {
    (adminService.deleteClientBranch as any).mockResolvedValue({
      success: true,
      error: null,
    });

    render(<HqClientDirectory />);
    expect(await screen.findByText('Bahtech Solutions')).toBeInTheDocument();

    // Click Delete Site on first card
    const delBtns = screen.getAllByRole('button', { name: /Delete Site/i });
    fireEvent.click(delBtns[0]);

    // Modal opens
    expect(screen.getByText('Delete Client Site')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

    // Enter deletion reason
    const reasonInput = screen.getByPlaceholderText(/e\.g\. Erroneous test entry/i);
    fireEvent.change(reasonInput, { target: { value: 'Test duplicate registration removed by admin.' } });

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: /Confirm Deletion/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminService.deleteClientBranch).toHaveBeenCalledWith(
        'br-1111',
        'Test duplicate registration removed by admin.'
      );
    });
  });

  it('6. Allows HQ Admin to review pending location pins like a Country Sales Head', async () => {
    (adminService.reviewBranchLocationPin as any).mockResolvedValue({
      success: true,
      error: null,
    });

    render(<HqClientDirectory />);
    expect(await screen.findByText('Zambezi Freight Ltd')).toBeInTheDocument();

    // Pending pin has "Review Pin Proposal" button
    const reviewBtn = screen.getByRole('button', { name: /Review Pin Proposal/i });
    expect(reviewBtn).toBeInTheDocument();
    fireEvent.click(reviewBtn);

    // Approval Decision Modal opens
    expect(screen.getByText('Manager Approval Decision Workbench')).toBeInTheDocument();

    // Provide rationale
    const rationaleArea = screen.getByPlaceholderText(/Enter mandatory justification for audit history/i);
    fireEvent.change(rationaleArea, { target: { value: 'Approved GPS coordinates and site signage by HQ Admin.' } });

    // Click Confirm Location Pin Approval
    const approveBtn = screen.getByRole('button', { name: /Confirm Location Pin Approval/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(adminService.reviewBranchLocationPin).toHaveBeenCalledWith(
        'pin-2',
        'approved',
        'Approved GPS coordinates and site signage by HQ Admin.'
      );
    });
  });

  it('7. Filters client list by author/salesperson', async () => {
    render(<HqClientDirectory />);
    expect(await screen.findByText('Bahtech Solutions')).toBeInTheDocument();

    // Find Salesperson dropdown
    const selectElements = screen.getAllByRole('combobox');
    // In our layout: [statusSelect, categorySelect, userSelect]
    const userSelect = selectElements.find((el) =>
      el.textContent?.includes('All Salespeople')
    );
    expect(userSelect).toBeDefined();

    // Select "Kondwani Banda"
    fireEvent.change(userSelect!, { target: { value: 'Kondwani Banda' } });

    // Should only show Kondwani's branches
    expect(screen.getByText('Zambezi Freight Ltd')).toBeInTheDocument();
    expect(screen.getByText('Kitwe Copper Workshop')).toBeInTheDocument();
    expect(screen.queryByText('Bahtech Solutions')).not.toBeInTheDocument();
    expect(screen.queryByText('Lakeview Haulage')).not.toBeInTheDocument();
  });

  it('8. Filters client list by registered date and clears filter', async () => {
    render(<HqClientDirectory />);
    expect(await screen.findByText('Bahtech Solutions')).toBeInTheDocument();

    // Find date input
    const dateInput = screen.getByTitle('Filter by registration date');
    expect(dateInput).toBeInTheDocument();

    // Filter by '2026-10-25'
    fireEvent.change(dateInput, { target: { value: '2026-10-25' } });

    // Should only show Lakeview Haulage (registered 2026-10-25)
    expect(screen.getByText('Lakeview Haulage')).toBeInTheDocument();
    expect(screen.queryByText('Bahtech Solutions')).not.toBeInTheDocument();

    // Clear date filter button
    const clearBtn = screen.getByTitle('Clear date filter');
    fireEvent.click(clearBtn);

    // Default pagination page 1 (3 items) should restore Bahtech Solutions
    expect(await screen.findByText('Bahtech Solutions')).toBeInTheDocument();
  });

  it('9. Paginates client list with default 3 items per page and navigates pages', async () => {
    render(<HqClientDirectory />);
    expect(await screen.findByText('Bahtech Solutions')).toBeInTheDocument();

    // Default page size is 3, total 7 items => Page 1 of 3 (showing 1 to 3 of 7)
    expect(screen.getAllByText(/Showing/i)[0]).toHaveTextContent('Showing 1 to 3 of 7 client sites');
    expect(screen.getAllByText(/Page 1 of 3/i)[0]).toBeInTheDocument();

    // Page 1 contains first 3 clients
    expect(screen.getByText('Bahtech Solutions')).toBeInTheDocument();
    expect(screen.getByText('Zambezi Freight Ltd')).toBeInTheDocument();
    expect(screen.getByText('Lakeview Haulage')).toBeInTheDocument();
    expect(screen.queryByText('Kano Express Hub')).not.toBeInTheDocument();

    // Click Next button
    const nextBtns = screen.getAllByRole('button', { name: /Next/i });
    fireEvent.click(nextBtns[0]);

    // Page 2 of 3 (showing 4 to 6 of 7)
    expect(screen.getAllByText(/Showing/i)[0]).toHaveTextContent('Showing 4 to 6 of 7 client sites');
    expect(screen.getAllByText(/Page 2 of 3/i)[0]).toBeInTheDocument();
    expect(screen.getByText('Kano Express Hub')).toBeInTheDocument();
    expect(screen.getByText('Kitwe Copper Workshop')).toBeInTheDocument();
    expect(screen.getByText('Lilongwe Central Motors')).toBeInTheDocument();
    expect(screen.queryByText('Bahtech Solutions')).not.toBeInTheDocument();

    // Click Next again to page 3
    fireEvent.click(nextBtns[0]);
    expect(screen.getAllByText(/Showing/i)[0]).toHaveTextContent('Showing 7 to 7 of 7 client sites');
    expect(screen.getAllByText(/Page 3 of 3/i)[0]).toBeInTheDocument();
    expect(screen.getByText('Ibadan Agro Logistics')).toBeInTheDocument();

    // Previous button goes back to page 2
    const prevBtns = screen.getAllByRole('button', { name: /Previous/i });
    fireEvent.click(prevBtns[0]);
    expect(screen.getAllByText(/Page 2 of 3/i)[0]).toBeInTheDocument();
  });

  it('10. Changes page size to 5, 10, or 50 per page', async () => {
    render(<HqClientDirectory />);
    expect(await screen.findByText('Bahtech Solutions')).toBeInTheDocument();

    // Select page size dropdown
    const showSelects = screen.getAllByRole('combobox').filter((el) =>
      el.textContent?.includes('3 per page')
    );
    expect(showSelects.length).toBeGreaterThan(0);

    // Change to 5 per page
    fireEvent.change(showSelects[0], { target: { value: '5' } });

    // Page 1 now shows 1 to 5 of 7
    expect(screen.getAllByText(/Showing/i)[0]).toHaveTextContent('Showing 1 to 5 of 7 client sites');
    expect(screen.getAllByText(/Page 1 of 2/i)[0]).toBeInTheDocument();

    // Verify 5 items on page 1
    expect(screen.getByText('Bahtech Solutions')).toBeInTheDocument();
    expect(screen.getByText('Zambezi Freight Ltd')).toBeInTheDocument();
    expect(screen.getByText('Lakeview Haulage')).toBeInTheDocument();
    expect(screen.getByText('Kano Express Hub')).toBeInTheDocument();
    expect(screen.getByText('Kitwe Copper Workshop')).toBeInTheDocument();
    expect(screen.queryByText('Lilongwe Central Motors')).not.toBeInTheDocument();

    // Change to 10 per page
    fireEvent.change(showSelects[0], { target: { value: '10' } });

    // Page 1 now shows all 7 items on single page
    expect(screen.getAllByText(/Showing/i)[0]).toHaveTextContent('Showing 1 to 7 of 7 client sites');
    expect(screen.getAllByText(/Page 1 of 1/i)[0]).toBeInTheDocument();
    expect(screen.getByText('Lilongwe Central Motors')).toBeInTheDocument();
    expect(screen.getByText('Ibadan Agro Logistics')).toBeInTheDocument();
  });
});
