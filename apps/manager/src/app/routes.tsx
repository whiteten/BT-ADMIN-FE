import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useBreadcrumbStore } from '@/shared-store';
import { createPageVariantSocket } from '@/components/custom/DynamicElement';
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

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('manager');

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
                element: pv('resource/user/list', UserList),
              },
              {
                path: 'create',
                element: pv('resource/user/create', UserCreate),
              },
              {
                path: ':userId',
                element: pv('resource/user/:userId', UserDetail),
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
                element: pv('resource/auth-group/list', AuthGroupManagement),
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
                element: pv('resource/role/create', RoleCreate),
              },
              {
                path: ':roleId',
                element: pv('resource/role/:roleId', RoleDetail),
              },
            ],
          },
          {
            path: 'menu',
            element: pv('resource/menu', MenuManagement),
          },
          {
            path: 'page-variant',
            element: pv('resource/page-variant', PageVariantManagement),
          },
          {
            path: 'bff-flow',
            element: pv('resource/bff-flow', BffFlowManagement),
          },
          {
            path: 'account-policy',
            element: pv('resource/account-policy', AccountPolicy),
          },
          {
            path: 'work-history',
            element: pv('resource/work-history', WorkHistoryList),
          },
          {
            path: 'data-retention',
            element: pv('resource/data-retention', DataRetention),
          },
          {
            path: 'mask-policy',
            element: pv('resource/mask-policy', MaskPolicyManagement),
          },
          {
            path: 'mask-unmask',
            element: pv('resource/mask-unmask', MaskUnmask),
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
                element: pv('resource/client/list', ClientList),
              },
              {
                path: 'create',
                element: pv('resource/client/create', ClientCreate),
              },
              {
                path: ':clientId',
                element: pv('resource/client/:clientId', ClientDetail),
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
                element: pv('resource/license/list', LicenseList),
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
                element: pv('resource/tenant-management/list', TenantList),
              },
              {
                path: 'create',
                element: pv('resource/tenant-management/create', TenantCreate),
              },
              {
                path: ':tenantId',
                element: pv('resource/tenant-management/:tenantId', TenantDetail),
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
                element: pv('resource/node-management/list', NodeList),
              },
              {
                path: 'create',
                element: pv('resource/node-management/create', NodeCreate),
              },
              {
                path: ':nodeId',
                element: pv('resource/node-management/:nodeId', NodeDetail),
              },
              {
                path: ':nodeId/settings',
                element: pv('resource/node-management/:nodeId/settings', NodeSetting),
              },
              {
                path: ':nodeId/cluster-config',
                element: pv('resource/node-management/:nodeId/cluster-config', ClusterConfig),
              },
              {
                path: ':nodeId/alloc/:tenantId',
                element: pv('resource/node-management/:nodeId/alloc/:tenantId', TenantAllocWizard),
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
