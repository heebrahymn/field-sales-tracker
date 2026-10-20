import React, { createContext, useContext, useState } from 'react';
import { MarketCode } from './AuthContext';

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

const INITIAL_COMPANY_DEVICES: CompanyDevice[] = [
  // Nigeria (Lagos Hub) Fleet
  {
    id: 'DEV-NG-001',
    assetId: 'CC-DEV-LOS-001',
    assetTag: 'CC-DEV-LOS-001',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: 'R58M102938A',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    inventoryStatus: 'Active',
    securityAuthorization: 'Authorized',
    imei: '864209051234561',
    osVersion: 'Android 14 / One UI 6.0',
    purchaseDate: '2025-01-10',
    supplier: 'Samsung West Africa Direct',
    warrantyExpiryDate: '2027-01-10',
    assignedSalespersonId: 'USR-NG-002',
    assignedSalespersonName: 'Chukwudi Okafor',
    assignedDate: '2025-02-01',
    batteryHealth: 98,
    lastSync: '12 mins ago (14:01 WAT)',
    enrolledDate: '2025-01-20',
    knoxSecurityEnrolled: true,
    notes: 'Primary sales handset for Lagos Island and Lekki corridor.',
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-01-15 10:00 WAT',
    history: [
      {
        id: 'hist-ng001-1',
        timestamp: '2025-01-15 10:00 WAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
        reason: 'Initial batch procurement for Nigerian sales expansion.',
      },
      {
        id: 'hist-ng001-2',
        timestamp: '2025-02-01 08:30 WAT',
        action: 'Handset Assigned to Salesperson',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Available',
        newStatus: 'Active',
        assigneeId: 'USR-NG-002',
        assigneeName: 'Chukwudi Okafor',
        reason: 'Initial field deployment for Lagos Island territory.',
      },
    ],
  },
  {
    id: 'DEV-NG-002',
    assetId: 'CC-DEV-LOS-002',
    assetTag: 'CC-DEV-LOS-002',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: 'R58M102938B',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    inventoryStatus: 'Active',
    securityAuthorization: 'Authorized',
    imei: '864209051234562',
    osVersion: 'Android 14 / One UI 6.0',
    purchaseDate: '2025-01-10',
    supplier: 'Samsung West Africa Direct',
    warrantyExpiryDate: '2027-01-10',
    assignedSalespersonId: 'USR-NG-003',
    assignedSalespersonName: 'Amina Bello',
    assignedDate: '2025-02-10',
    batteryHealth: 94,
    lastSync: '4 mins ago (14:09 WAT)',
    enrolledDate: '2025-01-20',
    knoxSecurityEnrolled: true,
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-01-15 10:15 WAT',
    history: [
      {
        id: 'hist-ng002-1',
        timestamp: '2025-01-15 10:15 WAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
      },
      {
        id: 'hist-ng002-2',
        timestamp: '2025-02-10 09:00 WAT',
        action: 'Handset Assigned to Salesperson',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Available',
        newStatus: 'Active',
        assigneeId: 'USR-NG-003',
        assigneeName: 'Amina Bello',
      },
    ],
  },
  {
    id: 'DEV-NG-003',
    assetId: 'CC-DEV-LOS-003',
    assetTag: 'CC-DEV-LOS-003',
    make: 'Nokia',
    model: 'G22 Field Edition',
    serialNumber: 'NK22-901821-NG',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    inventoryStatus: 'Active',
    securityAuthorization: 'Authorized',
    imei: '864209051234563',
    osVersion: 'Android 13',
    purchaseDate: '2025-01-12',
    supplier: 'Nokia Enterprise Solutions',
    warrantyExpiryDate: '2026-07-12',
    assignedSalespersonId: 'USR-NG-004',
    assignedSalespersonName: 'Oluwaseun Fashola',
    assignedDate: '2025-03-01',
    batteryHealth: 89,
    lastSync: 'Yesterday (18:30 WAT)',
    enrolledDate: '2025-01-25',
    knoxSecurityEnrolled: true,
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-01-15 10:30 WAT',
    history: [
      {
        id: 'hist-ng003-1',
        timestamp: '2025-01-15 10:30 WAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
      },
      {
        id: 'hist-ng003-2',
        timestamp: '2025-03-01 08:45 WAT',
        action: 'Handset Assigned to Salesperson',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Available',
        newStatus: 'Active',
        assigneeId: 'USR-NG-004',
        assigneeName: 'Oluwaseun Fashola',
      },
    ],
  },
  {
    id: 'DEV-NG-004',
    assetId: 'CC-DEV-LAG-019',
    assetTag: 'CC-DEV-LAG-019',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: 'R58M102938C',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    inventoryStatus: 'Under Maintenance',
    securityAuthorization: 'Authorized',
    imei: '864209051999042',
    osVersion: 'Android 14 / One UI 6.0',
    purchaseDate: '2025-02-01',
    supplier: 'Samsung West Africa Direct',
    assignedSalespersonId: 'CC-NG-042',
    assignedSalespersonName: 'Tunde Adebayo',
    assignedDate: '2025-02-15',
    batteryHealth: 94,
    lastSync: 'Today, 08:05 WAT',
    enrolledDate: '2025-02-10',
    knoxSecurityEnrolled: true,
    notes: 'Camera defect reported on 2026-10-18. Viewfinder blank, replacement request REQ-REP-2026-001 in progress.',
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-02-05 11:00 WAT',
    history: [
      {
        id: 'hist-lag019-1',
        timestamp: '2025-02-05 11:00 WAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
      },
      {
        id: 'hist-lag019-2',
        timestamp: '2025-02-15 08:30 WAT',
        action: 'Handset Assigned to Salesperson',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Available',
        newStatus: 'Active',
        assigneeId: 'CC-NG-042',
        assigneeName: 'Tunde Adebayo',
      },
      {
        id: 'hist-lag019-3',
        timestamp: '2026-10-18 10:14 WAT',
        action: 'Lifecycle Status Updated to Under Maintenance',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Active',
        newStatus: 'Under Maintenance',
        reason: 'Salesperson reported camera hardware defect. Replacement dispatched.',
      },
    ],
  },
  {
    id: 'DEV-NG-SPARE-01',
    assetId: 'CC-DEV-LOS-SPARE-01',
    assetTag: 'CC-DEV-LOS-SPARE-01',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: 'R58M102938D',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    inventoryStatus: 'Available',
    securityAuthorization: 'Authorized',
    imei: '864209051999001',
    osVersion: 'Android 14 / One UI 6.0',
    purchaseDate: '2025-02-15',
    supplier: 'Samsung West Africa Direct',
    batteryHealth: 100,
    lastSync: 'Depot Stock (Never synched)',
    knoxSecurityEnrolled: true,
    notes: 'Hot spare stored in Lagos IT depot safe.',
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-02-20 09:30 WAT',
    history: [
      {
        id: 'hist-losspare-1',
        timestamp: '2025-02-20 09:30 WAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
        reason: 'Procured as hot replacement spare.',
      },
    ],
  },
  {
    id: 'DEV-NG-005',
    assetId: 'CC-DEV-LOS-007',
    assetTag: 'CC-DEV-LOS-007',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: 'R58M102938E',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    inventoryStatus: 'Returned',
    securityAuthorization: 'Revoked',
    imei: '864209051234567',
    osVersion: 'Android 14',
    purchaseDate: '2025-01-10',
    supplier: 'Samsung West Africa Direct',
    batteryHealth: 92,
    lastSync: '28 Sep 2026',
    knoxSecurityEnrolled: true,
    notes: 'Returned from Emeka Nwosu following resignation; undergoing IT data wipe.',
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-01-15 11:00 WAT',
    history: [
      {
        id: 'hist-ng007-1',
        timestamp: '2025-01-15 11:00 WAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
      },
      {
        id: 'hist-ng007-2',
        timestamp: '2025-02-01 09:00 WAT',
        action: 'Handset Assigned to Salesperson',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Available',
        newStatus: 'Active',
        assigneeId: 'USR-NG-005',
        assigneeName: 'Emeka Nwosu',
      },
      {
        id: 'hist-ng007-3',
        timestamp: '2026-09-30 16:00 WAT',
        action: 'Lifecycle Status Updated to Returned',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Active',
        newStatus: 'Returned',
        reason: 'Employee resignation. Handset returned to Lagos IT custody.',
      },
    ],
  },

  // Zambia (Lusaka Hub) Fleet
  {
    id: 'DEV-ZM-001',
    assetId: 'CC-DEV-LUS-004',
    assetTag: 'CC-DEV-LUS-004',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: 'R58M204911A',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka Hub)',
    inventoryStatus: 'Active',
    securityAuthorization: 'Authorized',
    imei: '358941098765431',
    osVersion: 'Android 14 / One UI 6.0',
    purchaseDate: '2025-01-15',
    supplier: 'Samsung Central Africa',
    assignedSalespersonId: 'USR-ZM-002',
    assignedSalespersonName: 'Kondwani Banda',
    assignedDate: '2025-02-15',
    batteryHealth: 96,
    lastSync: '8 mins ago (15:05 CAT)',
    knoxSecurityEnrolled: true,
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-01-20 14:00 CAT',
    history: [
      {
        id: 'hist-zm004-1',
        timestamp: '2025-01-20 14:00 CAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
      },
      {
        id: 'hist-zm004-2',
        timestamp: '2025-02-15 08:30 CAT',
        action: 'Handset Assigned to Salesperson',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Available',
        newStatus: 'Active',
        assigneeId: 'USR-ZM-002',
        assigneeName: 'Kondwani Banda',
      },
    ],
  },
  {
    id: 'DEV-ZM-002',
    assetId: 'CC-DEV-LUS-005',
    assetTag: 'CC-DEV-LUS-005',
    make: 'Nokia',
    model: 'G22 Field Edition',
    serialNumber: 'NK22-811902-ZM',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka Hub)',
    inventoryStatus: 'Active',
    securityAuthorization: 'Authorized',
    imei: '358941098765432',
    osVersion: 'Android 13',
    purchaseDate: '2025-01-15',
    supplier: 'Nokia Enterprise Solutions',
    assignedSalespersonId: 'USR-ZM-003',
    assignedSalespersonName: 'Thandiwe Tembo',
    assignedDate: '2025-03-05',
    batteryHealth: 91,
    lastSync: '25 mins ago (14:48 CAT)',
    knoxSecurityEnrolled: true,
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-01-20 14:30 CAT',
    history: [
      {
        id: 'hist-zm005-1',
        timestamp: '2025-01-20 14:30 CAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
      },
      {
        id: 'hist-zm005-2',
        timestamp: '2025-03-05 09:15 CAT',
        action: 'Handset Assigned to Salesperson',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Available',
        newStatus: 'Active',
        assigneeId: 'USR-ZM-003',
        assigneeName: 'Thandiwe Tembo',
      },
    ],
  },
  {
    id: 'DEV-ZM-003',
    assetId: 'CC-DEV-LUS-006',
    assetTag: 'CC-DEV-LUS-006',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: 'R58M204911B',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka Hub)',
    inventoryStatus: 'Under Maintenance',
    securityAuthorization: 'Authorized',
    imei: '358941098765433',
    osVersion: 'Android 14',
    purchaseDate: '2025-01-15',
    supplier: 'Samsung Central Africa',
    assignedSalespersonId: 'USR-ZM-004',
    assignedSalespersonName: 'Peter Mwale',
    assignedDate: '2025-03-10',
    batteryHealth: 68,
    lastSync: '4 days ago',
    knoxSecurityEnrolled: true,
    notes: 'Impact damage with shattered screen following fall on gravel depot. Replacement request REQ-REP-2026-002 pending review.',
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-01-20 15:00 CAT',
    history: [
      {
        id: 'hist-zm006-1',
        timestamp: '2025-01-20 15:00 CAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
      },
      {
        id: 'hist-zm006-2',
        timestamp: '2025-03-10 08:30 CAT',
        action: 'Handset Assigned to Salesperson',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Available',
        newStatus: 'Active',
        assigneeId: 'USR-ZM-004',
        assigneeName: 'Peter Mwale',
      },
      {
        id: 'hist-zm006-3',
        timestamp: '2026-10-19 14:32 CAT',
        action: 'Lifecycle Status Updated to Under Maintenance',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Active',
        newStatus: 'Under Maintenance',
        reason: 'Shattered front glass and unresponsive digitizer.',
      },
    ],
  },
  {
    id: 'DEV-ZM-SPARE-01',
    assetId: 'CC-DEV-LUS-SPARE-01',
    assetTag: 'CC-DEV-LUS-SPARE-01',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: 'R58M204911C',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka Hub)',
    inventoryStatus: 'Available',
    securityAuthorization: 'Authorized',
    imei: '358941098999001',
    osVersion: 'Android 14 / One UI 6.0',
    purchaseDate: '2025-02-10',
    supplier: 'Samsung Central Africa',
    batteryHealth: 100,
    lastSync: 'Depot Stock',
    knoxSecurityEnrolled: true,
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-02-15 11:30 CAT',
    history: [
      {
        id: 'hist-lusspare-1',
        timestamp: '2025-02-15 11:30 CAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
        reason: 'Procured for Lusaka regional depot reserve.',
      },
    ],
  },

  // Malawi (Blantyre Hub) Fleet
  {
    id: 'DEV-MW-001',
    assetId: 'CC-DEV-BLA-002',
    assetTag: 'CC-DEV-BLA-002',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: 'R58M309112A',
    marketCode: 'MW',
    marketName: 'Malawi (Blantyre Hub)',
    inventoryStatus: 'Active',
    securityAuthorization: 'Authorized',
    imei: '490154203237511',
    osVersion: 'Android 14 / One UI 6.0',
    purchaseDate: '2025-02-01',
    supplier: 'Samsung Direct Southeast Africa',
    assignedSalespersonId: 'USR-MW-002',
    assignedSalespersonName: 'Chifundo Phiri',
    assignedDate: '2025-03-10',
    batteryHealth: 97,
    lastSync: '18 mins ago (14:55 CAT)',
    knoxSecurityEnrolled: true,
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-02-10 10:00 CAT',
    history: [
      {
        id: 'hist-mw002-1',
        timestamp: '2025-02-10 10:00 CAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
      },
      {
        id: 'hist-mw002-2',
        timestamp: '2025-03-10 08:30 CAT',
        action: 'Handset Assigned to Salesperson',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Available',
        newStatus: 'Active',
        assigneeId: 'USR-MW-002',
        assigneeName: 'Chifundo Phiri',
      },
    ],
  },
  {
    id: 'DEV-MW-002',
    assetId: 'CC-DEV-BLA-003',
    assetTag: 'CC-DEV-BLA-003',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: 'R58M309112B',
    marketCode: 'MW',
    marketName: 'Malawi (Blantyre Hub)',
    inventoryStatus: 'Active',
    securityAuthorization: 'Authorized',
    imei: '490154203237512',
    osVersion: 'Android 14 / One UI 6.0',
    purchaseDate: '2025-02-01',
    supplier: 'Samsung Direct Southeast Africa',
    assignedSalespersonId: 'USR-MW-003',
    assignedSalespersonName: 'Tadala Banda',
    assignedDate: '2025-03-12',
    batteryHealth: 95,
    lastSync: '1 hour ago (14:12 CAT)',
    knoxSecurityEnrolled: true,
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-02-10 10:30 CAT',
    history: [
      {
        id: 'hist-mw003-1',
        timestamp: '2025-02-10 10:30 CAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
      },
      {
        id: 'hist-mw003-2',
        timestamp: '2025-03-12 09:00 CAT',
        action: 'Handset Assigned to Salesperson',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Available',
        newStatus: 'Active',
        assigneeId: 'USR-MW-003',
        assigneeName: 'Tadala Banda',
      },
    ],
  },
  {
    id: 'DEV-MW-SPARE-01',
    assetId: 'CC-DEV-BLA-SPARE-01',
    assetTag: 'CC-DEV-BLA-SPARE-01',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: 'R58M309112C',
    marketCode: 'MW',
    marketName: 'Malawi (Blantyre Hub)',
    inventoryStatus: 'Available',
    securityAuthorization: 'Authorized',
    imei: '490154203999001',
    osVersion: 'Android 14 / One UI 6.0',
    purchaseDate: '2025-02-15',
    supplier: 'Samsung Direct Southeast Africa',
    batteryHealth: 100,
    lastSync: 'Depot Stock',
    knoxSecurityEnrolled: true,
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2025-02-20 12:00 CAT',
    history: [
      {
        id: 'hist-blaspare-1',
        timestamp: '2025-02-20 12:00 CAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
        reason: 'Blantyre regional depot hot spare reserve.',
      },
    ],
  },
  // Special Lifecycle States Demonstrations
  {
    id: 'DEV-NG-RETIRED-01',
    assetId: 'CC-DEV-LOS-RET-01',
    assetTag: 'CC-DEV-LOS-RET-01',
    make: 'Samsung',
    model: 'Galaxy S21 Enterprise',
    serialNumber: 'R58M990011Z',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    inventoryStatus: 'Retired',
    securityAuthorization: 'Revoked',
    imei: '864209051999999',
    osVersion: 'Android 12',
    purchaseDate: '2022-01-15',
    supplier: 'Samsung West Africa',
    batteryHealth: 61,
    lastSync: '12 Jan 2025',
    knoxSecurityEnrolled: false,
    notes: 'Decommissioned post 36-month field operational warranty cycle. Recycled at e-waste facility.',
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2022-01-20 09:00 WAT',
    history: [
      {
        id: 'hist-ret-1',
        timestamp: '2022-01-20 09:00 WAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
      },
      {
        id: 'hist-ret-2',
        timestamp: '2025-01-12 14:00 WAT',
        action: 'Lifecycle Status Updated to Retired',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Active',
        newStatus: 'Retired',
        reason: '36-month hardware depreciation cycle completed. Secure cryptographic wipe completed.',
      },
    ],
  },
  {
    id: 'DEV-ZM-LOST-01',
    assetId: 'CC-DEV-LUS-LOST-01',
    assetTag: 'CC-DEV-LUS-LOST-01',
    make: 'Nokia',
    model: 'G22 Field Edition',
    serialNumber: 'NK22-771122-ZM',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka Hub)',
    inventoryStatus: 'Lost/Stolen',
    securityAuthorization: 'Revoked',
    imei: '358941098888777',
    osVersion: 'Android 13',
    purchaseDate: '2024-05-10',
    supplier: 'Nokia Enterprise Solutions',
    batteryHealth: 85,
    lastSync: '14 Sep 2026',
    knoxSecurityEnrolled: false,
    notes: 'Reported stolen from sales rep vehicle in Ndola. Remote Knox wipe and IMEI block executed.',
    registeredBy: 'HQ Administrator (HQ Admin)',
    registeredAt: '2024-05-15 11:00 CAT',
    history: [
      {
        id: 'hist-lost-1',
        timestamp: '2024-05-15 11:00 CAT',
        action: 'Device Registered in Inventory',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        newStatus: 'Available',
      },
      {
        id: 'hist-lost-2',
        timestamp: '2026-09-15 10:20 CAT',
        action: 'Lifecycle Status Updated to Lost/Stolen',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        previousStatus: 'Active',
        newStatus: 'Lost/Stolen',
        reason: 'Theft incident reported in Ndola corridor. Remote security kill-switch activated.',
      },
    ],
  },
];

const INITIAL_REQUESTS: DeviceReplacementRequest[] = [
  {
    id: 'REQ-REP-2026-001',
    salespersonId: 'CC-NG-042',
    salespersonName: 'Tunde Adebayo',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    companyDeviceAssetId: 'CC-DEV-LAG-019',
    deviceModel: 'Samsung Galaxy A15 Enterprise',
    issueCategory: 'camera_defect',
    issueDescription: 'Rear camera autofocus sensor failure. Viewfinder remains blurred during visit premises check-in, causing camera retry failures.',
    submittedAt: '2026-10-18 10:14 WAT',
    supportingEvidence: 'Photo of blurry test target facade captured on device storage.',
    status: 'Dispatched',
    replacementDeviceAssetId: 'CC-DEV-LOS-SPARE-01',
    replacementDeviceModel: 'Samsung Galaxy A15 Enterprise',
    approvalReason: 'Hardware autofocus failure confirmed via diagnostic logs; urgent replacement needed for client visit compliance.',
    dispatchNotes: 'Dispatched via DHL Express Waybill #DHL-NG-88219 to Ikeja Hub.',
    oldDeviceDisposition: 'returned_to_depot',
    history: [
      {
        timestamp: '2026-10-18 10:14 WAT',
        action: 'Request Submitted Directly to HQ Admin',
        actorName: 'Tunde Adebayo',
        actorRole: 'Salesperson',
        notes: 'Submitted directly from mobile field interface.',
      },
      {
        timestamp: '2026-10-18 11:30 WAT',
        action: 'Request Approved by HQ Admin',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        notes: 'Reason: Hardware autofocus failure confirmed via diagnostic logs.',
      },
      {
        timestamp: '2026-10-18 14:00 WAT',
        action: 'Replacement Handset Dispatched',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        notes: 'Allocated spare CC-DEV-LOS-SPARE-01; dispatched via DHL Express.',
      },
    ],
  },
  {
    id: 'REQ-REP-2026-002',
    salespersonId: 'USR-ZM-004',
    salespersonName: 'Peter Mwale',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka)',
    companyDeviceAssetId: 'CC-DEV-LUS-006',
    deviceModel: 'Samsung Galaxy A15 Enterprise',
    issueCategory: 'screen_damage',
    issueDescription: 'Shattered front glass after accidental impact on depot gravel. Top 40% of touchscreen digitizer unregistered, preventing check-out completion.',
    submittedAt: '2026-10-19 14:32 CAT',
    supportingEvidence: 'Photo of shattered display taken with secondary hub phone.',
    status: 'Pending Review',
    history: [
      {
        timestamp: '2026-10-19 14:32 CAT',
        action: 'Request Submitted Directly to HQ Admin',
        actorName: 'Peter Mwale',
        actorRole: 'Salesperson',
        notes: 'Submitted directly to HQ Admin after regaining access.',
      },
    ],
  },
  {
    id: 'REQ-REP-2026-003',
    salespersonId: 'CC-NG-042',
    salespersonName: 'Tunde Adebayo',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    companyDeviceAssetId: 'CC-DEV-LAG-019',
    deviceModel: 'Samsung Galaxy A15 Enterprise',
    issueCategory: 'other',
    issueDescription: 'Slight cosmetic scuff on outer protective bumper casing.',
    submittedAt: '2026-10-15 09:20 WAT',
    status: 'Rejected',
    rejectionReason: 'Cosmetic wear on protective bumper does not impede camera or GPS visit capture. Handset remains fully compliant with field operations.',
    history: [
      {
        timestamp: '2026-10-15 09:20 WAT',
        action: 'Request Submitted Directly to HQ Admin',
        actorName: 'Tunde Adebayo',
        actorRole: 'Salesperson',
        notes: 'Submitted directly to HQ Admin.',
      },
      {
        timestamp: '2026-10-15 11:45 WAT',
        action: 'Request Rejected by HQ Admin',
        actorName: 'HQ Administrator',
        actorRole: 'HQ Administrator',
        notes: 'Reason: Cosmetic wear on protective bumper does not impede camera or GPS visit capture.',
      },
    ],
  },
];

interface DeviceReplacementContextType {
  // Device Fleet Inventory
  devices: CompanyDevice[];
  registerDevice: (data: RegisterDeviceInput) => { success: boolean; error?: string; device?: CompanyDevice };
  assignDevice: (assetId: string, salespersonId: string, salespersonName: string, reason?: string) => { success: boolean; error?: string };
  reassignDevice: (assetId: string, newSalespersonId: string, newSalespersonName: string, reason: string) => { success: boolean; error?: string };
  updateDeviceLifecycleStatus: (assetId: string, newStatus: DeviceInventoryStatus, reason: string) => { success: boolean; error?: string };

  // Replacement Requests & Queue
  replacementRequests: DeviceReplacementRequest[];
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
  const [devices, setDevices] = useState<CompanyDevice[]>(INITIAL_COMPANY_DEVICES);
  const [replacementRequests, setReplacementRequests] = useState<DeviceReplacementRequest[]>(INITIAL_REQUESTS);

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
    reason?: string
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
    if (existingActiveDevice) {
      return {
        success: false,
        error: `Salesperson ${salespersonName} is already assigned to active device ${existingActiveDevice.assetId}. Please reassign or return the existing device first.`,
      };
    }

    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} WAT`;

    setDevices((prev) =>
      prev.map((d) => {
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
                action: 'Handset Assigned to Salesperson',
                actorName: 'HQ Administrator',
                actorRole: 'HQ Administrator',
                previousStatus: d.inventoryStatus,
                newStatus: 'Active',
                assigneeId: salespersonId,
                assigneeName: salespersonName,
                reason: reason || `Assigned to ${salespersonName} (${salespersonId}) for field operations.`,
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
            status: 'Awaiting Activation',
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
        registerDevice,
        assignDevice,
        reassignDevice,
        updateDeviceLifecycleStatus,
        replacementRequests,
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
