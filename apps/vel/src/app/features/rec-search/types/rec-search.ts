/** 통화내역 목록 아이템 (V5 + 마킹은 TB_REC_CUST_INFO.CUST_INFO9/10) */
export interface RecFileListItem {
  recKey: string;
  tenantId: string;
  recTime: string;
  dnNo: string;
  groupId: string;
  userId: string;
  userName: string;
  callTime?: number;
  endTime?: number;
  callKind: string;
  callId: string;
  custTel: string;
  hold?: number;
  stt?: string;
  ucid?: string;
  listenGrantYn: string;

  /** 마킹 코드 (CUST_INFO9) */
  markCode?: string;
  /** 마킹 메모 (CUST_INFO10) */
  markMemo?: string;
  /** 마킹 분류명 (TB_REC_MARKCODE.MARK_NAME) */
  markName?: string;
  /** 마킹 색상 HEX (TB_REC_MARKCODE.MARK_COLOR) */
  markColor?: string;
}

/** 추가검색어 필드 */
export interface CustInfoField {
  colId: string;
  colText: string;
}

/** 마킹 코드 (TB_REC_MARKCODE) */
export interface MarkCode {
  tenantId: string;
  markCode: string;
  markName: string;
  markColor: string;
  useFlag?: string;
}

/** 마킹 등록/삭제 요청 */
export interface RecMarkingRequest {
  markCode: string;
  markMemo: string;
}

/** 통화내역 검색 파라미터 (V5 기준) */
export interface RecSearchParams {
  startDate: string;
  endDate: string;
  findTenantId?: string;
  findGroupId?: string;
  findDnText?: string;
  findUserIdText?: string;
  findCustTelText?: string;
  findCallKind?: string;
  findCallIdText?: string;
  callTimeMin?: number;
  callTimeMax?: number;
  findMarkKind?: string;
  findField?: string;
  findFieldText?: string;
  page?: number;
  size?: number;
}

/** 페이징 응답 */
export interface RecFilePagedResult {
  items: RecFileListItem[];
  page: number;
  size: number;
  total: number;
}

/** 정보수정 요청 (V5: CUST_TEL만) */
export interface RecUpdateInfoRequest {
  custTel: string;
}

/** 통화 구분 코드 */
export const CALL_KIND = {
  INBOUND: '1',
  OUTBOUND: '2',
} as const;

export const CALL_KIND_LABELS: Record<string, string> = {
  '1': '수신',
  '2': '발신',
};
