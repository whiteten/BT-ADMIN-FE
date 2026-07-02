import type { BreadcrumbProps } from 'antd';
import type { MenuConfig, RemoteRouteEntry, TabMeta } from '@/shared-store';
import { findMenuByPath } from './findMenuInfo';
import { getAppId, getRelPath } from './pathUtils';

export interface TabTarget {
  /** 탭 메타(appId·url·label·isDynamic) — 새 탭 생성·활성 탭 url 갱신·부트스트랩 공용. */
  meta: TabMeta;
  /** relPath에 매칭된 leaf 라우트 엔트리. redirect 전용 그룹·미로드 레지스트리면 undefined. */
  entry: RemoteRouteEntry | undefined;
  /** appId의 라우트 레지스트리 로드 여부 — false면 leaf 판정 불가(호출부는 기존 동작으로 폴백). */
  registryLoaded: boolean;
}

/**
 * pathname+search에서 탭 대상(메타 + leaf 엔트리 판정)을 한 번에 도출한다. appId가 없으면(비-remote url) null.
 * appId·relPath·leaf 매칭을 1회만 계산해 호출부(useTabSync)의 중복 계산을 없앤다.
 * - 라벨: 메뉴 라벨 우선 → 비파라미터는 세그먼트 humanize/appName, 파라미터 상세는 '…'(breadcrumb로 정밀화).
 * - isDynamic: leaf 라우트가 파라미터(`:id`)를 가지면 true → 이탤릭(데이터발 라벨) 스타일.
 */
export function resolveTabTarget(menuConfigs: MenuConfig[], routesMap: Record<string, RemoteRouteEntry[]>, pathname: string, search: string): TabTarget | null {
  const appId = getAppId(pathname);
  if (!appId) return null;
  const relPath = getRelPath(pathname, appId);
  const entries = routesMap[appId];
  const registryLoaded = !!entries && entries.length > 0;
  const entry = findLeafEntry(entries, relPath);
  const { label: menuLabel, appName } = findMenuByPath(menuConfigs, appId, relPath, search);
  const lastSeg = relPath.split('/').filter(Boolean).pop() ?? '';
  const isDynamic = !!entry?.paramKeys?.length;
  // 파라미터 상세는 id 세그먼트 대신 '…'(breadcrumb 해석 후 실제 이름으로 교체), 비파라미터는 기존 우선순위.
  const label = isDynamic ? ([menuLabel, '…'].find(Boolean) ?? '…') : ([menuLabel, humanizeSegment(lastSeg), appName].find(Boolean) ?? appId);
  return { meta: { appId, url: pathname + search, label, isDynamic }, entry, registryLoaded };
}

/** 한 leaf 엔트리 경로(`bot-config/bot/:serviceId`)가 실제 상대경로(`bot-config/bot/123`)와 매칭되는지. `:seg`는 와일드카드. */
function matchEntryPath(entryPath: string, relPath: string): boolean {
  const e = entryPath.split('/').filter(Boolean);
  const r = relPath.split('/').filter(Boolean);
  if (e.length !== r.length) return false;
  return e.every((seg, i) => seg.startsWith(':') || seg === r[i]);
}

/**
 * relPath에 매칭되는 leaf 라우트 엔트리를 찾는다(host의 RemoteRouteEntry 레지스트리 기준).
 * redirect 전용 그룹(`<Navigate>`)·Outlet 그룹 path는 레지스트리에 없으므로 undefined.
 * 레지스트리 미로드(빈 배열)면 undefined → 호출부에서 기존 동작으로 폴백한다.
 */
function findLeafEntry(entries: RemoteRouteEntry[] | undefined, relPath: string): RemoteRouteEntry | undefined {
  if (!entries || entries.length === 0) return undefined;
  return entries.find((en) => matchEntryPath(en.path, relPath));
}

/** kebab/snake 세그먼트를 사람이 읽기 쉬운 라벨로(메뉴/breadcrumb 미해석 시 임시 fallback). */
export function humanizeSegment(seg: string): string {
  if (!seg) return '';
  return seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * breadcrumb items 전체를 params로 해석해 문자열 배열로 돌려준다(탭 hover 툴팁의 경로 표시용).
 * 미해석(`:param` 잔존)·비문자 title 항목은 제외한다.
 */
export function resolveBreadcrumbTitles(items: BreadcrumbProps['items'], params: BreadcrumbProps['params']): string[] {
  if (!items) return [];
  return items
    .map((it) => {
      const title = it?.title;
      if (typeof title !== 'string') return '';
      const resolved = title.replace(/:(\w+)/g, (_m, p1) => String(params?.[p1] ?? ''));
      return resolved.includes(':') ? '' : resolved.trim();
    })
    .filter(Boolean);
}

/**
 * breadcrumb items의 마지막 항목 title을 params로 해석해 탭 라벨로 쓴다.
 * 동적 라벨(`:botName` 등)이 아직 미해석이면(빈 값/':' 잔존) 빈 문자열을 돌려 메뉴 라벨을 유지하게 한다.
 */
export function resolveBreadcrumbTail(items: BreadcrumbProps['items'], params: BreadcrumbProps['params']): string {
  if (!items || items.length === 0) return '';
  const title = items[items.length - 1]?.title;
  if (typeof title !== 'string') return '';
  const resolved = title.replace(/:(\w+)/g, (_m, p1) => String(params?.[p1] ?? ''));
  if (!resolved || resolved.includes(':')) return '';
  // 대시/공백만 남은 값은 페이지의 로딩 placeholder(`botName ?? '-'`)로 보고 미해석 취급 → '…' 유지
  if (/^[-–—\s]+$/.test(resolved)) return '';
  return resolved.trim();
}
