/**
 * 트래킹 조회이력 — React Query hooks.
 */
import { useQuery } from '@tanstack/react-query';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { trackingAuditApi } from '../api/trackingAuditApi';
import type { TrackingAuditSearchParams } from '../types/trackingAudit.types';

export const trackingAuditQueryKeys = createAppQueryKeys('tracking-audit', {
  list: (params: TrackingAuditSearchParams | null) => [{ params }],
  detail: (auditId: number | null) => [{ auditId }],
});

export function useGetTrackingAudits(params: TrackingAuditSearchParams | null) {
  return useQuery({
    queryKey: trackingAuditQueryKeys.list(params).queryKey,
    queryFn: () => trackingAuditApi.list(params as TrackingAuditSearchParams),
    enabled: params != null,
    staleTime: 10_000,
  });
}

export function useGetTrackingAuditDetail(auditId: number | null) {
  return useQuery({
    queryKey: trackingAuditQueryKeys.detail(auditId).queryKey,
    queryFn: () => trackingAuditApi.detail(auditId as number),
    enabled: auditId != null,
    staleTime: 60_000,
  });
}
