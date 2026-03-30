import { Suspense, lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { NotFound } from '@/components/custom/NotFound';

const DataSourceListPage = lazy(() => import('./pages/datasource/DataSourceListPage'));
const WidgetListPage = lazy(() => import('./pages/widget/WidgetListPage'));
const WidgetBuilderPage = lazy(() => import('./pages/widget/WidgetBuilderPage'));
const BoardListPage = lazy(() => import('./pages/board/BoardListPage'));
const BoardViewPage = lazy(() => import('./pages/board/BoardViewPage'));
const BoardEditPage = lazy(() => import('./pages/board/BoardEditPage'));
const ConditionListPage = lazy(() => import('./pages/condition/ConditionListPage'));

const withSuspense = (Component: React.LazyExoticComponent<() => React.ReactNode>) => (
  <Suspense fallback={<FallbackSpinner />}>
    <Component />
  </Suspense>
);

export const routes: RouteObject[] = [
  {
    path: '/',
    children: [
      { index: true, element: <Navigate to="boards" replace /> },
      { path: 'datasources', element: withSuspense(DataSourceListPage) },
      { path: 'widgets', element: withSuspense(WidgetListPage) },
      { path: 'widgets/new', element: withSuspense(WidgetBuilderPage) },
      { path: 'widgets/:widgetId/edit', element: withSuspense(WidgetBuilderPage) },
      { path: 'boards', element: withSuspense(BoardListPage) },
      { path: 'boards/new', element: withSuspense(BoardEditPage) },
      { path: 'boards/:boardId', element: withSuspense(BoardViewPage) },
      { path: 'boards/:boardId/edit', element: withSuspense(BoardEditPage) },
      { path: 'conditions', element: withSuspense(ConditionListPage) },
    ],
  },
  { path: '*', element: <NotFound homePath="/dashboard" /> },
];
