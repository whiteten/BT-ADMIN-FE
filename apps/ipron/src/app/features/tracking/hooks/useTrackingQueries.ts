/**
 * 통합 콜트래킹 React Query 훅 (IPR30S1060)
 * SD-CALL-TRACKING.md 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { trackingApi } from '../api/trackingApi';
import type {
  AgentEvent,
  CallDetailHeader,
  CallSearchResult,
  CallSegment,
  CtiRoutingHop,
  IvrScenarioGroup,
  RecordingRedirectResponse,
  RecordingType,
  TrackingSearchCriteria,
} from '../types/tracking.types';

export const trackingQueryKeys = createQueryKeys('tracking', {
  detail: (ucid?: string) => [ucid],
  ivrStep: (ucid?: string) => [ucid],
  ctiRoute: (ucid?: string, nexthop?: string) => [ucid, nexthop],
  agentEvent: (ucid?: string) => [ucid],
});

// ─── Search (mutation 형태로 운영 — criteria 변경에 즉시 반응) ──────────────

export const useSearchTracking = ({ mutationOptions }: MutationHookOptions<CallSearchResult[], TrackingSearchCriteria> = {}) => {
  return useMutation({
    mutationFn: (criteria: TrackingSearchCriteria) => trackingApi.search(criteria),
    ...mutationOptions,
  });
};

// ─── Detail Queries ────────────────────────────────────────────────────────

export const useGetTrackingDetail = (ucid: string | null | undefined, { queryOptions }: QueryHookOptions<{ header: CallDetailHeader; segments: CallSegment[] }> = {}) => {
  return useQuery({
    queryKey: trackingQueryKeys.detail(ucid ?? undefined).queryKey,
    queryFn: () => trackingApi.getDetail(ucid!),
    enabled: !!ucid,
    ...queryOptions,
  });
};

export const useGetIeCdrDetail = (
  ucid: string | null | undefined,
  hop: number | null | undefined,
  { queryOptions }: QueryHookOptions<Record<string, unknown>> = {},
) => {
  return useQuery({
    queryKey: ['tracking', 'ie-cdr', ucid ?? '', hop ?? -1] as const,
    queryFn: () => trackingApi.getIeCdrDetail(ucid!, hop!),
    enabled: !!ucid && hop != null && hop >= 0,
    ...queryOptions,
  });
};

export const useGetIvrSteps = (ucid: string | null | undefined, { queryOptions }: QueryHookOptions<IvrScenarioGroup[]> = {}) => {
  return useQuery({
    queryKey: trackingQueryKeys.ivrStep(ucid ?? undefined).queryKey,
    queryFn: () => trackingApi.getIvrSteps(ucid!),
    enabled: !!ucid,
    ...queryOptions,
  });
};

export const useGetCtiRouting = (ucid: string | null | undefined, nexthop: string | null = null, { queryOptions }: QueryHookOptions<CtiRoutingHop[]> = {}) => {
  return useQuery({
    queryKey: trackingQueryKeys.ctiRoute(ucid ?? undefined, nexthop ?? undefined).queryKey,
    queryFn: () => trackingApi.getCtiRouting(ucid!, nexthop),
    enabled: !!ucid,
    ...queryOptions,
  });
};

export const useGetAgentEvents = (ucid: string | null | undefined, { queryOptions }: QueryHookOptions<AgentEvent[]> = {}) => {
  return useQuery({
    queryKey: trackingQueryKeys.agentEvent(ucid ?? undefined).queryKey,
    queryFn: () => trackingApi.getAgentEvents(ucid!),
    enabled: !!ucid,
    ...queryOptions,
  });
};

// ─── Recording Redirect (lazy mutation — 사용자 클릭 시 즉시 호출) ─────────

export const useGetRecordingRedirect = ({ mutationOptions }: MutationHookOptions<RecordingRedirectResponse, { ucid: string; userid: string; type: RecordingType }> = {}) => {
  return useMutation({
    mutationFn: trackingApi.getRecordingRedirect,
    ...mutationOptions,
  });
};
