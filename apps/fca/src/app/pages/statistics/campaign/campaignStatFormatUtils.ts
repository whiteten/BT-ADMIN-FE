/** BE PSR_TIME_KEY(YYYYMMDD 등) → 화면 표시용 날짜 문자열 */
export function formatPsrTimeKey(value: unknown, timeUnit: string): string {
  if (value == null) return '';
  const s = String(value).trim();
  if (!s || s === '전체합계') return s;
  if (!/^\d+$/.test(s)) return s;

  const y = s.slice(0, 4);
  const mo = s.slice(4, 6);
  const d = s.slice(6, 8);

  if (s.length === 4) return y;
  if (s.length === 6) return `${y}-${mo}`;
  if (s.length >= 8) {
    switch (timeUnit) {
      case 'YY':
        return y;
      case 'MM':
        return `${y}-${mo}`;
      default:
        return `${y}-${mo}-${d}`;
    }
  }
  return s;
}

/** psrTimeKey가 비어 있을 때 viewDate 등 보조 필드 사용 */
export function resolvePsrTimeKeyRaw(data?: { psrTimeKey?: string; viewDate?: string } | null): string {
  return data?.psrTimeKey?.trim() || data?.viewDate?.trim() || '';
}

export function formatCampaignStatRowDate(data: { psrTimeKey?: string; viewDate?: string } | undefined, timeUnit: string, isSummaryRow: boolean): string {
  if (isSummaryRow) return String(data?.psrTimeKey ?? '전체합계');
  const formatted = formatPsrTimeKey(resolvePsrTimeKeyRaw(data), timeUnit);
  return formatted || '-';
}
