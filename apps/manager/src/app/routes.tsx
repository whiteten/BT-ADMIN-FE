import React from 'react';
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

// API Flow 관리 페이지
const BffFlowManagement = React.lazy(() => import('./pages/bff-flow/BffFlowManagement'));

// 작업이력 페이지
const WorkHistoryList = React.lazy(() => import('./pages/work-history/WorkHistoryList'));

// 클라이언트 관리 페이지
const ClientList = React.lazy(() => import('./pages/client/ClientList'));
const ClientCreate = React.lazy(() => import('./pages/client/ClientCreate'));
const ClientDetail = React.lazy(() => import('./pages/client/ClientDetail'));

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
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/manager" />,
  },
];
