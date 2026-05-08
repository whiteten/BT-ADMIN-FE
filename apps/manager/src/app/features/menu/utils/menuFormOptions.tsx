import type { RemoteRoutesMap } from '@/shared-store';

export interface MenuFormSelectOption {
  value: string;
  label: string;
  description?: string;
}

/** 선택된 appId의 routes만 path 옵션으로 변환. appId 없으면 빈 배열. */
export const buildPathOptions = (routes: RemoteRoutesMap, appId: string | undefined): MenuFormSelectOption[] => {
  if (!appId) return [];
  const entries = routes[appId];
  if (!entries) return [];
  return entries.map((entry) => ({
    value: entry.path,
    label: entry.path,
  }));
};

/**
 * 저장된 path 문자열에서 base path와 queryValues를 분리한다.
 * 'sample/query-demo?option=B' → { basePath: 'sample/query-demo', queryValues: { option: 'B' } }
 */
export const splitPathQuery = (rawPath: string | null | undefined): { basePath: string; queryValues: Record<string, string> } => {
  if (!rawPath) return { basePath: '', queryValues: {} };
  const qIndex = rawPath.indexOf('?');
  if (qIndex < 0) return { basePath: rawPath, queryValues: {} };

  const basePath = rawPath.slice(0, qIndex);
  const search = new URLSearchParams(rawPath.slice(qIndex + 1));
  const queryValues: Record<string, string> = {};
  search.forEach((value, key) => {
    queryValues[key] = value;
  });
  return { basePath, queryValues };
};

/**
 * base path와 queryValues를 단일 path 문자열로 합성한다.
 * { basePath: 'sample/query-demo', queryValues: { option: 'B' } } → 'sample/query-demo?option=B'
 * undefined/빈 문자열은 query에서 제외한다.
 */
export const joinPathQuery = (basePath: string, queryValues: Record<string, string | undefined>): string => {
  const params = new URLSearchParams();
  Object.entries(queryValues).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
};
