export const BADGE_COUNTS_CHANGED_EVENT = 'carbon:badge-counts-changed';

export interface AuditActionStatusLike {
  callStatus?: string | null;
  meetingConfirmed?: boolean | null;
  disputeStatus?: string | null;
}

/**
 * Shared predicate so DesktopSidebar, SalesHeadDashboardPreview, NotificationsMenu,
 * and ClientAuditWorkbench compute identical actionable audit counts
 * (Pending Calls + Open Disputes).
 */
export function isClientAuditActionRequired(record: AuditActionStatusLike): boolean {
  if (record.callStatus === 'pending_call') return true;
  if (record.disputeStatus === 'under_investigation') return true;
  if (
    record.callStatus === 'connected' &&
    record.meetingConfirmed === false &&
    record.disputeStatus !== 'resolved_cleared' &&
    record.disputeStatus !== 'resolved_violation'
  ) {
    return true;
  }
  return false;
}

/**
 * Broadcasts that a managerial review, visit, or queue refresh occurred so
 * navigation badges across DesktopSidebar, SalesHeadDashboardPreview, and
 * NotificationsMenu stay synchronized.
 */
export function emitBadgeCountsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BADGE_COUNTS_CHANGED_EVENT));
  }
}
