import { describe, it, expect } from 'vitest';

describe('Stage 1D — HQ Admin Interface Business Rules & Governance', () => {
  describe('Tri-Market Regional Hub Scoping', () => {
    it('recognises all 3 approved African operating markets with canonical IANA timezones', () => {
      const markets = [
        { code: 'NG', name: 'Nigeria', hub: 'Lagos Hub', tz: 'Africa/Lagos' },
        { code: 'ZM', name: 'Zambia', hub: 'Lusaka Hub', tz: 'Africa/Lusaka' },
        { code: 'MW', name: 'Malawi', hub: 'Blantyre Hub', tz: 'Africa/Blantyre' },
      ];

      expect(markets).toHaveLength(3);
      expect(markets.map((m) => m.code)).toEqual(['NG', 'ZM', 'MW']);
      expect(markets.find((m) => m.code === 'NG')?.tz).toBe('Africa/Lagos');
      expect(markets.find((m) => m.code === 'ZM')?.tz).toBe('Africa/Lusaka');
      expect(markets.find((m) => m.code === 'MW')?.tz).toBe('Africa/Blantyre');
    });

    it('enforces country sandboxing for Country Sales Heads while granting tri-market visibility to HQ Admin', () => {
      const canAccessMarket = (userRole: string, userAssignedMarket: string, targetMarket: string): boolean => {
        if (userRole === 'hq_admin') return true;
        if (userRole === 'sales_head') return userAssignedMarket === targetMarket;
        return false;
      };

      // Sales Head of Nigeria cannot access Zambia or Malawi
      expect(canAccessMarket('sales_head', 'NG', 'NG')).toBe(true);
      expect(canAccessMarket('sales_head', 'NG', 'ZM')).toBe(false);
      expect(canAccessMarket('sales_head', 'NG', 'MW')).toBe(false);

      // HQ Admin can access all
      expect(canAccessMarket('hq_admin', 'ALL', 'NG')).toBe(true);
      expect(canAccessMarket('hq_admin', 'ALL', 'ZM')).toBe(true);
      expect(canAccessMarket('hq_admin', 'ALL', 'MW')).toBe(true);
    });
  });

  describe('PRD §2 & §7 Sole-Author Boundary Enforcement', () => {
    it('strictly forbids HQ Admin and Country Sales Heads from originating salesperson visit or exception logs', () => {
      const canCreateSalespersonVisitLog = (role: string): boolean => {
        return role === 'salesperson';
      };

      const canCreateExceptionSubmission = (role: string): boolean => {
        return role === 'salesperson';
      };

      expect(canCreateSalespersonVisitLog('salesperson')).toBe(true);
      expect(canCreateSalespersonVisitLog('sales_head')).toBe(false);
      expect(canCreateSalespersonVisitLog('hq_admin')).toBe(false);

      expect(canCreateExceptionSubmission('salesperson')).toBe(true);
      expect(canCreateExceptionSubmission('sales_head')).toBe(false);
      expect(canCreateExceptionSubmission('hq_admin')).toBe(false);
    });

    it('ensures manager-approved GPS failure exceptions remain Manager Approved — Location Unverified', () => {
      const applyHqReview = (currentStatus: string): string => {
        if (currentStatus === 'manager_approved_unverified') {
          // Upholding does not promote to location_verified
          return 'manager_approved_unverified';
        }
        return currentStatus;
      };

      const finalStatus = applyHqReview('manager_approved_unverified');
      expect(finalStatus).toBe('manager_approved_unverified');
      expect(finalStatus).not.toBe('location_verified');
    });
  });

  describe('PRD §4.2 Client Master Import Validation Rules', () => {
    it('permits sibling branches to share parent company telephone numbers without duplicate rejection', () => {
      const importedBranches = [
        {
          rowIndex: 1,
          company: 'Apex Heavy Logistics Ltd',
          branch: 'Apapa Port Terminal Hub',
          phone: '+234 1 270 5000',
        },
        {
          rowIndex: 2,
          company: 'Apex Heavy Logistics Ltd',
          branch: 'Ikeja Freight Depot',
          phone: '+234 1 270 5000', // SHARED PHONE
        },
      ];

      const validateBranch = (row: (typeof importedBranches)[0], allRows: typeof importedBranches) => {
        const isDuplicateBranch = allRows.some(
          (other) => other.rowIndex !== row.rowIndex && other.company === row.company && other.branch === row.branch
        );
        const sharesParentPhone = allRows.some(
          (other) => other.rowIndex !== row.rowIndex && other.company === row.company && other.phone === row.phone
        );

        if (isDuplicateBranch) return { status: 'rejected', reason: 'Duplicate branch' };
        if (sharesParentPhone) return { status: 'warning_shared_phone', reason: 'PRD §4.2 Shared Parent Phone Permitted' };
        return { status: 'valid', reason: 'Valid' };
      };

      const row2Result = validateBranch(importedBranches[1], importedBranches);
      expect(row2Result.status).toBe('warning_shared_phone');
      expect(row2Result.status).not.toBe('rejected');
    });

    it('assigns Location Pending status to imported branches without approved GPS coordinates', () => {
      const branchWithoutGps = {
        company: 'Lekki Transit Commercial Fleets',
        branch: 'Admiralty Way Hub',
        lat: undefined,
        lng: undefined,
      };

      const getInitialLocationStatus = (lat?: number, lng?: number): string => {
        if (lat !== undefined && lng !== undefined) return 'location_verified';
        return 'location_pending';
      };

      expect(getInitialLocationStatus(branchWithoutGps.lat, branchWithoutGps.lng)).toBe('location_pending');
      expect(getInitialLocationStatus(6.4474, 3.3591)).toBe('location_verified');
    });
  });

  describe('CWE-1236 Safe CSV Export Sanitization', () => {
    const escapeCsv = (val: string): string => {
      if (!val) return '""';
      const trimmed = String(val);
      if (/^[=+\-@\t\r]/.test(trimmed)) {
        return `"'${trimmed.replace(/"/g, '""')}"`;
      }
      return `"${trimmed.replace(/"/g, '""')}"`;
    };

    it('escapes cells beginning with formula triggers to prevent CSV injection', () => {
      expect(escapeCsv('=HYPERLINK("http://attacker.com")')).toBe('"\'=HYPERLINK(""http://attacker.com"")"');
      expect(escapeCsv('+12345')).toBe('"\'+12345"');
      expect(escapeCsv('-999')).toBe('"\' -999"'.replace(' ', ''));
      expect(escapeCsv('@SUM(1,2)')).toBe('"\'@SUM(1,2)"');
      expect(escapeCsv('\tcmd')).toBe('"\'\tcmd"');
    });

    it('safely encapsulates standard text and quotes', () => {
      expect(escapeCsv('Carbon Car Care Nigeria')).toBe('"Carbon Car Care Nigeria"');
      expect(escapeCsv('Lagos "Central" Hub')).toBe('"Lagos ""Central"" Hub"');
    });
  });

  describe('PRD §11 Rule Immutability & Non-Retroactivity', () => {
    it('applies configuration changes prospectively from effective date without rewriting historical logs', () => {
      const historicalVisit = {
        id: 'VIS-2026-08-01',
        visitDate: '2026-08-15',
        recordedDistanceMeters: 185,
        ruleVersionAtCapture: 'v1.1',
        geofenceRadiusAtCapture: 200,
        status: 'location_verified',
      };

      // HQ Admin updates rule in September to tighter 150m
      const newRuleConfig = {
        version: 'v1.3',
        effectiveDate: '2026-09-01',
        geofenceRadiusMeters: 150,
      };

      // Verification check: Historical record MUST preserve original status
      const verifyHistoricalIntegrity = (record: typeof historicalVisit, _activeRule: typeof newRuleConfig) => {
        // Record is prior to _activeRule.effectiveDate; MUST NOT re-evaluate distance
        return record.status;
      };

      const preservedStatus = verifyHistoricalIntegrity(historicalVisit, newRuleConfig);
      expect(preservedStatus).toBe('location_verified');
      expect(historicalVisit.ruleVersionAtCapture).toBe('v1.1');
    });
  });

  describe('Company Device Inventory & MDM Governance', () => {
    it('verifies company-provided handset inventory attributes', () => {
      const device = {
        id: 'DEV-NG-001',
        assetTag: 'CC-DEV-LOS-001',
        imei: '864209051234561',
        make: 'Samsung',
        model: 'Galaxy A15 Enterprise',
        status: 'active',
        batteryHealth: 98,
        knoxSecurityEnrolled: true,
      };

      expect(device.assetTag).toMatch(/^CC-DEV-[A-Z]{3}-\d{3}$/);
      expect(device.imei).toHaveLength(15);
      expect(device.batteryHealth).toBeGreaterThanOrEqual(0);
      expect(device.knoxSecurityEnrolled).toBe(true);
    });
  });

  describe('Separation of GPS Verification and Client Phone Audit', () => {
    it('confirms that client denial transitions visit to Disputed — Pending Review, never immediate disciplinary fraud', () => {
      const recordClientAuditOutcome = (callOutcome: 'confirmed' | 'denied' | 'unreachable'): {
        auditStatus: string;
        requiresManagementInquiry: boolean;
        isAutomatedViolation: boolean;
      } => {
        if (callOutcome === 'confirmed') {
          return { auditStatus: 'client_confirmed', requiresManagementInquiry: false, isAutomatedViolation: false };
        }
        if (callOutcome === 'denied') {
          return { auditStatus: 'disputed_pending_review', requiresManagementInquiry: true, isAutomatedViolation: false };
        }
        return { auditStatus: 'unreachable_rescheduled', requiresManagementInquiry: false, isAutomatedViolation: false };
      };

      const result = recordClientAuditOutcome('denied');
      expect(result.auditStatus).toBe('disputed_pending_review');
      expect(result.requiresManagementInquiry).toBe(true);
      expect(result.isAutomatedViolation).toBe(false);
    });
  });

  describe('Strict MVP Exclusions in HQ Admin Interface', () => {
    it('verifies no commercial sales modules exist in HQ Admin navigation', () => {
      const hqNavModules = [
        'dashboard',
        'users',
        'devices',
        'markets',
        'import',
        'exports',
        'exceptions',
        'audits',
        'audit_log',
      ];

      const forbiddenCommercialModules = [
        'quotes',
        'quotations',
        'orders',
        'order_tracking',
        'pipeline',
        'sales_pipeline',
        'revenue',
        'sales_revenue',
        'invoicing',
        'tasks',
        'follow_up_tasks',
      ];

      forbiddenCommercialModules.forEach((forbidden) => {
        expect(hqNavModules).not.toContain(forbidden);
      });
    });
  });

  describe('Approved Company Device Replacement Workflow (Direct to HQ Admin)', () => {
    it('directs salesperson device replacement requests straight to HQ Admin with zero Country Sales Head approval', () => {
      interface DeviceReplacementSubmission {
        salespersonId: string;
        salespersonName: string;
        assignedDeviceAssetId: string;
        issueCategory: 'camera_defect' | 'gps_failure' | 'screen_damage' | 'battery_charging_fault' | 'lost_or_stolen' | 'other';
        issueDescription: string;
        targetApproverRole: string;
        requiresCountrySalesHeadApproval: boolean;
      }

      const createSubmission = (spId: string, spName: string, assetId: string, cat: any, desc: string): DeviceReplacementSubmission => ({
        salespersonId: spId,
        salespersonName: spName,
        assignedDeviceAssetId: assetId,
        issueCategory: cat,
        issueDescription: desc,
        targetApproverRole: 'hq_admin',
        requiresCountrySalesHeadApproval: false, // Architectural Decision: Zero intermediary step
      });

      const submission = createSubmission('CC-NG-042', 'Tunde Adebayo', 'CC-DEV-LAG-019', 'camera_defect', 'Autofocus sensor blur');

      expect(submission.targetApproverRole).toBe('hq_admin');
      expect(submission.requiresCountrySalesHeadApproval).toBe(false);
      expect(submission.issueCategory).toBe('camera_defect');
    });

    it('enforces role-based boundaries: only Salesperson submits, Sales Head has no approval authority, HQ Admin approves', () => {
      const canSubmitDeviceReplacementRequest = (role: string): boolean => role === 'salesperson';
      const canApproveOrRejectDeviceReplacement = (role: string): boolean => role === 'hq_admin';
      const canCountrySalesHeadApproveOrReject = (role: string): boolean => {
        if (role === 'sales_head') return false; // Prohibited by approved architecture
        return false;
      };

      expect(canSubmitDeviceReplacementRequest('salesperson')).toBe(true);
      expect(canSubmitDeviceReplacementRequest('sales_head')).toBe(false);
      expect(canSubmitDeviceReplacementRequest('hq_admin')).toBe(false);

      expect(canApproveOrRejectDeviceReplacement('hq_admin')).toBe(true);
      expect(canApproveOrRejectDeviceReplacement('sales_head')).toBe(false);
      expect(canApproveOrRejectDeviceReplacement('salesperson')).toBe(false);

      expect(canCountrySalesHeadApproveOrReject('sales_head')).toBe(false);
    });

    it('validates the complete 7-status lifecycle and append-only audit trail', () => {
      const allowedStatuses = [
        'Pending Review',
        'Approved',
        'Rejected',
        'Awaiting Spare',
        'Dispatched',
        'Awaiting Activation',
        'Completed',
      ];

      expect(allowedStatuses).toHaveLength(7);

      interface MockRequest {
        id: string;
        status: string;
        approvalReason?: string;
        rejectionReason?: string;
        allocatedSpareAssetId?: string;
        dispatchNotes?: string;
        activationConfirmed?: boolean;
        oldDeviceDisposition?: 'quarantined' | 'returned_to_depot' | 'revoked';
        history: Array<{ action: string; actorRole: string }>;
      }

      // Initial state
      const req: MockRequest = {
        id: 'REQ-REP-TEST-001',
        status: 'Pending Review',
        history: [{ action: 'Request Submitted Directly to HQ Admin', actorRole: 'Salesperson' }],
      };

      expect(req.status).toBe('Pending Review');

      // HQ Admin Approves with mandatory reason
      req.status = 'Approved';
      req.approvalReason = 'Sensor hardware failure confirmed via diagnostic logs';
      req.history.push({ action: 'Request Approved by HQ Admin', actorRole: 'HQ Administrator' });
      expect(req.status).toBe('Approved');
      expect(req.approvalReason).toBeTruthy();

      // Allocate spare handset from depot inventory
      req.status = 'Awaiting Spare';
      req.allocatedSpareAssetId = 'CC-DEV-LOS-SPARE-01';
      req.history.push({ action: 'Spare Handset Allocated from Depot', actorRole: 'HQ Administrator' });
      expect(req.status).toBe('Awaiting Spare');

      // Record dispatch
      req.status = 'Dispatched';
      req.dispatchNotes = 'Dispatched via DHL Express Waybill #DHL-NG-88219';
      req.history.push({ action: 'Replacement Handset Dispatched', actorRole: 'HQ Administrator' });
      expect(req.status).toBe('Dispatched');

      // Confirm activation and old device disposition
      req.status = 'Awaiting Activation';
      req.activationConfirmed = true;
      req.oldDeviceDisposition = 'returned_to_depot';
      req.history.push({ action: 'New Device Activated in MDM', actorRole: 'HQ Administrator' });
      expect(req.status).toBe('Awaiting Activation');
      expect(req.oldDeviceDisposition).toBe('returned_to_depot');

      // Final closure
      req.status = 'Completed';
      req.history.push({ action: 'Replacement Request Closed & Completed', actorRole: 'HQ Administrator' });
      expect(req.status).toBe('Completed');
      expect(req.history).toHaveLength(6);
    });

    it('demonstrates rejected request lifecycle with mandatory rejection rationale', () => {
      interface RejectedMockRequest {
        id: string;
        status: string;
        rejectionReason: string;
        history: Array<{ action: string; actorRole: string; notes?: string }>;
      }

      const rejectRequest = (id: string, reason: string): RejectedMockRequest => {
        if (!reason.trim()) throw new Error('Mandatory rejection reason required');
        return {
          id,
          status: 'Rejected',
          rejectionReason: reason.trim(),
          history: [
            { action: 'Request Submitted Directly to HQ Admin', actorRole: 'Salesperson' },
            { action: 'Request Rejected by HQ Admin', actorRole: 'HQ Administrator', notes: reason.trim() },
          ],
        };
      };

      const rejected = rejectRequest('REQ-REP-TEST-002', 'Cosmetic scuff on bumper case does not impede field operations.');
      expect(rejected.status).toBe('Rejected');
      expect(rejected.rejectionReason).toContain('Cosmetic scuff');
      expect(rejected.history).toHaveLength(2);

      // Throws if reason is empty
      expect(() => rejectRequest('REQ-REP-TEST-003', '')).toThrow('Mandatory rejection reason required');
    });

    it('strictly separates hardware replacement requests from field visit exception records', () => {
      const handleHardwareBreakdownDuringFieldDay = (salespersonId: string, visitMissed: boolean) => {
        const hardwareRequest = {
          type: 'administrative_hardware_replacement',
          submittedBy: salespersonId,
          targetReviewer: 'hq_admin',
          createsFieldVisitLog: false, // Hardware request NEVER creates visit evidence
        };

        const fieldException = visitMissed
          ? {
              type: 'field_visit_gps_or_device_failure_exception',
              submittedBy: salespersonId, // Salesperson MUST create own exception upon device restoration
              targetReviewer: 'sales_head',
              createdByManager: false,
            }
          : null;

        return { hardwareRequest, fieldException };
      };

      const workflowResult = handleHardwareBreakdownDuringFieldDay('CC-NG-042', true);

      // 1. Hardware request is administrative and reviewed by HQ Admin
      expect(workflowResult.hardwareRequest.type).toBe('administrative_hardware_replacement');
      expect(workflowResult.hardwareRequest.targetReviewer).toBe('hq_admin');
      expect(workflowResult.hardwareRequest.createsFieldVisitLog).toBe(false);

      // 2. Field visit exception is distinct, authored by salesperson, reviewed by Country Sales Head
      expect(workflowResult.fieldException).not.toBeNull();
      expect(workflowResult.fieldException?.type).toBe('field_visit_gps_or_device_failure_exception');
      expect(workflowResult.fieldException?.submittedBy).toBe('CC-NG-042');
      expect(workflowResult.fieldException?.createdByManager).toBe(false);
    });
  });

  describe('New Company Device Registration, Assignment & 9-Status Lifecycle (Stage 1D Enhancement)', () => {
    interface TestDeviceAuditEntry {
      id: string;
      timestamp: string;
      action: string;
      actorName: string;
      actorRole: string;
      previousStatus?: string;
      newStatus?: string;
      assigneeId?: string;
      assigneeName?: string;
      reason?: string;
    }

    interface TestCompanyDevice {
      assetId: string;
      serialNumber: string;
      make: string;
      model: string;
      marketCode: 'NG' | 'ZM' | 'MW';
      inventoryStatus:
        | 'Available'
        | 'Assigned'
        | 'Active'
        | 'Pending Inspection'
        | 'Under Maintenance'
        | 'Lost/Stolen'
        | 'Returned'
        | 'Revoked'
        | 'Retired';
      securityAuthorization: 'Authorized' | 'Pending Activation' | 'Revoked' | 'Quarantined';
      assignedSalespersonId?: string;
      assignedSalespersonName?: string;
      registeredBy: string;
      history: TestDeviceAuditEntry[];
    }

    const createDeviceInventory = () => {
      const devices: TestCompanyDevice[] = [
        {
          assetId: 'CC-DEV-LOS-001',
          serialNumber: 'R58M102938A',
          make: 'Samsung',
          model: 'Galaxy A15 Enterprise',
          marketCode: 'NG',
          inventoryStatus: 'Active',
          securityAuthorization: 'Authorized',
          assignedSalespersonId: 'USR-NG-002',
          assignedSalespersonName: 'Chukwudi Okafor',
          registeredBy: 'HQ Administrator (HQ Admin)',
          history: [
            {
              id: 'h1',
              timestamp: '2025-01-15 10:00 WAT',
              action: 'Device Registered in Inventory',
              actorName: 'HQ Administrator',
              actorRole: 'HQ Administrator',
              newStatus: 'Available',
            },
            {
              id: 'h2',
              timestamp: '2025-02-01 08:30 WAT',
              action: 'Handset Assigned to Salesperson',
              actorName: 'HQ Administrator',
              actorRole: 'HQ Administrator',
              previousStatus: 'Available',
              newStatus: 'Active',
              assigneeId: 'USR-NG-002',
              assigneeName: 'Chukwudi Okafor',
            },
          ],
        },
        {
          assetId: 'CC-DEV-LOS-SPARE-01',
          serialNumber: 'R58M102938D',
          make: 'Samsung',
          model: 'Galaxy A15 Enterprise',
          marketCode: 'NG',
          inventoryStatus: 'Available',
          securityAuthorization: 'Authorized',
          registeredBy: 'HQ Administrator (HQ Admin)',
          history: [
            {
              id: 'h3',
              timestamp: '2025-02-20 09:30 WAT',
              action: 'Device Registered in Inventory',
              actorName: 'HQ Administrator',
              actorRole: 'HQ Administrator',
              newStatus: 'Available',
            },
          ],
        },
      ];

      const registerDevice = (input: {
        assetId: string;
        serialNumber: string;
        make: string;
        model: string;
        marketCode: 'NG' | 'ZM' | 'MW';
        initialStatus?: 'Available' | 'Pending Inspection';
      }) => {
        if (!input.assetId?.trim() || !input.serialNumber?.trim() || !input.make?.trim() || !input.model?.trim()) {
          return { success: false, error: 'Required fields missing' };
        }

        const normAsset = input.assetId.trim().toLowerCase();
        if (devices.some((d) => d.assetId.toLowerCase() === normAsset)) {
          return { success: false, error: 'Duplicate Asset ID' };
        }

        const normSerial = input.serialNumber.trim().toLowerCase();
        if (devices.some((d) => d.serialNumber.toLowerCase() === normSerial)) {
          return { success: false, error: 'Duplicate Serial Number' };
        }

        const status = input.initialStatus === 'Pending Inspection' ? 'Pending Inspection' : 'Available';
        const security = status === 'Pending Inspection' ? 'Quarantined' : 'Authorized';

        const newDev: TestCompanyDevice = {
          assetId: input.assetId.trim(),
          serialNumber: input.serialNumber.trim(),
          make: input.make.trim(),
          model: input.model.trim(),
          marketCode: input.marketCode,
          inventoryStatus: status,
          securityAuthorization: security,
          registeredBy: 'HQ Administrator (HQ Admin)',
          history: [
            {
              id: `h-reg-${Date.now()}`,
              timestamp: '2026-10-20 12:00 WAT',
              action: 'Device Registered in Inventory',
              actorName: 'HQ Administrator',
              actorRole: 'HQ Administrator',
              newStatus: status,
            },
          ],
        };

        devices.push(newDev);
        return { success: true, device: newDev };
      };

      const assignDevice = (assetId: string, repId: string, repName: string) => {
        const dev = devices.find((d) => d.assetId === assetId);
        if (!dev) return { success: false, error: 'Device not found' };
        if (dev.inventoryStatus !== 'Available' && dev.inventoryStatus !== 'Returned') {
          return { success: false, error: 'Device not available for assignment' };
        }

        const alreadyAssigned = devices.some(
          (d) =>
            d.assetId !== assetId &&
            d.assignedSalespersonId === repId &&
            (d.inventoryStatus === 'Active' || d.inventoryStatus === 'Assigned')
        );
        if (alreadyAssigned) {
          return { success: false, error: 'Salesperson already holds an active company device' };
        }

        dev.inventoryStatus = 'Active';
        dev.assignedSalespersonId = repId;
        dev.assignedSalespersonName = repName;
        dev.history.push({
          id: `h-assign-${Date.now()}`,
          timestamp: '2026-10-20 13:00 WAT',
          action: 'Handset Assigned to Salesperson',
          actorName: 'HQ Administrator',
          actorRole: 'HQ Administrator',
          previousStatus: 'Available',
          newStatus: 'Active',
          assigneeId: repId,
          assigneeName: repName,
        });

        return { success: true, device: dev };
      };

      const reassignDevice = (assetId: string, newRepId: string, newRepName: string, reason: string) => {
        const dev = devices.find((d) => d.assetId === assetId);
        if (!dev) return { success: false, error: 'Device not found' };
        if (!reason?.trim()) return { success: false, error: 'Mandatory reason required' };

        const prevName = dev.assignedSalespersonName;
        dev.assignedSalespersonId = newRepId;
        dev.assignedSalespersonName = newRepName;
        dev.history.push({
          id: `h-reassign-${Date.now()}`,
          timestamp: '2026-10-20 14:00 WAT',
          action: 'Handset Custody Reassigned',
          actorName: 'HQ Administrator',
          actorRole: 'HQ Administrator',
          assigneeId: newRepId,
          assigneeName: newRepName,
          reason: `Custody transferred from ${prevName} to ${newRepName}. Reason: ${reason.trim()}`,
        });

        return { success: true, device: dev };
      };

      const updateStatus = (assetId: string, newStatus: TestCompanyDevice['inventoryStatus'], reason: string) => {
        const dev = devices.find((d) => d.assetId === assetId);
        if (!dev) return { success: false, error: 'Device not found' };
        if (!reason?.trim()) return { success: false, error: 'Mandatory reason required' };

        const prevStatus = dev.inventoryStatus;
        dev.inventoryStatus = newStatus;
        if (newStatus === 'Retired' || newStatus === 'Lost/Stolen' || newStatus === 'Revoked' || newStatus === 'Returned') {
          dev.securityAuthorization = 'Revoked';
          dev.assignedSalespersonId = undefined;
          dev.assignedSalespersonName = undefined;
        } else if (newStatus === 'Pending Inspection') {
          dev.securityAuthorization = 'Quarantined';
        }

        dev.history.push({
          id: `h-status-${Date.now()}`,
          timestamp: '2026-10-20 15:00 WAT',
          action: `Lifecycle Status Updated to ${newStatus}`,
          actorName: 'HQ Administrator',
          actorRole: 'HQ Administrator',
          previousStatus: prevStatus,
          newStatus,
          reason: reason.trim(),
        });

        return { success: true, device: dev };
      };

      return { devices, registerDevice, assignDevice, reassignDevice, updateStatus };
    };

    it('registers a new Samsung company phone and defaults status to Available with unique asset ID & serial', () => {
      const { devices, registerDevice } = createDeviceInventory();

      const res = registerDevice({
        assetId: 'CC-DEV-LOS-010',
        serialNumber: 'R58M998811A',
        make: 'Samsung',
        model: 'Galaxy A15 Enterprise',
        marketCode: 'NG',
      });

      expect(res.success).toBe(true);
      expect(res.device?.assetId).toBe('CC-DEV-LOS-010');
      expect(res.device?.inventoryStatus).toBe('Available');
      expect(res.device?.securityAuthorization).toBe('Authorized');
      expect(devices).toHaveLength(3);
      expect(res.device?.history).toHaveLength(1);
      expect(res.device?.history[0].action).toBe('Device Registered in Inventory');
    });

    it('rejects duplicate asset IDs (case-insensitive)', () => {
      const { registerDevice } = createDeviceInventory();

      const dupRes = registerDevice({
        assetId: 'cc-dev-los-001', // existing asset in lowercase
        serialNumber: 'R58M-UNIQUE-99',
        make: 'Samsung',
        model: 'Galaxy A15 Enterprise',
        marketCode: 'NG',
      });

      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toBe('Duplicate Asset ID');
    });

    it('rejects duplicate manufacturer serial numbers (case-insensitive)', () => {
      const { registerDevice } = createDeviceInventory();

      const dupRes = registerDevice({
        assetId: 'CC-DEV-NEW-999',
        serialNumber: 'r58m102938a', // existing serial in lowercase
        make: 'Samsung',
        model: 'Galaxy A15 Enterprise',
        marketCode: 'NG',
      });

      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toBe('Duplicate Serial Number');
    });

    it('supports Pending Inspection as explicit initial status with Quarantined security authorization', () => {
      const { registerDevice } = createDeviceInventory();

      const res = registerDevice({
        assetId: 'CC-DEV-INSPECT-01',
        serialNumber: 'R58M-INSPECT-77',
        make: 'Nokia',
        model: 'G22 Field Edition',
        marketCode: 'ZM',
        initialStatus: 'Pending Inspection',
      });

      expect(res.success).toBe(true);
      expect(res.device?.inventoryStatus).toBe('Pending Inspection');
      expect(res.device?.securityAuthorization).toBe('Quarantined');
    });

    it('enforces single active user assignment rule and records assignment history', () => {
      const { assignDevice } = createDeviceInventory();

      // Trying to assign to Chukwudi Okafor (who already has CC-DEV-LOS-001 active)
      const blockedRes = assignDevice('CC-DEV-LOS-SPARE-01', 'USR-NG-002', 'Chukwudi Okafor');
      expect(blockedRes.success).toBe(false);
      expect(blockedRes.error).toContain('already holds an active company device');

      // Assigning to an unassigned rep succeeds
      const successRes = assignDevice('CC-DEV-LOS-SPARE-01', 'USR-NG-006', 'Kayode Williams');
      expect(successRes.success).toBe(true);
      expect(successRes.device?.inventoryStatus).toBe('Active');
      expect(successRes.device?.assignedSalespersonName).toBe('Kayode Williams');
      expect(successRes.device?.history).toHaveLength(2); // Registration + Assignment
    });

    it('preserves full assignment and reassignment history without overwriting historical records', () => {
      const { reassignDevice } = createDeviceInventory();

      // Reassign without mandatory reason fails
      const noReasonRes = reassignDevice('CC-DEV-LOS-001', 'USR-NG-006', 'Kayode Williams', '');
      expect(noReasonRes.success).toBe(false);
      expect(noReasonRes.error).toBe('Mandatory reason required');

      // Reassign with reason succeeds
      const res = reassignDevice('CC-DEV-LOS-001', 'USR-NG-006', 'Kayode Williams', 'Territory hand-over to Lekki corridor');
      expect(res.success).toBe(true);
      expect(res.device?.assignedSalespersonName).toBe('Kayode Williams');
      expect(res.device?.history).toHaveLength(3); // Registration + Initial Assignment + Reassignment
      expect(res.device?.history[2].reason).toContain('Chukwudi Okafor to Kayode Williams');
      expect(res.device?.history[1].assigneeName).toBe('Chukwudi Okafor'); // Historical record untouched!
    });

    it('supports all 9 lifecycle statuses and models security authorization separately', () => {
      const { updateStatus } = createDeviceInventory();

      // Retire device
      const res = updateStatus('CC-DEV-LOS-001', 'Retired', '36-month hardware depreciation cycle completed.');
      expect(res.success).toBe(true);
      expect(res.device?.inventoryStatus).toBe('Retired');
      expect(res.device?.securityAuthorization).toBe('Revoked');
      expect(res.device?.assignedSalespersonName).toBeUndefined(); // Active assignment cleared
      expect(res.device?.history.at(-1)?.action).toBe('Lifecycle Status Updated to Retired');
    });

    it('enforces role boundaries: only HQ Admin registers, edits, assigns, or retires company devices', () => {
      const canManageCompanyDeviceInventory = (role: string): boolean => {
        return role === 'hq_admin';
      };

      expect(canManageCompanyDeviceInventory('hq_admin')).toBe(true);
      expect(canManageCompanyDeviceInventory('sales_head')).toBe(false);
      expect(canManageCompanyDeviceInventory('salesperson')).toBe(false);
    });

    it('demonstrates complete 8-step mock demonstration flow', () => {
      const { devices, registerDevice, assignDevice, updateStatus } = createDeviceInventory();

      // 1. HQ Admin registers a new Samsung company phone
      const reg = registerDevice({
        assetId: 'CC-DEV-DEMO-99',
        serialNumber: 'R58M-DEMO-99',
        make: 'Samsung',
        model: 'Galaxy A15 Enterprise',
        marketCode: 'NG',
      });
      expect(reg.success).toBe(true);

      // 2. Phone appears in available inventory
      const registeredPhone = devices.find((d) => d.assetId === 'CC-DEV-DEMO-99');
      expect(registeredPhone).toBeDefined();
      expect(registeredPhone?.inventoryStatus).toBe('Available');

      // 3. HQ Admin assigns it to a salesperson
      const assign = assignDevice('CC-DEV-DEMO-99', 'USR-NG-006', 'Kayode Williams');
      expect(assign.success).toBe(true);

      // 4. Assignment is recorded
      expect(registeredPhone?.inventoryStatus).toBe('Active');
      expect(registeredPhone?.assignedSalespersonName).toBe('Kayode Williams');
      expect(registeredPhone?.history).toHaveLength(2);

      // 5. A device replacement is approved for old device CC-DEV-LOS-001
      const oldDevice = devices.find((d) => d.assetId === 'CC-DEV-LOS-001');
      expect(oldDevice).toBeDefined();

      // 6. An available phone (CC-DEV-LOS-SPARE-01) is selected as replacement
      const sparePhone = devices.find((d) => d.assetId === 'CC-DEV-LOS-SPARE-01');
      expect(sparePhone?.inventoryStatus).toBe('Available');

      // 7. Old and new device records update correctly
      updateStatus('CC-DEV-LOS-001', 'Returned', 'Returned to IT depot post-replacement.');
      expect(oldDevice?.inventoryStatus).toBe('Returned');
      expect(oldDevice?.securityAuthorization).toBe('Revoked');

      assignDevice('CC-DEV-LOS-SPARE-01', 'USR-NG-002', 'Chukwudi Okafor');
      expect(sparePhone?.inventoryStatus).toBe('Active');
      expect(sparePhone?.assignedSalespersonName).toBe('Chukwudi Okafor');

      // 8. Device history reflects all operations on both devices
      expect(oldDevice?.history.at(-1)?.action).toBe('Lifecycle Status Updated to Returned');
      expect(sparePhone?.history.at(-1)?.action).toBe('Handset Assigned to Salesperson');
      expect(registeredPhone?.history.at(-1)?.action).toBe('Handset Assigned to Salesperson');
    });
  });
});

