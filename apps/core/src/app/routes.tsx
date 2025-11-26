import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const UserList = React.lazy(() => import('./pages/user/UserList'));
const UserCreate = React.lazy(() => import('./pages/user/UserCreate'));
const UserDetail = React.lazy(() => import('./pages/user/UserDetail'));

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
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/core" />,
  },
];
