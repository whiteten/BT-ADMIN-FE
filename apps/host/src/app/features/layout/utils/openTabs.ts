import type { BreadcrumbProps } from 'antd';
import type { RemoteRouteEntry, TabMeta } from '@/shared-store';
import { findMenuByPath } from './findMenuInfo';
import type { MenuConfig } from '@/libs/shared-store/src/types/menu.types';

/** URL 첫 세그먼트(remote appId). */
export function getAppId(pathname: string): string {
  return pathname.split('/').filter(Boolean)[0] ?? '';
}

/** 전체 경로 문자열을 pathname과 search(쿼리스트링)로 분리. queryString 분기 메뉴 path 대응. */
export function splitPath(fullPath: string): { pathname: string; search: string } {
  const qIdx = fullPath.indexOf('?');
  if (qIdx < 0) return { pathname: fullPath, search: '' };
  return { pathname: fullPath.slice(0, qIdx), search: fullPath.slice(qIdx) };
}

/**
 * pathname+search에서 탭 메타(appId·url·label·isDynamic)를 도출한다. 메뉴 클릭(새 탭 생성)·탭 내 이동
 * (활성 탭 url 갱신)·부트스트랩(딥링크)에서 공통 사용. appId가 없으면(비-remote url) null.
 * - 라벨: 메뉴 라벨 우선 → 비파라미터는 세그먼트 humanize/appName, 파라미터 상세는 '…'(breadcrumb로 정밀화).
 * - isDynamic: leaf 라우트가 파라미터(`:id`)를 가지면 true → 이탤릭(데이터발 라벨) 스타일.
 */
export function deriveTabMeta(menuConfigs: MenuConfig[], routesMap: Record<string, RemoteRouteEntry[]>, pathname: string, search: string): TabMeta | null {
  const appId = getAppId(pathname);
  if (!appId) return null;
  const relPath = pathname.replace(new RegExp(`^/${appId}/?`), '').replace(/\/+$/, '');
  const entry = findLeafEntry(routesMap[appId], relPath);
  const { label: menuLabel, appName } = findMenuByPath(menuConfigs, appId, relPath, search);
  const lastSeg = relPath.split('/').filter(Boolean).pop() ?? '';
  const isDynamic = !!entry?.paramKeys?.length;
  // 파라미터 상세는 id 세그먼트 대신 '…'(breadcrumb 해석 후 실제 이름으로 교체), 비파라미터는 기존 우선순위.
  const label = isDynamic ? ([menuLabel, '…'].find(Boolean) ?? '…') : ([menuLabel, humanizeSegment(lastSeg), appName].find(Boolean) ?? appId);
  return { appId, url: pathname + search, label, isDynamic };
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
export function findLeafEntry(entries: RemoteRouteEntry[] | undefined, relPath: string): RemoteRouteEntry | undefined {
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
