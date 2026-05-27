/**
 * 상담사/그룹 화면에서 사용하는 공통코드.
 *
 * AS-IS 출처: SWAT `TB_CC_COMMONCODE`
 *   - CLASS_CD = 'AGENT_GRADE'   → 상담등급
 *   - CLASS_CD = 'JIKGUP_CODE'   → 직급
 *   - CLASS_CD = 'ON_OFF_STATUS' → ON/OFF
 *
 * 코드값은 IPRON DB(실측, 2026-05-22) 기준 하드코딩.
 * 후속 PR 에서 `/api/ipron/common-codes?classCd=...` 로 옮길 예정.
 */

export interface CodeOption {
  value: string;
  label: string;
}

export const AGENT_GRADE_OPTIONS: CodeOption[] = [
  { value: '10', label: '관리자' },
  { value: '21', label: 'P.T' },
  { value: '25', label: 'Trainee' },
  { value: '30', label: 'Junior' },
  { value: '40', label: 'Senior' },
  { value: '50', label: 'Vice Supervisor' },
  { value: '60', label: 'Supervisor' },
];

export const JIKGUP_OPTIONS: CodeOption[] = [
  { value: '01', label: '실장' },
  { value: '02', label: '부부장' },
  { value: '03', label: '차장' },
  { value: '04', label: '과장' },
  { value: '05', label: '차장대우' },
  { value: '06', label: '계장' },
  { value: '07', label: '대리' },
  { value: '08', label: '주임' },
  { value: '10', label: '팀장' },
  { value: '20', label: '파트장' },
  { value: '30', label: '부파트장' },
  { value: '40', label: '교육강사' },
  { value: '50', label: 'QAA' },
  { value: '60', label: '상담사' },
  { value: '90', label: '총괄' },
  { value: '91', label: '수석' },
  { value: '92', label: '운영' },
  { value: '93', label: '영업' },
  { value: '94', label: '개발' },
  { value: '95', label: '엔지니어' },
];

function toMap(opts: CodeOption[]): Record<string, string> {
  return Object.fromEntries(opts.map((o) => [o.value, o.label]));
}

/**
 * 상담사 로그인 상태 — CLASS_CD = 'LOGIN_STATUS'.
 * SWAT IPR20S4010 SQL: `LEFT OUTER JOIN ... CLASS_CD = 'LOGIN_STATUS' AND CODE_CD = A.AGENT_STATUS`.
 */
export const LOGIN_STATUS_OPTIONS: CodeOption[] = [
  { value: '1', label: 'Login' },
  { value: '9', label: 'Logout' },
  { value: '2', label: 'Fail' },
];

export const AGENT_GRADE_MAP = toMap(AGENT_GRADE_OPTIONS);
export const JIKGUP_MAP = toMap(JIKGUP_OPTIONS);
export const LOGIN_STATUS_MAP = toMap(LOGIN_STATUS_OPTIONS);

export function labelOfAgentGrade(code?: string | null): string {
  if (code == null || code === '') return '-';
  return AGENT_GRADE_MAP[code] ?? code;
}

export function labelOfJikgup(code?: string | null): string {
  if (code == null || code === '') return '-';
  return JIKGUP_MAP[code] ?? code;
}

export function labelOfLoginStatus(code?: string | number | null): string {
  if (code == null || code === '') return '-';
  return LOGIN_STATUS_MAP[String(code)] ?? String(code);
}

export function labelOfActivate(v?: number | null): string {
  if (v == null) return '-';
  return v === 1 ? '활성' : '비활성';
}

export function labelOfYesNo(v?: number | null, on = '사용', off = '미사용'): string {
  if (v == null) return '-';
  return v === 1 ? on : off;
}

// ── Form Select / Radio 옵션 ──────────────────────────────────────────────

export const ACTIVATE_OPTIONS = [
  { value: 1, label: '활성' },
  { value: 0, label: '비활성' },
];

export const RETIRE_OPTIONS = [
  { value: 0, label: '재직' },
  { value: 1, label: '퇴사' },
];

export const ON_OFF_OPTIONS = [
  { value: 1, label: '사용' },
  { value: 0, label: '미사용' },
];

export const GRP_ANI_OPTIONS = [
  { value: 1, label: '사용' },
  { value: 0, label: '미사용' },
];

/** 미디어 옵션 사용 방식 — SWAT poUseGrpMdaOpt radio. */
export const USE_GRP_MDA_OPT_OPTIONS = [
  { value: 0, label: '개별 미디어 옵션' },
  { value: 1, label: '그룹 미디어 옵션' },
];

/** 스킬 배정 옵션 사용 방식 — SWAT poUseGrpSkill radio. */
export const USE_GRP_SKILL_OPTIONS = [
  { value: 0, label: '개별 스킬 배정' },
  { value: 1, label: '그룹 스킬 배정' },
];
