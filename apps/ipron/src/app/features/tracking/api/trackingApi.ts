/**
 * 통합 콜트래킹 API 클라이언트 (IPR30S1060)
 * BFF Aggregation Flow 기반 — TB_BT_CM_AGG_FLOW_MST에 등록된 flow ID 사용.
 *
 * 등록 예정 flow (Phase 1):
 *  - ipron-tracking-search:             POST   콜 검색 (body: TrackingSearchCriteria, PagedResponse)
 *  - ipron-tracking-detail:             GET    콜 헤더 + segment (단건)
 *  - ipron-tracking-ivr-step:           GET    IVR step tree (시나리오 단위 그룹)
 *  - ipron-tracking-cti-route:          GET    CTI 라우팅 결정 흐름
 *  - ipron-tracking-agent-event:        GET    Agent 이벤트 타임라인
 *  - ipron-tracking-recording-redirect: GET    녹취 재생 redirect URL
 *
 * 응답 파싱 규칙(CLAUDE.md):
 *  - PagedResponse<T>  → BFF: data.items[]   → extractList
 *  - List<T>           → BFF: data.value[]   → extractDetail(...)?.value
 *  - 단건 T            → BFF: data:{...}    → extractDetail
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
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

const apiClient = new ApiClient({ serviceURL: '/bff' });

/** ISO String("…Z" 또는 ms 포함)을 Java LocalDateTime 호환 형식으로 변환. */
function toLocalDateTime(s: string | null | undefined): string | null {
  if (!s) return null;
  // "2026-05-07T05:00:00.000Z" → "2026-05-07T05:00:00"
  return s.replace('Z', '').replace(/\.\d+/, '');
}

/** FE TrackingSearchCriteria → BE SearchCriteria 필드명 매핑. */
function toSearchRequest(c: TrackingSearchCriteria) {
  return {
    dateFrom: toLocalDateTime(c.startTime),
    dateTo: toLocalDateTime(c.endTime),
    ucid: c.ucid,
    ani: c.ani,
    dnis: c.dnis,
    tenantId: c.tenantId,
    nodeId: c.nodeId,
    queueId: c.queueId,
    agentId: c.agentId,
    scenarioId: c.scenarioId,
    results: c.results,
    durationMinSeconds: c.durationMinSec,
    durationMaxSeconds: c.durationMaxSec,
    agentTalkMinSeconds: c.agentTalkMinSec,
    queueWaitMinSeconds: c.queueWaitMinSec,
    queueWaitMaxSeconds: c.queueWaitMaxSec,
    callKinds: c.callKinds,
    abandoned: c.abandoned,
    reqAgent: c.reqAgent,
    ivrSelfServiced: c.ivrSelfServiced,
    requestedMode: c.mode === 'PBX' ? 'PBX_FRONT' : c.mode === 'IVR' ? 'IVR_FRONT' : c.mode === 'CTI' ? 'CTI_FRONT' : c.mode,
    page: c.page,
    size: c.size,
  };
}

export const trackingApi = {
  // ─── Search ───────────────────────────────────────────────────────────────

  /**
   * 콜 검색.
   * Backend: ApiResponse<PagedResponse<CallSearchResult>> -> BFF: data.items[] -> extractList
   * @flow ipron-tracking-search
   */
  search: async (criteria: TrackingSearchCriteria): Promise<CallSearchResult[]> => {
    const response = await apiClient.post<ListResponse<CallSearchResult>>('/ipron-tracking-search', toSearchRequest(criteria));
    return extractList(response);
  },

  // ─── Detail (헤더 + segment) ──────────────────────────────────────────────

  /**
   * 콜 상세 헤더 + segment 목록.
   * Backend: ApiResponse<{ header, segments }> -> BFF: data:{...} -> extractDetail
   * @flow ipron-tracking-detail
   */
  getDetail: async (ucid: string): Promise<{ header: CallDetailHeader; segments: CallSegment[] }> => {
    const response = await apiClient.get<DetailResponse<{ header: CallDetailHeader; segments: CallSegment[] }>>('/ipron-tracking-detail', {
      params: { ucid },
    });
    return extractDetail(response);
  },

  // ─── IVR Step Tree ────────────────────────────────────────────────────────

  /**
   * IVR step tree — 시나리오(CDR_PKEY) 단위 그룹핑.
   * Backend: ApiResponse<List<IvrScenarioGroup>> -> BFF: data.value[]
   * @flow ipron-tracking-ivr-step
   */
  getIvrSteps: async (ucid: string): Promise<IvrScenarioGroup[]> => {
    const response = await apiClient.get<DetailResponse<{ value: IvrScenarioGroup[] }>>('/ipron-tracking-ivr-step', {
      params: { ucid },
    });
    return extractDetail(response)?.value ?? [];
  },

  // ─── CTI Routing ──────────────────────────────────────────────────────────

  /**
   * CTI 라우팅 결정 흐름 (TRACKING_DATA 파싱 결과).
   * Backend: ApiResponse<List<CtiRoutingHop>> -> BFF: data.value[]
   * @flow ipron-tracking-cti-route
   *
   * @param nexthop 동일 UCID 내 CTI segment 식별자 (segmentId / hopIndex). 미지정 시 첫 CTI segment.
   */
  getCtiRouting: async (ucid: string, nexthop?: string | null): Promise<CtiRoutingHop[]> => {
    const response = await apiClient.get<DetailResponse<{ value: CtiRoutingHop[] }>>('/ipron-tracking-cti-route', {
      params: { ucid, nexthop: nexthop ?? undefined },
    });
    return extractDetail(response)?.value ?? [];
  },

  // ─── Agent Events ─────────────────────────────────────────────────────────

  /**
   * Agent 상태 변화 + 호 응답/재전환 이벤트 타임라인.
   * Backend: ApiResponse<List<AgentEvent>> -> BFF: data.value[]
   * @flow ipron-tracking-agent-event
   */
  getAgentEvents: async (ucid: string): Promise<AgentEvent[]> => {
    const response = await apiClient.get<DetailResponse<{ value: AgentEvent[] }>>('/ipron-tracking-agent-event', {
      params: { ucid },
    });
    return extractDetail(response)?.value ?? [];
  },

  // ─── Recording Redirect ───────────────────────────────────────────────────

  /**
   * 녹취 재생 URL — 외부 미디어 플레이어(Range 헤더 지원) redirect.
   * Backend: ApiResponse<RecordingRedirectResponse> -> BFF: data:{...} -> extractDetail
   * @flow ipron-tracking-recording-redirect
   *
   * @param userid 상담사 ID (segment 매칭)
   * @param type   녹취 종류 (VOICE / SCREEN / STT)
   */
  getRecordingRedirect: async (params: { ucid: string; userid: string; type: RecordingType }): Promise<RecordingRedirectResponse> => {
    const response = await apiClient.get<DetailResponse<RecordingRedirectResponse>>('/ipron-tracking-recording-redirect', {
      params,
    });
    return extractDetail(response);
  },
};
