/**
 * 사용자 상세 페이지
 * - BotDetail 패턴 적용: PageTabs 컴포넌트 사용
 * - Tab 1: 기본 정보 (사용자명, 계정, 역할, 활성화, 설명)
 * - Tab 2: 부가사항 (핸드폰번호, 이메일, 접근 허용 IP)
 * - UserCreate와 동일한 탭 구성 및 필드 배치
 * - 입력 정보 요약 사이드바 (xl 해상도 이상)
 */

import React, { Suspense, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { type BreadcrumbProps, Button, Divider, Tag } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGetRoles } from '../../features/iam/hooks/useRoleQueries';
import { useGetUser } from '../../features/user/hooks/useUserQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconDocument, IconSlidersHorizontal } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/libs/shared-ui/src/components/shadcn/tabs';

const UserBasicInfoTab = React.lazy(() => import('./tabs/UserBasicInfoTab'));
const UserAdditionalInfoTab = React.lazy(() => import('./tabs/UserAdditionalInfoTab'));

interface PageTab {
  id: string;
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  component: React.ComponentType | React.LazyExoticComponent<React.ComponentType>;
}

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: UserBasicInfoTab },
  { id: 'tab2', label: '부가사항', icon: IconSlidersHorizontal, component: UserAdditionalInfoTab },
];

// 헬퍼 함수: Select 옵션에서 라벨 찾기
const getOptionLabel = (options: { label: string; value: string | number }[], value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  return options.find((opt) => opt.value === value)?.label ?? value;
};

// 헬퍼 함수: 빈 값일 때 - 표시
const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return value as React.ReactNode;
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

  const tabFromUrl = searchParams.get('tab');
  const activeTabId = tabFromUrl ?? tabs[0]?.id ?? '';

  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '자원 관리', path: '/core/resource' },
    { title: '사용자', path: '/core/resource/user' },
    { title: '사용자 상세', path: `/core/resource/user/${userId}` },
  ];

  // 사용자 조회
  const { data: user, isFetching } = useGetUser({
    id: numericUserId,
  });

  // 역할 목록 조회
  const { data: roleList = [], isFetching: isFetchingRoles } = useGetRoles();
  const roleOptions = roleList.map((role) => ({ label: role.roleName, value: role.roleId }));

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

  // 폼 정보 요약 렌더링
  function renderFormSummary() {
    if (isFetching || isFetchingRoles) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      );
    }

    if (!user) {
      return <div className="text-gray-400 text-center">사용자 정보를 불러오는 중입니다...</div>;
    }

    // allowedIps JSON 파싱
    let parsedAllowedIps: string[] = [];
    if (user.allowedIps) {
      try {
        parsedAllowedIps = JSON.parse(user.allowedIps);
      } catch {
        parsedAllowedIps = [];
      }
    }

    return (
      <div className="space-y-4">
        {/* 기본 정보 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">사용자명</span>
            <span className="text-gray-800 font-medium flex-1">{displayValue(user.username)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">계정</span>
            <span className="text-gray-800 flex-1">{displayValue(user.userAccount)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">역할</span>
            <span className="text-gray-800 flex-1">{displayValue(getOptionLabel(roleOptions, user.roleId))}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">활성화</span>
            <span className="text-gray-800 flex-1">
              {user.enabled ? <span className="text-green-600 font-medium">활성</span> : <span className="text-red-500 font-medium">비활성</span>}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">설명</span>
            <span className="text-gray-800 flex-1 truncate">{displayValue(user.description)}</span>
          </div>
        </div>
        <Divider className="!my-3" />
        {/* 부가사항 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">핸드폰번호</span>
            <span className="text-gray-800 flex-1">{displayValue(user.phone)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-28 shrink-0">이메일</span>
            <span className="text-gray-800 flex-1">{displayValue(user.email)}</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-gray-500 w-28 shrink-0">접근 허용 IP</span>
            <span className="text-gray-800 flex-1">
              {parsedAllowedIps.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {parsedAllowedIps.map((ip: string) => (
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
        {/* 시스템 정보 */}
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

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="사용자 편집" breadcrumb={breadcrumb} />

      <div className="flex w-full flex-1 min-h-0 gap-4">
        {/* 메인 콘텐츠 - PageTabs 영역 */}
        <Tabs defaultValue={activeTabId} className="w-full h-full gap-4 overflow-hidden">
          <div className="flex w-full h-[58px] min-h-[58px] bg-white bt-shadow">
            <Button
              type="text"
              icon={<ChevronLeft className="h-5 w-5 !text-[#495057]" />}
              onClick={scrollLeft}
              className="!h-full !bg-transparent !border-0 !border-r !border-[#E9EBEC] !rounded-none"
            />

            <div ref={scrollContainerRef} className="w-full h-full overflow-x-auto bt-scroll-hide">
              <TabsList defaultValue={activeTabId} className="h-full p-0 bg-white">
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

        {/* 입력 정보 요약 사이드바 */}
        <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderFormSummary()}</div>
        </div>
      </div>
    </div>
  );
}
