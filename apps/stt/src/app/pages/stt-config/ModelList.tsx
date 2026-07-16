import React, { Suspense, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type BreadcrumbProps, Segmented } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconEntity, IconLayer } from '@/components/custom/Icons';

const SttModel = React.lazy(() => import('../../features/stt-config/tabs/SttModel'));
const SttModelDeploy = React.lazy(() => import('../../features/stt-config/tabs/SttModelDeploy'));

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: '모델 관리', path: '/stt/stt-config/model/list' },
];

type ModelMode = 'model' | 'model-deploy';

const MODE_LABELS: Record<ModelMode, string> = {
  model: '모델',
  'model-deploy': '모델 배포',
};

const MODE_ICONS: Record<ModelMode, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  model: IconEntity,
  'model-deploy': IconLayer,
};

/** 선택된 토글만 대표 브랜드 색(primary)으로 강조 — Segmented label 은 정적이라 mode 를 받아 매번 새로 구성. */
function buildModeOptions(mode: ModelMode) {
  return (Object.keys(MODE_LABELS) as ModelMode[]).map((value) => {
    const Icon = MODE_ICONS[value];
    return {
      value,
      label: (
        <span
          className={`flex items-center justify-center gap-2 w-[180px] px-2 py-0.5 text-[15px] ${
            value === mode ? 'font-bold text-[var(--color-bt-primary)]' : 'font-medium text-gray-500'
          }`}
        >
          <Icon className="h-5 w-5" />
          {MODE_LABELS[value]}
        </span>
      ),
    };
  });
}

export default function ModelList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // 탭 대신 Segmented 토글 — 화면이 2개뿐이라 별도 탭바 박스 없이 필터 줄에서 바로 전환.
  // ?mode= 쿼리 파라미터로 딥링크 유지(기존 PageTabs 의 ?tab= 과 동일한 의도).
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: ModelMode = searchParams.get('mode') === 'model-deploy' ? 'model-deploy' : 'model';

  const handleModeChange = (value: ModelMode) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('mode', value);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center gap-4 w-full flex-wrap flex-shrink-0">
          <Segmented options={buildModeOptions(mode)} value={mode} onChange={handleModeChange} size="large" />
        </header>

        <div className="flex-1 min-h-0">
          <Suspense fallback={<FallbackSpinner />}>{mode === 'model' ? <SttModel /> : <SttModelDeploy />}</Suspense>
        </div>
      </div>
    </div>
  );
}
