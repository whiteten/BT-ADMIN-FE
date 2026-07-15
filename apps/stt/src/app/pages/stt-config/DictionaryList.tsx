import React, { Suspense, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Segmented } from 'antd';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { dictionaryQueryKeys } from '../../features/stt-config/hooks/useDictionaryQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconEvaluation, IconTag } from '@/components/custom/Icons';
import ScopeSelect from '@/components/custom/ScopeSelect';

const KeywordBoosting = React.lazy(() => import('../../features/stt-config/tabs/KeywordBoosting'));
const SttDictionary = React.lazy(() => import('../../features/stt-config/tabs/SttDictionary'));

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: '사전 관리', path: '/stt/stt-config/dictionary/list' },
];

type DictionaryMode = 'keyword-boosting' | 'stt-dictionary';

const MODE_LABELS: Record<DictionaryMode, string> = {
  'keyword-boosting': '키워드 부스팅',
  'stt-dictionary': '후처리 사전',
};

const MODE_ICONS: Record<DictionaryMode, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  'keyword-boosting': IconTag,
  'stt-dictionary': IconEvaluation,
};

/** 선택된 토글만 대표 브랜드 색(primary)으로 강조 — Segmented label 은 정적이라 mode 를 받아 매번 새로 구성. */
function buildModeOptions(mode: DictionaryMode) {
  return (Object.keys(MODE_LABELS) as DictionaryMode[]).map((value) => {
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

export default function DictionaryList() {
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): tenantId 미전달 → apiClient 가 X-View-All-Tenants 주입 → 전체 테넌트 조회
  //  - 대행(actAsTenantId=X): apiClient 가 X-Act-As-Tenant 주입 → X 테넌트로 조회 스코프
  // 검색 모드 2개(키워드 부스팅/후처리 사전)가 공유하는 스코프라 상단 필터 줄에 둔다.
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants ?? []);
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);

  // 탭 대신 Segmented 토글 — 화면이 2개뿐이라 별도 탭바 박스 없이 필터 줄에서 바로 전환.
  // ?mode= 쿼리 파라미터로 딥링크 유지(기존 PageTabs 의 ?tab= 과 동일한 의도).
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: DictionaryMode = searchParams.get('mode') === 'stt-dictionary' ? 'stt-dictionary' : 'keyword-boosting';

  const handleModeChange = (value: DictionaryMode) => {
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
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={availableTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))}
              value={actAsTenantId}
              onChange={(id) => {
                setActAsTenant(id);
                // 두 모드가 각자 마운트된 경우에만 재조회되면 되므로, 활성 모드의 observer 만 자동으로
                // 다시 실행되는 invalidateQueries 를 사용(비활성 모드는 다음 전환 시 새 스코프로 자동 조회).
                void queryClient.invalidateQueries({ queryKey: dictionaryQueryKeys._def });
              }}
            />
          )}
        </header>

        <div className="flex-1 min-h-0">
          <Suspense fallback={<FallbackSpinner />}>{mode === 'keyword-boosting' ? <KeywordBoosting /> : <SttDictionary />}</Suspense>
        </div>
      </div>
    </div>
  );
}
