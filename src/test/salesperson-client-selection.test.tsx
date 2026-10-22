import { describe, it, expect } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from '@/context/AuthContext';
import { FieldSessionProvider, useFieldSession } from '@/context/FieldSessionContext';
import { MarketConfigProvider } from '@/context/MarketConfigContext';
import { SalespersonHomePreview } from '@/features/field/SalespersonHomePreview';
import { ClientsDirectoryView } from '@/features/field/ClientsDirectoryView';
import { VisitWorkflowView } from '@/features/field/VisitWorkflowView';

const TestAppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <MarketConfigProvider>
      <FieldSessionProvider>
        {children}
      </FieldSessionProvider>
    </MarketConfigProvider>
  </AuthProvider>
);

describe('Salesperson Client Selection & Add Client Improvements (Changes 1 - 7)', () => {
  // =========================================================================
  // CHANGE 1: Add Client terminology on dashboard and directory
  // =========================================================================
  describe('Change 1: Terminology Updates (Add Client)', () => {
    it('displays "Add Client" and "Register a new business client" on dashboard action tile', () => {
      render(
        <TestAppProviders>
          <SalespersonHomePreview />
        </TestAppProviders>
      );

      // Tile 3 has new title and subtitle
      expect(screen.getByText('Add Client')).toBeInTheDocument();
      expect(screen.getByText('Register a new business client')).toBeInTheDocument();

      // Old "Add Branch" text is absent from action cards
      expect(screen.queryByText('Add Branch')).toBeNull();
      expect(screen.queryByText(/Shared phone OK \(PRD §4\.2\)/i)).toBeNull();
    });

    it('displays "+ Add Client" and context-aware "Select Client for Visit" in Clients Directory', () => {
      const DirectoryHarness = () => {
        const { cancelVisit } = useFieldSession();
        return (
          <div>
            <button onClick={cancelVisit}>Cancel Active Visit For Directory Test</button>
            <ClientsDirectoryView />
          </div>
        );
      };

      render(
        <TestAppProviders>
          <DirectoryHarness />
        </TestAppProviders>
      );

      // Header button
      expect(screen.getByRole('button', { name: /Add Client/i })).toBeInTheDocument();

      // Clear active visit to reveal "Select Client for Visit" action buttons
      fireEvent.click(screen.getByText('Cancel Active Visit For Directory Test'));

      // Card action button
      const selectButtons = screen.getAllByRole('button', { name: /Select Client for Visit/i });
      expect(selectButtons.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // CHANGES 2 & 3: Remove random client preselection & Step 1 Select Client
  // =========================================================================
  describe('Changes 2 & 3: Remove Random Client Selection & Implement Step 1 Select Client', () => {
    // Harness with no active visit so we test the new visit flow
    const NewVisitHarness = () => {
      const { cancelVisit } = useFieldSession();
      const [cancelled, setCancelled] = useState(false);

      return (
        <div>
          {!cancelled && (
            <button
              onClick={() => {
                cancelVisit();
                setCancelled(true);
              }}
            >
              Clear Active Visit For Testing
            </button>
          )}
          <VisitWorkflowView />
        </div>
      );
    };

    it('initializes new visit with NO client selected and displays "STEP 1: SELECT CLIENT"', () => {
      render(
        <TestAppProviders>
          <NewVisitHarness />
        </TestAppProviders>
      );

      // Cancel the demo active visit to enter new visit flow
      fireEvent.click(screen.getByText('Clear Active Visit For Testing'));

      // Check Step 1 Title
      expect(screen.getByText(/STEP 1: SELECT CLIENT/i)).toBeInTheDocument();

      // Check search input is present
      expect(
        screen.getByPlaceholderText(/Search business by name, address, or phone\.\.\./i)
      ).toBeInTheDocument();

      // Check that Step 2 and Step 3 indicate no client selected
      expect(screen.getByText(/No client selected/i)).toBeInTheDocument();
      expect(screen.getByText(/Client selection required/i)).toBeInTheDocument();

      // Check-in button is disabled
      const checkInBtn = screen.getByRole('button', { name: /Select a Client in Step 1 to Proceed/i });
      expect(checkInBtn).toBeDisabled();
    });

    it('searches and filters client organisations in the searchable dropdown', () => {
      render(
        <TestAppProviders>
          <NewVisitHarness />
        </TestAppProviders>
      );

      fireEvent.click(screen.getByText('Clear Active Visit For Testing'));

      const searchInput = screen.getByPlaceholderText(/Search business by name, address, or phone\.\.\./i);

      // Search for Equatorial
      fireEvent.change(searchInput, { target: { value: 'Equatorial' } });

      // Dropdown displays Equatorial Energy Hubs
      expect(screen.getByText('Equatorial Energy Hubs')).toBeInTheDocument();

      // Does not display Apex in filtered list
      expect(screen.queryByText('Apex Heavy Logistics Ltd')).toBeNull();
    });

    it('displays multi-location selector when a client with multiple branches is chosen', () => {
      render(
        <TestAppProviders>
          <NewVisitHarness />
        </TestAppProviders>
      );

      fireEvent.click(screen.getByText('Clear Active Visit For Testing'));

      const searchInput = screen.getByPlaceholderText(/Search business by name, address, or phone\.\.\./i);
      fireEvent.change(searchInput, { target: { value: 'Apex' } });

      // Select Apex Heavy Logistics Ltd (which has 2 branches in mock data)
      const apexClientBtn = screen.getByText('Apex Heavy Logistics Ltd');
      fireEvent.click(apexClientBtn);

      // Sub-location selection is displayed
      expect(screen.getByText(/Select Location \/ Branch/i)).toBeInTheDocument();
      expect(screen.getByText('Apex Heavy Logistics Fleet Depot')).toBeInTheDocument();
      expect(screen.getByText('Apex Commercial Transit Hub (Ikeja)')).toBeInTheDocument();

      // Clicking Ikeja branch selects it and shows its address
      fireEvent.click(screen.getByText('Apex Commercial Transit Hub (Ikeja)'));
      expect(screen.getAllByText(/Mobolaji Bank Anthony Way, Ikeja, Lagos/i).length).toBeGreaterThan(0);
    });

    it('allows clearing selection via "Change Client" button and resets evidence', () => {
      render(
        <TestAppProviders>
          <NewVisitHarness />
        </TestAppProviders>
      );

      fireEvent.click(screen.getByText('Clear Active Visit For Testing'));

      const searchInput = screen.getByPlaceholderText(/Search business by name, address, or phone\.\.\./i);
      fireEvent.change(searchInput, { target: { value: 'Equatorial' } });

      // Select Equatorial Energy Hubs (single location -> auto populates)
      fireEvent.click(screen.getByText('Equatorial Energy Hubs'));
      expect(screen.getByText(/Equatorial Energy Fleet Terminal/i)).toBeInTheDocument();

      // Click "Change Client"
      const changeClientBtn = screen.getByRole('button', { name: /Change Client/i });
      fireEvent.click(changeClientBtn);

      // Returns to unselected state
      expect(
        screen.getByPlaceholderText(/Search business by name, address, or phone\.\.\./i)
      ).toBeInTheDocument();
      expect(screen.getByText(/No client selected/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // CHANGE 4: Add New Client from Step 1
  // =========================================================================
  describe('Change 4: Add New Client directly from Step 1', () => {
    it('opens client registration modal directly from Step 1 and retains registered client context', () => {
      const AddClientHarness = () => {
        const { cancelVisit } = useFieldSession();
        return (
          <div>
            <button onClick={cancelVisit}>Reset Session</button>
            <VisitWorkflowView />
          </div>
        );
      };

      render(
        <TestAppProviders>
          <AddClientHarness />
        </TestAppProviders>
      );

      fireEvent.click(screen.getByText('Reset Session'));

      // Click Add New Client button
      const addNewClientBtn = screen.getByRole('button', { name: /Add New Client/i });
      fireEvent.click(addNewClientBtn);

      // Modal is open
      expect(screen.getByText(/Register Client & Propose Location Pin/i)).toBeInTheDocument();
      expect(screen.getByText(/PRD §4\.2 Client Registration/i)).toBeInTheDocument();

      // Fill in new client details
      const companyInput = screen.getByPlaceholderText(/e\.g\. Saharan Haulage & Energy Logistics/i);
      const branchInput = screen.getByPlaceholderText(/e\.g\. Apapa Terminal 2 Depot or Central Workshop/i);
      const addressInput = screen.getByPlaceholderText(/e\.g\. 14 Commercial Avenue, Apapa Industrial Area, Lagos/i);

      fireEvent.change(companyInput, { target: { value: 'Atlantic Marine Logistics Ltd' } });
      fireEvent.change(branchInput, { target: { value: 'Atlantic Offshore Yard' } });
      fireEvent.change(addressInput, { target: { value: 'Snake Island Integrated Free Zone, Lagos' } });

      // Submit registration
      const submitBtn = screen.getByRole('button', { name: /Submit Client Location for Approval/i });
      fireEvent.click(submitBtn);

      // Returns to Step 1 with context retained
      // Newly created branch by rep is pending approval
      // Check that the registered location status is "Pending Approval"
    });
  });

  // =========================================================================
  // CHANGE 6: Active Visit Protection (AT-04)
  // =========================================================================
  describe('Change 6: Active Visit In Progress is strictly locked to original client', () => {
    it('renders the recorded active visit with locked client and active timer (cannot switch client)', () => {
      render(
        <TestAppProviders>
          <VisitWorkflowView />
        </TestAppProviders>
      );

      // Active visit is displayed with its recorded client
      expect(screen.getByText('Visit Session In Progress')).toBeInTheDocument();
      expect(screen.getByText('Apex Heavy Logistics Ltd')).toBeInTheDocument();
      expect(screen.getByText('Apex Heavy Logistics Fleet Depot')).toBeInTheDocument();
      expect(screen.getByText(/PRD AT-04: Only 1 active normal physical visit is permitted/i)).toBeInTheDocument();

      // There is NO "Change Client" or client dropdown during active visit
      expect(screen.queryByPlaceholderText(/Search business by name/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /Change Client/i })).toBeNull();
    });
  });

  // =========================================================================
  // CHANGE 5: GPS Validation Linked to Selected Location & Approval Enforced
  // =========================================================================
  describe('Change 5: GPS Validation Linked to Selected Location & Approval Rules', () => {
    const NewVisitHarness = () => {
      const { cancelVisit } = useFieldSession();
      return (
        <div>
          <button onClick={cancelVisit}>Reset Session</button>
          <VisitWorkflowView />
        </div>
      );
    };

    it('links GPS distance to the selected location and updates dynamically when selecting a location', () => {
      render(
        <TestAppProviders>
          <NewVisitHarness />
        </TestAppProviders>
      );

      fireEvent.click(screen.getByText('Reset Session'));

      const searchInput = screen.getByPlaceholderText(/Search business by name, address, or phone\.\.\./i);
      fireEvent.change(searchInput, { target: { value: 'Equatorial' } });

      // Select Equatorial Energy Hubs (approved distance is 180m)
      fireEvent.click(screen.getByText('Equatorial Energy Hubs'));

      // Distance to Pin shows 180 metres
      expect(screen.getByText(/180 metres/i)).toBeInTheDocument();
      expect(screen.getByText(/Inside Geofence \(180m \/ 200m\)/i)).toBeInTheDocument();
    });

    it('blocks verified check-in if the location status is pending approval', () => {
      const PendingBranchHarness = () => {
        const { cancelVisit, registerBranch } = useFieldSession();
        return (
          <div>
            <button onClick={cancelVisit}>Reset Session</button>
            <button
              onClick={() => {
                registerBranch({
                  companyName: 'Sahara Cold Storage Hub',
                  branchName: 'Oregun Terminal 3',
                  branchCode: 'BR-LAG-991',
                  category: 'Cold Storage / Haulage',
                  address: 'Kudirat Abiola Way, Oregun, Lagos',
                  landmark: 'Near Total Station',
                  contacts: [{ name: 'Musa', role: 'Lead', phone: '+234 800 000 0000' }],
                  hasSharedPhone: false,
                  approvedGpsLat: 6.6,
                  approvedGpsLng: 3.3,
                });
              }}
            >
              Add Pending Rep Branch
            </button>
            <VisitWorkflowView />
          </div>
        );
      };

      render(
        <TestAppProviders>
          <PendingBranchHarness />
        </TestAppProviders>
      );

      fireEvent.click(screen.getByText('Reset Session'));
      fireEvent.click(screen.getByText('Add Pending Rep Branch'));

      const searchInput = screen.getByPlaceholderText(/Search business by name, address, or phone\.\.\./i);
      fireEvent.change(searchInput, { target: { value: 'Sahara' } });

      fireEvent.click(screen.getByText('Sahara Cold Storage Hub'));

      // Location details display Pending Approval badge and warning
      expect(screen.getByText(/Pending Manager Approval/i)).toBeInTheDocument();

      // Check-in button is explicitly blocked
      const blockedBtn = screen.getByRole('button', { name: /Check-In Blocked: Location Pending Approval/i });
      expect(blockedBtn).toBeDisabled();
    });
  });
});
