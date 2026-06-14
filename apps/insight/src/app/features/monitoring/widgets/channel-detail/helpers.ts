import { isChannelBusy } from './statusMap';
import type { ChannelRow, SystemGroup } from './types';

/** 안전 숫자 변환. 문자열 숫자도 처리. */
export function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

export function toStr(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

/** 원본 data 가 List / {rows} / {value} / {items} / {channels} 어느 형태든 안전 추출. */
export function toChannelRows(data: unknown): ChannelRow[] {
  if (data == null) return [];
  let list: unknown = data;
  if (!Array.isArray(list) && typeof list === 'object') {
    const obj = list as Record<string, unknown>;
    if (Array.isArray(obj.rows)) list = obj.rows;
    else if (Array.isArray(obj.value)) list = obj.value;
    else if (Array.isArray(obj.items)) list = obj.items;
    else if (Array.isArray(obj.channels)) list = obj.channels;
  }
  if (!Array.isArray(list)) return [];
  return list.filter((r): r is ChannelRow => r != null && typeof r === 'object');
}

/** 채널·ANI·DNIS·UCID 어디에 매칭되든 검색 통과. */
export function matchSearch(row: ChannelRow, q: string): boolean {
  if (!q) return true;
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const haystack = [row.CHNL_NO, row.SERVICE_ANI, row.SERVICE_DNIS, row.UCID, row.ORG_DNIS]
    .filter((v) => v != null && v !== '')
    .map((v) => String(v).toLowerCase())
    .join(' ');
  return haystack.includes(s);
}

/**
 * 시스템(SLEE)별 채널 그룹 + 점유 집계. 점유율 높은 순으로 정렬(헬스보드/시안 동일).
 */
export function groupBySystem(rows: ChannelRow[]): SystemGroup[] {
  const map = new Map<number, ChannelRow[]>();
  for (const r of rows) {
    const sid = toNum(r.SYSTEM_ID);
    if (sid == null) continue;
    const arr = map.get(sid);
    if (arr) arr.push(r);
    else map.set(sid, [r]);
  }

  const groups: SystemGroup[] = [];
  for (const [systemId, list] of map) {
    const irType = toNum(list[0]?.IR_TYPE);
    let busy = 0;
    let inBusy = 0;
    let outBusy = 0;
    let errCnt = 0;
    for (const r of list) {
      const status = toNum(r.CHNL_STATUS);
      if (status === 8 || status === 9) errCnt++;
      if (isChannelBusy(irType, status)) {
        busy++;
        const inout = toNum(r.INOUT_KIND);
        if (inout === 20 || inout === 30) inBusy++;
        else if (inout === 10) outBusy++;
      }
    }
    const total = list.length;
    const occPct = total === 0 ? 0 : Math.round((busy / total) * 100);
    const inPct = total === 0 ? 0 : Math.round((inBusy / total) * 100);
    const systemName = toStr(list[0]?.SYSTEM_NAME) || `SLEE ${systemId}`;
    groups.push({ systemId, systemName, irType, rows: list, total, busy, inBusy, outBusy, errCnt, occPct, inPct });
  }

  groups.sort((a, b) => b.occPct - a.occPct || a.systemId - b.systemId);
  return groups;
}

/** 상태코드별 채널수. (전체 10종 0 포함) */
export function countByStatus(rows: ChannelRow[]): Record<number, number> {
  const c: Record<number, number> = {};
  for (let i = 0; i < 10; i++) c[i] = 0;
  for (const r of rows) {
    const status = toNum(r.CHNL_STATUS);
    if (status == null) continue;
    c[status] = (c[status] ?? 0) + 1;
  }
  return c;
}

/** IR_TYPE 라벨. */
export function irTypeLabel(irType: number | null): string {
  if (irType === 1) return 'TDM';
  if (irType === 2) return 'SIP';
  return '-';
}
