import type { PageVariantsManifestMap, RemoteRoutesMap } from '@/shared-store';

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
 * 선택된 appId · path 조합에 등록된 변형이 있으면 옵션 배열 반환, 없으면 null.
 * null인 경우 폼에서 componentKey Select 자체를 숨긴다.
 */
export const buildVariantOptions = (variants: PageVariantsManifestMap, appId: string | undefined, path: string | undefined): MenuFormSelectOption[] | null => {
  if (!appId || !path) return null;
  const matched = variants[appId]?.find((v) => v.path === path);
  if (!matched) return null;
  return matched.variants.map((variant) => ({
    value: variant.key,
    label: variant.label,
    ...(variant.description ? { description: variant.description } : {}),
  }));
};
