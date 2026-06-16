import type { ComponentType } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * 화면 지정(componentKey) 값에서 현장 커스텀(custom remote) 컴포넌트를 가리키는 prefix.
 * 예: 'site:fca/bot-config/bot/list' → custom remote의 './fca/bot-config/bot/list' 노출 모듈
 */
export const SITE_COMPONENT_KEY_PREFIX = 'site:';

/**
 * prefix를 제외한 노출 경로(예: 'fca/bot-config/bot/list')를 받아
 * custom remote의 컴포넌트를 로드한다. 로드 실패·미노출 시 null을 반환한다.
 */
export type SiteCustomComponentLoader = (exposedPath: string) => Promise<ComponentType | null>;

/** custom remote의 SiteManifest가 제공하는 오버라이드 메타 (picker 카드 등에 사용) */
export interface SiteOverrideMeta {
  label: string;
  description?: string;
}

/**
 * 현장 커스텀(custom remote) loader·오버라이드 목록 보관 스토어.
 *
 * DynamicElement는 shared 라이브러리가 아니어서 각 remote 번들에 사본으로 포함된다.
 * remote 번들 사본이 자기 MF 런타임에서 직접 loadRemote를 호출하면 host 런타임에
 * 동적 등록된 custom remote를 보지 못할 수 있으므로, host가 부팅 시 loader와
 * 오버라이드 목록을 singleton인 이 스토어에 주입하고 DynamicElement는 여기서 꺼내 쓴다.
 *
 * 하이브리드 판정에서의 역할:
 * - overrides: componentKey 미지정 화면의 자동 활성화 판단 근거 ('<appId>/<path>' 키 존재 여부)
 * - loader: 'site:' componentKey 및 자동 활성화 시 실제 컴포넌트 로드 수단
 */
interface SiteCustomStore {
  /** host가 custom remote 등록 후 주입하는 loader. null이면 custom remote 미배포 상태 */
  loader: SiteCustomComponentLoader | null;
  /** '<appId>/<path>' → 메타. custom remote SiteManifest에서 적재. null이면 미배포 상태 */
  overrides: Record<string, SiteOverrideMeta> | null;
  setLoader: (loader: SiteCustomComponentLoader | null) => void;
  setOverrides: (overrides: Record<string, SiteOverrideMeta> | null) => void;
}

export const useSiteCustomStore = create<SiteCustomStore>()(
  devtools(
    (set) => ({
      loader: null,
      overrides: null,
      setLoader: (loader) => set({ loader }, false, 'setLoader'),
      setOverrides: (overrides) => set({ overrides }, false, 'setOverrides'),
    }),
    { name: 'SiteCustomStore' },
  ),
);
