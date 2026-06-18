import dayjs from 'dayjs';
import type { EffectiveFormat } from '../features/panel/api/panelApi';
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

/** Java 날짜 패턴(yyyy-MM-dd HH:mm:ss) → dayjs 토큰. 대소문자 다른 y/d 만 치환. */
function javaPatternToDayjs(pattern: string): string {
  return pattern.replace(/y+/g, (m) => m.toUpperCase()).replace(/d+/g, (m) => m.toUpperCase());
}

/**
 * BE 산출 최종 서식(EffectiveFormat)으로 원시값을 표시 문자열로 변환한다.
 * 전역 포맷 정책(소수자릿수·천단위·로케일)이 BE 에서 이미 병합되어 내려오므로 그대로 적용한다.
 *
 * - 천단위/소수자릿수/로케일: Intl(NumberFormat) 로 type 무관 공통 적용
 * - PERCENT: 원시값은 이미 백분율 수치(AS-IS 동일, ×100 안 함). percentScale 은 메타로만 보유
 * - CURRENCY: symbol 우선, 없으면 'value code'
 * - DURATION: 초 → hh:mm:ss
 * - DATETIME: pattern 있으면 그대로, 없으면 yyyy-MM-dd[ HH:mm:ss]
 * - MASK: maskStart~maskEnd 구간을 maskChar 로 치환
 * - NONE: 원시값 그대로
 */
export function formatByEffectiveFormat(value: unknown, fmt: EffectiveFormat): string {
  if (value === null || value === undefined || value === '') return '—';
  const locale = fmt.locale || 'ko-KR';

  if (fmt.type === 'NONE') return String(value);

  if (fmt.type === 'DATETIME') {
    const d = dayjs(value as string);
    if (!d.isValid()) return String(value);
    if (fmt.pattern) return d.format(javaPatternToDayjs(fmt.pattern));
    return d.hour() || d.minute() || d.second() ? d.format('YYYY-MM-DD HH:mm:ss') : d.format('YYYY-MM-DD');
  }

  if (fmt.type === 'MASK') {
    const str = String(value);
    const ch = fmt.maskChar || '*';
    const start = Math.max(0, fmt.maskStart ?? 0);
    const end = Math.min(str.length - 1, fmt.maskEnd ?? str.length - 1);
    if (end < start) return str;
    return str.slice(0, start) + ch.repeat(end - start + 1) + str.slice(end + 1);
  }

  const num = Number(value);
  if (isNaN(num)) return String(value);

  const decimals = Math.max(0, fmt.decimals ?? 0);
  const nf = num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: fmt.thousandsSep,
  });

  switch (fmt.type) {
    case 'PERCENT':
      return `${nf}%`;
    case 'CURRENCY':
      return fmt.symbol ? `${fmt.symbol}${nf}` : fmt.currencyCode ? `${nf} ${fmt.currencyCode}` : nf;
    case 'DURATION': {
      const total = Math.floor(num);
      const h = Math.floor(total / 3600)
        .toString()
        .padStart(2, '0');
      const m = Math.floor((total % 3600) / 60)
        .toString()
        .padStart(2, '0');
      const s = Math.floor(total % 60)
        .toString()
        .padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
    case 'NUMBER':
    case 'DECIMAL':
    default:
      return nf;
  }
}

/**
 * 통합 셀 서식 — BE 서식 메타(EffectiveFormat)에 실제 타입이 있으면 우선,
 * 없거나 NONE(미지정)이면 패널 columnFormat 으로 폴백.
 * 그리드·차트·KPI 가 동일 규칙으로 표시하도록 단일 진입점으로 둔다.
 *
 * NONE 폴백 이유: 계산필드 등 BE formatterType 미지정 컬럼은 NONE 으로 내려오는데,
 * 이때 원본(미반올림) 노출 대신 보고서 작성자가 패널에 지정한 columnFormat(Rate/Decimal 등)을 적용한다.
 */
export function formatCell(value: unknown, meta: EffectiveFormat | undefined, fallback: ColumnFormat | undefined): string {
  return meta && meta.type !== 'NONE' ? formatByEffectiveFormat(value, meta) : formatColumnValue(value, fallback);
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
