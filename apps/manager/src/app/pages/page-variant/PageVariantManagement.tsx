/**
 * 화면 지정 관리 페이지.
 * - 좌측: appId 필터 + 화면 지정이 가능한 (appId, path) 카탈로그 목록
 * - 우측: 선택된 path에 지정 가능한 화면 카드 그리드 (현재 지정 표시 / 변경)
 *
 * 데이터 출처:
 * - 카탈로그(manifest): usePageVariantManifestStore (각 remote가 등록한 화면 메타)
 * - 적용된 지정: usePageVariantsStore (host 부팅 시 한 번 로드된 (appId, path) → componentKey 맵)
 *
 * mutation 적용 후에는 query 캐시를 invalidate한다.
 * → host loader의 useQuery가 refetch → store 자동 갱신 → 이 페이지가 리렌더된다.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Card, Empty, Select, Tag } from 'antd';
import { type PageVariantManifestPath, useBreadcrumbStore, usePageVariantManifestStore, usePageVariantsStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetApps } from '../../features/iam/hooks/useAppQueries';
import { pageVariantQueryKeys, useDeletePageVariant, useUpsertPageVariant } from '../../features/page-variant/hooks/usePageVariantQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { cn } from '@/lib/utils';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '시스템', path: '/manager/resource/page-variant' },
  { title: '플랫폼', path: '/manager/resource/page-variant' },
  { title: '화면 지정', path: '/manager/resource/page-variant' },
];

interface CatalogItem extends PageVariantManifestPath {
  appName: string;
}

export default function PageVariantManagement() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const variantManifest = usePageVariantManifestStore((s) => s.variants);
  const isManifestLoaded = usePageVariantManifestStore((s) => s.isLoaded);
  const variantMap = usePageVariantsStore((s) => s.variants);
  const isVariantsLoaded = usePageVariantsStore((s) => s.isLoaded);

  const { data: apps = [] } = useGetApps();

  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const appOptions = useMemo(() => [{ label: '전체 앱', value: '' }, ...apps.map((a) => ({ label: a.appName, value: a.appId }))], [apps]);

  const catalog: CatalogItem[] = useMemo(() => {
    const items: CatalogItem[] = [];
    Object.entries(variantManifest).forEach(([appId, paths]) => {
      const appName = apps.find((a) => a.appId === appId)?.appName ?? appId;
      paths.forEach((p) => items.push({ ...p, appName }));
    });
    return items.filter((i) => !selectedAppId || i.appId === selectedAppId);
  }, [variantManifest, apps, selectedAppId]);

  const selected = useMemo(() => catalog.find((c) => `${c.appId}::${c.path}` === selectedKey) ?? null, [catalog, selectedKey]);
  const currentKey = selected ? (variantMap[selected.appId]?.[selected.path] ?? selected.defaultKey) : null;

  // 선택된 path 또는 적용된 키가 바뀌면 pending도 동기화 (=변경 사항 없는 상태로 시작)
  useEffect(() => {
    setPendingKey(currentKey);
  }, [currentKey]);

  const isDirty = pendingKey !== currentKey;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: pageVariantQueryKeys.getPageVariants.queryKey });
  };

  const upsertMutation = useUpsertPageVariant({
    mutationOptions: {
      onSuccess: () => {
        toast.success('화면 지정이 적용되었습니다');
        invalidate();
      },
    },
  });
  const deleteMutation = useDeletePageVariant({
    mutationOptions: {
      onSuccess: () => {
        toast.success('기본 화면으로 복원되었습니다');
        invalidate();
      },
    },
  });

  const isProcessing = upsertMutation.isPending || deleteMutation.isPending;

  const handleSelectVariant = (variantKey: string) => {
    if (isProcessing) return;
    setPendingKey(variantKey);
  };

  const handleApply = () => {
    if (!selected || !pendingKey || !isDirty) return;

    if (pendingKey === selected.defaultKey) {
      deleteMutation.mutate({ appId: selected.appId, path: selected.path });
      return;
    }

    upsertMutation.mutate({ appId: selected.appId, path: selected.path, componentKey: pendingKey });
  };

  if (!isManifestLoaded || !isVariantsLoaded) {
    return (
      <div className="flex flex-col gap-4 w-full h-full">
        <div className="flex items-center justify-center flex-1">
          <FallbackSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: 카탈로그 */}
        <div className="w-[360px] shrink-0 bg-white bt-shadow p-4 flex flex-col gap-3">
          <Select value={selectedAppId} onChange={setSelectedAppId} options={appOptions} className="w-full" />
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {catalog.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Empty description="화면 지정이 가능한 경로가 없습니다" />
              </div>
            ) : (
              catalog.map((item) => {
                const itemKey = `${item.appId}::${item.path}`;
                const active = itemKey === selectedKey;
                const mapped = variantMap[item.appId]?.[item.path];
                return (
                  <button
                    key={itemKey}
                    type="button"
                    onClick={() => setSelectedKey(itemKey)}
                    className={cn(
                      'flex flex-col items-start gap-1 px-3 py-2 rounded border text-left transition-colors',
                      active ? 'border-[var(--color-bt-primary)] bg-blue-50' : 'border-gray-200 hover:bg-gray-50',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Tag color="blue">{item.appName}</Tag>
                      {mapped && mapped !== item.defaultKey && <Tag color="orange">변경됨</Tag>}
                    </div>
                    <div className="text-sm font-medium break-all">{item.path}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 우측: 화면 선택 */}
        <div className="flex-1 min-h-0 bg-white bt-shadow flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-5">
                <div>
                  <div className="text-[20px] font-bold text-[var(--color-bt-primary)]">{selected.path}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    앱: {selected.appName} · 기본: {selected.defaultKey} · 현재: {currentKey}
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {selected.variants.map((v) => (
                    <VariantCard
                      key={v.key}
                      variantKey={v.key}
                      label={v.label}
                      description={v.description}
                      isDefault={v.key === selected.defaultKey}
                      isCurrent={currentKey === v.key}
                      isPending={pendingKey === v.key}
                      onClick={() => handleSelectVariant(v.key)}
                      disabled={isProcessing}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end sticky bottom-0 bg-white border-t border-gray-100 py-4 px-7">
                <Button type="primary" onClick={handleApply} loading={isProcessing} disabled={!isDirty}>
                  적용
                </Button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <NoData message="좌측 목록에서 경로를 선택해주세요" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface VariantCardProps {
  variantKey: string;
  label: string;
  description?: string;
  isDefault?: boolean;
  isCurrent?: boolean;
  isPending?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function VariantCard({ variantKey, label, description, isDefault, isCurrent, isPending, disabled, onClick }: VariantCardProps) {
  return (
    <Card
      onClick={disabled ? undefined : onClick}
      className={cn(
        'transition-colors cursor-pointer',
        isPending && '!border-[var(--color-bt-primary)] !border-2',
        disabled && 'opacity-60 pointer-events-none cursor-not-allowed',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-medium">{label}</div>
        <div className="flex gap-1">
          {isDefault && <Tag color="default">기본</Tag>}
          {isCurrent && <Tag color="green">적용 중</Tag>}
        </div>
      </div>
      <div className="text-xs text-gray-400 mb-2 break-all">{variantKey}</div>
      {description && <div className="text-xs text-gray-500">{description}</div>}
    </Card>
  );
}
