import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Dashboard = React.lazy(() => import('./pages/dashboard'));
const UserList = React.lazy(() => import('./pages/user/UserList'));
const UserCreate = React.lazy(() => import('./pages/user/UserCreate'));
const UserDetail = React.lazy(() => import('./pages/user/UserDetail'));

// IAM 페이지
const AuthGroupManagement = React.lazy(() => import('./pages/iam/AuthGroupManagement'));
const RoleCreatePage = React.lazy(() => import('./pages/iam/RoleCreatePage'));
const PasswordPolicyPage = React.lazy(() => import('./pages/password-policy/PasswordPolicyPage'));

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
        ],
      },
      // 권한 관리 (iam)
      {
        path: 'iam',
        element: <Outlet />,
        children: [
          {
            index: true,
            element: <Navigate to="auth-group" replace />,
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
                path: 'edit/:roleId',
                element: <RoleCreatePage />,
              },
            ],
          },
          {
            path: 'password-policy',
            element: <PasswordPolicyPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/core" />,
  },
];
