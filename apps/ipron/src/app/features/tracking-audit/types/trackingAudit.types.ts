/**
 * 트래킹 조회이력 — 타입.
 */
export type TrackingAuditAction = 'SEARCH' | 'EXPORT' | 'DETAIL_VIEW';
export type TrackingMode = 'PBX_FRONT' | 'IVR_FRONT' | 'CTI_FRONT';

export interface TrackingAudit {
  auditId: number;
  userId: number;
  userName: string | null;
  tenantId: number;
  actionType: TrackingAuditAction;
  trackingMode: TrackingMode | null;
  criteriaSummary: string;
  criteriaJson: string | null;
  resultCount: number | null;
  exportFormat: string | null;
  exportBytes: number | null;
  reason: string | null;
  approvalId: number | null;
  approvalStatus: string | null;
  targetUcid: string | null;
  workTime: string | null;
}

export interface TrackingAuditSearchParams {
  actionType?: TrackingAuditAction | null;
  trackingMode?: TrackingMode | null;
  from?: string | null;
  to?: string | null;
  keyword?: string | null;
  page?: number;
  size?: number;
}
