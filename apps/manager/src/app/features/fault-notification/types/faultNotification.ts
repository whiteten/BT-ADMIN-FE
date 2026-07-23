/**
 * 장애통보 관리 타입 정의 (리뉴얼 D안 v3 — 대상-시스템 페어 모델 + 제외코드)
 * BE: BT-ADMIN-SERVICE-MANAGER /api/manager/notification-targets (BFF Flow: manager-fault-noti-*)
 */

/** 통보 대상 (마스터) — 활성/전체 시스템 페어·제외코드 카운트 포함 */
export interface NotiTarget {
  /** 통보 대상 ID (PK, 사용자 입력 문자열 — 수정 불가) */
  notiTargetId: string;
  /** 대상 이름 (NOT NULL — 수정 가능) */
  notiTargetName: string;
  phoneNo: string | null;
  email: string | null;
  smsId: string | null;
  /** true = 일시정지 — 이 대상의 모든 통보 중단 (STOP_YN) */
  stopped: boolean;
  /** 활성(발송 중) 시스템 페어 수 */
  activeSystemCount: number;
  /** 전체 시스템 페어 수 */
  totalSystemCount: number;
  /** 제외코드 수 */
  excludedCodeCount: number;
  workTime: string | null;
}

/** 통보 대상 등록 요청 — 서버가 시스템마스터 전체를 페어로 함께 INSERT(모두 활성) */
export interface NotiTargetCreateDatas {
  notiTargetId: string;
  notiTargetName: string;
  phoneNo: string | null;
  email: string | null;
  smsId: string | null;
  stopped: boolean;
}

/** 통보 대상 수정 요청 — ID 는 path 변수(targetId)로 전달, 변경 불가 */
export type NotiTargetUpdateDatas = Omit<NotiTargetCreateDatas, 'notiTargetId'>;

/** 통보 시스템 페어 — 대상 등록 시 전체 INSERT, 비활성화는 stopped 토글(행 삭제 없음) */
export interface NotiSystem {
  sysClassCd: string;
  sysClassName: string | null;
  systemId: number;
  systemName: string | null;
  systemAlias: string | null;
  nodeId: number | null;
  nodeName: string | null;
  /** true = 발송 안 함 (페어 행 STOP_YN='Y') */
  stopped: boolean;
}

/** 발신코드 타입 — ALARM/INFO (상수 객체 SoT + 파생 타입 패턴) */
export const ERR_TYPE = {
  ALARM: 'ALARM',
  INFO: 'INFO',
} as const;
export type ErrType = (typeof ERR_TYPE)[keyof typeof ERR_TYPE];

/** 제외코드 — 행 존재 = 그 코드 장애는 이 대상에게 발송 안 함 */
export interface ExceptCode {
  categoryCd: string;
  categoryName: string | null;
  errCode: string;
  errName: string | null;
  errType: ErrType | null;
  /** 등록 시각 */
  workTime: string | null;
}

/** 제외코드 추가 요청 항목 (다건 일괄 POST) */
export interface ExceptCodeCreateItem {
  categoryCd: string;
  errCode: string;
}

/** 제외코드 피커 후보 (코드 사전) — excluded = 이미 제외됨 */
export interface NoticeCode {
  sysClassCd: string;
  sysClassName: string;
  categoryCd: string;
  categoryName: string;
  errCode: string;
  errName: string;
  errType: ErrType;
  excluded: boolean;
}
