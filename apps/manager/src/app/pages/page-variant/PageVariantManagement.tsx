/**
 * 화면 지정 관리 페이지.
 * - 좌측: appId 필터 + 화면 지정이 가능한 (appId, path) 카탈로그 목록
 * - 우측: 선택된 path에 지정 가능한 화면 카드 그리드 (현재 지정 표시 / 변경)
 *
 * 데이터 출처:
 * - 카탈로그(manifest): usePageVariantManifestStore (각 remote가 등록한 화면 메타)
 * - 적용된 지정: usePageVariantsStore (host 부팅 시 한 번 로드된 (appId, path) → componentKey 맵)
 * - 현장 커스텀 상태: useSiteCustomStore (custom remote 배포 여부·오버라이드 목록).
 *   DB 지정을 역대조해 해석 불가능한 지정은 '연결 끊김'으로 가시화하고 표준 복원을 유도한다.
 *
 * mutation 적용 후에는 query 캐시를 invalidate한다.
 * → host loader의 useQuery가 refetch → store 자동 갱신 → 이 페이지가 리렌더된다.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, type BreadcrumbProps, Button, Card, Empty, Select, Tag } from 'antd';
import {
  type PageVariantManifestPath,
  SITE_COMPONENT_KEY_PREFIX,
  type SiteOverrideMeta,
  useBreadcrumbStore,
  usePageVariantManifestStore,
  usePageVariantsStore,
  useSiteCustomStore,
} from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetApps } from '../../features/iam/hooks/useAppQueries';
import { pageVariantQueryKeys, useDeletePageVariant, useUpsertPageVariant } from '../../features/page-variant/hooks/usePageVariantQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { cn } from '@/lib/utils';

// host는 MF host라 /app-list에 없어 프론트에서 주입한다. 유저 노출용 라벨은 한 곳에서 관리.
const HOST_APP_LABEL = '공용';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '시스템', path: '/manager/resource/page-variant' },
  { title: '플랫폼', path: '/manager/resource/page-variant' },
  { title: '화면 지정', path: '/manager/resource/page-variant' },
];

interface CatalogItem extends PageVariantManifestPath {
  appName: string;
  /** custom remote(현장 커스텀)에 배포된 오버라이드 메타 — 있으면 현장 커스텀 카드 노출 */
  siteOverride?: SiteOverrideMeta;
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
  const siteOverrides = useSiteCustomStore((s) => s.overrides);
  // loader !== null → host 부팅 시 custom remote HEAD 체크·등록 성공 (배포됨)
  const siteLoader = useSiteCustomStore((s) => s.loader);
  const isSiteDeployed = siteLoader !== null;

  const { data: apps = [] } = useGetApps();

  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // host는 MF host라 /app-list(백엔드 앱 등록 목록)에 없다. host 자체 화면도 변형 지정 대상이므로 프론트에서 강제 주입.
  const appOptions = useMemo(() => {
    const opts = [{ label: '전체 앱', value: '' }, ...apps.map((a) => ({ label: a.appName, value: a.appId }))];
    if (!apps.some((a) => a.appId === 'host')) opts.push({ label: HOST_APP_LABEL, value: 'host' });
    return opts;
  }, [apps]);

  const catalog: CatalogItem[] = useMemo(() => {
    const items: CatalogItem[] = [];
    const byKey = new Map<string, CatalogItem>();
    const resolveAppName = (appId: string) => apps.find((a) => a.appId === appId)?.appName ?? (appId === 'host' ? HOST_APP_LABEL : appId);

    // 1) 정식 variants 카탈로그 (각 remote의 pageVariantManifest)
    Object.entries(variantManifest).forEach(([appId, paths]) => {
      const appName = resolveAppName(appId);
      paths.forEach((p) => {
        const item: CatalogItem = { ...p, appName };
        byKey.set(`${appId}::${p.path}`, item);
        items.push(item);
      });
    });

    // 2) 현장 커스텀 오버라이드 목록 합류 (custom remote SiteManifest — '<appId>/<path>' 키)
    Object.entries(siteOverrides ?? {}).forEach(([overrideKey, meta]) => {
      const slashIdx = overrideKey.indexOf('/');
      if (slashIdx < 0) return;
      const appId = overrideKey.slice(0, slashIdx);
      const path = overrideKey.slice(slashIdx + 1);
      const existing = byKey.get(`${appId}::${path}`);
      if (existing) {
        existing.siteOverride = meta;
        return;
      }
      // manifest에 없는 화면 — 표준 카드만 가진 항목으로 합성
      const item: CatalogItem = {
        appId,
        path,
        appName: resolveAppName(appId),
        defaultKey: 'default',
        variants: [{ key: 'default', label: '표준', description: '본사 표준 화면' }],
        siteOverride: meta,
      };
      byKey.set(`${appId}::${path}`, item);
      items.push(item);
    });

    // 3) DB 지정 중 ①·②로 해석 안 되는 (appId, path) 합성 — custom 미배포·오버라이드 제거 등으로
    //    카탈로그에서 사라진 깨진 지정을 목록에 노출해 운영자가 표준 복원으로 정리할 수 있게 한다
    Object.entries(variantMap).forEach(([appId, paths]) => {
      Object.keys(paths).forEach((path) => {
        const mapKey = `${appId}::${path}`;
        if (byKey.has(mapKey)) return;
        const item: CatalogItem = {
          appId,
          path,
          appName: resolveAppName(appId),
          defaultKey: 'default',
          variants: [{ key: 'default', label: '표준', description: '본사 표준 화면' }],
        };
        byKey.set(mapKey, item);
        items.push(item);
      });
    });

    return items.filter((i) => !selectedAppId || i.appId === selectedAppId);
  }, [variantManifest, siteOverrides, variantMap, apps, selectedAppId]);

  // DB 지정 componentKey가 현재 코드·custom 배포 상태에서 해석 가능한지 판정.
  // 깨진 지정은 DynamicElement가 표준으로 fallback하므로 장애는 아니지만,
  // 운영자가 인지·정리할 수 있도록 목록·카드에 경고로 노출한다.
  // (siteOverrides는 exposes의 대리 지표 — 1:1 동기화 규칙·create-custom --check 전제)
  const isKeyResolvable = (item: CatalogItem, key: string | null | undefined): boolean => {
    if (!key || key === item.defaultKey) return true;
    if (key.startsWith(SITE_COMPONENT_KEY_PREFIX)) {
      return isSiteDeployed && !!siteOverrides?.[key.slice(SITE_COMPONENT_KEY_PREFIX.length)];
    }
    return item.variants.some((v) => v.key === key);
  };

  // 미선택 상태 우측 패널에 표기할 제공 현황 (앱 필터 반영)
  const formalVariantCount = Object.entries(variantManifest)
    .filter(([appId]) => !selectedAppId || appId === selectedAppId)
    .reduce((acc, [, paths]) => acc + paths.length, 0);
  const customOverrideCount = Object.keys(siteOverrides ?? {}).filter((key) => !selectedAppId || key.startsWith(`${selectedAppId}/`)).length;

  const selected = useMemo(() => catalog.find((c) => `${c.appId}::${c.path}` === selectedKey) ?? null, [catalog, selectedKey]);
  const currentKey = selected ? (variantMap[selected.appId]?.[selected.path] ?? selected.defaultKey) : null;

  // 선택된 path 또는 적용된 키가 바뀌면 pending도 동기화 (=변경 사항 없는 상태로 시작)
  useEffect(() => {
    setPendingKey(currentKey);
  }, [currentKey]);

  const isDirty = pendingKey !== currentKey;
  // 현장 커스텀 강제 지정 시 저장될 componentKey ('site:<appId>/<path>')
  const siteVariantKey = selected ? `${SITE_COMPONENT_KEY_PREFIX}${selected.appId}/${selected.path}` : null;
  // 선택된 path의 현재 지정이 해석 불가능한(깨진) 상태인지 — Alert·ghost 카드 노출 조건
  const isCurrentBroken = selected !== null && !isKeyResolvable(selected, currentKey);

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
                const broken = !isKeyResolvable(item, mapped);
                return (
                  <button
                    key={itemKey}
                    type="button"
                    onClick={() => setSelectedKey(active ? null : itemKey)}
                    className={cn(
                      'flex flex-col items-start gap-1 px-3 py-2 rounded border text-left transition-colors cursor-pointer',
                      active ? 'border-[var(--color-bt-primary)] bg-blue-50' : 'border-gray-200 hover:bg-gray-50',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Tag color="blue">{item.appName}</Tag>
                      {item.siteOverride && <Tag color="purple">커스텀</Tag>}
                      {mapped && mapped !== item.defaultKey && <Tag color="orange">변경됨</Tag>}
                      {broken && <Tag color="red">연결 끊김</Tag>}
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

                {isCurrentBroken && (
                  <Alert
                    type="warning"
                    showIcon
                    className="!py-1.5 !px-3 [&_.ant-alert-title]:text-[13px]"
                    message="지정 정보는 남아 있지만 화면 파일이 더 이상 제공되지 않아 현재는 표준 화면으로 표시됩니다. '표준' 카드를 선택 후 적용해 지정을 정리하세요."
                  />
                )}

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
                  {selected.siteOverride && siteVariantKey && (
                    <VariantCard
                      variantKey={siteVariantKey}
                      label={selected.siteOverride.label}
                      description={selected.siteOverride.description}
                      isSite
                      isCurrent={currentKey === siteVariantKey}
                      isPending={pendingKey === siteVariantKey}
                      onClick={() => handleSelectVariant(siteVariantKey)}
                      disabled={isProcessing}
                    />
                  )}
                  {/* 깨진 지정 ghost 카드 — DB에 저장된 키를 그대로 보여주되 선택은 불가 */}
                  {isCurrentBroken && currentKey && (
                    <VariantCard
                      variantKey={currentKey}
                      label="사라진 화면 파일"
                      description={
                        currentKey.startsWith(SITE_COMPONENT_KEY_PREFIX)
                          ? '지정 당시 제공되던 외부 커스텀 화면 파일이 사라졌습니다 (custom remote 미배포 또는 오버라이드 제거).'
                          : '지정 당시 제공되던 내부 커스텀 화면 파일이 사라졌습니다 (코드에서 변형 제거).'
                      }
                      isBroken
                      isCurrent
                      onClick={() => undefined}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end sticky bottom-0 bg-white border-t border-gray-100 py-4 px-7">
                <Button type="primary" onClick={handleApply} loading={isProcessing} disabled={!isDirty}>
                  적용
                </Button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-8">
              {/* 제공 현황 요약 — 경로 미선택 상태에서 전체(또는 필터된 앱) 단위 현황 표기 */}
              <div className="text-[18px] font-bold">화면 지정 파일 현황</div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 px-10 py-5">
                  <span className="text-[26px] font-bold text-[var(--color-bt-primary)]">
                    {formalVariantCount}
                    <span className="text-sm font-normal text-gray-500 ml-1">건</span>
                  </span>
                  <span className="text-sm text-gray-500">내부 커스텀 화면</span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 px-10 py-5">
                  <span className={cn('text-[26px] font-bold', isSiteDeployed ? 'text-purple-600' : 'text-gray-400')}>
                    {customOverrideCount}
                    <span className="text-sm font-normal text-gray-500 ml-1">건</span>
                  </span>
                  <span className="text-sm text-gray-500">외부 커스텀 화면{!isSiteDeployed && ' (미배포)'}</span>
                </div>
              </div>
              <div className="text-sm text-gray-400">좌측 목록에서 경로를 선택해주세요</div>
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
  isSite?: boolean;
  /** 해석 불가능한(깨진) DB 지정을 보여주는 ghost 카드 — 선택 불가, 정보 표시 전용 */
  isBroken?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function VariantCard({ variantKey, label, description, isDefault, isCurrent, isPending, isSite, isBroken, disabled, onClick }: VariantCardProps) {
  return (
    <Card
      onClick={disabled || isBroken ? undefined : onClick}
      className={cn(
        'transition-colors cursor-pointer',
        isPending && '!border-[var(--color-bt-primary)] !border-2',
        isBroken && '!border-dashed !border-red-300 bg-red-50/40 cursor-default pointer-events-none',
        disabled && 'opacity-60 pointer-events-none cursor-not-allowed',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className={cn('font-medium', isBroken && 'text-red-600')}>{label}</div>
        <div className="flex gap-1">
          {isDefault && <Tag color="default">기본</Tag>}
          {isSite && <Tag color="purple">커스텀</Tag>}
          {isBroken && <Tag color="red">연결 끊김</Tag>}
          {isCurrent && <Tag color="green">적용 중</Tag>}
        </div>
      </div>
      <div className="text-xs text-gray-400 mb-2 break-all">{variantKey}</div>
      {description && <div className="text-xs text-gray-500">{description}</div>}
    </Card>
  );
}
