/**
 * 암호화 버블 복호화 감사 이력 타입 정의.
 * 백엔드: BT-ADMIN-SERVICE-FCA / DecryptLogListResponse / DecryptLogStatResponse
 */

/** 감사 이력 단건 (목록 + 상세 공용) */
export interface DecryptLogItem {
  logId: string;
  requestId: string;

  // 대상 버블
  ucid: string;
  bubbleKey: string;
  bubbleSeq: number | null;
  bubbleInnerIdx: number | null;
  bubbleType: number | null;
  /** BOT / CUSTOMER / SYSTEM */
  dialogRole: string | null;

  // 결과
  /** SUCCESS / NOT_FOUND / DECRYPT_FAIL / FORBIDDEN / VALIDATION_FAIL */
  result: string;
  failureReason: string | null;

  // 사유
  reasonCode: string | null;
  reasonText: string | null;

  // 열람자
  userId: number | null;
  userAccount: string;
  userName: string | null;

  // 클라이언트 컨텍스트
  clientIp: string | null;
  userAgent: string | null;
  traceId: string | null;

  // 콜 컨텍스트 스냅샷
  serviceId: number | null;
  serviceName: string | null;
  ani: string | null;
  dnis: string | null;
  callStartTime: string | null;
  bubbleStartTime: string | null;

  // 시각
  createdAt: string;
}

/** 페이지 응답 */
export interface PagedDecryptLog {
  items: DecryptLogItem[];
  page: number;
  size: number;
  total: number;
}

/** 검색 요청 파라미터 */
export interface DecryptLogSearchRequest {
  /** YYYY-MM-DD (필수) */
  fromDate: string;
  /** YYYY-MM-DD (필수) */
  toDate: string;
  userAccount?: string;
  userNameKeyword?: string;
  ucid?: string;
  serviceId?: number;
  result?: string;
  reasonCode?: string;
  clientIp?: string;
  page?: number;
  size?: number;
  /** queryKey 강제 갱신용 */
  _t?: number;
  [key: string]: unknown;
}

/** 통계 응답 */
export interface DecryptLogStat {
  totalCount: number;
  failureCount: number;
  distinctUserCount: number;
  countByReasonCode: Record<string, number>;
  countByResult: Record<string, number>;
}

/** 사유 코드 메타 (UI 라벨/색상 매핑) */
export const REASON_CODE_LABELS: Record<string, string> = {
  MINWON: '민원 확인',
  QUALITY: '품질 검수',
  SECURITY: '보안 감사',
  LEGAL: '법적 대응',
  CUSTOMER: '고객 요청',
  CUSTOM: '기타',
};

/** 결과 코드 메타 */
export const RESULT_LABELS: Record<string, string> = {
  SUCCESS: '성공',
  NOT_FOUND: '대상 없음',
  DECRYPT_FAIL: '복호화 실패',
  FORBIDDEN: '권한 없음',
  VALIDATION_FAIL: '요청 오류',
};
