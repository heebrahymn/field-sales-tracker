import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoLightboxModal } from '@/components/ui/photo-lightbox-modal';
import { ApprovalDecisionModal, ApprovalItem } from '@/features/review/ApprovalDecisionModal';
import { ClientVisitVerification } from '@/features/review/ClientVisitVerification';
import { BranchApprovalsQueue } from '@/features/review/BranchApprovalsQueue';
import { TeamAttendanceReview } from '@/features/review/TeamAttendanceReview';
import { AuthContext } from '@/context/AuthContext';
import { FieldSessionContext } from '@/context/FieldSessionContext';
import { MarketConfigContext } from '@/context/MarketConfigContext';
import { managementService } from '@/services/managementService';

describe('Sales Head Full Photo Display & Lightbox Interactions', () => {
  const mockSalesHead = {
    id: 'sh-001',
    name: 'Babajide Adeleke',
    role: 'country_sales_head',
    marketCode: 'NG',
    marketName: 'Nigeria (Africa/Lagos)',
  };

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
  });

  it('PhotoLightboxModal displays full uncropped image with object-contain and closes on Escape / Close button', () => {
    const onClose = vi.fn();
    render(
      <PhotoLightboxModal
        photo={{
          url: 'https://example.com/premises-full.jpg',
          title: 'Inner Ring Engineering — Victoria Island',
          subtitle: 'Captured at 10:15 WAT',
        }}
        onClose={onClose}
      />
    );

    const dialog = screen.getByRole('dialog', { name: /Inner Ring Engineering/i });
    expect(dialog).toBeInTheDocument();

    const img = screen.getByAltText('Inner Ring Engineering — Victoria Island');
    expect(img).toHaveAttribute('src', 'https://example.com/premises-full.jpg');
    expect(img).toHaveClass('object-contain');

    // Escape key closes lightbox
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Close button closes lightbox
    const closeBtn = screen.getByRole('button', { name: /Close full photo view/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('ApprovalDecisionModal (Manager Approval Workbench) opens full-photo lightbox when thumbnail or View full photo is clicked', async () => {
    vi.spyOn(managementService, 'getPremisesPhotoSignedUrl').mockResolvedValue(
      'https://cdn.example.com/signed-badire-photo.jpg'
    );

    const pinItem: ApprovalItem = {
      id: 'pin-badire-1',
      type: 'pin_approval',
      title: 'Badire',
      subtitle: '12 Adesola, Victoria Island, Lagos, Nigeria • Version #1',
      repName: 'Heebrahymn Bankole',
      claimedTime: '18 Nov 2026 15:16 WAT',
      accuracy: '±14m (Threshold: ≤50m)',
      evidenceNote: 'Field GPS fix captured with ±14m reported accuracy.',
      premisesPhotoUrl: 'user-1/badire_premises.jpg',
    };

    render(
      <ApprovalDecisionModal
        item={pinItem}
        isOpen={true}
        onClose={vi.fn()}
        onDecision={vi.fn()}
      />
    );

    // Signed URL resolves into thumbnail button
    const thumbBtn = await screen.findByRole('button', { name: /View full premises photograph/i });
    expect(thumbBtn).toBeInTheDocument();

    // Clicking the thumbnail opens the full photo lightbox with object-contain
    fireEvent.click(thumbBtn);

    const lightbox = await screen.findByRole('dialog', { name: 'Badire' });
    expect(lightbox).toBeInTheDocument();
    const fullImg = lightbox.querySelector('img');
    expect(fullImg).toHaveAttribute('src', 'https://cdn.example.com/signed-badire-photo.jpg');
    expect(fullImg).toHaveClass('object-contain');

    // Closing the lightbox leaves ApprovalDecisionModal intact
    fireEvent.click(screen.getByRole('button', { name: /Close full photo view/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Badire' })).not.toBeInTheDocument();
    });
    expect(screen.getByText('Manager Approval Decision Workbench')).toBeInTheDocument();

    // Clicking "View full photo" link also opens the lightbox
    const viewFullBtn = screen.getByRole('button', { name: /View full photo/i });
    fireEvent.click(viewFullBtn);
    expect(await screen.findByRole('dialog', { name: 'Badire' })).toBeInTheDocument();
  });

  it('ClientVisitVerification renders premises photo and business card uncropped (object-contain) and opens lightbox on click', async () => {
    vi.spyOn(managementService, 'getCountryVisits').mockResolvedValue({
      data: [
        {
          id: '1dc734be-0000-0000-0000-000000000001',
          repId: 'rep-1',
          repName: 'Tunde Adebayo',
          organisationName: 'Inner Ring Engineering',
          branchName: '19 Ademola Hopewell',
          branchAddress: 'Victoria Island',
          category: 'fleet_operator',
          marketCode: 'NG',
          workDate: '2026-11-18',
          checkInAt: '2026-11-18T10:10:00Z',
          checkOutAt: '2026-11-18T10:40:00Z',
          durationMinutes: 30,
          verificationStatus: 'location_verified',
          checkInLatitude: 6.4341,
          checkInLongitude: 3.4291,
          checkInAccuracyM: 17,
          checkOutLatitude: 6.4341,
          checkOutLongitude: 3.4291,
          checkOutAccuracyM: 17,
          pinLatitude: 6.4341,
          pinLongitude: 3.429,
          geofenceRadiusM: 200,
          distanceMeters: 8,
          withinGeofence: true,
          premisesPhotoPath: 'rep-1/inner-ring-premises.jpg',
          meetingLog: {
            id: 'log-1',
            contactName: 'Mr. Charles',
            contactRole: 'Fleet Lead',
            visitPurpose: 'routine_visit',
            productsDiscussed: ['Batteries', 'Lubricants', 'Tyres'],
            fleetSizeOrVolume: '50',
            outcomeNarrative: 'Discussed tyre needs.',
            nextStepText: 'Follow up Tuesday.',
            submittedAt: '2026-11-18T10:42:00Z',
            businessCardPhotoPath: 'rep-1/charles-card.jpg',
          },
        },
      ] as any,
      error: null,
    });

    vi.spyOn(managementService, 'getPremisesPhotoSignedUrl').mockResolvedValue(
      'https://cdn.example.com/inner-ring-signed.jpg'
    );
    vi.spyOn(managementService, 'getBusinessCardSignedUrl').mockResolvedValue(
      'https://cdn.example.com/charles-card-signed.jpg'
    );

    render(
      <MarketConfigContext.Provider value={mockMarketConfig}>
        <AuthContext.Provider value={{ currentUser: mockSalesHead as any, isAuthenticated: true } as any}>
          <ClientVisitVerification />
        </AuthContext.Provider>
      </MarketConfigContext.Provider>
    );

    const inspectBtn = await screen.findByRole('button', { name: /Inspect Full Audit Record/i });
    fireEvent.click(inspectBtn);

    expect(screen.getByText('Agreed Next Step:')).toBeInTheDocument();
    expect(screen.queryByText(/Free Text/i)).not.toBeInTheDocument();

    // Inline preview uses object-contain instead of cropping with object-cover
    const photoBtn = await screen.findByRole('button', { name: /View full premises verification photo/i });
    const inlineImg = photoBtn.querySelector('img');
    expect(inlineImg).toHaveAttribute('src', 'https://cdn.example.com/inner-ring-signed.jpg');
    expect(inlineImg).toHaveClass('object-contain');

    // Clicking the inline premises photo opens full lightbox
    fireEvent.click(photoBtn);
    const lightbox = await screen.findByRole('dialog', {
      name: /Inner Ring Engineering — 19 Ademola Hopewell/i,
    });
    expect(lightbox).toBeInTheDocument();
    expect(lightbox.querySelector('img')).toHaveClass('object-contain');

    // Close lightbox and test business card lightbox trigger
    fireEvent.click(screen.getByRole('button', { name: /Close full photo view/i }));
    const cardBtn = await screen.findByRole('button', { name: /View full business card photo/i });
    fireEvent.click(cardBtn);
    expect(
      await screen.findByRole('dialog', { name: /Inner Ring Engineering — Client Business Card/i })
    ).toBeInTheDocument();
  });

  it('BranchApprovalsQueue makes queue card premises thumbnail clickable to view full photo', async () => {
    const mockFieldContext: any = {
      branches: [
        {
          id: 'br-queue-1',
          companyName: 'Coastal Haulage Ltd',
          branchName: 'Ikoyi Depot',
          branchCode: 'IKO-01',
          category: 'fleet_operator',
          address: '15 Bourdillon Rd, Ikoyi',
          landmark: 'Near Falomo Bridge',
          contacts: [{ name: 'Tola Peters', role: 'Manager', phone: '+234 800 123 4567' }],
          hasSharedPhone: false,
          distanceMeters: 20,
          approvedGpsLat: 6.45,
          approvedGpsLng: 3.43,
          accuracyMeters: 16,
          premisesPhotoUrl: 'https://cdn.example.com/ikoyi-depot.jpg',
          status: 'pending_approval',
        },
      ],
      approveBranchPin: vi.fn(),
      rejectBranchPin: vi.fn(),
    };

    render(
      <MarketConfigContext.Provider value={mockMarketConfig}>
        <AuthContext.Provider value={{ currentUser: mockSalesHead as any, isAuthenticated: true } as any}>
          <FieldSessionContext.Provider value={mockFieldContext}>
            <BranchApprovalsQueue />
          </FieldSessionContext.Provider>
        </AuthContext.Provider>
      </MarketConfigContext.Provider>
    );

    const cardThumbBtn = await screen.findByRole('button', {
      name: /View full premises photo for Ikoyi Depot/i,
    });
    fireEvent.click(cardThumbBtn);

    const lightbox = await screen.findByRole('dialog', {
      name: /Coastal Haulage Ltd — Ikoyi Depot/i,
    });
    expect(lightbox).toBeInTheDocument();
    expect(lightbox.querySelector('img')).toHaveAttribute('src', 'https://cdn.example.com/ikoyi-depot.jpg');
    expect(lightbox.querySelector('img')).toHaveClass('object-contain');
  });

  it('TeamAttendanceReview displays Start Day selfie uncropped (object-contain) and opens lightbox on click', async () => {
    render(
      <AuthContext.Provider value={{ currentUser: mockSalesHead as any, isAuthenticated: true } as any}>
        <TeamAttendanceReview />
      </AuthContext.Provider>
    );

    const inspectBtns = await screen.findAllByRole('button', { name: /Inspect Telemetry/i });
    fireEvent.click(inspectBtns[0]);

    const selfieBtn = await screen.findByRole('button', {
      name: /View full Start Day selfie photograph/i,
    });
    expect(selfieBtn.querySelector('img')).toHaveClass('object-contain');

    fireEvent.click(selfieBtn);
    const lightbox = await screen.findByRole('dialog', {
      name: /Tunde Adebayo — Start Day Selfie/i,
    });
    expect(lightbox).toBeInTheDocument();
    expect(lightbox.querySelector('img')).toHaveAttribute('src', '/brand/selfie_demo_01.jpg');
    expect(lightbox.querySelector('img')).toHaveClass('object-contain');
  });
});
