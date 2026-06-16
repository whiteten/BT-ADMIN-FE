import { type ComponentType, useCallback } from 'react';
import { loadRemote, registerRemotes } from '@module-federation/enhanced/runtime';
import { LOG } from '@/log';
import { type SiteOverrideMeta, useSiteCustomStore } from '@/shared-store';

const Log = new LOG('useSiteCustomLoader');

/**
 * 현장 커스텀(custom remote) 고정 경로.
 * 기존 remote들과 동일한 배포 컨벤션(/remotes/<app>/)을 따른다 —
 * 현장은 빌드 산출물을 이 경로에 업로드하기만 하면 되고, 파일이 없으면(404)
 * 현장 커스텀 비활성으로 표준 동작한다. dev에서는 host proxy(proxy.config.js)가
 * 이 경로를 custom remote dev 서버로 우회시킨다.
 *
 * ⚠️ 전제조건: custom remote는 반드시 consume-only(shared `import: false`)로 빌드돼야 한다.
 * 일반 remote처럼 공급자로 합류하면 host share scope의 동일 버전 항목(react 등)을
 * 미로딩 factory로 덮어써 React 인스턴스가 2개가 된다(Invalid hook call).
 * 상세: apps/custom/webpack.config.ts 주석 참조.
 */
const SITE_REMOTE_NAME = 'custom';
const SITE_REMOTE_ENTRY_URL = `/remotes/${SITE_REMOTE_NAME}/remoteEntry.js`;

type SiteManifestModule = { siteOverrides?: Record<string, SiteOverrideMeta> };

/**
 * host 부팅 시 1회 고정 경로의 remoteEntry 존재를 확인해 custom remote를 MF 런타임에
 * 동적 등록하고, 오버라이드 목록(SiteManifest)과 컴포넌트 loader를 useSiteCustomStore
 * (singleton)에 주입한다. DynamicElement(각 remote 번들의 사본)는 loader로
 * 'site:' componentKey를 해석하고, 오버라이드 목록은 picker 카탈로그에 노출된다.
 */
export function useSiteCustomLoader() {
  const setLoader = useSiteCustomStore((s) => s.setLoader);
  const setOverrides = useSiteCustomStore((s) => s.setOverrides);

  const load = useCallback(async () => {
    try {
      const res = await fetch(SITE_REMOTE_ENTRY_URL, { method: 'HEAD', cache: 'no-cache' });
      if (!res.ok) {
        Log.debug('custom remote 없음 — 현장 커스텀 비활성 (표준 동작)');
        return;
      }

      registerRemotes([{ name: SITE_REMOTE_NAME, entry: SITE_REMOTE_ENTRY_URL }]);

      // 오버라이드 목록 적재 — picker 카탈로그('커스텀' 카드 노출)의 근거.
      // SiteManifest가 없거나 로드에 실패해도 'site:' componentKey 명시 경로는 동작해야 하므로
      // 빈 목록으로 계속 진행한다.
      let overrides: Record<string, SiteOverrideMeta> = {};
      try {
        const manifest = await loadRemote<SiteManifestModule>(`${SITE_REMOTE_NAME}/SiteManifest`);
        overrides = manifest?.siteOverrides ?? {};
      } catch (err) {
        Log.warn('SiteManifest 로드 실패 — picker 카탈로그 노출 없이 동작합니다.', err);
      }
      setOverrides(overrides);

      setLoader(async (exposedPath: string) => {
        const module = await loadRemote<{ default: ComponentType }>(`${SITE_REMOTE_NAME}/${exposedPath}`);
        return module?.default ?? null;
      });
      Log.debug('custom remote 등록 완료:', SITE_REMOTE_ENTRY_URL, '/ overrides:', Object.keys(overrides));
    } catch (err) {
      Log.warn('custom remote 등록 실패 — 표준 화면으로 동작합니다.', err);
    }
  }, [setLoader, setOverrides]);

  return { load };
}
