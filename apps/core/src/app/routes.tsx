import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const UserList = React.lazy(() => import('./pages/user/UserList'));
const UserCreate = React.lazy(() => import('./pages/user/UserCreate'));
const UserDetail = React.lazy(() => import('./pages/user/UserDetail'));

// IAM 페이지
const AuthGroupManagement = React.lazy(() => import('./pages/iam/AuthGroupManagement'));
const RoleList = React.lazy(() => import('./pages/iam/RoleList'));
const RoleDetail = React.lazy(() => import('./pages/iam/RoleDetail'));
const PermissionList = React.lazy(() => import('./pages/iam/PermissionList'));
const UserAuthOverride = React.lazy(() => import('./pages/iam/UserAuthOverride'));

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
      // IAM 라우트
      {
        path: 'auth-groups',
        element: <AuthGroupManagement />,
      },
      {
        path: 'roles',
        element: <RoleList />,
      },
      {
        path: 'role',
        element: <Outlet />,
        children: [
          {
            index: true,
            element: <Navigate to="../roles" replace />,
          },
          {
            path: ':id',
            element: <RoleDetail />,
          },
          {
            path: 'create',
            element: <RoleDetail />,
          },
        ],
      },
      {
        path: 'permissions',
        element: <PermissionList />,
      },
      {
        path: 'user-auth-override',
        element: <UserAuthOverride />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/core" />,
  },
];
