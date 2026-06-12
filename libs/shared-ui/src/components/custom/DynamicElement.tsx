import { type ComponentType, Suspense, lazy } from 'react';
import { Log } from '@/log';
import { SITE_COMPONENT_KEY_PREFIX, type SiteCustomComponentLoader, usePageVariantsStore, useSiteCustomStore } from '@/shared-store';
import { FallbackSpinner } from './FallbackSpinner';

export interface PageVariantManifestConfig {
  appId: string;
  path: string;
  defaultKey: string;
  components: Record<
    string,
    {
      label: string;
      description?: string;
      component: ComponentType;
    }
  >;
}

interface Props {
  variants: PageVariantManifestConfig;
}

/**
 * default(표준) 컴포넌트 1개짜리 변형 소켓 config를 만드는 헬퍼.
 *
 * component에는 routes.tsx 상단의 React.lazy 선언을 그대로 전달한다
 * (lazy 컴포넌트도 ComponentType이므로 별도 loader가 필요 없음).
 * 보통은 직접 쓰기보다 createPageVariantSocket으로 appId를 바인딩해 사용한다.
 */
export const createDefaultPageVariants = (appId: string, path: string, component: ComponentType): PageVariantManifestConfig => ({
  appId,
  path,
  defaultKey: 'default',
  components: {
    default: { label: '표준', component },
  },
});

/**
 * appId를 한 번만 바인딩하는 변형 소켓 팩토리.
 *
 * 정식 변형이 없는 페이지를 routes.tsx에서 별도 *.variants.ts 파일 없이
 * 한 줄로 DynamicElement 래핑할 때 사용한다. 현장 커스텀(custom remote)은
 * 런타임에 해석되므로 이 소켓만 있으면 커스텀 교체가 가능하다.
 * 정식 변형이 2개 이상 생기면 <Page>.variants.ts로 승격해 pageVariantManifest에 등록하고,
 * 해당 라우트만 <DynamicElement variants={...} />를 직접 사용한다.
 *
 * path는 화면을 식별하는 논리 키(SoT) — DB page-variant row·custom remote exposes 키와
 * 일치해야 하며, 라우트 경로를 그대로 사용한다(동적 세그먼트 `:paramId` 포함).
 * 키는 한번 정하면 변경 금지 — 라우트 경로·파라미터명이 리팩토링으로 바뀌어도 키를 따라
 * 바꾸면 DB에 저장된 기존 지정·현장 커스텀 연결이 끊어진다.
 *
 * @example
 * const pv = createPageVariantSocket('fca'); // routes.tsx 상단에 한 번
 * { path: 'list', element: pv('bot-config/bot/list', BotList) } // BotList = React.lazy(...)
 * { path: ':serviceId', element: pv('bot-config/bot/:serviceId', BotDetail) }
 */
export const createPageVariantSocket = (appId: string) => {
  return (path: string, component: ComponentType) => <DynamicElement variants={createDefaultPageVariants(appId, path, component)} />;
};

/**
 * 현장 커스텀 lazy 컴포넌트 캐시 (key: exposedPath).
 * 렌더마다 새 lazy를 만들면 Suspense가 매번 다시 발동해 화면이 remount되므로
 * 노출 경로 단위로 1회 생성해 재사용한다.
 */
const siteComponentCache = new Map<string, ComponentType>();

const getSiteComponent = (exposedPath: string, loader: SiteCustomComponentLoader, Fallback: ComponentType): ComponentType => {
  const cached = siteComponentCache.get(exposedPath);
  if (cached) return cached;

  const LazyComponent = lazy(async () => {
    try {
      const component = await loader(exposedPath);
      if (component) return { default: component };
      Log.warn(`[DynamicElement] custom remote에 '${exposedPath}'가 노출되어 있지 않아 기본 화면으로 fallback합니다.`);
    } catch (err) {
      Log.warn(`[DynamicElement] custom remote '${exposedPath}' 로드 실패 — 기본 화면으로 fallback합니다.`, err);
    }
    // Fallback은 보통 routes.tsx의 React.lazy 컴포넌트 — lazy payload의 default로 lazy를
    // 그대로 반환하면 중첩 lazy가 되어 React가 거부하므로, 함수 컴포넌트로 한 겹 감싸 반환한다.
    return { default: () => <Fallback /> };
  });
  siteComponentCache.set(exposedPath, LazyComponent);
  return LazyComponent;
};

/**
 * routes.tsx의 element 자리에 끼우는 래퍼.
 * 운영자가 화면 지정 관리에서 선택한 componentKey(usePageVariantsStore에 저장)를 보고
 * 컴포넌트를 결정하며, 지정이 없으면 defaultKey(표준)의 컴포넌트를 렌더한다.
 *
 *  1. componentKey가 'site:' prefix → custom remote에서 런타임 로드 (현장 커스텀)
 *  2. componentKey가 components 맵의 키 → 해당 variant
 *  3. 그 외(미지정 포함) → defaultKey의 컴포넌트
 *
 * custom remote 미배포·로드 실패 시에는 defaultKey로 fallback한다.
 */
const DynamicElement = ({ variants }: Props) => {
  const selectedKey = usePageVariantsStore((state) => state.variants[variants.appId]?.[variants.path]);
  const siteLoader = useSiteCustomStore((state) => state.loader);

  const DefaultComponent = variants.components[variants.defaultKey].component;

  let Component: ComponentType;
  if (selectedKey?.startsWith(SITE_COMPONENT_KEY_PREFIX)) {
    // 1. 현장 커스텀 지정
    if (siteLoader) {
      Component = getSiteComponent(selectedKey.slice(SITE_COMPONENT_KEY_PREFIX.length), siteLoader, DefaultComponent);
    } else {
      Log.warn(`[DynamicElement] componentKey '${selectedKey}'가 지정됐지만 custom remote가 등록되지 않아 기본 화면으로 fallback합니다.`);
      Component = DefaultComponent;
    }
  } else if (selectedKey) {
    // 2. 정식 variant 지정 — 미등록 키면 defaultKey로 안전 fallback
    Component = variants.components[selectedKey]?.component ?? DefaultComponent;
  } else {
    // 3. 미지정 → 표준
    Component = DefaultComponent;
  }

  return (
    <Suspense fallback={<FallbackSpinner />}>
      <Component />
    </Suspense>
  );
};

DynamicElement.displayName = 'DynamicElement';

export default DynamicElement;
