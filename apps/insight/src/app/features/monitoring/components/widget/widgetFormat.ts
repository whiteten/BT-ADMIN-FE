import type { DatasetDetail } from '../../types';

/** 위젯 차트/그리드 공용 — 필드명으로 기본/계산 필드 메타 조회. */
export interface WidgetFieldMeta {
  fieldName: string;
  displayName: string;
  columnFormat: string;
  classification: 'DIM' | 'MSR';
  isCalc: boolean;
}

export function fieldMeta(detail: DatasetDetail, name: string): WidgetFieldMeta | undefined {
  const base = detail.fields.find((f) => f.fieldName === name);
  if (base) {
    return { fieldName: base.fieldName, displayName: base.displayName, columnFormat: base.columnFormat, classification: base.classification, isCalc: false };
  }
  const calc = detail.calcFields.find((c) => c.fieldName === name);
  if (calc) {
    return { fieldName: calc.fieldName, displayName: calc.displayName, columnFormat: calc.columnFormat, classification: calc.classification, isCalc: true };
  }
  return undefined;
}

/** columnFormat(Number/Decimal/Rate/Time/String/Date)에 맞춘 값 포맷. */
export function formatValue(v: unknown, format?: string): string {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  const isNum = Number.isFinite(n) && !(typeof v === 'string' && v.trim() === '');
  switch (format) {
    case 'Number':
      return isNum ? Math.round(n).toLocaleString('ko-KR') : String(v);
    case 'Decimal':
      return isNum ? n.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : String(v);
    case 'Rate':
      return isNum ? `${n.toFixed(1)}%` : String(v);
    case 'Time': {
      if (!isNum) return String(v);
      const s = Math.max(0, Math.round(n));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }
    default:
      return String(v);
  }
}
