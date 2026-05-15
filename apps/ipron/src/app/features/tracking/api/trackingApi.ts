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

// ─── Backend CallDetail (평면) → FE {header, segments} 변환 ─────────────────

interface BackendCallFlowSegment {
  segmentType: 'IE' | 'IR' | 'IC_QUEUE' | 'IC_AGENT' | 'IC_ROUTING' | string;
  hop: number | null;
  cdrPkey: number | null;
  parentId: number | null;
  systemId: number | null;
  systemName: string | null;
  nodeId: number | null;
  nodeName: string | null;
  tenantId: number | null;
  queueId: number | null;
  queueName: string | null;
  agentId: number | null;
  agentName: string | null;
  serviceName: string | null;
  startTime: string | null;
  endTime: string | null;
  durationSec: number | null;
  endReason: string | null;
  oName: string | null;
  tName: string | null;
  // IE hop 의 단계 추론용 (T_TYPE: 1=국선, 2=내선, 3=IVR, 4=IVR큐, 5=CTI큐, 6=ACD큐)
  oType: number | null;
  tType: number | null;
  ccEnd: number | null;
}

interface BackendCallDetail {
  ucid: string;
  ani: string | null;
  dnis: string | null;
  startTime: string | null;
  endTime: string | null;
  totalDurationSec: number | null;
  overallResult: string | null;
  tenantId: number | null;
  tenantName: string | null;
  segments: BackendCallFlowSegment[];
}

function emptyHeader(ucid: string): CallDetailHeader {
  return {
    ucid,
    startTime: '',
    endTime: null,
    durationSec: null,
    ani: null,
    aniMasked: false,
    dnis: null,
    agentId: null,
    agentName: null,
    queueName: null,
    result: null,
    resultLabel: null,
    tenantId: null,
    tenantName: null,
    nodeId: null,
    nodeName: null,
    transferCount: 0,
    unmaskAvailable: false,
  };
}

/**
 * segment → FE kind 매핑.
 *
 * 규칙:
 * 1) IR / IC_QUEUE / IC_ROUTING / IC_AGENT 는 segmentType 자체로 단계 결정
 * 2) IE 는 hop 의 T_TYPE 으로 세분 (PBX/IVR/CTI front 모두 안전):
 *    - T_TYPE=3 (IVR)       → IVR
 *    - T_TYPE=4,5,6 (큐 계열) → CTI
 *    - T_TYPE=2 (내선 EDN)  → AGENT
 *    - 그 외 + ccEnd=1       → DISCONNECT (콜 종료 hop)
 *    - 그 외 + isFirst       → INBOUND (호 진입)
 *    - 그 외                  → OTHER
 * 3) 첫 segment(시간상 가장 처음)는 항상 INBOUND 로 우선 처리 (설계서 § 2.0)
 */
function mapSegmentKind(seg: BackendCallFlowSegment, isFirst: boolean, isLast: boolean): CallSegment['kind'] {
  // 1) 첫 segment 는 호 진입점 — 항상 INBOUND (설계서 § 2.0)
  if (isFirst) return 'INBOUND';

  switch (seg.segmentType) {
    case 'IR':
      return 'IVR';
    case 'IC_QUEUE':
    case 'IC_ROUTING':
      return 'CTI';
    case 'IC_AGENT':
      return 'AGENT';
    case 'IE': {
      // 중간/끝 IE hop — T_TYPE 으로 단계 분류
      const t = seg.tType;
      if (t === 3) return 'IVR';
      if (t === 4 || t === 5 || t === 6) return 'CTI';
      if (t === 2) return 'AGENT';
      if (seg.ccEnd === 1 || isLast) return 'DISCONNECT';
      return 'OTHER';
    }
    default:
      return 'OTHER';
  }
}

function segmentLabel(seg: BackendCallFlowSegment, kind: CallSegment['kind']): string {
  if (kind === 'IVR' && seg.serviceName) return `IVR · ${seg.serviceName}`;
  if (kind === 'CTI' && seg.queueName) return `큐 · ${seg.queueName}`;
  if (kind === 'AGENT' && seg.agentName) return `상담사 · ${seg.agentName}`;
  if (kind === 'INBOUND') return `인입 · ${seg.tName ?? seg.oName ?? `hop ${seg.hop ?? 0}`}`;
  return seg.tName ?? seg.oName ?? `hop ${seg.hop ?? '?'}`;
}

function mapCallDetail(raw: BackendCallDetail): { header: CallDetailHeader; segments: CallSegment[] } {
  const aniMasked = /\*/.test(raw.ani ?? '');
  const total = raw.segments?.length ?? 0;
  const segments: CallSegment[] = (raw.segments ?? []).map((s, idx) => {
    const kind = mapSegmentKind(s, idx === 0, idx === total - 1);
    return {
      segmentId: `${s.segmentType}-${s.hop ?? idx}-${s.cdrPkey ?? idx}`,
      kind,
      startTime: s.startTime ?? raw.startTime ?? '',
      endTime: s.endTime,
      durationSec: s.durationSec,
      label: segmentLabel(s, kind),
      meta: {
        queueId: s.queueId,
        queueName: s.queueName,
        agentId: s.agentId,
        agentName: s.agentName,
        nodeId: s.nodeId,
        nodeName: s.nodeName,
        serviceName: s.serviceName,
        endReason: s.endReason,
      },
      isError: false,
    };
  });

  // 헤더 — agent/queue 가 segments 에서 가장 먼저 발견되는 것 사용
  const firstAgent = (raw.segments ?? []).find((s) => s.agentName || s.agentId != null);
  const firstQueue = (raw.segments ?? []).find((s) => s.queueName || s.queueId != null);

  const header: CallDetailHeader = {
    ucid: raw.ucid,
    startTime: raw.startTime ?? '',
    endTime: raw.endTime,
    durationSec: raw.totalDurationSec,
    ani: raw.ani,
    aniMasked,
    dnis: raw.dnis,
    agentId: firstAgent?.agentId != null ? String(firstAgent.agentId) : null,
    agentName: firstAgent?.agentName ?? null,
    queueName: firstQueue?.queueName ?? null,
    result: (raw.overallResult as CallDetailHeader['result']) ?? null,
    resultLabel: raw.overallResult ?? null,
    tenantId: raw.tenantId,
    tenantName: raw.tenantName,
    nodeId: raw.segments?.[0]?.nodeId ?? null,
    nodeName: raw.segments?.[0]?.nodeName ?? null,
    transferCount: 0,
    unmaskAvailable: aniMasked,
  };

  return { header, segments };
}

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
   * 콜 검색 — 백엔드 페이징 응답 그대로 반환.
   * Backend: ApiResponse<PagedResponse<CallSearchResult>> -> BFF: data:{items, page, size, total}
   * @flow ipron-tracking-search
   */
  search: async (criteria: TrackingSearchCriteria): Promise<{ items: CallSearchResult[]; page: number; size: number; total: number }> => {
    const response = await apiClient.post<DetailResponse<{ items: CallSearchResult[]; page: number; size: number; total: number }>>(
      '/ipron-tracking-search',
      toSearchRequest(criteria),
    );
    const data = extractDetail(response);
    return data ?? { items: [], page: 0, size: 0, total: 0 };
  },

  // ─── Detail (헤더 + segment) ──────────────────────────────────────────────

  /**
   * 콜 상세 헤더 + segment 목록.
   * Backend(CallDetail): 평면 {ucid, ani, dnis, startTime, endTime, totalDurationSec, ..., segments[{segmentType, hop, ...}]}
   * FE 가 기대하는 nested {header, segments} 로 변환 + segmentType('IE'|'IR'|'IC_*') → kind ('INBOUND'|'IVR'|'CTI'|'AGENT'|...) 매핑.
   * @flow ipron-tracking-detail
   */
  getDetail: async (ucid: string): Promise<{ header: CallDetailHeader; segments: CallSegment[] }> => {
    const response = await apiClient.get<DetailResponse<BackendCallDetail>>('/ipron-tracking-detail', {
      params: { ucid },
    });
    const raw = extractDetail(response);
    if (!raw) return { header: emptyHeader(ucid), segments: [] };
    return mapCallDetail(raw);
  },

  /**
   * IE_BASICCDR hop별 raw row (118 컬럼) — Drawer 시각화용.
   * Backend: ApiResponse<Map<String, Object>> -> BFF: data:{...} -> extractDetail
   * @flow ipron-tracking-ie-cdr
   */
  getIeCdrDetail: async (ucid: string, hop: number): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<DetailResponse<Record<string, unknown>>>('/ipron-tracking-ie-cdr', {
      params: { ucid, hop },
    });
    return (extractDetail(response) ?? {}) as Record<string, unknown>;
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
