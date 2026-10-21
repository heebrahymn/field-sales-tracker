import React, { createContext, useContext, useState } from 'react';
import { MarketCode } from '@/context/AuthContext';

export interface SharedAuditCallRecord {
  id: string;
  visitId: string;
  sampleType: 'random_5_percent' | 'risk_targeted';
  marketCode: MarketCode;
  marketName: string;
  organisationName: string;
  branchName: string;
  clientContactPerson: string;
  clientContactPhone: string;
  clientContactRole: string;
  salespersonName: string;
  visitDate: string;
  claimedTime?: string;
  productsDiscussed?: string;
  callStatus: 'pending_call' | 'confirmed_meeting' | 'disputed_client_denial' | 'unreachable_rescheduled';
  callAttemptCount: number;
  callNotes?: string;
  lastCallTimestamp?: string;
  auditorName?: string;
  disputeFindings?: string;
  secondaryContact?: string;
  disputeDecision?: 'cleared' | 'violation';
  resolvedBy?: string;
  resolvedAt?: string;
  gpsStatus: 'location_verified' | 'manager_approved_unverified';
}

export const INITIAL_SHARED_AUDITS: SharedAuditCallRecord[] = [
  // Nigeria Audits
  {
    id: 'AUD-001',
    visitId: 'VIS-LAG-901',
    sampleType: 'random_5_percent',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    organisationName: 'Apex Commercial Transit Ltd',
    branchName: 'Ibeju-Lekki Hub • Branch #BR-LAG-108',
    clientContactPerson: 'Engr. Babatunde Jinadu',
    clientContactPhone: '+234 1 270 5000',
    clientContactRole: 'Fleet Maintenance Director',
    salespersonName: 'Tunde Adebayo',
    visitDate: '2026-10-19',
    claimedTime: '09:40 - 10:15 WAT',
    productsDiscussed: 'Heavy Duty Coolant 20L, Fleet Degreaser',
    callStatus: 'pending_call',
    callAttemptCount: 0,
    gpsStatus: 'location_verified',
  },
  {
    id: 'AUD-002',
    visitId: 'VIS-LAG-874',
    sampleType: 'risk_targeted', // triggered by short visit under 5 mins
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    organisationName: 'Atlantic Heavy Transport',
    branchName: 'Lekki Depot Yard • Branch #BR-LAG-015',
    clientContactPerson: 'Mr. Kenneth Okoro',
    clientContactPhone: '+234 802 333 4455',
    clientContactRole: 'Depot Superintendent',
    salespersonName: 'Emeka Nwosu',
    visitDate: '2026-10-19',
    claimedTime: '10:15 - 10:19 WAT (3m short visit flag)',
    productsDiscussed: 'Industrial Gear Oil ISO 220',
    callStatus: 'pending_call',
    callAttemptCount: 0,
    gpsStatus: 'location_verified',
  },
  {
    id: 'AUD-003',
    visitId: 'VIS-LAG-850',
    sampleType: 'random_5_percent',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    organisationName: 'Equatorial Energy Hubs',
    branchName: 'Dockyard Road, Apapa • Branch #BR-LAG-002',
    clientContactPerson: 'Mrs. Chinyere Nwosu',
    clientContactPhone: '+234 805 777 9900',
    clientContactRole: 'Safety & Environmental Officer',
    salespersonName: 'Chinyere Nwosu',
    visitDate: '2026-10-18',
    claimedTime: '11:20 - 12:05 WAT',
    productsDiscussed: 'Spill Containment Booms, Absorbent Pads',
    callStatus: 'confirmed_meeting',
    callAttemptCount: 1,
    callNotes: 'Spoke with Mrs. Chinyere. Confirmed in-person visit took place and discussed environmental spill kits.',
    lastCallTimestamp: '2026-10-18 16:30 WAT',
    auditorName: 'Ayodele Ibraheem (Country Head)',
    gpsStatus: 'manager_approved_unverified',
  },
  {
    id: 'AUD-004',
    visitId: 'VIS-LAG-821',
    sampleType: 'risk_targeted', // High velocity flag
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    organisationName: 'Northern Freight Corridors Ltd',
    branchName: 'Kano Transit Yard • Branch #BR-KAN-012',
    clientContactPerson: 'Malam Salisu Garba',
    clientContactPhone: '+234 803 222 1100',
    clientContactRole: 'Logistics Supervisor',
    salespersonName: 'Ibrahim Sani',
    visitDate: '2026-10-17',
    claimedTime: '13:45 WAT (High velocity flag)',
    productsDiscussed: 'Radiator Antifreeze 200L',
    callStatus: 'disputed_client_denial',
    callAttemptCount: 1,
    callNotes: 'Client stated no sales representative visited workshop on 17 Oct. Contact was in Zaria all afternoon. Moved to Disputed — Pending Human Review.',
    lastCallTimestamp: '2026-10-17 17:00 WAT',
    auditorName: 'Ayodele Ibraheem (Country Head)',
    gpsStatus: 'location_verified',
  },
  {
    id: 'AUD-005',
    visitId: 'VIS-LAG-812',
    sampleType: 'random_5_percent',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    organisationName: 'Seven-Up Bottling Logistics Hub',
    branchName: 'Oregun Industrial Area • Branch #BR-LAG-063',
    clientContactPerson: 'Mr. Femi Adeolu',
    clientContactPhone: '+234 802 888 7766',
    clientContactRole: 'Distribution Manager',
    salespersonName: 'Emeka Nwosu',
    visitDate: '2026-10-18',
    claimedTime: '15:20 WAT',
    productsDiscussed: 'Heavy Duty Wash Concentrate',
    callStatus: 'unreachable_rescheduled',
    callAttemptCount: 1,
    callNotes: 'Client unreachable on 18 Oct. Call went to voicemail after 4 rings. Re-queued for repeated attempt.',
    lastCallTimestamp: '2026-10-18 17:15 WAT',
    auditorName: 'Ayodele Ibraheem (Country Head)',
    gpsStatus: 'location_verified',
  },

  // Zambia Audits
  {
    id: 'AUD-ZM-2026-201',
    visitId: 'VIS-ZM-412',
    sampleType: 'random_5_percent',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka)',
    organisationName: 'Copperbelt Haulage Ltd',
    branchName: 'Ndola Heavy Transit Depot',
    clientContactPerson: 'Bwalya Chanda',
    clientContactPhone: '+260 211 445 566',
    clientContactRole: 'Maintenance Supervisor',
    salespersonName: 'Kondwani Banda',
    visitDate: '2026-10-18',
    claimedTime: '10:00 - 10:45 CAT',
    productsDiscussed: 'Hydraulic Fluid ISO 46, Grease EP2',
    callStatus: 'confirmed_meeting',
    callAttemptCount: 1,
    lastCallTimestamp: '2026-10-18 15:00 CAT',
    auditorName: 'Mutale Mwape (Country Sales Head)',
    callNotes: 'Client verified Kondwani visited Ndola depot at 10:00. Product samples inspected.',
    gpsStatus: 'location_verified',
  },
  {
    id: 'AUD-ZM-2026-202',
    visitId: 'VIS-ZM-419',
    sampleType: 'risk_targeted',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka)',
    organisationName: 'Zambezi Freight Logistics',
    branchName: 'Kafue Road Operations Yard',
    clientContactPerson: 'Peter Mwale',
    clientContactPhone: '+260 977 123 456',
    clientContactRole: 'Depot Manager',
    salespersonName: 'Kondwani Banda',
    visitDate: '2026-10-19',
    claimedTime: '09:45 CAT',
    productsDiscussed: 'Heavy Duty Diesel 15W-40',
    callStatus: 'pending_call',
    callAttemptCount: 0,
    gpsStatus: 'manager_approved_unverified',
  },

  // Malawi Audits
  {
    id: 'AUD-MW-2026-301',
    visitId: 'VIS-MW-108',
    sampleType: 'random_5_percent',
    marketCode: 'MW',
    marketName: 'Malawi (Blantyre)',
    organisationName: 'Nyasa Express Couriers',
    branchName: 'Ginnery Corner Distribution Hub',
    clientContactPerson: 'Grace Gondwe',
    clientContactPhone: '+265 1 876 543',
    clientContactRole: 'Fleet Controller',
    salespersonName: 'Chifundo Phiri',
    visitDate: '2026-10-18',
    claimedTime: '15:20 CAT',
    productsDiscussed: 'Commercial Van Engine Oil 10W-30',
    callStatus: 'disputed_client_denial',
    callAttemptCount: 1,
    lastCallTimestamp: '2026-10-19 09:00 CAT',
    auditorName: 'Blessings Gondwe (Country Sales Head)',
    callNotes: 'Client reception contact stated no rep visited on 18 Oct. Initiated Disputed — Pending Human Review.',
    gpsStatus: 'location_verified',
  },
];

interface AuditContextType {
  audits: SharedAuditCallRecord[];
  recordAuditCall: (
    auditId: string,
    outcome: 'confirmed' | 'disputed' | 'unreachable',
    callNotes: string,
    productsConfirmed?: boolean,
    auditorName?: string
  ) => void;
  resolveDispute: (
    auditId: string,
    findings: string,
    secondaryContact: string,
    decision: 'cleared' | 'violation',
    resolvedBy?: string
  ) => void;
  getAuditsByMarket: (marketCode?: MarketCode | 'ALL') => SharedAuditCallRecord[];
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audits, setAudits] = useState<SharedAuditCallRecord[]>(INITIAL_SHARED_AUDITS);

  const recordAuditCall = (
    auditId: string,
    outcome: 'confirmed' | 'disputed' | 'unreachable',
    callNotes: string,
    productsConfirmed = true,
    auditorName = 'Ayodele Ibraheem (Country Head)'
  ) => {
    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} Local`;
    let newStatus: SharedAuditCallRecord['callStatus'] = 'confirmed_meeting';
    if (outcome === 'disputed') {
      newStatus = 'disputed_client_denial';
    } else if (outcome === 'unreachable') {
      newStatus = 'unreachable_rescheduled';
    }

    setAudits((prev) =>
      prev.map((a) => {
        if (a.id === auditId) {
          const newAttempts = a.callAttemptCount + 1;
          const outcomeText =
            outcome === 'confirmed'
              ? 'In-person meeting confirmed.'
              : outcome === 'disputed'
              ? 'Client denied in-person meeting. Initiated Disputed — Pending Human Review.'
              : `Client unreachable on attempt #${newAttempts}. Re-queued for follow-up call.`;
          return {
            ...a,
            callStatus: newStatus,
            callAttemptCount: newAttempts,
            callNotes: `${outcomeText} Products confirmed: ${productsConfirmed ? 'Yes' : 'No'}. Notes: ${callNotes.trim()}`,
            lastCallTimestamp: timestamp,
            auditorName,
          };
        }
        return a;
      })
    );
  };

  const resolveDispute = (
    auditId: string,
    findings: string,
    secondaryContact: string,
    decision: 'cleared' | 'violation',
    resolvedBy = 'Ayodele Ibraheem (Country Head)'
  ) => {
    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} Local`;
    setAudits((prev) =>
      prev.map((a) => {
        if (a.id === auditId) {
          return {
            ...a,
            disputeFindings: findings.trim(),
            secondaryContact: secondaryContact.trim(),
            disputeDecision: decision,
            resolvedBy,
            resolvedAt: timestamp,
            callNotes: `${a.callNotes || ''} | Dispute Resolution: ${decision === 'cleared' ? 'Cleared (human verification confirmed meeting)' : 'Confirmed Violation'}. Findings: ${findings.trim()}`,
          };
        }
        return a;
      })
    );
  };

  const getAuditsByMarket = (marketCode: MarketCode | 'ALL' = 'ALL'): SharedAuditCallRecord[] => {
    if (marketCode === 'ALL') return audits;
    return audits.filter((a) => a.marketCode === marketCode);
  };

  return (
    <AuditContext.Provider
      value={{
        audits,
        recordAuditCall,
        resolveDispute,
        getAuditsByMarket,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = (): AuditContextType => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};
