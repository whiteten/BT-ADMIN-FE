/**
 * 대표번호별 DNIS 관리 타입 정의 (IPR20S6043).
 * AS-IS: TB_IR_AIN_MASTER
 * TO-BE: BT-ADMIN-SERVICE-IVR aindnis feature
 */

// ─── 통신사 구분 (CC_TELCO_KIND) — Enum 전환 ─────────────────────────────────

export type TelcoKindCode = '0' | '1' | '2' | '3';

export const TELCO_KIND_OPTIONS = [
  { label: '공통', value: '0' as TelcoKindCode },
  { label: 'KT', value: '1' as TelcoKindCode },
  { label: 'SKT', value: '2' as TelcoKindCode },
  { label: 'LGU+', value: '3' as TelcoKindCode },
] as const;

export const TELCO_KIND_LABELS: Record<TelcoKindCode, string> = {
  '0': '공통',
  '1': 'KT',
  '2': 'SKT',
  '3': 'LGU+',
};

// ─── Backend Response 타입 ──────────────────────────────────────────────────

export interface IrAinMaster {
  ainNo: string;
  tenantId: number;
  tenantName?: string;
  originDnis: string;
  originDnisName: string;
  telcoKind: TelcoKindCode;
  telcoKindLabel?: string;
  dnisDesc?: string | null;
  workUser?: number;
  workTime?: string;
}

// ─── Request 타입 ───────────────────────────────────────────────────────────

export interface IrAinMasterCreateRequest {
  tenantId: number;
  ainNo: string;
  originDnis: string;
  originDnisName: string;
  telcoKind: TelcoKindCode;
  dnisDesc?: string | null;
}

export interface IrAinMasterUpdateRequest {
  originDnisName?: string;
  telcoKind?: TelcoKindCode;
  dnisDesc?: string | null;
}

// ─── 테넌트 정보 (cross-service) ────────────────────────────────────────────

export interface TenantSimpleResponse {
  tenantId: number;
  tenantName: string;
}

// ─── 엑셀 업로드 결과 ───────────────────────────────────────────────────────

export interface ExcelImportResultRow {
  rowNumber: number;
  name: string;
  status: 'SUCCESS' | 'FAIL';
  reason: string | null;
}

export interface ExcelImportResult {
  totalCount: number;
  successCount: number;
  failCount: number;
  rows: ExcelImportResultRow[];
}
