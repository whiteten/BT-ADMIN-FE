import { type ComponentType, Suspense } from 'react';
import { useMenuStore } from '@/shared-store';
import { FallbackSpinner } from './FallbackSpinner';
import type { MenuItem } from '@/libs/shared-store/src/types/menu.types';

export interface PageVariantConfig {
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
  variants: PageVariantConfig;
}

const findComponentKey = (menus: MenuItem[], targetPath: string): string | undefined => {
  for (const menu of menus) {
    if (menu.path === targetPath && menu.componentKey) return menu.componentKey;
    if (menu.children) {
      const found = findComponentKey(menu.children, targetPath);
      if (found) return found;
    }
  }
  return undefined;
};

/**
 * routes.tsx의 element 자리에 끼우는 래퍼.
 * 운영자가 메뉴 관리에서 선택한 componentKey(menuStore에 저장)를 보고
 * variants.components에서 알맞은 컴포넌트를 렌더하며,
 * 선택값이 없거나 등록되지 않은 키면 defaultKey의 컴포넌트로 fallback한다.
 */
const DynamicElement = ({ variants }: Props) => {
  const selectedKey = useMenuStore((state) => {
    const config = state.menuConfigs.find((c) => c.appId === variants.appId);
    return config ? findComponentKey(config.menus, variants.path) : undefined;
  });

  const resolvedKey = selectedKey && variants.components[selectedKey] ? selectedKey : variants.defaultKey;
  const Component = variants.components[resolvedKey]?.component ?? variants.components[variants.defaultKey].component;

  return (
    <Suspense fallback={<FallbackSpinner />}>
      <Component />
    </Suspense>
  );
};

DynamicElement.displayName = 'DynamicElement';

export default DynamicElement;
