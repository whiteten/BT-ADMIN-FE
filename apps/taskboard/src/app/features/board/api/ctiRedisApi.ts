import ApiTaskboard, { type ApiRequestConfig } from '@/shared-util';
import { isPublicMode, publicAuthHeaders } from './publicAuth';

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

/**
 * 공개 모드(TaskViewPublic)면 401이 apps/host의 전역 로그인 리다이렉트를 트리거하지
 * 않도록 apiClient의 silent 플래그를 실어 보낸다 (taskboardApi.ts의 withAuth와 동일 패턴).
 */
const withAuth = (config?: ApiRequestConfig): ApiRequestConfig | undefined => {
  const auth = publicAuthHeaders();
  const needsSilent = isPublicMode();
  if (!auth && !needsSilent) return config;
  return {
    ...config,
    ...(auth ? { headers: { ...(config?.headers as Record<string, string> | undefined), ...auth } } : {}),
    ...(needsSilent ? { silent: true } : {}),
  };
};

// [삭제 2026-07-10] CtiQueueRow/CtiAgentRow/CtiMediaTypeRow/CtiGroupRow — IC 전용 마스터목록 타입.
// 큐/상담사/상담그룹/미디어타입은 데이터소스관리(DbQueryDef)로 일반화되어 별도 타입/엔드포인트 불필요.

/** application-redis-key-map.yml의 key-definitions 항목 하나 (BE RedisKeyMapper.KeyDefinition과 1:1 대응) */
export interface RedisKeyDefinition {
  /** 실제 Redis HASH KEY 패턴 ({var}는 가이드용 표기, 예: "IC:GROUP:REASON:{groupId}:{mediaType}") */
  actual: string;
  /** FE 탐색기 한국어 표시명 */
  label: string;
  /** 복합 field key의 파트 이름 목록(순서대로) */
  fieldParts: string[];
  /** 각 파트의 고정 길이(0 또는 마지막 파트 = 나머지 전체) */
  fieldLengths: number[];
  /** (선택) TB_BT_IS_MON_REDIS_FIELD.KEY_PATTERN — 이 키의 필드 영문명을 한글로 매핑하는 키 패턴 */
  keyPattern?: string;
}

/** GET /api/taskboard/redis/key-definitions 응답 전체 */
export interface RedisKeyDefinitionsResponse {
  mediaType: Record<string, string>;
  prefixMap: Record<string, string>;
  keyDefinitions: Record<string, RedisKeyDefinition>;
  /** keyPattern → {영문 필드명 → 한글 표시명}. yml key-pattern 지정분만. */
  fieldDisplayNames?: Record<string, Record<string, string>>;
}

export const ctiRedisApi = {
  /** Redis Hash 타입 키 목록 조회. refresh=true이면 서버 캐시를 다시 SCAN하여 갱신한 뒤 반환 */
  getRedisHashKeys: async (refresh?: boolean): Promise<string[]> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-hashkeys', withAuth({ params: refresh ? { refresh: true } : undefined }));
    const list = response?.data?.data?.value ?? response?.data?.data;
    return Array.isArray(list) ? list : [];
  },

  /**
   * 해시키 → 컬럼명(필드명) 목록 캐시 조회. 서버가 기동/새로고침(refresh=true) 시점에 미리 계산해 둔
   * 캐시를 즉시 반환하므로 Redis를 직접 조회하지 않음 — task-create 좌측 Redis 탐색기의 필드명 검색
   * (예: SUM_CONN_CNT)에 사용. 최신 캐시가 필요하면 getRedisHashKeys(true)를 먼저 호출.
   */
  getRedisHashColumns: async (): Promise<Record<string, string[]>> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-hashcolumns', withAuth());
    const data = response?.data?.data?.value ?? response?.data?.data;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, string[]>) : {};
  },

  /**
   * Redis Hash 키의 모든 필드(compositeKey)를 원본 그대로(평탄화 없이) 조회.
   * "해시그룹"(IC:GROUP:0 등)에서 task-create가 특정 compositeKey(그룹/큐/상담사)를 선택할 수 있는 UI를 위해 사용.
   */
  getRedisHashEntries: async (hashKey: string): Promise<Record<string, string>> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-hashentries', withAuth({ params: { hashKey } }));
    const data = response?.data?.data?.value ?? response?.data?.data;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, string>) : {};
  },

  /**
   * Redis BASE KEY → 실제 HASH KEY 매핑 메타데이터(application-redis-key-map.yml 로드 결과).
   * BE `RedisKeyMapper`가 기동 시 로드 — YAML을 고쳐도 재시작 전엔 안 바뀌는 정적 데이터.
   */
  getRedisKeyDefinitions: async (): Promise<RedisKeyDefinitionsResponse> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-key-definitions', withAuth());
    const data = response?.data?.data?.value ?? response?.data?.data;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as RedisKeyDefinitionsResponse) : { mediaType: {}, prefixMap: {}, keyDefinitions: {} };
  },
};
