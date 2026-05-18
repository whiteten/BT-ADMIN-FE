// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      {
        index: true,
        element: <Navigate to="/" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/" />,
  },
];
