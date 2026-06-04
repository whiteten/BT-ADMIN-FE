/**
 * 노드 상세 위젯 — 정규화 데이터 모델.
 *
 * 헬스보드 시스템 신호등("노드 상세 →" 링크)의 드릴다운 상세 위젯.
 * 데이터 출처: IO `SYSTEM:STAT` (Hashes, field = SYSTEM_ID) — 시스템별 리소스 현황.
 *   spec: docs/insight/monitoring/data-document/IO-REDIS-spec.md
 *   - STATUS / *_STATUS = 0:Normal, 1:Minor, 2:Major, 3:Critical (높을수록 나쁨)
 *   - IS_ACTIVE = 1:Active, 0:StandBy
 *   - CLASS_ITEMS = 시스템에 적재된 모듈별 상태 { CLASS_CD: { STATUS, IS_ACTIVE } }
 *
 * 회의 근거: meeting-007 — "자원판(CPU/메모리/디스크)은 독립 일상 위젯으로는 기각이나,
 * 헬스보드 빨간불 → 드릴다운 상세로는 충분"(고객·기획·FE 만장일치). 본 위젯이 그 드릴다운.
 */

/** SYSTEM:STAT STATUS 코드 — 0:Normal / 1:Minor / 2:Major / 3:Critical. */
export type NodeStatus = 0 | 1 | 2 | 3;

/** 한 자원(CPU/메모리/디스크)의 사용율 + 상태. */
export interface ResourceStat {
  /** 사용율 % (0~100) */
  rate: number;
  status: NodeStatus;
}

/** CLASS_ITEMS 의 모듈별 상태 (시스템에 적재된 모듈 1건). */
export interface NodeModule {
  /** CLASS_CD (모듈 코드) */
  code: string;
  status: NodeStatus;
  /** CLASS_ITEMS.IS_ACTIVE — 이중화 역할. true: Active / false: Standby. (이중화는 모듈 단위) */
  isActive: boolean;
}

/** 프로세스 현황 (전체/실행중 + 상태). */
export interface ProcessStat {
  total: number;
  running: number;
  status: NodeStatus;
}

/** 한 시스템(노드)의 종합 헬스. */
export interface SystemNode {
  /** SYSTEM_ID */
  systemId: string;
  /** SYSTEM_NAME */
  systemName: string;
  /** TYPE (IVR, NO7, FAX …) */
  type: string;
  /** 시스템 종합 상태 — CPU/MEM/DISK/PCS 중 가장 나쁜 값 (spec STATUS 정의) */
  status: NodeStatus;
  /**
   * IS_ACTIVE(04) — 시스템 가동 여부. true: 가동(살아있음) / false: 다운(죽음).
   * ⚠ 이중화(Active/Standby) 아님 — 이중화는 모듈(CLASS_ITEMS.IS_ACTIVE) 단위.
   * 다운(false)이면 자원·모듈 값은 무의미(stale)하며 최상위 위험으로 취급.
   */
  isAlive: boolean;
  cpu: ResourceStat;
  mem: ResourceStat;
  disk: ResourceStat;
  process: ProcessStat;
  /** CLASS_ITEMS — 모듈별 상태 */
  modules: NodeModule[];
  /** DB_UPDATE_TIME (yyyyMMddHHmmss) */
  updateTime?: string;
}

/** 위젯 옵션 — 자원 사용율 임계(주의/위험 %) 오버라이드. */
export interface NodeDetailThresholds {
  /** 사용율 ≥ warn → 주의색, ≥ danger → 위험색 (status 컬럼이 없을 때 사용율 폴백) */
  cpu?: { warn: number; danger: number };
  mem?: { warn: number; danger: number };
  disk?: { warn: number; danger: number };
}
