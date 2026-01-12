import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const UserList = React.lazy(() => import('./pages/user/UserList'));
const UserCreate = React.lazy(() => import('./pages/user/UserCreate'));
const UserDetail = React.lazy(() => import('./pages/user/UserDetail'));

// IAM 페이지 (통합)
const AuthGroupManagement = React.lazy(() => import('./pages/iam/AuthGroupManagement'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'users',
        element: <UserList />,
      },
      {
        path: 'user',
        element: <Outlet />,
        children: [
          {
            index: true,
            element: <Navigate to="../users" replace />,
          },
          {
            path: ':id',
            element: <UserDetail />,
          },
          {
            path: 'create',
            element: <UserCreate />,
          },
        ],
      },
      // IAM 라우트 (권한그룹 통합 페이지만 유지)
      {
        path: 'auth-groups',
        element: <AuthGroupManagement />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/core" />,
  },
];
