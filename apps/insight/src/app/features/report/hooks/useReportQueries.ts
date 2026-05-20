import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { reportApi } from '../api/reportApi';
import type {
  CalcField,
  CalcFieldCreateDatas,
  FieldDisplay,
  PanelCreateDatas,
  PanelDetail,
  PanelLayoutUpdateItem,
  PublishDatas,
  ReportCreateDatas,
  ReportDetail,
  ReportFullDetail,
  ReportListItem,
  ReportUpdateDatas,
  SearchBinding,
  SearchBindingCreateDatas,
} from '../types';

export const reportKeys = createQueryKeys('statistics-reports', {
  list: (params?: Record<string, unknown>) => [params],
  detail: (reportId: number) => [reportId],
  fieldDisplays: (reportId: number) => [reportId],
  calcFields: (reportId: number) => [reportId],
  searchBindings: (reportId: number) => [reportId],
  panels: (reportId: number) => [reportId],
});

export const useGetReports = ({
  params,
  queryOptions,
}: { params?: Record<string, unknown>; queryOptions?: Omit<UseQueryOptions<ReportListItem[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({ ...reportKeys.list(params), queryFn: () => reportApi.getReports(params), ...queryOptions });

export const useGetReport = ({
  params: { reportId },
  queryOptions,
}: {
  params: { reportId: number };
  queryOptions?: Omit<UseQueryOptions<ReportFullDetail>, 'queryKey' | 'queryFn'>;
}) => useQuery({ ...reportKeys.detail(reportId), queryFn: () => reportApi.getReport(reportId), ...queryOptions });

export const useCreateReport = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<ReportDetail, Error, ReportCreateDatas> } = {}) =>
  useMutation({ mutationFn: (data: ReportCreateDatas) => reportApi.createReport(data), ...mutationOptions });

export const useUpdateReport = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<ReportDetail, Error, { reportId: number; data: ReportUpdateDatas }> } = {}) =>
  useMutation({ mutationFn: ({ reportId, data }) => reportApi.updateReport(reportId, data), ...mutationOptions });

export const useDeleteReport = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, number> } = {}) =>
  useMutation({ mutationFn: (reportId: number) => reportApi.deleteReport(reportId), ...mutationOptions });

export const useGetFieldDisplays = ({
  params: { reportId },
  queryOptions,
}: {
  params: { reportId: number };
  queryOptions?: Omit<UseQueryOptions<FieldDisplay[]>, 'queryKey' | 'queryFn'>;
}) => useQuery({ ...reportKeys.fieldDisplays(reportId), queryFn: () => reportApi.getFieldDisplays(reportId), ...queryOptions });

export const useUpdateFieldDisplays = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, { reportId: number; data: FieldDisplay[] }> } = {}) =>
  useMutation({ mutationFn: ({ reportId, data }) => reportApi.updateFieldDisplays(reportId, data), ...mutationOptions });

export const useGetCalcFields = ({
  params: { reportId },
  queryOptions,
}: {
  params: { reportId: number };
  queryOptions?: Omit<UseQueryOptions<CalcField[]>, 'queryKey' | 'queryFn'>;
}) => useQuery({ ...reportKeys.calcFields(reportId), queryFn: () => reportApi.getCalcFields(reportId), ...queryOptions });

export const useCreateCalcField = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<CalcField, Error, { reportId: number; data: CalcFieldCreateDatas }> } = {}) =>
  useMutation({ mutationFn: ({ reportId, data }) => reportApi.createCalcField(reportId, data), ...mutationOptions });

export const useUpdateCalcField = ({
  mutationOptions,
}: { mutationOptions?: UseMutationOptions<CalcField, Error, { reportId: number; calcFieldId: number; data: CalcFieldCreateDatas }> } = {}) =>
  useMutation({ mutationFn: ({ reportId, calcFieldId, data }) => reportApi.updateCalcField(reportId, calcFieldId, data), ...mutationOptions });

export const useDeleteCalcField = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, { reportId: number; calcFieldId: number }> } = {}) =>
  useMutation({ mutationFn: ({ reportId, calcFieldId }) => reportApi.deleteCalcField(reportId, calcFieldId), ...mutationOptions });

export const useGetSearchBindings = ({
  params: { reportId },
  queryOptions,
}: {
  params: { reportId: number };
  queryOptions?: Omit<UseQueryOptions<SearchBinding[]>, 'queryKey' | 'queryFn'>;
}) => useQuery({ ...reportKeys.searchBindings(reportId), queryFn: () => reportApi.getSearchBindings(reportId), ...queryOptions });

export const useCreateSearchBinding = ({
  mutationOptions,
}: { mutationOptions?: UseMutationOptions<SearchBinding, Error, { reportId: number; data: SearchBindingCreateDatas }> } = {}) =>
  useMutation({ mutationFn: ({ reportId, data }) => reportApi.createSearchBinding(reportId, data), ...mutationOptions });

export const useDeleteSearchBinding = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, { reportId: number; bindId: number }> } = {}) =>
  useMutation({ mutationFn: ({ reportId, bindId }) => reportApi.deleteSearchBinding(reportId, bindId), ...mutationOptions });

export const useGetPanels = ({
  params: { reportId },
  queryOptions,
}: {
  params: { reportId: number };
  queryOptions?: Omit<UseQueryOptions<PanelDetail[]>, 'queryKey' | 'queryFn'>;
}) => useQuery({ ...reportKeys.panels(reportId), queryFn: () => reportApi.getPanels(reportId), ...queryOptions });

export const useCreatePanel = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<PanelDetail, Error, { reportId: number; data: PanelCreateDatas }> } = {}) =>
  useMutation({ mutationFn: ({ reportId, data }) => reportApi.createPanel(reportId, data), ...mutationOptions });

export const useUpdatePanel = ({
  mutationOptions,
}: { mutationOptions?: UseMutationOptions<PanelDetail, Error, { reportId: number; panelId: number; data: PanelCreateDatas }> } = {}) =>
  useMutation({ mutationFn: ({ reportId, panelId, data }) => reportApi.updatePanel(reportId, panelId, data), ...mutationOptions });

export const useDeletePanel = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, { reportId: number; panelId: number }> } = {}) =>
  useMutation({ mutationFn: ({ reportId, panelId }) => reportApi.deletePanel(reportId, panelId), ...mutationOptions });

export const useUpdatePanelLayouts = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, { reportId: number; layouts: PanelLayoutUpdateItem[] }> } = {}) =>
  useMutation({ mutationFn: ({ reportId, layouts }) => reportApi.updatePanelLayouts(reportId, layouts), ...mutationOptions });

export const usePublishReport = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<{ menuId: number }, Error, { reportId: number; data: PublishDatas }> } = {}) =>
  useMutation({ mutationFn: ({ reportId, data }) => reportApi.publishReport(reportId, data), ...mutationOptions });

export const useUnpublishReport = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, number> } = {}) =>
  useMutation({ mutationFn: (reportId: number) => reportApi.unpublishReport(reportId), ...mutationOptions });
