import ApiClient, { type ApiResponse } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * Redis 키 템플릿 — 플랫 리스트의 한 행.
 * 전광판과 달리 데이터셋은 변수(mediaType 등)를 키에 확정하지 않고 검색조건(필터)으로 다룬다.
 * 그래서 가변 세그먼트는 '*'로 치환돼 동일 구조 키가 하나의 템플릿으로 묶인다.
 */
export interface RedisKeyTemplate {
  /** SCAN MATCH 패턴(가변 자리는 '*'), 데이터셋 키로 사용 */
  pattern: string;
  /** 이 템플릿에 묶인 실제 키 수 */
  keyCount: number;
  /** 가변(*) 세그먼트 수 = 필터 차원 개수 */
  variableCount: number;
}

/** 템플릿 선택 시 받는 필드(컬럼) 후보 1개. (BE MonDatasetDetectedColumnDto 직렬화 필드명과 일치) */
export interface RedisKeyColumn {
  columnName: string;
  dataType: string;
  columnFormat: string;
  /** JSON | HASH_FIELD | KEY_SEGMENT (없으면 null) */
  source: string | null;
  /** 컬럼 코멘트/설명 (REDIS는 추후 제공, 없으면 null) */
  comment?: string | null;
  /** DIM(차원) | MSR(측정값) — 필드 사전 지정값. 없으면 null(타입으로 폴백) */
  classification?: 'DIM' | 'MSR' | null;
}

/** 키 템플릿의 필드 스키마 — 실제 데이터 값은 포함하지 않는다. */
export interface RedisKeySchema {
  /** 스키마 추출에 사용한 샘플 키(매칭 키가 없으면 null) */
  sampleKey: string | null;
  /** JSON_PER_FIELD(value=JSON) | HASH_AS_ROW(value=스칼라) | null */
  valueMode: 'JSON_PER_FIELD' | 'HASH_AS_ROW' | null;
  /** 키 사전(TB_BT_IS_MON_REDIS_KEY)의 한글 표시명 (없으면 null) */
  keyDisplayName?: string | null;
  /** 키 사전의 설명 — 기본 정보 화면 노출 (없으면 null) */
  keyDescription?: string | null;
  columns: RedisKeyColumn[];
}

// 모니터링 데이터셋 REDIS 베이스 — 플랫 키 템플릿 탐색 API.
// ※ BE 미연동/빈 데이터일 수 있다. 호출 측에서 graceful 처리할 것.
export const redisTreeApi = {
  /** 플랫 키 템플릿 목록 조회. refresh=true 면 BE 캐시 무시하고 재스캔. */
  getKeyTemplates: async (refresh?: boolean): Promise<RedisKeyTemplate[]> => {
    const response = await apiClient.get<ApiResponse<{ templates: RedisKeyTemplate[] }>>('/insight-monitoring-redis-key-templates', {
      params: refresh ? { refresh: true } : undefined,
    });
    return response.data?.data?.templates ?? [];
  },

  /** 선택한 키 템플릿의 필드 스키마 조회. 첫 샘플 키의 컬럼만 내려온다(값 미포함). */
  getKeySchema: async (path: string): Promise<RedisKeySchema> => {
    const response = await apiClient.get<ApiResponse<RedisKeySchema>>('/insight-monitoring-redis-key-schema', { params: { path } });
    return response.data?.data ?? { sampleKey: null, valueMode: null, columns: [] };
  },
};
