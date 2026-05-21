/**
 * 사용자 상세 페이지
 * - 비밀번호 정책 패턴 적용: 폼 값 실시간 반영으로 요약 정보 즉시 업데이트
 * - Tab 1: 기본 정보 (사용자명, 계정, 역할, 활성화, 설명)
 * - Tab 2: 부가사항 (핸드폰번호, 이메일, 접근 허용 IP)
 * - Tab 3: 개별 권한 (사용자별 권한 부여/차단)
 * - 탭 전환 시 저장하지 않은 변경사항 폐기, DB 값으로 리셋
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { type BreadcrumbProps, Button, Divider, Tag } from 'antd';
import { Check, ChevronLeft, ChevronRight, History, Layers, Shield } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { useGetRoles } from '../../features/iam/hooks/useRoleQueries';
import AccountStatusBadge from '../../features/user/components/AccountStatusBadge';
import {
  type PermissionStats,
  type ResourceStats,
  type UserAdditionalFormValues,
  type UserBasicFormValues,
  UserDetailProvider,
} from '../../features/user/context/UserDetailContext';
import { useGetUser } from '../../features/user/hooks/useUserQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconDocument, IconSlidersHorizontal } from '@/components/custom/Icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/libs/shared-ui/src/components/shadcn/tabs';

const UserBasicInfoTab = React.lazy(() => import('../../features/user/tabs/UserBasicInfoTab'));
const UserAdditionalInfoTab = React.lazy(() => import('../../features/user/tabs/UserAdditionalInfoTab'));
const UserPermissionTab = React.lazy(() => import('../../features/user/tabs/UserPermissionTab'));
const UserLoginHistoryTab = React.lazy(() => import('../../features/user/tabs/UserLoginHistoryTab'));
const UserResourceAccessTab = React.lazy(() => import('../../features/user/tabs/UserResourceAccessTab'));

interface PageTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  component: React.ComponentType | React.LazyExoticComponent<React.ComponentType>;
}

const baseTabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: UserBasicInfoTab },
  { id: 'tab2', label: '리소스 접근', icon: Layers, component: UserResourceAccessTab },
  { id: 'tab3', label: '개별 권한', icon: Shield, component: UserPermissionTab },
  { id: 'tab4', label: '부가사항', icon: IconSlidersHorizontal, component: UserAdditionalInfoTab },
  { id: 'tab5', label: '로그인 이력', icon: History, component: UserLoginHistoryTab },
];

// 헬퍼 함수: Select 옵션에서 라벨 찾기
const getOptionLabel = (options: { label: string; value: string | number }[], value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  return options.find((opt) => opt.value === value)?.label ?? value;
};

// 헬퍼 함수: 빈 값일 때 - 표시
const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// 날짜 포맷 유틸
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export default function UserDetail() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const numericUserId = userId ? Number(userId) : undefined;

  // 리소스 접근 관리 권한에 따라 탭 필터링
  const { canManageResourceAccess: canManageResourceAccessFn } = useAuthStore();
  const hasResourceAccessPermission = canManageResourceAccessFn();
  const tabs = baseTabs.filter((tab) => {
    if (tab.id === 'tab2') return hasResourceAccessPermission;
    return true;
  });

  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl ?? tabs[0]?.id ?? '');

  // 폼 상태 (실시간 요약 정보용)
  const [basicFormValues, setBasicFormValues] = useState<Partial<UserBasicFormValues>>({});
  const [additionalFormValues, setAdditionalFormValues] = useState<Partial<UserAdditionalFormValues>>({});
  const [permissionStats, setPermissionStats] = useState<PermissionStats | null>(null);
  const [resourceStats, setResourceStats] = useState<ResourceStats | null>(null);

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  // 사용자 조회
  const { data: user, isFetching } = useGetUser({
    params: { userId: numericUserId },
    queryOptions: { enabled: !!numericUserId },
  });

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: '사용자', path: '/manager/resource/user/list' },
      { title: '사용자 계정', path: '/manager/resource/user/list' },
      { title: ':username', path: `/manager/resource/user/${userId}` },
    ];
    setBreadcrumb(breadcrumb, { username: user?.username ?? '-' });
    return () => clearBreadcrumb();
  }, [userId, user?.username, setBreadcrumb, clearBreadcrumb]);

  // 역할 목록은 이 화면에서 직접 호출
  const { data: roles = [] } = useGetRoles();
  const roleOptions = roles.map((role) => ({ label: role.roleName, value: role.roleId }));

  // DB 데이터로 폼 상태 초기화/리셋
  const resetToServerData = useCallback(() => {
    if (user) {
      setBasicFormValues({
        username: user.username,
        userAccount: user.userAccount ?? '',
        roleId: user.roleId,
        accountStatus: user.accountStatus,
        description: user.description ?? '',
      });

      // allowedIps JSON 파싱
      let parsedAllowedIps: string[] = [];
      if (user.allowedIps) {
        try {
          parsedAllowedIps = JSON.parse(user.allowedIps);
        } catch {
          parsedAllowedIps = [];
        }
      }

      setAdditionalFormValues({
        phone: user.phone ?? '',
        email: user.email ?? '',
        allowedIps: parsedAllowedIps,
      });
    }
  }, [user]);

  // 사용자 데이터 로드 시 초기화
  useEffect(() => {
    resetToServerData();
  }, [resetToServerData]);

  /**
   * 탭 전환 핸들러
   * - forceMount 미사용으로 탭 전환 시 컴포넌트가 언마운트/리마운트됨
   * - 리마운트 시 각 탭이 자체적으로 서버 데이터로 초기화
   */
  const handleTabChange = (newTab: string) => {
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

    if (!user) {
      return <div className="text-gray-400 text-center">사용자 정보를 불러오는 중입니다...</div>;
    }

    // 실시간 폼 값 사용 (비밀번호 정책 패턴)
    const currentBasic = basicFormValues;
    const currentAdditional = additionalFormValues;

    return (
      <div className="space-y-4">
        {/* 기본 정보 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">계정</span>
            <span className="text-gray-800 font-medium flex-1">{displayValue(currentBasic.userAccount)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">사용자명</span>
            <span className="text-gray-800 flex-1">{displayValue(currentBasic.username)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">역할</span>
            <span className="text-gray-800 flex-1">{displayValue(getOptionLabel(roleOptions, currentBasic.roleId))}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">상태</span>
            <span className="text-gray-800 flex-1">
              {currentBasic.accountStatus && <AccountStatusBadge status={currentBasic.accountStatus as 'ACTIVE' | 'DORMANT' | 'DISABLED'} />}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">설명</span>
            <span className="text-gray-800 flex-1 truncate">{displayValue(currentBasic.description)}</span>
          </div>
        </div>
        {hasResourceAccessPermission && (
          <>
            <Divider className="!my-3" />
            {/* 리소스 접근 */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-28 shrink-0">봇 서비스</span>
                <span className="text-gray-800 flex-1">
                  {resourceStats && resourceStats.botCount > 0 ? (
                    <span className="text-blue-600 font-medium">{resourceStats.botCount}개 설정</span>
                  ) : (
                    <span className="text-gray-400 text-sm">전체 허용</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-28 shrink-0">NLU 모델</span>
                <span className="text-gray-800 flex-1">
                  {resourceStats && resourceStats.modelCount > 0 ? (
                    <span className="text-blue-600 font-medium">{resourceStats.modelCount}개 설정</span>
                  ) : (
                    <span className="text-gray-400 text-sm">전체 허용</span>
                  )}
                </span>
              </div>
            </div>
          </>
        )}
        <Divider className="!my-3" />
        {/* 개별 권한 (Replacement 모델) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">역할 권한</span>
            <span className="text-gray-800 flex-1">{permissionStats ? `${permissionStats.roleAuthCount}개` : <span className="text-gray-300">-</span>}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">개별 권한</span>
            <span className="flex-1">
              {permissionStats?.savedAllowCount ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {permissionStats.savedAllowCount}개 (대체 중)
                </span>
              ) : (
                <span className="text-gray-300">-</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">최종 권한</span>
            <span className="text-gray-800 font-medium flex-1">{permissionStats ? `${permissionStats.selectedCount}개` : <span className="text-gray-300">-</span>}</span>
          </div>
        </div>
        <Divider className="!my-3" />
        {/* 부가사항 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">핸드폰번호</span>
            <span className="text-gray-800 flex-1">{displayValue(currentAdditional.phone)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">이메일</span>
            <span className="text-gray-800 flex-1">{displayValue(currentAdditional.email)}</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-gray-500 w-28 shrink-0">접근 허용 IP</span>
            <span className="text-gray-800 flex-1">
              {currentAdditional.allowedIps && currentAdditional.allowedIps.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {currentAdditional.allowedIps.map((ip: string) => (
                    <Tag key={ip} className="text-xs">
                      {ip}
                    </Tag>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">전체 허용</span>
              )}
            </span>
          </div>
        </div>
        <Divider className="!my-3" />
        {/* 시스템 정보 (서버 데이터 사용 - 읽기 전용) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">생성일</span>
            <span className="text-gray-800 flex-1 text-sm">{formatDateTime(user.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">수정일</span>
            <span className="text-gray-800 flex-1 text-sm">{formatDateTime(user.updatedAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">최근 로그인</span>
            <span className="text-gray-800 flex-1 text-sm">{formatDateTime(user.lastLoginAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">로그인 실패</span>
            <span className="text-gray-800 flex-1 text-sm">{formatDateTime(user.lastFailedLoginAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">비밀번호 변경</span>
            <span className="text-gray-800 flex-1 text-sm">{formatDateTime(user.passwordChangedAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Context 값
  const contextValue = useMemo(
    () => ({
      user,
      isUserFetching: isFetching,
      basicFormValues,
      setBasicFormValues,
      additionalFormValues,
      setAdditionalFormValues,
      permissionStats,
      setPermissionStats,
      resourceStats,
      setResourceStats,
      resetToServerData,
    }),
    [user, isFetching, basicFormValues, additionalFormValues, permissionStats, resourceStats, resetToServerData],
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex w-full flex-1 min-h-0 gap-4">
        {/* 메인 콘텐츠 - PageTabs 영역 */}
        <UserDetailProvider value={contextValue}>
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
                <TabsContent key={tab.id} value={tab.id} className="flex-0 w-full h-[calc(100%-58px-20px)] min-h-[calc(100%-58px-20px)]">
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
        </UserDetailProvider>

        {/* 입력 정보 요약 사이드바 */}
        <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderFormSummary()}</div>
        </div>
      </div>
    </div>
  );
}
