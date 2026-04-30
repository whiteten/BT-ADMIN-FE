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
