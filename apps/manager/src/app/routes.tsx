import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useBreadcrumbStore } from '@/shared-store';
import { NotFound } from '@/components/custom/NotFound';

const UserList = React.lazy(() => import('./pages/user/UserList'));
const UserCreate = React.lazy(() => import('./pages/user/UserCreate'));
const UserDetail = React.lazy(() => import('./pages/user/UserDetail'));

// IAM 페이지
const AuthGroupManagement = React.lazy(() => import('./pages/iam/AuthGroupManagement'));
const RoleCreate = React.lazy(() => import('./pages/iam/RoleCreate'));
const RoleDetail = React.lazy(() => import('./pages/iam/RoleDetail'));

// 계정 정책 페이지
const AccountPolicy = React.lazy(() => import('./pages/account-policy/AccountPolicy'));

// 메뉴 관리 페이지
const MenuManagement = React.lazy(() => import('./pages/menu/MenuManagement'));

// 화면 지정 관리 페이지
const PageVariantManagement = React.lazy(() => import('./pages/page-variant/PageVariantManagement'));

// API Flow 관리 페이지
const BffFlowManagement = React.lazy(() => import('./pages/bff-flow/BffFlowManagement'));

// 작업이력 페이지
const WorkHistoryList = React.lazy(() => import('./pages/work-history/WorkHistoryList'));

// 데이터 보관주기 관리 페이지
const DataRetention = React.lazy(() => import('./pages/data-retention/DataRetention'));

// 마스킹 정책/해지 요청 페이지
const MaskPolicyManagement = React.lazy(() => import('./pages/mask-policy/MaskPolicyManagement'));
const MaskUnmask = React.lazy(() => import('./pages/mask-unmask/MaskUnmask'));

// 클라이언트 관리 페이지
const ClientList = React.lazy(() => import('./pages/client/ClientList'));
const ClientCreate = React.lazy(() => import('./pages/client/ClientCreate'));
const ClientDetail = React.lazy(() => import('./pages/client/ClientDetail'));

// 라이선스 관리 페이지
const LicenseList = React.lazy(() => import('./pages/license/LicenseList'));

// 테넌트 관리 페이지
const TenantList = React.lazy(() => import('./pages/tenant-management/TenantList'));
const TenantCreate = React.lazy(() => import('./pages/tenant-management/TenantCreate'));
const TenantDetail = React.lazy(() => import('./pages/tenant-management/TenantDetail'));

// 노드/클러스터 관리 페이지
const NodeList = React.lazy(() => import('./pages/node-management/NodeList'));
const NodeCreate = React.lazy(() => import('./pages/node-management/NodeCreate'));
const NodeDetail = React.lazy(() => import('./pages/node-management/NodeDetail'));
const NodeSetting = React.lazy(() => import('./pages/node-management/NodeSetting'));
const ClusterConfig = React.lazy(() => import('./pages/node-management/ClusterConfig'));
const TenantAllocWizard = React.lazy(() => import('./pages/node-management/TenantAllocWizard'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      {
        index: true,
        element: <Navigate to="/" replace />,
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
                element: <RoleCreate />,
              },
              {
                path: ':roleId',
                element: <RoleDetail />,
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
            element: <AccountPolicy />,
          },
          {
            path: 'work-history',
            element: <WorkHistoryList />,
          },
          {
            path: 'data-retention',
            element: <DataRetention />,
          },
          {
            path: 'mask-policy',
            element: <MaskPolicyManagement />,
          },
          {
            path: 'mask-unmask',
            element: <MaskUnmask />,
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
                element: <NodeList />,
              },
              {
                path: 'create',
                element: <NodeCreate />,
              },
              {
                path: ':nodeId',
                element: <NodeDetail />,
              },
              {
                path: ':nodeId/settings',
                element: <NodeSetting />,
              },
              {
                path: ':nodeId/cluster-config',
                element: <ClusterConfig />,
              },
              {
                path: ':nodeId/alloc/:tenantId',
                element: <TenantAllocWizard />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/" />,
  },
];
