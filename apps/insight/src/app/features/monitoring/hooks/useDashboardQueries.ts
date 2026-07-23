import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { dashboardApi } from '../api/dashboardApi';
import type {
  CustomWidgetCatalogItem,
  CustomWidgetCatalogUpdateDatas,
  DashboardCreateDatas,
  DashboardDetail,
  DashboardListItem,
  DashboardUpdateDatas,
  Widget,
  WidgetCreateDatas,
} from '../types';

export const dashboardKeys = createAppQueryKeys('monitoring-dashboards', {
  list: (params?: Record<string, unknown>) => [params],
  detail: (dashboardId: number) => [dashboardId],
  widgets: (dashboardId: number) => [dashboardId],
  customWidgetCatalog: (params?: Record<string, unknown>) => [params],
});

// ─── 대시보드 쿼리 ────────────────────────────────────────────────────

export const useGetDashboards = ({
  params,
  queryOptions,
}: { params?: Record<string, unknown>; queryOptions?: Omit<UseQueryOptions<DashboardListItem[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({ ...dashboardKeys.list(params), queryFn: () => dashboardApi.getDashboards(params), ...queryOptions });

export const useGetDashboard = ({
  params: { dashboardId },
  queryOptions,
}: {
  params: { dashboardId: number };
  queryOptions?: Omit<UseQueryOptions<DashboardDetail>, 'queryKey' | 'queryFn'>;
}) => useQuery({ ...dashboardKeys.detail(dashboardId), queryFn: () => dashboardApi.getDashboard(dashboardId), ...queryOptions });

// ─── 대시보드 뮤테이션 ────────────────────────────────────────────────

export const useCreateDashboard = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<DashboardDetail, Error, DashboardCreateDatas> } = {}) =>
  useMutation({ mutationFn: (data: DashboardCreateDatas) => dashboardApi.createDashboard(data), ...mutationOptions });

export const useUpdateDashboard = ({
  mutationOptions,
}: { mutationOptions?: UseMutationOptions<DashboardDetail, Error, { dashboardId: number; data: DashboardUpdateDatas }> } = {}) =>
  useMutation({ mutationFn: ({ dashboardId, data }) => dashboardApi.updateDashboard(dashboardId, data), ...mutationOptions });

export const useDeleteDashboard = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, number> } = {}) =>
  useMutation({ mutationFn: (dashboardId: number) => dashboardApi.deleteDashboard(dashboardId), ...mutationOptions });

export const useApplyDashboardTenants = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, { dashboardId: number; tenantIds: number[] }> } = {}) =>
  useMutation({ mutationFn: ({ dashboardId, tenantIds }) => dashboardApi.applyTenants(dashboardId, tenantIds), ...mutationOptions });

// ─── 위젯 쿼리 ────────────────────────────────────────────────────────

export const useGetWidgets = ({
  params: { dashboardId },
  queryOptions,
}: {
  params: { dashboardId: number };
  queryOptions?: Omit<UseQueryOptions<Widget[]>, 'queryKey' | 'queryFn'>;
}) => useQuery({ ...dashboardKeys.widgets(dashboardId), queryFn: () => dashboardApi.getWidgets(dashboardId), ...queryOptions });

// ─── 위젯 뮤테이션 ────────────────────────────────────────────────────

export const useCreateWidget = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<Widget, Error, { dashboardId: number; data: WidgetCreateDatas }> } = {}) =>
  useMutation({ mutationFn: ({ dashboardId, data }) => dashboardApi.createWidget(dashboardId, data), ...mutationOptions });

export const useUpdateWidget = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<Widget, Error, { widgetId: number; data: Partial<WidgetCreateDatas> }> } = {}) =>
  useMutation({ mutationFn: ({ widgetId, data }) => dashboardApi.updateWidget(widgetId, data), ...mutationOptions });

export const useDeleteWidget = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, number> } = {}) =>
  useMutation({ mutationFn: (widgetId: number) => dashboardApi.deleteWidget(widgetId), ...mutationOptions });

export const useUpdateLayout = ({
  mutationOptions,
}: {
  mutationOptions?: UseMutationOptions<void, Error, { dashboardId: number; items: Array<{ widgetId: number; row: number; col: number; w: number; h: number }> }>;
} = {}) => useMutation({ mutationFn: ({ dashboardId, items }) => dashboardApi.updateLayout(dashboardId, items), ...mutationOptions });

// ─── 커스텀 위젯 카탈로그 ───────────────────────────────────────────────

export const useGetCustomWidgetCatalog = ({
  params,
  queryOptions,
}: { params?: Record<string, unknown>; queryOptions?: Omit<UseQueryOptions<CustomWidgetCatalogItem[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({ ...dashboardKeys.customWidgetCatalog(params), queryFn: () => dashboardApi.getCustomWidgetCatalog(params), ...queryOptions });

export const useUpdateCustomWidgetCatalog = ({
  mutationOptions,
}: { mutationOptions?: UseMutationOptions<CustomWidgetCatalogItem, Error, { widgetTypeId: string; data: CustomWidgetCatalogUpdateDatas }> } = {}) =>
  useMutation({ mutationFn: ({ widgetTypeId, data }) => dashboardApi.updateCustomWidgetCatalog(widgetTypeId, data), ...mutationOptions });
