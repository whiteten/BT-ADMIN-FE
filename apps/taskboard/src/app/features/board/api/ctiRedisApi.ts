import ApiTaskboard from '@/shared-util';

/**
 * CTI Redis 실시간 데이터 API
 * TASKBOARD BE → Redis → TB_IC_CTIQMASTER / TB_IC_AGENTMASTER / TB_IC_GROUPMASTER
 *
 * BFF AGG Flow 등록 필요 (V67 migration):
 *   - taskboard-redis-queue  : GET → TASKBOARD /api/taskboard/redis/cti-queue
 *   - taskboard-redis-agent  : GET → TASKBOARD /api/taskboard/redis/cti-agent
 *   - taskboard-redis-group  : GET → TASKBOARD /api/taskboard/redis/cti-group
 */
const apiTaskboard = new ApiTaskboard({ serviceURL: '/bff' });

/** TB_IC_CTIQMASTER 큐 행 */
export interface CtiQueueRow {
  [key: string]: string | number | null | undefined;
  ctiqId: string;
  ctiqName: string;
  gdnNo?: string | null;
  rtsWaitCnt?: number | null;
  totalIn?: number | null;
  totalAnswer?: number | null;
  totalAbandon?: number | null;
  kpiAnswerRate?: number | null;
  kpiAbandonRatio?: number | null;
  avgTotwaitTime?: number | null;
  rtsAvgwaitTime?: number | null;
  rtsMaxwaitTime?: number | null;
  dbUpdateTime?: string | null;
}

/** TB_IC_AGENTMASTER 상담사 행 */
export interface CtiAgentRow {
  [key: string]: string | number;
  agentId: string;
  agentName: string;
  /** 소속 상담그룹 ID — IC:AGENT:{groupId}:{mediaType} 해시 구독 키 합성에 사용 */
  groupId: string;
  statusCode: string;
  statusName: string;
  talkCount: number;
  talkTimeSec: number;
}

/** TB_IC_MEDIA_USAGE 미디어타입 행 */
export interface CtiMediaTypeRow {
  /** Redis 키 접미사 (예: "0", "10") */
  mediaType: string;
  /** 화면 표시 이름 (예: VOIP, 챗, 영상통화) */
  mediaAlias: string;
}

/** TB_IC_GROUPMASTER 상담그룹 행 */
export interface CtiGroupRow {
  [key: string]: string | number | string[];
  groupId: string;
  groupName: string;
  tenantId: string;
  /** IC:GROUP:{groupId10}{nodeId6} 복합키 목록 (노드 수만큼) */
  compositeKeys: string[];
  waitCount: number;
  talkCount: number;
  agentCount: number;
}

export const ctiRedisApi = {
  /** 큐 리스트 (TB_IC_CTIQMASTER via Redis) */
  getCtiQueueList: async (): Promise<CtiQueueRow[]> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-queue');
    const list = response?.data?.data?.value ?? response?.data?.data;
    return Array.isArray(list) ? list : [];
  },

  /** 상담사 리스트 (TB_IC_AGENTMASTER via Redis) */
  getCtiAgentList: async (): Promise<CtiAgentRow[]> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-agent');
    const list = response?.data?.data?.value ?? response?.data?.data;
    return Array.isArray(list) ? list : [];
  },

  /** 상담그룹 리스트 (TB_IC_GROUPMASTER via Redis) */
  getCtiGroupList: async (): Promise<CtiGroupRow[]> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-group');
    const list = response?.data?.data?.value ?? response?.data?.data;
    return Array.isArray(list) ? list : [];
  },

  /** Redis Hash 타입 키 목록 조회. refresh=true이면 서버 캐시를 다시 SCAN하여 갱신한 뒤 반환 */
  getRedisHashKeys: async (refresh?: boolean): Promise<string[]> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-hashkeys', { params: refresh ? { refresh: true } : undefined });
    const list = response?.data?.data?.value ?? response?.data?.data;
    return Array.isArray(list) ? list : [];
  },

  /** Redis Hash 키에 해당하는 모든 필드(컬럼)와 값 조회. BFF가 hashKey를 경로로 치환. */
  getRedisHashFields: async (hashKey: string): Promise<Record<string, string>> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-hashfields', { params: { hashKey } });
    const data = response?.data?.data?.value ?? response?.data?.data;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, string>) : {};
  },

  /**
   * Redis Hash 키의 모든 필드(compositeKey)를 원본 그대로(평탄화 없이) 조회.
   * "해시그룹"(IC:GROUP:0 등)에서 task-create가 특정 compositeKey(그룹/큐/상담사)를
   * 선택할 수 있는 UI를 위해 사용 — getRedisHashFields와 달리 첫 필드만 펼치지 않고 전체 field를 그대로 반환.
   */
  getRedisHashEntries: async (hashKey: string): Promise<Record<string, string>> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-hashentries', { params: { hashKey } });
    const data = response?.data?.data?.value ?? response?.data?.data;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, string>) : {};
  },

  /** TB_IC_MEDIA_USAGE 미디어타입 목록 조회 */
  getCtiMediaTypeList: async (): Promise<CtiMediaTypeRow[]> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-media-type');
    const list = response?.data?.data?.value ?? response?.data?.data;
    return Array.isArray(list) ? list : [];
  },

  /**
   * IC:GROUP:{mediaType} 해시에서 특정 compositeKey 목록의 컬럼값 조회.
   * table-group 위젯의 그룹별 RTS 집계에 사용.
   * 반환: { hashKey → { compositeKey → { column → value } } }
   */
  getRedisGroupValuesBatch: async (request: {
    hashKeys: string[];
    compositeKeys: string[];
    columns: string[];
  }): Promise<Record<string, Record<string, Record<string, number>>>> => {
    if (!request.hashKeys.length || !request.compositeKeys.length || !request.columns.length) return {};
    const response = await apiTaskboard.post<any>('/taskboard-redis-group-values-batch', request);
    const data = response?.data?.data?.value ?? response?.data?.data;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, Record<string, Record<string, number>>>) : {};
  },
};
