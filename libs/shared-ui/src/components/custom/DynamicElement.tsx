import { type ComponentType, Suspense } from 'react';
import { usePageVariantsStore } from '@/shared-store';
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
 * routes.tsx의 element 자리에 끼우는 래퍼.
 * 운영자가 화면 지정 관리에서 선택한 componentKey(usePageVariantsStore에 저장)를 보고
 * variants.components에서 알맞은 컴포넌트를 렌더하며,
 * 지정이 없거나 등록되지 않은 키면 defaultKey의 컴포넌트로 fallback한다.
 */
const DynamicElement = ({ variants }: Props) => {
  const selectedKey = usePageVariantsStore((state) => state.variants[variants.appId]?.[variants.path]);

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
