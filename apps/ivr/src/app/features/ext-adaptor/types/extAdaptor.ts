/**
 * 확장 어댑터 관리 타입 (AS-IS IPR20S6042)
 *
 * 도메인: FOCUS 시스템(SYS_CLASS_CD 1035/1036/1037)별 어댑터 + Watcher + 환경파일.
 * 백엔드: BT-ADMIN-SERVICE-IVR (TB_IR_ADAPTOR_MASTER / TB_IR_WATCHER_MASTER / TB_IR_ADAPTOR_CONFIGFILE)
 */

// ─── 노드 / FOCUS 시스템 ─────────────────────────────────────────────────
export interface AdaptorNode {
  nodeId: number;
  nodeName: string;
}

export interface AdaptorSystem {
  nodeId: number;
  nodeName: string;
  systemId: number;
  systemName: string;
  /** 해당 시스템의 어댑터 수 (카드 표시용) */
  adaptorCount?: number;
}

// ─── 어댑터 마스터 ───────────────────────────────────────────────────────
export interface Adaptor {
  systemId: number;
  adaptorId: number;
  adaptorName: string;
  /** 어댑터 종류 (공통코드 IR_BRIDGE_KIND) */
  adaptorType: number;
  adaptorTypeName?: string;
  /** 시나리오 지정용 ID */
  transId: number;
  connIp: string;
  connPort: number;
  /** 접속방식 (공통코드 ADAPTOR_CONN_TYPE) */
  connType: number;
  connTypeName?: string;
  /** 이중화 동작방식 (공통코드 ADAPTOR_HA_ROLE) */
  haRole: number;
  haRoleName?: string;
  /** Alive 감시주기(초) */
  aliveInterval: number;
  /** 최대 응답대기시간(초) */
  respTimeout: number;
  /** 사용유무 (1=사용 / 0=미사용) */
  useYn: number;
  useYnName?: string;
  workUser?: number;
  workUserName?: string | null;
  workTime?: string | null;
}

export interface AdaptorCreateRequest {
  systemId: number;
  adaptorName: string;
  adaptorType: number;
  transId: number;
  connIp: string;
  connPort: number;
  connType: number;
  haRole: number;
  aliveInterval: number;
  respTimeout: number;
  useYn: number;
}

/** 수정 본문 — 레거시 updAdaptorMaster 가 전 컬럼 갱신이므로 create 와 동일 형태. adaptorId 는 path 파라미터. */
export type AdaptorUpdateRequest = AdaptorCreateRequest;

/** 배치복사 요청 — 원본 시스템 어댑터 전체를 대상 시스템들로 덮어쓰기 복사 (AS-IS IPR20S6042SC.do). */
export interface AdaptorBatchCopyRequest {
  sourceSystemId: number;
  targetSystemIds: number[];
}

/** 배치복사 결과. */
export interface AdaptorBatchCopyResult {
  targetCount: number;
  sourceCount: number;
  deletedCount: number;
  insertedCount: number;
}

// ─── 어댑터 환경파일 (기본/확장 2개) ──────────────────────────────────────
export interface AdaptorConfig {
  systemId: number;
  adaptorId: number;
  /** FN_NEWID_IR 채번 — BE Long → number */
  irAdaptorConfigId: number;
  /** 1=기본 환경파일 / (확장도 동일하게 1로 저장됨 — 실제 구분은 configId) */
  irAdaptorConfigType: string;
  adaptorConfigName: string;
  configDesc?: string | null;
  filePath?: string | null;
  createDate?: string | null;
  workUser?: number | null;
  workTime?: string | null;
}

// ─── Watcher ─────────────────────────────────────────────────────────────
export interface Watcher {
  watcherId: number;
  systemId: number;
  watcherName: string;
  watcherDesc?: string | null;
  /** EMS 파일 경로 (BE FILE_PATH) */
  filePath?: string | null;
  createDate?: string | null;
  workUser?: number | null;
  workUserName?: string | null;
  workTime?: string | null;
}

// ─── 공통코드 라벨 (운영 DB TB_CC_COMMONCODE 직접 조회로 확인한 실값. BE enum 코드와 1:1) ──
/** IR_BRIDGE_KIND — 어댑터 종류 (1=CB, 2=TB) */
export const ADAPTOR_TYPE_LABELS: Record<string, string> = {
  '1': 'CB',
  '2': 'TB',
};

/** ADAPTOR_CONN_TYPE — 접속방식 (1=TCP, 2=UDP) */
export const ADAPTOR_CONN_TYPE_LABELS: Record<string, string> = {
  '1': 'TCP',
  '2': 'UDP',
};

/** ADAPTOR_HA_ROLE — 이중화 동작방식 (0=Stanby, 1=Active) — Stanby 는 운영 DB 값 그대로 */
export const ADAPTOR_HA_ROLE_LABELS: Record<string, string> = {
  '0': 'Stanby',
  '1': 'Active',
};

/** 사용유무 */
export const USE_YN_LABELS: Record<number, string> = {
  1: '사용',
  0: '미사용',
};

// ─── 폼 기본값 (AS-IS setDefalutValue 동일) ──────────────────────────────
export const ADAPTOR_FORM_DEFAULTS = {
  adaptorType: 2,
  haRole: 1,
  connType: 1,
  respTimeout: 10,
  aliveInterval: 10,
  useYn: 1,
} as const;

/** 시스템당 어댑터 최대 개수 (AS-IS 100개 제한) */
export const ADAPTOR_MAX_PER_SYSTEM = 100;
