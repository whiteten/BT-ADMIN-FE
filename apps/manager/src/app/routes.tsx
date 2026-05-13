import React from 'react';
import { useBreadcrumbStore } from '@/shared-store';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const UserList = React.lazy(() => import('./pages/user/UserList'));
const UserCreate = React.lazy(() => import('./pages/user/UserCreate'));
const UserDetail = React.lazy(() => import('./pages/user/UserDetail'));

// IAM 페이지
const AuthGroupManagement = React.lazy(() => import('./pages/iam/AuthGroupManagement'));
const RoleCreatePage = React.lazy(() => import('./pages/iam/RoleCreatePage'));
const RoleDetailPage = React.lazy(() => import('./pages/iam/RoleDetailPage'));

// 계정 정책 페이지
const AccountPolicyPage = React.lazy(() => import('./pages/account-policy/AccountPolicyPage'));

// 메뉴 관리 페이지
const MenuManagement = React.lazy(() => import('./pages/menu/MenuManagement'));

// 화면 지정 관리 페이지
const PageVariantManagement = React.lazy(() => import('./pages/page-variant/PageVariantManagement'));

// API Flow 관리 페이지
const BffFlowManagement = React.lazy(() => import('./pages/bff-flow/BffFlowManagement'));

// 작업이력 페이지
const WorkHistoryList = React.lazy(() => import('./pages/work-history/WorkHistoryList'));

// 데이터 보관주기 관리 페이지
const DataRetentionPage = React.lazy(() => import('./pages/data-retention/DataRetentionPage'));

// 마스킹 정책/해지 요청 페이지
const MaskPolicyPage = React.lazy(() => import('./pages/mask-policy/MaskPolicyPage'));
const MaskUnmaskPage = React.lazy(() => import('./pages/mask-unmask/MaskUnmaskPage'));

// 클라이언트 관리 페이지
const ClientList = React.lazy(() => import('./pages/client/ClientList'));
const ClientCreate = React.lazy(() => import('./pages/client/ClientCreate'));
const ClientDetail = React.lazy(() => import('./pages/client/ClientDetail'));

// 라이선스 관리 페이지
const LicenseList = React.lazy(() => import('./pages/license/LicenseList'));

// 테넌트 관리 페이지
const TenantList = React.lazy(() => import('./features/tenant-management/pages/TenantList'));
const TenantCreate = React.lazy(() => import('./features/tenant-management/pages/TenantCreate'));
const TenantDetail = React.lazy(() => import('./features/tenant-management/pages/TenantDetail'));

// 노드/클러스터 관리 페이지
const NodeListPage = React.lazy(() => import('./features/node-management/pages/NodeListPage'));
const NodeCreatePage = React.lazy(() => import('./features/node-management/pages/NodeCreatePage'));
const NodeDetailPage = React.lazy(() => import('./features/node-management/pages/NodeDetailPage'));
const NodeSettingPage = React.lazy(() => import('./features/node-management/pages/NodeSettingPage'));
const ClusterConfigPage = React.lazy(() => import('./features/node-management/pages/ClusterConfigPage'));
const TenantAllocWizardPage = React.lazy(() => import('./features/node-management/pages/TenantAllocWizardPage'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      {
        index: true,
        element: <Navigate to="main" replace />,
      },
      {
        path: 'main',
        element: <Main />,
      },
      // 자원 관리 (resource)
      {
        path: 'resource',
        element: <Outlet />,
        children: [
          {
            index: true,
            element: <Navigate to="user" replace />,
          },
          {
            path: 'user',
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <Navigate to="list" replace />,
              },
              {
                path: 'list',
                element: <UserList />,
              },
              {
                path: 'create',
                element: <UserCreate />,
              },
              {
                path: ':userId',
                element: <UserDetail />,
              },
            ],
          },
          {
            path: 'auth-group',
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <Navigate to="list" replace />,
              },
              {
                path: 'list',
                element: <AuthGroupManagement />,
              },
            ],
          },
          {
            path: 'role',
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <Navigate to="../auth-group/list" replace />,
              },
              {
                path: 'create',
                element: <RoleCreatePage />,
              },
              {
                path: ':roleId',
                element: <RoleDetailPage />,
              },
            ],
          },
          {
            path: 'menu',
            element: <MenuManagement />,
          },
          {
            path: 'page-variant',
            element: <PageVariantManagement />,
          },
          {
            path: 'bff-flow',
            element: <BffFlowManagement />,
          },
          {
            path: 'account-policy',
            element: <AccountPolicyPage />,
          },
          {
            path: 'work-history',
            element: <WorkHistoryList />,
          },
          {
            path: 'data-retention',
            element: <DataRetentionPage />,
          },
          {
            path: 'mask-policy',
            element: <MaskPolicyPage />,
          },
          {
            path: 'mask-unmask',
            element: <MaskUnmaskPage />,
          },
          {
            path: 'client',
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <Navigate to="list" replace />,
              },
              {
                path: 'list',
                element: <ClientList />,
              },
              {
                path: 'create',
                element: <ClientCreate />,
              },
              {
                path: ':clientId',
                element: <ClientDetail />,
              },
            ],
          },
          {
            path: 'license',
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <Navigate to="list" replace />,
              },
              {
                path: 'list',
                element: <LicenseList />,
              },
            ],
          },
          {
            path: 'tenant-management',
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <Navigate to="list" replace />,
              },
              {
                path: 'list',
                element: <TenantList />,
              },
              {
                path: 'create',
                element: <TenantCreate />,
              },
              {
                path: ':tenantId',
                element: <TenantDetail />,
              },
            ],
          },
          {
            path: 'node-management',
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <Navigate to="list" replace />,
              },
              {
                path: 'list',
                element: <NodeListPage />,
              },
              {
                path: 'create',
                element: <NodeCreatePage />,
              },
              {
                path: ':nodeId',
                element: <NodeDetailPage />,
              },
              {
                path: ':nodeId/settings',
                element: <NodeSettingPage />,
              },
              {
                path: ':nodeId/cluster-config',
                element: <ClusterConfigPage />,
              },
              {
                path: ':nodeId/alloc/:tenantId',
                element: <TenantAllocWizardPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/manager" />,
  },
];
