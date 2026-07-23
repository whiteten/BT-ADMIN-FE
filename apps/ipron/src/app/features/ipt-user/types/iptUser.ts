/**
 * IPT 사용자관리 타입 (TB_IE_USER_MASTER — AS-IS IPR20S2055).
 */

/** 사용자 목록/상세 응답 — PW/PIN 미포함 (보안: 레거시 PIN 평문 노출 제거) */
export interface IptUserResponse {
  ieUserid: number;
  tenantId: number;
  tenantName: string | null;
  dnGroupId: number;
  dnGrpName: string | null;
  userId: string;
  userName: string;
  clidName: string | null;
  localLang: string | null;
  timeZone: string | null;
  userLevel: number | null;
  userLevelName: string | null;
  duties: number | null;
  dutiesName: string | null;
  activateYn: number; // 0/1
  mobileNo: string | null;
  emailAddr: string | null;
  uniqCode: string | null;
  userAniNum: string | null;
  internalAni: string | null;
  dnId: number | null;
  dnNo: string | null;
  autoMdYn: number | null; // 녹취(자동 미디어 전달) — 할당 DN 값
  pinRegistered: boolean;
  workTime: string | null;
}

/** 사용자 등록 요청 */
export interface IptUserCreateRequest {
  tenantId: number;
  dnGroupId: number;
  userId: string;
  userPw: string;
  userName: string;
  pinNo: string;
  activateYn?: number;
  clidName?: string | null;
  userLevel?: number | null;
  duties?: number | null;
  localLang?: string | null;
  timeZone?: string | null;
  emailAddr?: string | null;
  mobileNo?: string | null;
  userAniNum?: string | null;
  internalAni?: string | null;
  uniqCode?: string | null;
}

/** 사용자 수정 요청 — userId 변경 불가, PW/PIN 공란=미변경 */
export type IptUserUpdateRequest = Omit<IptUserCreateRequest, 'tenantId' | 'userId' | 'userPw' | 'pinNo'> & {
  userPw?: string | null;
  pinNo?: string | null;
};

/** 할당가능 DN */
export interface AssignableDn {
  dnId: number;
  dnNo: string;
  nodeId: number | null;
  assignedToSelf: boolean;
}

/** 조직 일괄변경 요청 */
export interface IptUserGroupMoveRequest {
  dnGroupId: number;
  ieUserIds: number[];
}

/** 직급/직책 (TYPE 1=직급, 2=직책 — 전역) */
export interface IptLevelDuty {
  levelDutyId: number;
  type: number;
  name: string;
  sortSeq: number | null;
  userCount: number;
}

export interface IptLevelDutyRequest {
  type: number;
  name: string;
  sortSeq?: number | null;
}

/** 엑셀 Import 결과 (부분 성공 207) */
export interface IptUserImportResult {
  total: number;
  successCount: number;
  failCount: number;
  rows: {
    rowNum: number;
    userId: string | null;
    userName: string | null;
    success: boolean;
    message: string | null;
  }[];
}

/** 공통코드 옵션 (localLang / timeZone) */
export interface CommonCodeOption {
  code: string;
  name: string;
}
