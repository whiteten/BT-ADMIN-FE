import dayjs from 'dayjs';
import type { ColumnFormat } from '../features/report/types';

/**
 * 패널 컬럼 서식(columnFormat)에 따라 원시값을 표시 문자열로 변환한다.
 * 그리드·차트·KPI 등 모든 보고서 렌더링이 동일 규칙을 쓰도록 단일 소스로 둔다.
 *
 * - Decimal: 소수 2자리 고정
 * - Rate: 천단위 + '%' (원시값이 이미 백분율 수치라고 가정, ×100 안 함)
 * - Time: 초 → hh:mm:ss
 * - Date: 날짜/일시 문자열 → yyyy-MM-dd (시각 있으면 yyyy-MM-dd HH:mm:ss)
 * - Number/String/그 외: 천단위 구분자만
 */
export function formatColumnValue(value: unknown, format: ColumnFormat | undefined): string {
  if (value === null || value === undefined || value === '') return '—';

  if (format === 'Date') {
    const d = dayjs(value as string);
    if (!d.isValid()) return String(value);
    return d.hour() || d.minute() || d.second() ? d.format('YYYY-MM-DD HH:mm:ss') : d.format('YYYY-MM-DD');
  }

  const num = Number(value);
  if (isNaN(num)) return String(value);

  switch (format) {
    case 'Decimal':
      return num.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'Rate':
      return `${num.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`;
    case 'Time': {
      const h = Math.floor(num / 3600)
        .toString()
        .padStart(2, '0');
      const m = Math.floor((num % 3600) / 60)
        .toString()
        .padStart(2, '0');
      const s = Math.floor(num % 60)
        .toString()
        .padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
    default:
      return num.toLocaleString('ko-KR');
  }
}

const FORMATTER_TO_COLUMN: Record<string, ColumnFormat> = {
  NUMBER: 'Number',
  DECIMAL: 'Decimal',
  PERCENT: 'Rate',
  DATETIME: 'Date',
  DURATION: 'Time',
};

/**
 * 데이터셋 필드의 서버 formatterType → 보고서 패널 columnFormat.
 * 패널에 필드를 추가할 때 데이터셋에서 지정한 서식을 그대로 상속받기 위한 변환.
 * (NONE/null 등 미지정은 측정값 기본인 Number 로 폴백)
 */
export function formatterTypeToColumnFormat(formatterType: string | null | undefined): ColumnFormat {
  return (formatterType && FORMATTER_TO_COLUMN[formatterType]) || 'Number';
}
