/**
 * 권한 그룹 관리 통합 페이지
 * - 역할 관리, 권한 목록, 사용자 권한 할당을 탭으로 통합
 * - PageTabs 컴포넌트 사용 (모델 관리 스타일 통일)
 */

import React from 'react';
import type { BreadcrumbProps } from 'antd';
import { IconDocument, IconList } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const RoleManagementTab = React.lazy(() => import('../../features/iam/tabs/RoleManagementTab'));
const PermissionListTab = React.lazy(() => import('../../features/iam/tabs/PermissionListTab'));

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '자원 관리', path: '/manager/resource' },
  { title: '역할', path: '/manager/resource/auth-group' },
  { title: '목록', path: '/manager/resource/auth-group/list' },
];

const tabs: PageTab[] = [
  { id: 'roles', label: '역할 관리', icon: IconDocument, component: RoleManagementTab },
  { id: 'permissions', label: '권한 목록', icon: IconList, component: PermissionListTab },
];

export default function AuthGroupManagement() {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
