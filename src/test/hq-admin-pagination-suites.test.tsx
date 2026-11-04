import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HqClientAuditOversight, HqAuditCallRecord } from '@/features/admin/HqClientAuditOversight';
import { HqSystemAuditLog, SystemAuditEvent } from '@/features/admin/HqSystemAuditLog';
import { HqClientMasterImport } from '@/features/admin/HqClientMasterImport';

// Mock AuditContext
vi.mock('@/context/AuditContext', () => ({
  useAudit: () => ({
    audits: [],
  }),
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'hq-uuid-1',
      fullName: 'HQ Administrator',
      role: 'hq_admin',
    },
  }),
}));

const generateMockAudits = (count: number): HqAuditCallRecord[] => {
  return Array.from({ length: count }, (_, idx) => {
    const num = idx + 1;
    return {
      id: `AUD-${String(num).padStart(6, '0')}`,
      samplingType: num % 2 === 0 ? 'random_5_percent' : 'risk_targeted',
      marketCode: num % 3 === 0 ? 'ZM' : num % 3 === 1 ? 'NG' : 'MW',
      marketName: num % 3 === 0 ? 'Zambia (Lusaka)' : num % 3 === 1 ? 'Nigeria (Lagos)' : 'Malawi (Blantyre)',
      organisationName: `Audit Client ${num}`,
      branchName: `Facility Branch ${num}`,
      clientContactPerson: `Contact Person ${num}`,
      clientContactPhone: `+2348000000${String(num).padStart(2, '0')}`,
      clientContactRole: 'Depot Supervisor',
      salespersonName: `Sales Rep ${num}`,
      visitDate: '2026-11-04',
      callStatus: num % 2 === 0 ? 'confirmed_meeting' : 'pending_call',
      callAttemptCount: 1,
      gpsStatus: 'location_verified',
    };
  });
};

const generateMockLogs = (count: number): SystemAuditEvent[] => {
  return Array.from({ length: count }, (_, idx) => {
    const num = idx + 1;
    return {
      id: `LOG-${String(num).padStart(6, '0')}`,
      timestamp: '2026-11-04 14:00:00',
      actorName: `Admin Actor ${num}`,
      actorRole: 'HQ Administrator',
      marketCode: num % 2 === 0 ? 'NG' : 'ALL',
      category: 'user_management',
      action: 'USER_PROVISION',
      targetRecord: `USER #USR${num}`,
      changeSummary: `Provisioned user account ${num}`,
      severity: 'routine',
      ipAddress: '127.0.0.1',
    };
  });
};

describe('HQ Admin Client Audits Pagination (HqClientAuditOversight)', () => {
  const mockAudits = generateMockAudits(25);

  it('renders default 10 audits per page and displays pagination controls', () => {
    render(<HqClientAuditOversight initialAudits={mockAudits} />);

    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText(/audit records/i)).toBeInTheDocument();

    expect(screen.getByText('Audit Client 1')).toBeInTheDocument();
    expect(screen.getByText('Audit Client 10')).toBeInTheDocument();
    expect(screen.queryByText('Audit Client 11')).not.toBeInTheDocument();
  });

  it('navigates to page 2 and changes page size to 20', () => {
    render(<HqClientAuditOversight initialAudits={mockAudits} />);

    const nextBtn = screen.getByTitle('Next Page');
    fireEvent.click(nextBtn);

    expect(screen.getByText('Audit Client 11')).toBeInTheDocument();
    expect(screen.queryByText('Audit Client 1')).not.toBeInTheDocument();

    const select = screen.getByTitle('Items per page');
    fireEvent.change(select, { target: { value: '20' } });

    expect(screen.getByText('Audit Client 1')).toBeInTheDocument();
    expect(screen.getByText('Audit Client 20')).toBeInTheDocument();
    expect(screen.queryByText('Audit Client 21')).not.toBeInTheDocument();
  });

  it('resets current page to 1 when search filter is modified', () => {
    render(<HqClientAuditOversight initialAudits={mockAudits} />);

    const nextBtn = screen.getByTitle('Next Page');
    fireEvent.click(nextBtn);
    expect(screen.getByText('Audit Client 11')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search audit ID, client, rep/i);
    fireEvent.change(searchInput, { target: { value: 'Client 1' } });

    expect(screen.getByText('Audit Client 1')).toBeInTheDocument();
  });
});

describe('HQ Admin System Audit Log Pagination (HqSystemAuditLog)', () => {
  const mockLogs = generateMockLogs(25);

  it('renders default 10 log events per page with pagination summary', () => {
    render(<HqSystemAuditLog initialLogs={mockLogs} />);

    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText(/audit events/i)).toBeInTheDocument();

    expect(screen.getByText('Admin Actor 1')).toBeInTheDocument();
    expect(screen.getByText('Admin Actor 10')).toBeInTheDocument();
    expect(screen.queryByText('Admin Actor 11')).not.toBeInTheDocument();
  });

  it('navigates to next page and supports 50 items per page', () => {
    render(<HqSystemAuditLog initialLogs={mockLogs} />);

    const nextBtn = screen.getByTitle('Next Page');
    fireEvent.click(nextBtn);

    expect(screen.getByText('Admin Actor 11')).toBeInTheDocument();
    expect(screen.queryByText('Admin Actor 1')).not.toBeInTheDocument();

    const select = screen.getByTitle('Items per page');
    fireEvent.change(select, { target: { value: '50' } });

    expect(screen.getByText('Admin Actor 1')).toBeInTheDocument();
    expect(screen.getByText('Admin Actor 25')).toBeInTheDocument();
  });
});

describe('HQ Admin Historical Master Import Batches Pagination (HqClientMasterImport)', () => {
  it('renders Historical Master Import Batches with pagination controls', () => {
    render(<HqClientMasterImport />);

    // In test environment, TEST_BATCHES has items
    expect(screen.getByText('Historical Master Import Batches')).toBeInTheDocument();
    expect(screen.getAllByText(/import batches/i).length).toBeGreaterThanOrEqual(1);
  });
});
