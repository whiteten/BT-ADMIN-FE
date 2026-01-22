/**
 * 사용자 상세 페이지
 * - BotDetail 패턴 적용: PageTabs 컴포넌트 사용
 * - Tab 1: 기본 정보 (사용자명, 계정, 역할, 활성화, 설명)
 * - Tab 2: 부가사항 (핸드폰번호, 이메일, 접근 허용 IP)
 * - UserCreate와 동일한 탭 구성 및 필드 배치
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { IconDocument, IconSlidersHorizontal } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const UserBasicInfoTab = React.lazy(() => import('./tabs/UserBasicInfoTab'));
const UserAdditionalInfoTab = React.lazy(() => import('./tabs/UserAdditionalInfoTab'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: UserBasicInfoTab },
  { id: 'tab2', label: '부가사항', icon: IconSlidersHorizontal, component: UserAdditionalInfoTab },
];

export default function UserDetail() {
  const { userId } = useParams();
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '자원 관리', path: '/core/resource' },
    { title: '사용자', path: '/core/resource/user' },
    { title: '사용자 상세', path: `/core/resource/user/${userId}` },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="사용자 편집" breadcrumb={breadcrumb} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
