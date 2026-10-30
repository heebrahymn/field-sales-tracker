import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MarketCode } from './AuthContext';
import { adminService, HqDeviceRecord, HqDeviceReplacementItem } from '@/services/adminService';

export type ReplacementRequestStatus =
  | 'Pending Review'
  | 'Approved'
  | 'Rejected'
  | 'Awaiting Spare'
  | 'Dispatched'
  | 'Awaiting Activation'
  | 'Completed';

export type DeviceIssueCategory =
  | 'camera_defect'
  | 'gps_failure'
  | 'screen_damage'
  | 'battery_charging_fault'
  | 'lost_or_stolen'
  | 'other';

export type DeviceInventoryStatus =
  | 'Available'
  | 'Assigned'
  | 'Active'
  | 'Pending Inspection'
  | 'Under Maintenance'
  | 'Lost/Stolen'
  | 'Returned'
  | 'Revoked'
  | 'Retired';

export type SecurityAuthorizationStatus =
  | 'Authorized'
  | 'Pending Activation'
  | 'Revoked'
  | 'Quarantined';

export interface DeviceAuditHistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  actorName: string;
  actorRole: string;
  previousStatus?: DeviceInventoryStatus;
  newStatus?: DeviceInventoryStatus;
  assigneeId?: string;
  assigneeName?: string;
  reason?: string;
}

export interface CompanyDevice {
  id: string;
  assetId: string;
  assetTag: string; // alias for assetId
  make: string;
  model: string;
  serialNumber: string;
  marketCode: MarketCode;
  marketName: string;
  inventoryStatus: DeviceInventoryStatus;
  securityAuthorization: SecurityAuthorizationStatus;
  // Optional enterprise metadata
  imei?: string;
  osVersion?: string;
  purchaseDate?: string;
  supplier?: string;
  warrantyExpiryDate?: string;
  notes?: string;
  // Assignment
  assignedSalespersonId?: string;
  assignedSalespersonName?: string;
  assignedDate?: string;
  // Simulated hardware telemetry
  batteryHealth?: number;
  lastSync?: string;
  enrolledDate?: string;
  knoxSecurityEnrolled?: boolean;
  // Audit
  registeredBy: string;
  registeredAt: string;
  history: DeviceAuditHistoryEntry[];
}

export interface RegisterDeviceInput {
  assetId: string;
  make: string;
  model: string;
  serialNumber: string;
  marketCode: MarketCode;
  initialStatus?: 'Available' | 'Pending Inspection';
  imei?: string;
  osVersion?: string;
  purchaseDate?: string;
  supplier?: string;
  warrantyExpiryDate?: string;
  notes?: string;
}

export interface ReplacementHistoryEntry {
  timestamp: string;
  action: string;
  actorName: string;
  actorRole: string;
  notes?: string;
}

export interface DeviceReplacementRequest {
  id: string;
  salespersonId: string;
  salespersonName: string;
  marketCode: MarketCode;
  marketName: string;
  companyDeviceAssetId: string;
  deviceModel: string;
  issueCategory: DeviceIssueCategory;
  issueDescription: string;
  submittedAt: string;
  supportingEvidence?: string;
  status: ReplacementRequestStatus;
  replacementDeviceAssetId?: string;
  replacementDeviceModel?: string;
  approvalReason?: string;
  rejectionReason?: string;
  dispatchNotes?: string;
  activationConfirmedAt?: string;
  oldDeviceDisposition?: 'revoked' | 'returned_to_depot' | 'quarantined' | 'lost_reported';
  history: ReplacementHistoryEntry[];
}

export interface SpareDevice {
  assetId: string;
  imei: string;
  make: string;
  model: string;
  marketCode: MarketCode;
  depotLocation: string;
  status: 'available_in_depot' | 'dispatched' | 'assigned';
}

const isTestEnv =
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
  (typeof window !== 'undefined' && (window as any).__VITEST__);

// Minimal fixtures for Vitest isolated unit tests only
const TEST_COMPANY_DEVICES: CompanyDevice[] = [
  {
    id: 'DEV-NG-001',
    assetId: 'CC-DEV-LAG-014',
    assetTag: 'CC-DEV-LAG-014',
    make: 'Samsung',
    model: 'Galaxy A15',
    serialNumber: 'R58M102938A',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    inventoryStatus: 'Active',
    securityAuthorization: 'Authorized',
    assignedSalespersonId: 'CC-REP-042',
    assignedSalespersonName: 'Tunde Adebayo',
    registeredBy: 'HQ Administrator',
    registeredAt: '2026-10-15 10:00 WAT',
    history: [],
  },
  {
    id: 'DEV-NG-SPARE',
    assetId: 'CC-DEV-LAG-003',
    assetTag: 'CC-DEV-LAG-003',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: 'R58M102938Z',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    inventoryStatus: 'Available',
    securityAuthorization: 'Authorized',
    registeredBy: 'HQ Administrator',
    registeredAt: '2026-10-15 10:00 WAT',
    history: [],
  },
];

const TEST_REQUESTS: DeviceReplacementRequest[] = [
  {
    id: 'REQ-TEST-001',
    salespersonId: 'CC-REP-042',
    salespersonName: 'Tunde Adebayo',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    companyDeviceAssetId: 'CC-DEV-LAG-014',
    deviceModel: 'Samsung Galaxy A15',
    issueCategory: 'camera_defect',
    issueDescription: 'Autofocus sensor shattered.',
    submittedAt: '2026-10-15 08:30 WAT',
    status: 'Pending Review',
    history: [],
  },
];

export const mapHqDeviceToCompanyDevice = (d: HqDeviceRecord): CompanyDevice => {
  const marketName =
    d.marketCode === 'NG'
      ? 'Nigeria (Lagos Hub)'
      : d.marketCode === 'ZM'
      ? 'Zambia (Lusaka Hub)'
      : 'Malawi (Blantyre Hub)';

  let inventoryStatus: DeviceInventoryStatus = 'Available';
  if (d.inventoryStatus === 'assigned') inventoryStatus = 'Assigned';
  else if (d.inventoryStatus === 'active') inventoryStatus = 'Active';
  else if (d.inventoryStatus === 'under_maintenance') inventoryStatus = 'Under Maintenance';
  else if (d.inventoryStatus === 'pending_inspection') inventoryStatus = 'Pending Inspection';
  else if (d.inventoryStatus === 'lost_stolen') inventoryStatus = 'Lost/Stolen';
  else if (d.inventoryStatus === 'returned') inventoryStatus = 'Returned';
  else if (d.inventoryStatus === 'revoked') inventoryStatus = 'Revoked';
  else if (d.inventoryStatus === 'retired') inventoryStatus = 'Retired';
  else inventoryStatus = 'Available';

  return {
    id: d.id,
    assetId: d.assetTag,
    assetTag: d.assetTag,
    make: d.make,
    model: d.model,
    serialNumber: d.serialNumber,
    marketCode: d.marketCode as MarketCode,
    marketName,
    inventoryStatus,
    securityAuthorization: 'Authorized',
    imei: d.imei,
    osVersion: d.osVersion,
    purchaseDate: d.purchaseDate,
    supplier: d.supplier,
    warrantyExpiryDate: d.warrantyExpiryDate,
    notes: d.notes,
    assignedSalespersonId: d.assignedTo?.salespersonId,
    assignedSalespersonName: d.assignedTo?.fullName,
    assignedDate: d.assignedTo?.assignedAt ? d.assignedTo.assignedAt.slice(0, 10) : undefined,
    batteryHealth: 100,
    lastSync: 'Live Connected',
    enrolledDate: d.createdAt ? d.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    knoxSecurityEnrolled: true,
    registeredBy: 'HQ Administrator',
    registeredAt: d.createdAt ? d.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    history: [],
  };
};

export const mapHqReplacementToContextRequest = (r: HqDeviceReplacementItem): DeviceReplacementRequest => {
  const marketName =
    r.marketCode === 'NG'
      ? 'Nigeria (Lagos)'
      : r.marketCode === 'ZM'
      ? 'Zambia (Lusaka)'
      : 'Malawi (Blantyre)';

  let status: ReplacementRequestStatus = 'Pending Review';
  if (r.status === 'approved') status = 'Approved';
  else if (r.status === 'rejected') status = 'Rejected';
  else if (r.status === 'awaiting_spare') status = 'Awaiting Spare';
  else if (r.status === 'dispatched') status = 'Dispatched';
  else if (r.status === 'awaiting_activation') status = 'Awaiting Activation';
  else if (r.status === 'completed') status = 'Completed';
  else status = 'Pending Review';

  return {
    id: r.id,
    salespersonId: r.salespersonId,
    salespersonName: r.salespersonName,
    marketCode: r.marketCode as MarketCode,
    marketName,
    companyDeviceAssetId: r.currentDeviceTag || 'DEV-TAG',
    deviceModel: r.currentDeviceModel || 'Samsung Galaxy A15 Enterprise',
    issueCategory: (r.issueCategory as DeviceIssueCategory) || 'other',
    issueDescription: r.issueDescription || '',
    submittedAt: r.submittedAt,
    status,
    replacementDeviceAssetId: r.replacementDeviceTag || undefined,
    rejectionReason: r.rejectionReason || undefined,
    dispatchNotes: r.dispatchNotes || undefined,
    history: (r.history || []).map((h) => ({
      timestamp: h.createdAt,
      action: h.newStatus,
      actorName: h.changedByName || 'HQ Administrator',
      actorRole: 'HQ Administrator',
      notes: h.notes || undefined,
    })),
  };
};

interface DeviceReplacementContextType {
  // Device Fleet Inventory
  devices: CompanyDevice[];
  refreshDevices: () => Promise<void>;
  registerDevice: (data: RegisterDeviceInput) => { success: boolean; error?: string; device?: CompanyDevice };
  assignDevice: (assetId: string, salespersonId: string, salespersonName: string, reason?: string, supersedeExisting?: boolean) => { success: boolean; error?: string };
  reassignDevice: (assetId: string, newSalespersonId: string, newSalespersonName: string, reason: string) => { success: boolean; error?: string };
  updateDeviceLifecycleStatus: (assetId: string, newStatus: DeviceInventoryStatus, reason: string) => { success: boolean; error?: string };

  // Replacement Requests & Queue
  replacementRequests: DeviceReplacementRequest[];
  refreshRequests: () => Promise<void>;
  spareInventory: SpareDevice[];
  submitReplacementRequest: (data: {
    salespersonId: string;
    salespersonName: string;
    marketCode: MarketCode;
    marketName: string;
    companyDeviceAssetId: string;
    deviceModel: string;
    issueCategory: DeviceIssueCategory;
    issueDescription: string;
    supportingEvidence?: string;
  }) => DeviceReplacementRequest;
  approveRequest: (requestId: string, approvalReason: string) => void;
  rejectRequest: (requestId: string, rejectionReason: string) => void;
  assignSpareDevice: (requestId: string, spareAssetId: string) => void;
  recordDispatch: (requestId: string, dispatchNotes: string) => void;
  confirmDeviceActivation: (
    requestId: string,
    oldDeviceDisposition: 'revoked' | 'returned_to_depot' | 'quarantined'
  ) => void;
  closeRequest: (requestId: string) => void;
  getRequestsForSalesperson: (salespersonId: string) => DeviceReplacementRequest[];
}

const DeviceReplacementContext = createContext<DeviceReplacementContextType | undefined>(undefined);

export const DeviceReplacementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<CompanyDevice[]>(() => isTestEnv ? TEST_COMPANY_DEVICES : []);
  const [replacementRequests, setReplacementRequests] = useState<DeviceReplacementRequest[]>(() => isTestEnv ? TEST_REQUESTS : []);

  const refreshDevices = useCallback(async () => {
    if (isTestEnv) return;
    try {
      const { data } = await adminService.getHqDevices();
      if (data && data.length > 0) {
        setDevices(data.map(mapHqDeviceToCompanyDevice));
      }
    } catch (err) {
      console.warn('[DeviceReplacementContext] Error fetching live devices:', err);
    }
  }, []);

  const refreshRequests = useCallback(async () => {
    if (isTestEnv) return;
    try {
      const { data } = await adminService.getHqDeviceReplacements();
      if (data && data.length > 0) {
        setReplacementRequests(data.map(mapHqReplacementToContextRequest));
      }
    } catch (err) {
      console.warn('[DeviceReplacementContext] Error fetching live replacements:', err);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    refreshRequests();
  }, [refreshDevices, refreshRequests]);

  // Derived Spare Inventory from Available / Returned Company Devices
  const spareInventory: SpareDevice[] = devices
    .filter((d) => d.inventoryStatus === 'Available' || d.inventoryStatus === 'Returned')
    .map((d) => ({
      assetId: d.assetId,
      imei: d.imei || '358941098999000',
      make: d.make,
      model: d.model,
      marketCode: d.marketCode,
      depotLocation:
        d.marketCode === 'NG'
          ? 'Lagos IT Logistics Depot'
          : d.marketCode === 'ZM'
          ? 'Lusaka Regional Hub Depot'
          : 'Blantyre Regional Depot',
      status: 'available_in_depot',
    }));

  // 1. Register New Device (HQ Admin Only)
  const registerDevice = (data: RegisterDeviceInput): { success: boolean; error?: string; device?: CompanyDevice } => {
    // Required fields validation
    if (!data.assetId?.trim()) {
      return { success: false, error: 'Asset ID is required.' };
    }
    if (!data.make?.trim()) {
      return { success: false, error: 'Device make is required.' };
    }
    if (!data.model?.trim()) {
      return { success: false, error: 'Device model is required.' };
    }
    if (!data.serialNumber?.trim()) {
      return { success: false, error: 'Manufacturer serial number is required.' };
    }
    if (!data.marketCode) {
      return { success: false, error: 'Assigned market is required.' };
    }

    // Asset ID uniqueness check (case-insensitive)
    const normalizedAssetId = data.assetId.trim();
    const isDuplicateAssetId = devices.some(
      (d) => d.assetId.toLowerCase() === normalizedAssetId.toLowerCase()
    );
    if (isDuplicateAssetId) {
      return {
        success: false,
        error: `Duplicate Asset ID: A company device with Asset ID '${normalizedAssetId}' is already registered.`,
      };
    }

    // Manufacturer Serial Number uniqueness check (case-insensitive)
    const normalizedSerial = data.serialNumber.trim();
    const isDuplicateSerial = devices.some(
      (d) => d.serialNumber.toLowerCase() === normalizedSerial.toLowerCase()
    );
    if (isDuplicateSerial) {
      return {
        success: false,
        error: `Duplicate Serial Number: A company device with serial number '${normalizedSerial}' already exists in inventory.`,
      };
    }

    // Initial status defaults to Available unless marked Pending Inspection
    const initialStatus: DeviceInventoryStatus = data.initialStatus === 'Pending Inspection' ? 'Pending Inspection' : 'Available';
    const securityStatus: SecurityAuthorizationStatus = initialStatus === 'Pending Inspection' ? 'Quarantined' : 'Authorized';
    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} WAT`;
    const marketName =
      data.marketCode === 'NG'
        ? 'Nigeria (Lagos Hub)'
        : data.marketCode === 'ZM'
        ? 'Zambia (Lusaka Hub)'
        : 'Malawi (Blantyre Hub)';

    const newDevice: CompanyDevice = {
      id: `DEV-NEW-${Date.now()}`,
      assetId: normalizedAssetId,
      assetTag: normalizedAssetId,
      make: data.make.trim(),
      model: data.model.trim(),
      serialNumber: normalizedSerial,
      marketCode: data.marketCode,
      marketName,
      inventoryStatus: initialStatus,
      securityAuthorization: securityStatus,
      imei: data.imei?.trim(),
      osVersion: data.osVersion?.trim() || 'Android 14 / One UI 6.0',
      purchaseDate: data.purchaseDate?.trim() || new Date().toISOString().slice(0, 10),
      supplier: data.supplier?.trim() || 'Authorized Enterprise Channel',
      warrantyExpiryDate: data.warrantyExpiryDate?.trim(),
      notes: data.notes?.trim(),
      batteryHealth: 100,
      lastSync: 'Newly Registered (Never synched)',
      enrolledDate: new Date().toISOString().slice(0, 10),
      knoxSecurityEnrolled: true,
      registeredBy: 'HQ Administrator (HQ Admin)',
      registeredAt: timestamp,
      history: [
        {
          id: `hist-${Date.now()}-reg`,
          timestamp,
          action: 'Device Registered in Inventory',
          actorName: 'HQ Administrator',
          actorRole: 'HQ Administrator',
          newStatus: initialStatus,
          reason: data.notes || `Initial registration of company-owned ${data.make} ${data.model} with serial ${normalizedSerial}.`,
        },
      ],
    };

    setDevices((prev) => [newDevice, ...prev]);
    return { success: true, device: newDevice };
  };

  // 2. Assign Device to Salesperson (HQ Admin Only)
  const assignDevice = (
    assetId: string,
    salespersonId: string,
    salespersonName: string,
    reason?: string,
    supersedeExisting?: boolean
  ): { success: boolean; error?: string } => {
    const targetDevice = devices.find((d) => d.assetId === assetId);
    if (!targetDevice) {
      return { success: false, error: `Device with Asset ID ${assetId} not found.` };
    }

    if (targetDevice.inventoryStatus !== 'Available' && targetDevice.inventoryStatus !== 'Returned') {
      return {
        success: false,
        error: `Device cannot be assigned: Current status is '${targetDevice.inventoryStatus}'. Only 'Available' or 'Returned' devices can be assigned.`,
      };
    }

    // Enforce: A device cannot be simultaneously assigned to multiple active users
    const existingActiveDevice = devices.find(
      (d) =>
        d.assetId !== assetId &&
        d.assignedSalespersonId === salespersonId &&
        (d.inventoryStatus === 'Active' || d.inventoryStatus === 'Assigned')
    );
    if (existingActiveDevice && !supersedeExisting) {
      return {
        success: false,
        error: `Salesperson ${salespersonName} is already assigned to active device ${existingActiveDevice.assetId}. Please reassign or return the existing device first.`,
      };
    }

    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} WAT`;

    setDevices((prev) =>
      prev.map((d) => {
        // If superseding existing active device, return it to depot
        if (existingActiveDevice && d.assetId === existingActiveDevice.assetId) {
          return {
            ...d,
            inventoryStatus: 'Returned',
            assignedSalespersonId: undefined,
            assignedSalespersonName: undefined,
            history: [
              ...d.history,
              {
                id: `hist-${Date.now()}-superseded`,
                timestamp,
                action: 'Handset Custody Superseded & Returned to Depot',
                actorName: 'HQ Administrator',
                actorRole: 'HQ Administrator',
                previousStatus: d.inventoryStatus,
                newStatus: 'Returned',
                reason: `Custody superseded by assignment of company handset ${assetId} to ${salespersonName}.`,
              },
            ],
          };
        }
        if (d.assetId === assetId) {
          return {
            ...d,
            inventoryStatus: 'Active',
            securityAuthorization: 'Authorized',
            assignedSalespersonId: salespersonId,
            assignedSalespersonName: salespersonName,
            assignedDate: new Date().toISOString().slice(0, 10),
            history: [
              ...d.history,
              {
                id: `hist-${Date.now()}-assign`,
                timestamp,
                action: existingActiveDevice ? 'Handset Reassigned to Salesperson' : 'Handset Assigned to Salesperson',
                actorName: 'HQ Administrator',
                actorRole: 'HQ Administrator',
                previousStatus: d.inventoryStatus,
                newStatus: 'Active',
                assigneeId: salespersonId,
                assigneeName: salespersonName,
                reason: reason || (existingActiveDevice
                  ? `Reassigned to ${salespersonName} (${salespersonId}), superseding ${existingActiveDevice.assetId}.`
                  : `Assigned to ${salespersonName} (${salespersonId}) for field operations.`),
              },
            ],
          };
        }
        return d;
      })
    );

    return { success: true };
  };

  // 3. Reassign Device to Another Salesperson (with Confirmation & Audit History)
  const reassignDevice = (
    assetId: string,
    newSalespersonId: string,
    newSalespersonName: string,
    reason: string
  ): { success: boolean; error?: string } => {
    const targetDevice = devices.find((d) => d.assetId === assetId);
    if (!targetDevice) {
      return { success: false, error: `Device with Asset ID ${assetId} not found.` };
    }

    if (!reason?.trim()) {
      return { success: false, error: 'A mandatory reason is required to reassign a company device.' };
    }

    const previousSalesperson = targetDevice.assignedSalespersonName || 'Unassigned';
    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} WAT`;

    setDevices((prev) =>
      prev.map((d) => {
        if (d.assetId === assetId) {
          return {
            ...d,
            inventoryStatus: 'Active',
            securityAuthorization: 'Authorized',
            assignedSalespersonId: newSalespersonId,
            assignedSalespersonName: newSalespersonName,
            assignedDate: new Date().toISOString().slice(0, 10),
            history: [
              ...d.history,
              {
                id: `hist-${Date.now()}-reassign`,
                timestamp,
                action: 'Handset Custody Reassigned',
                actorName: 'HQ Administrator',
                actorRole: 'HQ Administrator',
                previousStatus: d.inventoryStatus,
                newStatus: 'Active',
                assigneeId: newSalespersonId,
                assigneeName: newSalespersonName,
                reason: `Custody transferred from ${previousSalesperson} to ${newSalespersonName}. Reason: ${reason.trim()}`,
              },
            ],
          };
        }
        return d;
      })
    );

    return { success: true };
  };

  // 4. Update Device Lifecycle Status (HQ Admin Only)
  const updateDeviceLifecycleStatus = (
    assetId: string,
    newStatus: DeviceInventoryStatus,
    reason: string
  ): { success: boolean; error?: string } => {
    const targetDevice = devices.find((d) => d.assetId === assetId);
    if (!targetDevice) {
      return { success: false, error: `Device with Asset ID ${assetId} not found.` };
    }

    if (!reason?.trim()) {
      return { success: false, error: 'A mandatory reason is required for status changes.' };
    }

    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} WAT`;
    let newSecurityStatus: SecurityAuthorizationStatus = targetDevice.securityAuthorization;

    if (newStatus === 'Retired' || newStatus === 'Lost/Stolen' || newStatus === 'Revoked' || newStatus === 'Returned') {
      newSecurityStatus = 'Revoked';
    } else if (newStatus === 'Pending Inspection') {
      newSecurityStatus = 'Quarantined';
    } else if (newStatus === 'Available' || newStatus === 'Active' || newStatus === 'Assigned') {
      newSecurityStatus = 'Authorized';
    }

    setDevices((prev) =>
      prev.map((d) => {
        if (d.assetId === assetId) {
          const updated: CompanyDevice = {
            ...d,
            inventoryStatus: newStatus,
            securityAuthorization: newSecurityStatus,
            // If retired, lost/stolen, available, or returned, clear active assignee
            assignedSalespersonId:
              newStatus === 'Retired' || newStatus === 'Lost/Stolen' || newStatus === 'Available' || newStatus === 'Returned'
                ? undefined
                : d.assignedSalespersonId,
            assignedSalespersonName:
              newStatus === 'Retired' || newStatus === 'Lost/Stolen' || newStatus === 'Available' || newStatus === 'Returned'
                ? undefined
                : d.assignedSalespersonName,
            history: [
              ...d.history,
              {
                id: `hist-${Date.now()}-status`,
                timestamp,
                action: `Lifecycle Status Updated to ${newStatus}`,
                actorName: 'HQ Administrator',
                actorRole: 'HQ Administrator',
                previousStatus: d.inventoryStatus,
                newStatus,
                reason: reason.trim(),
              },
            ],
          };
          return updated;
        }
        return d;
      })
    );

    return { success: true };
  };

  // 5. Salesperson submits directly to HQ Admin
  const submitReplacementRequest = (data: {
    salespersonId: string;
    salespersonName: string;
    marketCode: MarketCode;
    marketName: string;
    companyDeviceAssetId: string;
    deviceModel: string;
    issueCategory: DeviceIssueCategory;
    issueDescription: string;
    supportingEvidence?: string;
  }): DeviceReplacementRequest => {
    const newId = `REQ-REP-2026-0${replacementRequests.length + 1}`;
    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} Local`;

    const newRequest: DeviceReplacementRequest = {
      id: newId,
      salespersonId: data.salespersonId,
      salespersonName: data.salespersonName,
      marketCode: data.marketCode,
      marketName: data.marketName,
      companyDeviceAssetId: data.companyDeviceAssetId,
      deviceModel: data.deviceModel,
      issueCategory: data.issueCategory,
      issueDescription: data.issueDescription,
      submittedAt: timestamp,
      supportingEvidence: data.supportingEvidence,
      status: 'Pending Review',
      history: [
        {
          timestamp,
          action: 'Request Submitted Directly to HQ Admin',
          actorName: data.salespersonName,
          actorRole: 'Salesperson',
          notes: 'Direct submission from salesperson mobile interface.',
        },
      ],
    };

    setReplacementRequests((prev) => [newRequest, ...prev]);
    return newRequest;
  };

  // 6. HQ Admin Approves Replacement Request
  const approveRequest = (requestId: string, approvalReason: string) => {
    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} WAT`;
    setReplacementRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'Approved',
            approvalReason,
            history: [
              ...r.history,
              {
                timestamp,
                action: 'Request Approved by HQ Admin',
                actorName: 'HQ Administrator',
                actorRole: 'HQ Administrator',
                notes: `Approval Reason: ${approvalReason}`,
              },
            ],
          };
        }
        return r;
      })
    );
  };

  // 7. HQ Admin Rejects Replacement Request
  const rejectRequest = (requestId: string, rejectionReason: string) => {
    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} WAT`;
    setReplacementRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'Rejected',
            rejectionReason,
            history: [
              ...r.history,
              {
                timestamp,
                action: 'Request Rejected by HQ Admin',
                actorName: 'HQ Administrator',
                actorRole: 'HQ Administrator',
                notes: `Mandatory Reason: ${rejectionReason}`,
              },
            ],
          };
        }
        return r;
      })
    );
  };

  // 8. HQ Admin Allocates Spare Handset for Replacement
  const assignSpareDevice = (requestId: string, spareAssetId: string) => {
    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} WAT`;
    const spare = devices.find((d) => d.assetId === spareAssetId);

    // Update the replacement device in inventory
    setDevices((prev) =>
      prev.map((d) => {
        if (d.assetId === spareAssetId) {
          return {
            ...d,
            inventoryStatus: 'Assigned',
            history: [
              ...d.history,
              {
                id: `hist-${Date.now()}-alloc`,
                timestamp,
                action: 'Allocated as Replacement Handset',
                actorName: 'HQ Administrator',
                actorRole: 'HQ Administrator',
                previousStatus: d.inventoryStatus,
                newStatus: 'Assigned',
                reason: `Allocated for approved replacement request ${requestId}.`,
              },
            ],
          };
        }
        return d;
      })
    );

    // Update the replacement request
    setReplacementRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            replacementDeviceAssetId: spareAssetId,
            replacementDeviceModel: spare ? `${spare.make} ${spare.model}` : 'Samsung Galaxy A15 Enterprise',
            status: 'Awaiting Spare',
            history: [
              ...r.history,
              {
                timestamp,
                action: 'Spare Handset Allocated from Depot',
                actorName: 'HQ Administrator',
                actorRole: 'HQ Administrator',
                notes: `Allocated Asset ${spareAssetId} from depot inventory.`,
              },
            ],
          };
        }
        return r;
      })
    );
  };

  // 9. HQ Admin Records Courier Dispatch
  const recordDispatch = (requestId: string, dispatchNotes: string) => {
    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} WAT`;
    setReplacementRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'Dispatched',
            dispatchNotes,
            history: [
              ...r.history,
              {
                timestamp,
                action: 'Replacement Device Dispatched',
                actorName: 'HQ Administrator',
                actorRole: 'HQ Administrator',
                notes: `Dispatch Logistics: ${dispatchNotes}`,
              },
            ],
          };
        }
        return r;
      })
    );
  };

  // 10. HQ Admin Confirms Activation & Disposes Old Device
  const confirmDeviceActivation = (
    requestId: string,
    oldDeviceDisposition: 'revoked' | 'returned_to_depot' | 'quarantined'
  ) => {
    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} WAT`;
    const targetRequest = replacementRequests.find((r) => r.id === requestId);

    if (targetRequest) {
      // 1. Update replacement device in fleet inventory to Active & Assigned to Salesperson
      if (targetRequest.replacementDeviceAssetId) {
        setDevices((prev) =>
          prev.map((d) => {
            if (d.assetId === targetRequest.replacementDeviceAssetId) {
              return {
                ...d,
                inventoryStatus: 'Active',
                securityAuthorization: 'Authorized',
                assignedSalespersonId: targetRequest.salespersonId,
                assignedSalespersonName: targetRequest.salespersonName,
                assignedDate: new Date().toISOString().slice(0, 10),
                history: [
                  ...d.history,
                  {
                    id: `hist-${Date.now()}-act`,
                    timestamp,
                    action: 'Replacement Handset Activated in MDM',
                    actorName: 'HQ Administrator',
                    actorRole: 'HQ Administrator',
                    previousStatus: d.inventoryStatus,
                    newStatus: 'Active',
                    assigneeId: targetRequest.salespersonId,
                    assigneeName: targetRequest.salespersonName,
                    reason: `Knox MDM activation confirmed following delivery to ${targetRequest.salespersonName}.`,
                  },
                ],
              };
            }
            return d;
          })
        );
      }

      // 2. Update old device disposition
      const oldAssetId = targetRequest.companyDeviceAssetId;
      const oldNewStatus: DeviceInventoryStatus =
        oldDeviceDisposition === 'returned_to_depot'
          ? 'Returned'
          : oldDeviceDisposition === 'quarantined'
          ? 'Pending Inspection'
          : 'Revoked';

      const oldSecurityStatus: SecurityAuthorizationStatus =
        oldDeviceDisposition === 'quarantined' ? 'Quarantined' : 'Revoked';

      setDevices((prev) =>
        prev.map((d) => {
          if (d.assetId === oldAssetId) {
            return {
              ...d,
              inventoryStatus: oldNewStatus,
              securityAuthorization: oldSecurityStatus,
              assignedSalespersonId: undefined,
              assignedSalespersonName: undefined,
              history: [
                ...d.history,
                {
                  id: `hist-${Date.now()}-disp`,
                  timestamp,
                  action: `Old Handset Disposition: ${oldDeviceDisposition}`,
                  actorName: 'HQ Administrator',
                  actorRole: 'HQ Administrator',
                  previousStatus: d.inventoryStatus,
                  newStatus: oldNewStatus,
                  reason: `De-enrolled following successful replacement with ${targetRequest.replacementDeviceAssetId}.`,
                },
              ],
            };
          }
          return d;
        })
      );
    }

    setReplacementRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'Completed',
            activationConfirmedAt: timestamp,
            oldDeviceDisposition,
            history: [
              ...r.history,
              {
                timestamp,
                action: 'New Device Activated in MDM',
                actorName: 'HQ Administrator',
                actorRole: 'HQ Administrator',
                notes: `Replacement handset activated with Knox enterprise policy. Old handset ${r.companyDeviceAssetId} marked as ${oldDeviceDisposition}.`,
              },
            ],
          };
        }
        return r;
      })
    );
  };

  // 11. HQ Admin Marks Replacement Request Completed
  const closeRequest = (requestId: string) => {
    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} WAT`;
    setReplacementRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'Completed',
            history: [
              ...r.history,
              {
                timestamp,
                action: 'Replacement Request Closed & Completed',
                actorName: 'HQ Administrator',
                actorRole: 'HQ Administrator',
                notes: 'Chain of custody confirmed. Replacement cycle complete.',
              },
            ],
          };
        }
        return r;
      })
    );
  };

  // Helper for salesperson view
  const getRequestsForSalesperson = (salespersonId: string) => {
    return replacementRequests.filter((r) => r.salespersonId === salespersonId);
  };

  return (
    <DeviceReplacementContext.Provider
      value={{
        devices,
        refreshDevices,
        registerDevice,
        assignDevice,
        reassignDevice,
        updateDeviceLifecycleStatus,
        replacementRequests,
        refreshRequests,
        spareInventory,
        submitReplacementRequest,
        approveRequest,
        rejectRequest,
        assignSpareDevice,
        recordDispatch,
        confirmDeviceActivation,
        closeRequest,
        getRequestsForSalesperson,
      }}
    >
      {children}
    </DeviceReplacementContext.Provider>
  );
};

export const useDeviceReplacement = (): DeviceReplacementContextType => {
  const context = useContext(DeviceReplacementContext);
  if (!context) {
    throw new Error('useDeviceReplacement must be used within a DeviceReplacementProvider');
  }
  return context;
};
