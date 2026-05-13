/**
 * 역할 상세 페이지 (Tab 방식)
 * - 비밀번호 정책 패턴 적용: 폼 값 실시간 반영으로 요약 정보 즉시 업데이트
 * - Tab 1: 기본 정보 (역할코드, 역할이름, 설명, 정렬순서, 사용여부)
 * - Tab 2: 권한 매핑 (체크박스 트리)
 * - 탭 전환 시 저장하지 않은 변경사항 폐기, DB 값으로 리셋
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBreadcrumbStore } from '@/shared-store';
import { useParams, useSearchParams } from 'react-router-dom';
import { type BreadcrumbProps, Button, Divider, Tag } from 'antd';
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { type RoleBasicFormValues, RoleDetailProvider } from './context/RoleDetailContext';
import { useGetGroupedPermissions } from '../../features/iam/hooks/usePermissionQueries';
import { useGetRole } from '../../features/iam/hooks/useRoleQueries';
import type { MenuWithPermissions } from '../../features/iam/types/iam.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconDocument, IconSlidersHorizontal } from '@/components/custom/Icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/libs/shared-ui/src/components/shadcn/tabs';

type PermEntry = { authKey: string; action: string };

/**
 * 메뉴와 모든 하위 메뉴의 권한을 재귀적으로 수집
 */
function collectAllPermissions(menu: MenuWithPermissions): PermEntry[] {
  const p = menu.permissions;
  const perms: PermEntry[] = [];
  if (p) {
    if (p.read != null) perms.push({ authKey: p.read, action: 'read' });
    if (p.write != null) perms.push({ authKey: p.write, action: 'write' });
    if (p.delete != null) perms.push({ authKey: p.delete, action: 'delete' });
    if (p.apply != null) perms.push({ authKey: p.apply, action: 'apply' });
    if (p.export != null) perms.push({ authKey: p.export, action: 'export' });
  }
  for (const child of menu.children ?? []) {
    perms.push(...collectAllPermissions(child));
  }
  return perms;
}

const RoleBasicInfoTab = React.lazy(() => import('./tabs/RoleBasicInfoTab'));
const RolePermissionTab = React.lazy(() => import('./tabs/RolePermissionTab'));

interface PageTab {
  id: string;
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  component: React.ComponentType | React.LazyExoticComponent<React.ComponentType>;
}

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: RoleBasicInfoTab },
  { id: 'tab2', label: '권한 매핑', icon: IconSlidersHorizontal, component: RolePermissionTab },
];

// 헬퍼 함수: 빈 값일 때 - 표시
const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return value as React.ReactNode;
};

export default function RoleDetailPage() {
  const { roleId } = useParams();
  const [searchParams] = useSearchParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const numericRoleId = roleId ? Number(roleId) : undefined;

  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl ?? tabs[0]?.id ?? '');

  // 폼 상태 (실시간 요약 정보용)
  const [basicFormValues, setBasicFormValues] = useState<Partial<RoleBasicFormValues>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  // 역할 조회
  const { data: role, isFetching } = useGetRole({
    params: { roleId: numericRoleId ?? 0 },
    queryOptions: { enabled: !!numericRoleId },
  });

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: '사용자', path: '/manager/resource/auth-group/list' },
      { title: '역할/권한', path: '/manager/resource/auth-group/list' },
      { title: ':roleName', path: `/manager/resource/role/${roleId}` },
    ];
    setBreadcrumb(breadcrumb, { roleName: role?.roleName ?? '-' });
    return () => clearBreadcrumb();
  }, [roleId, role?.roleName, setBreadcrumb, clearBreadcrumb]);

  // 권한 목록 조회 (요약 표시용)
  const { data: permissionGroups = [] } = useGetGroupedPermissions();

  // 전체 권한 목록 (flat) - 트리에서 재귀적으로 수집
  const allPermissions = useMemo(() => {
    return permissionGroups.flatMap((group) => group.menus.flatMap((menu) => collectAllPermissions(menu)));
  }, [permissionGroups]);

  // DB 데이터로 폼 상태 초기화/리셋
  const resetToServerData = useCallback(() => {
    if (role) {
      setBasicFormValues({
        roleCode: role.roleCode,
        roleName: role.roleName,
        description: role.description ?? '',
        sortOrder: role.sortOrder,
        isUse: role.isUse,
        canResetPassword: role.canResetPassword,
        canManageResourceAccess: role.canManageResourceAccess,
      });
      setSelectedPermissions(new Set(role.authKeys ?? []));
    }
  }, [role]);

  // 역할 데이터 로드 시 초기화
  useEffect(() => {
    resetToServerData();
  }, [resetToServerData]);

  /**
   * 탭 전환 시 폼을 DB 값으로 리셋
   * - 비밀번호 정책 패턴: 저장하지 않은 변경사항은 폐기됨
   */
  const handleTabChange = (newTab: string) => {
    resetToServerData();
    setActiveTab(newTab);
  };

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({
      left: -300,
      behavior: 'smooth',
    });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({
      left: 300,
      behavior: 'smooth',
    });
  };

  // 폼 정보 요약 렌더링 (실시간 폼 값 기반)
  function renderFormSummary() {
    if (isFetching) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      );
    }

    if (!role) {
      return <div className="text-gray-400 text-center">역할 정보를 불러오는 중입니다...</div>;
    }

    // 실시간 폼 값 사용 (비밀번호 정책 패턴)
    const currentBasic = basicFormValues;
    const permissionCount = selectedPermissions.size;
    const permissionArray = Array.from(selectedPermissions);

    return (
      <div className="space-y-4">
        {/* 기본 정보 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600 mb-2">기본 정보</div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">역할 코드</span>
            <span className="text-gray-800 font-medium flex-1 font-mono">{displayValue(currentBasic.roleCode)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">역할 이름</span>
            <span className="text-gray-800 flex-1">{displayValue(currentBasic.roleName)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">설명</span>
            <span className="text-gray-800 flex-1 whitespace-pre-wrap truncate">{displayValue(currentBasic.description)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">정렬 순서</span>
            <span className="text-gray-800 flex-1">{displayValue(currentBasic.sortOrder)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">사용 여부</span>
            <span className="flex-1">
              <Tag color={currentBasic.isUse ? 'green' : 'default'}>{currentBasic.isUse ? '사용' : '미사용'}</Tag>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">비밀번호 초기화</span>
            <span className="flex-1">
              <Tag color={currentBasic.canResetPassword ? 'orange' : 'default'}>{currentBasic.canResetPassword ? '허용' : '불가'}</Tag>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-20 shrink-0">리소스 접근 관리</span>
            <span className="flex-1">
              <Tag color={currentBasic.canManageResourceAccess ? 'purple' : 'default'}>{currentBasic.canManageResourceAccess ? '허용' : '불가'}</Tag>
            </span>
          </div>
        </div>

        <Divider className="!my-3" />

        {/* 권한 매핑 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600 mb-2">권한 매핑</div>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-blue-500" />
            <span className="text-gray-800 font-semibold">{permissionCount}개 권한 선택됨</span>
          </div>
          {/* 권한 타입별 카운트 */}
          {permissionCount > 0 && (
            <div className="flex gap-3 mt-2 flex-wrap">
              {(['read', 'write', 'delete', 'apply', 'export'] as const).map((action) => {
                const count = permissionArray.filter((authKey) => {
                  const perm = allPermissions.find((p) => p.authKey === authKey);
                  return perm?.action === action;
                }).length;
                const colorMap: Record<string, string> = {
                  read: 'text-blue-600',
                  write: 'text-emerald-600',
                  delete: 'text-rose-600',
                  apply: 'text-violet-600',
                  export: 'text-teal-600',
                };
                return (
                  <div key={action} className="flex items-center gap-1 text-xs">
                    <span className={`uppercase font-medium ${colorMap[action]}`}>{action}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Context 값
  const contextValue = useMemo(
    () => ({
      basicFormValues,
      setBasicFormValues,
      selectedPermissions,
      setSelectedPermissions,
      resetToServerData,
    }),
    [basicFormValues, selectedPermissions, resetToServerData],
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex w-full flex-1 min-h-0 gap-4">
        {/* 메인 콘텐츠 - PageTabs 영역 */}
        <RoleDetailProvider value={contextValue}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full gap-4 overflow-hidden">
            <div className="flex w-full h-[58px] min-h-[58px] bg-white bt-shadow">
              <Button
                type="text"
                icon={<ChevronLeft className="h-5 w-5 !text-[#495057]" />}
                onClick={scrollLeft}
                className="!h-full !bg-transparent !border-0 !border-r !border-[#E9EBEC] !rounded-none"
              />

              <div ref={scrollContainerRef} className="w-full h-full overflow-x-auto bt-scroll-hide">
                <TabsList className="h-full p-0 bg-white">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      className="w-auto hover:cursor-pointer !shadow-none border-1 border-transparent !rounded-none border-r-[#E9EBEC] text-[#495057] data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]"
                      value={tab.id}
                    >
                      <div className="flex items-center justify-center gap-2 min-w-[184px]">
                        {tab.icon && <tab.icon className="h-5 w-5" />}
                        <span>{tab.label}</span>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <Button
                type="text"
                icon={<ChevronRight className="h-5 w-5 !text-[#495057]" />}
                onClick={scrollRight}
                className="!h-full !bg-transparent !border-0 !border-l !border-[#E9EBEC] !rounded-none"
              />
            </div>

            {tabs.map((tab) => {
              const Component = tab.component;
              return (
                <TabsContent key={tab.id} value={tab.id} forceMount className="flex-0 w-full h-[calc(100%-58px-20px)] min-h-[calc(100%-58px-20px)] data-[state=inactive]:hidden">
                  <div className="w-full h-full bg-white bt-shadow overflow-y-auto">
                    <div className="flex flex-col w-full h-full p-7">
                      <Suspense fallback={<FallbackSpinner />}>
                        <div className="flex gap-2 items-center text-[var(--color-bt-primary)] mb-6">
                          {tab.icon && <tab.icon className="h-5 w-5" />}
                          <span className="text-[20px] font-bold">{tab.label}</span>
                        </div>
                        <Component />
                      </Suspense>
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </RoleDetailProvider>

        {/* 입력 정보 요약 사이드바 */}
        <div className="!w-[350px] !min-w-[350px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderFormSummary()}</div>
        </div>
      </div>
    </div>
  );
}
