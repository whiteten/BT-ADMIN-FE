/**
 * COS 설정 타입 정의
 * AS-IS: IPR20S2060 (TB_IE_COS_MASTER)
 * TO-BE: BT-ADMIN-SERVICE-IPRON cos feature
 */

// ─── COS 응답 ────────────────────────────────────────────────────────────────

export interface Cos {
  cosId: number;
  cosName: string;
  tenantId: number;
  // 그룹IPT 서비스
  dnTblSvc: number; // 착신금지 (0/1)
  dnOblSvc: number; // 발신금지 (0/1)
  dodLimitSvc: number; // 발신제한/허용그룹
  pickupSvc: number; // 픽업사용 (0/1)
  coachingSvc: number; // 코칭사용 (0/1)
  monitorSvc: number; // 감청사용 (0/1)
  ignoreBugsCoaching: number; // 피감청/피코칭방지 (0/1)
  dodNumAllow: number; // 특정번호 발신허용 (0/1)
  dodNumPattern: string | null; // 특정번호 발신허용 패턴
  callScreenSvc: number; // 특정번호 착신금지 (0/1)
  callScreenNum: string | null; // 특정번호 착신금지 패턴
  // 개인IPT 서비스 - 발신
  shortDialSvc: number; // 단축다이얼 (0/1)
  callReserveSvc: number; // 통화예약 (0/1)
  autoReturnSvc: number; // 자동호회수 (0/1)
  intercomOrigSvc: number; // 인터콤 발신 (0/1)
  // 개인IPT 서비스 - 착신
  unknownDeny: number; // 익명호 거부 (0/1)
  dodNameSvc: number; // 발신자 이름표시 (0/1)
  transSvc: number; // 착신 전환류 (0/1)
  denySvc: number; // 착신 거부류 (0/1)
  busyWaitSvc: number; // 통화중 대기 (0/1)
  absenceSvc: number; // 부재중 안내 (0/1)
  moveAnsSvc: number; // 이동응답 (0/1)
  mvaSvc: number; // 모바일 원격접근 (0/1)
  cidDenySvc: number; // 발신자정보표시방지 (0/1)
  callAvoidSvc: number; // 호회피 (0/1)
  autoanswerSvc: number; // 자동응답 (0/1)
  // 개인IPT 서비스 - 기타
  intercomTermSvc: number; // 인터콤 착신 허용 (0/1)
  didReleaseTone: number; // 통화 종료음 (0/1)
  trnsOkTone: number; // 호전환완료음 (0/1)
  silentTermSvc: number; // 무음착신서비스 (0/1)
  // 예약 필드 (DB 라운드트립 손실 방지용, UI 미노출)
  reserve1?: number | null;
  reserve2?: number | null;
  reserve3?: number | null;
  reserve4?: number | null;
  reserve5?: number | null;
}

// ─── COS 등록 요청 ─────────────────────────────────────────────────────────

export interface CosCreateRequest {
  cosName: string;
  tenantId: number;
  // 그룹IPT 서비스
  dnTblSvc: number;
  dnOblSvc: number;
  dodLimitSvc: number;
  pickupSvc: number;
  coachingSvc: number;
  monitorSvc: number;
  ignoreBugsCoaching: number;
  dodNumAllow: number;
  dodNumPattern?: string | null;
  callScreenSvc: number;
  callScreenNum?: string | null;
  // 개인IPT 서비스
  shortDialSvc: number;
  callReserveSvc: number;
  autoReturnSvc: number;
  intercomOrigSvc: number;
  unknownDeny: number;
  dodNameSvc: number;
  transSvc: number;
  denySvc: number;
  busyWaitSvc: number;
  absenceSvc: number;
  moveAnsSvc: number;
  mvaSvc: number;
  cidDenySvc: number;
  callAvoidSvc: number;
  autoanswerSvc: number;
  intercomTermSvc: number;
  didReleaseTone: number;
  trnsOkTone: number;
  silentTermSvc: number;
  // 예약 필드 (DB 라운드트립 손실 방지용, UI 미노출)
  reserve1?: number | null;
  reserve2?: number | null;
  reserve3?: number | null;
  reserve4?: number | null;
  reserve5?: number | null;
}

// ─── COS 수정 요청 ─────────────────────────────────────────────────────────

export interface CosUpdateRequest {
  cosName: string;
  // 그룹IPT 서비스
  dnTblSvc: number;
  dnOblSvc: number;
  dodLimitSvc: number;
  pickupSvc: number;
  coachingSvc: number;
  monitorSvc: number;
  ignoreBugsCoaching: number;
  dodNumAllow: number;
  dodNumPattern?: string | null;
  callScreenSvc: number;
  callScreenNum?: string | null;
  // 개인IPT 서비스
  shortDialSvc: number;
  callReserveSvc: number;
  autoReturnSvc: number;
  intercomOrigSvc: number;
  unknownDeny: number;
  dodNameSvc: number;
  transSvc: number;
  denySvc: number;
  busyWaitSvc: number;
  absenceSvc: number;
  moveAnsSvc: number;
  mvaSvc: number;
  cidDenySvc: number;
  callAvoidSvc: number;
  autoanswerSvc: number;
  intercomTermSvc: number;
  didReleaseTone: number;
  trnsOkTone: number;
  silentTermSvc: number;
  // 예약 필드 (DB 라운드트립 손실 방지용, UI 미노출)
  reserve1?: number | null;
  reserve2?: number | null;
  reserve3?: number | null;
  reserve4?: number | null;
  reserve5?: number | null;
}

// ─── 초기값 ─────────────────────────────────────────────────────────────────

export const COS_INITIAL_VALUES: CosCreateRequest = {
  cosName: '',
  tenantId: 0,
  dnTblSvc: 0,
  dnOblSvc: 0,
  dodLimitSvc: 0,
  pickupSvc: 0,
  coachingSvc: 0,
  monitorSvc: 0,
  ignoreBugsCoaching: 0,
  dodNumAllow: 0,
  dodNumPattern: '',
  callScreenSvc: 0,
  callScreenNum: '',
  shortDialSvc: 0,
  callReserveSvc: 0,
  autoReturnSvc: 0,
  intercomOrigSvc: 0,
  unknownDeny: 0,
  dodNameSvc: 0,
  transSvc: 0,
  denySvc: 0,
  busyWaitSvc: 0,
  absenceSvc: 0,
  moveAnsSvc: 0,
  mvaSvc: 0,
  cidDenySvc: 0,
  callAvoidSvc: 0,
  autoanswerSvc: 0,
  intercomTermSvc: 0,
  didReleaseTone: 0,
  trnsOkTone: 0,
  silentTermSvc: 0,
};

// ─── 서비스 플래그 메타 정보 (카드 토글 렌더링용) ─────────────────────────────

export interface ServiceFlag {
  field: keyof Cos;
  label: string;
  hasPattern?: boolean;
  patternField?: keyof Cos;
  patternLabel?: string;
  patternMaxLength?: number;
}

/** 그룹IPT 서비스 - 발신 부가서비스 */
export const GROUP_IPT_OUTBOUND_FLAGS: ServiceFlag[] = [
  { field: 'dnOblSvc', label: '발신금지' },
  { field: 'dodNumAllow', label: '특정번호 발신허용', hasPattern: true, patternField: 'dodNumPattern', patternLabel: '발신허용 패턴', patternMaxLength: 256 },
  { field: 'coachingSvc', label: '코칭사용' },
  { field: 'monitorSvc', label: '감청사용' },
];

/** 그룹IPT 서비스 - 착신 부가서비스 */
export const GROUP_IPT_INBOUND_FLAGS: ServiceFlag[] = [
  { field: 'dnTblSvc', label: '착신금지' },
  { field: 'callScreenSvc', label: '특정번호 착신금지', hasPattern: true, patternField: 'callScreenNum', patternLabel: '착신금지 패턴', patternMaxLength: 24 },
  { field: 'pickupSvc', label: '픽업사용' },
  { field: 'ignoreBugsCoaching', label: '피감청/피코칭방지' },
];

/** 개인IPT 서비스 - 발신 부가서비스 */
export const PERSONAL_IPT_OUTBOUND_FLAGS: ServiceFlag[] = [
  { field: 'shortDialSvc', label: '단축다이얼' },
  { field: 'callReserveSvc', label: '통화예약' },
  { field: 'autoReturnSvc', label: '자동호회수' },
  { field: 'intercomOrigSvc', label: '인터콤 발신' },
];

/** 개인IPT 서비스 - 착신 부가서비스 */
export const PERSONAL_IPT_INBOUND_FLAGS: ServiceFlag[] = [
  { field: 'unknownDeny', label: '익명호 거부' },
  { field: 'dodNameSvc', label: '발신자 이름표시' },
  { field: 'transSvc', label: '착신 전환류' },
  { field: 'denySvc', label: '착신 거부류' },
  { field: 'busyWaitSvc', label: '통화중 대기' },
  { field: 'absenceSvc', label: '부재중 안내' },
  { field: 'moveAnsSvc', label: '이동응답' },
  { field: 'mvaSvc', label: '모바일 원격접근' },
  { field: 'cidDenySvc', label: '발신자정보표시방지' },
  { field: 'callAvoidSvc', label: '호회피' },
  { field: 'autoanswerSvc', label: '자동응답' },
];

/** 개인IPT 서비스 - 기타 */
export const PERSONAL_IPT_ETC_FLAGS: ServiceFlag[] = [
  { field: 'intercomTermSvc', label: '인터콤 착신 허용' },
  { field: 'didReleaseTone', label: '통화 종료음' },
  { field: 'trnsOkTone', label: '호전환완료음' },
  { field: 'silentTermSvc', label: '무음착신서비스' },
];
