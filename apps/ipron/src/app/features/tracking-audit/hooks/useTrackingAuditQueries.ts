/**
 * 트래킹 조회이력 — React Query hooks.
 */
import { useQuery } from '@tanstack/react-query';
import { trackingAuditApi } from '../api/trackingAuditApi';
import type { TrackingAuditSearchParams } from '../types/trackingAudit.types';

export function useGetTrackingAudits(params: TrackingAuditSearchParams | null) {
  return useQuery({
    queryKey: ['tracking-audit', 'list', params],
    queryFn: () => trackingAuditApi.list(params as TrackingAuditSearchParams),
    enabled: params != null,
    staleTime: 10_000,
  });
}

export function useGetTrackingAuditDetail(auditId: number | null) {
  return useQuery({
    queryKey: ['tracking-audit', 'detail', auditId],
    queryFn: () => trackingAuditApi.detail(auditId as number),
    enabled: auditId != null,
    staleTime: 60_000,
  });
}
