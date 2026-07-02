/** url 경로 분해 소형 유틸 — 의존성 없음(openTabs·findMenuInfo 양쪽에서 순환 없이 공용). */

/** URL 첫 세그먼트(remote appId). 없으면 빈 문자열. */
export function getAppId(pathname: string): string {
  return pathname.split('/').filter(Boolean)[0] ?? '';
}

/** pathname에서 appId 세그먼트를 제거한 상대경로(앞·뒤 슬래시 없음). appId는 pathname의 첫 세그먼트여야 한다. */
export function getRelPath(pathname: string, appId: string): string {
  return pathname.slice(appId.length + 1).replace(/^\/+|\/+$/g, '');
}

/** 전체 경로 문자열을 pathname과 search(쿼리스트링)로 분리. queryString 분기 메뉴 path 대응. */
export function splitPath(fullPath: string): { pathname: string; search: string } {
  const qIdx = fullPath.indexOf('?');
  if (qIdx < 0) return { pathname: fullPath, search: '' };
  return { pathname: fullPath.slice(0, qIdx), search: fullPath.slice(qIdx) };
}
