import { type QueryParamSpec, useBreadcrumbStore, useQuerySelectorsStore } from '@/shared-store';
import { Suspense } from 'react';

import { Form } from 'antd';

import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface Props {
  specs: QueryParamSpec[];
  values: Record<string, string | undefined>;
  onChange: (key: string, value: string | undefined) => void;
  errors?: Record<string, string>;
}

/**
 * routes.tsx의 handle.queryParams로 선언된 spec을 보고
 * useQuerySelectorsStore.registry에서 selectorKey로 컴포넌트를 lookup해 동적 렌더한다.
 *
 * - 모든 spec은 무조건 필수 입력으로 표시·검증됨 (라벨 별표 + errors prop으로 인라인 에러)
 * - 미등록 selectorKey는 조용히 무시 (운영 안전)
 * - 각 selector가 lazy로 로드되므로 Suspense로 감쌈
 */
export default function QuerySelectorRenderer({ specs, values, onChange, errors }: Props) {
  const registry = useQuerySelectorsStore((s) => s.registry);

  if (!specs.length) return null;

  return (
    <Suspense fallback={<FallbackSpinner />}>
      {specs.map((spec) => {
        const Selector = registry[spec.selectorKey];
        if (!Selector) return null;
        const errorMessage = errors?.[spec.key];
        return (
          <Form.Item key={spec.key} label={spec.label} required validateStatus={errorMessage ? 'error' : undefined} help={errorMessage}>
            <Selector spec={spec} value={values[spec.key]} onChange={(v) => onChange(spec.key, v)} />
          </Form.Item>
        );
      })}
    </Suspense>
  );
}
