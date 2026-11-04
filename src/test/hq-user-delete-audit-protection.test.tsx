import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HqUserManagement } from '@/features/admin/HqUserManagement';
import { adminService } from '@/services/adminService';

const mockHqUsers = [
  {
    id: 'user-hq-1',
    fullName: 'HQ Administrator',
    email: 'admin@carbon.com',
    phone: '+2348000000000',
    role: 'hq_admin',
    marketCode: null,
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z',
    assignedDevice: null,
  },
  {
    id: 'user-sp-1',
    fullName: 'Ayomide Bankole',
    email: 'a.bankole@carbon.com',
    phone: '+2348011112222',
    role: 'salesperson',
    marketCode: 'NG',
    isActive: true,
    createdAt: '2026-10-01T08:00:00Z',
    assignedDevice: {
      id: 'dev-1',
      assetTag: 'CAR-TST-699861',
      model: 'Samsung Galaxy A15',
    },
  },
];

// Mock adminService
vi.mock('@/services/adminService', async () => {
  const actual = await vi.importActual<any>('@/services/adminService');
  return {
    ...actual,
    adminService: {
      ...actual.adminService,
      getHqUsers: vi.fn(),
      getAvailableDevices: vi.fn().mockResolvedValue({ data: [] }),
      getSystemAuditLogs: vi.fn().mockResolvedValue({ data: [] }),
      deleteUser: vi.fn(),
      updateUserProfile: vi.fn(),
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

describe('HQ User Management — Relational Audit Protection & Deactivation on Delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminService.getHqUsers as any).mockResolvedValue({
      data: mockHqUsers,
      error: null,
    });
  });

  it('detects operational history on delete, shows relational audit warning, and offers Deactivate Account Instead button', async () => {
    (adminService.deleteUser as any).mockResolvedValueOnce({
      success: false,
      hasHistory: true,
      error: new Error(
        'USER_HAS_OPERATIONAL_HISTORY: This employee account has associated field operational records (device assignments, attendance, visits, or client registrations) and cannot be permanently deleted. You can deactivate the account instead.'
      ),
    });

    (adminService.updateUserProfile as any).mockResolvedValueOnce({
      success: true,
      error: null,
    });

    render(<HqUserManagement />);

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('Ayomide Bankole')).toBeInTheDocument();
    });

    // Find and click the actions menu for Ayomide Bankole
    const actionButtons = screen.getAllByTitle('Actions Menu');
    expect(actionButtons.length).toBeGreaterThan(0);

    // Ayomide is the second row (first selectable)
    fireEvent.click(actionButtons[1]);

    // Click "Delete Employee"
    const deleteButton = screen.getByTitle('Delete Employee Account');
    fireEvent.click(deleteButton);

    // Delete modal should now be visible
    expect(screen.getByText('Delete Employee User')).toBeInTheDocument();
    expect(screen.getByText('Confirm Delete User')).toBeInTheDocument();

    // Click Confirm Delete User to trigger delete
    fireEvent.click(screen.getByText('Confirm Delete User'));

    // Should detect history, update header to Deactivate, and show Relational Audit Protection Active
    await waitFor(() => {
      expect(screen.getByText('Relational Audit Protection Active')).toBeInTheDocument();
    });

    expect(screen.getByText(/Deactivate Employee User/i)).toBeInTheDocument();
    expect(screen.getByText(/Deleting the profile is blocked to protect historical audit integrity/i)).toBeInTheDocument();
    expect(screen.getByText('Deactivate Account Instead')).toBeInTheDocument();

    // Confirm Delete button should no longer exist
    expect(screen.queryByText('Confirm Delete User')).not.toBeInTheDocument();

    // Click "Deactivate Account Instead"
    fireEvent.click(screen.getByText('Deactivate Account Instead'));

    // Verify updateUserProfile was called with is_active: false
    await waitFor(() => {
      expect(adminService.updateUserProfile).toHaveBeenCalledWith(
        'user-sp-1',
        expect.objectContaining({ is_active: false })
      );
    });
  });

  it('handles foreign key constraint database error safely and displays audit protection with deactivation option', async () => {
    (adminService.deleteUser as any).mockResolvedValueOnce({
      success: false,
      hasHistory: true,
      error: new Error(
        'update or delete on table "profiles" violates foreign key constraint "device_assignments_salesperson_id_fkey" on table "device_assignments"'
      ),
    });

    render(<HqUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Ayomide Bankole')).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByTitle('Actions Menu');
    fireEvent.click(actionButtons[1]);

    const deleteButton = screen.getByTitle('Delete Employee Account');
    fireEvent.click(deleteButton);

    fireEvent.click(screen.getByText('Confirm Delete User'));

    await waitFor(() => {
      expect(screen.getByText('Relational Audit Protection Active')).toBeInTheDocument();
    });

    expect(screen.getByText('Deactivate Account Instead')).toBeInTheDocument();
  });
});
