/**
 * ACS 서비스 관리 페이지 — AS-IS IPR35S5010 마이그레이션.
 *
 * <p>레이아웃: 상단 ACS 서비스 마스터 그리드(수정 Drawer/삭제/발신설정/시스템제어) +
 * 하단 선택 ACS 의 배정 현황 2그리드(업무시간/휴일, 배정·해제).</p>
 *
 * <p>등록 버튼이 없다 — ACS 마스터는 시나리오 관리에서 ACS 시나리오(20/70) 등록 시 자동 생성된다 (AS-IS 동일).</p>
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Popconfirm, Switch, Tag } from 'antd';
import { CalendarCheck, CalendarX, PhoneOutgoing, Settings2, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AcsDialConfigDrawer, { type AcsDialConfigDrawerRef } from './AcsDialConfigDrawer';
import AcsHolidayAssignDrawer, { type AcsHolidayAssignDrawerRef } from './AcsHolidayAssignDrawer';
import AcsServiceEditDrawer, { type AcsServiceEditDrawerRef } from './AcsServiceEditDrawer';
import AcsSystemControlDrawer, { type AcsSystemControlDrawerRef } from './AcsSystemControlDrawer';
import AcsWorktimeAssignDrawer, { type AcsWorktimeAssignDrawerRef } from './AcsWorktimeAssignDrawer';
import {
  acsServiceQueryKeys,
  useCancelHolidays,
  useCancelWorktimes,
  useDeleteAcsService,
  useGetAcsServices,
  useGetAssignedHolidays,
  useGetAssignedWorktimes,
  useUpdateAcsServiceUse,
} from '../hooks/useAcsServiceQueries';
import {
  ACS_TYPE_LABELS,
  type AcsHoliday,
  type AcsService,
  type AcsWorktime,
  CONTROL_TYPE_LABELS,
  HOLI_TYPE_LABELS,
  REPEAT_OPT_LABELS,
  formatHHmm,
  formatWeekdayByte,
} from '../types/acsService.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb = [
  { title: 'ACS 관리', path: '/ivr/acs/service' },
  { title: 'ACS 서비스 관리', path: '/ivr/acs/service' },
];

export default function AcsServicePage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();

  const [selectedAcs, setSelectedAcs] = useState<AcsService | null>(null);
  const [checkedRows, setCheckedRows] = useState<AcsService[]>([]);
  const [checkedWorktimes, setCheckedWorktimes] = useState<AcsWorktime[]>([]);
  const [checkedHolidays, setCheckedHolidays] = useState<AcsHoliday[]>([]);

  const editDrawerRef = useRef<AcsServiceEditDrawerRef>(null);
  const worktimeAssignRef = useRef<AcsWorktimeAssignDrawerRef>(null);
  const holidayAssignRef = useRef<AcsHolidayAssignDrawerRef>(null);
  const dialConfigRef = useRef<AcsDialConfigDrawerRef>(null);
  const systemControlRef = useRef<AcsSystemControlDrawerRef>(null);

  const { data: acsServices = [], isFetching } = useGetAcsServices();

  const { data: assignedWorktimes = [], isFetching: isWorktimeFetching } = useGetAssignedWorktimes({
    params: selectedAcs ? { acsId: selectedAcs.acsId } : undefined,
    queryOptions: { enabled: !!selectedAcs },
  });

  const { data: assignedHolidays = [], isFetching: isHolidayFetching } = useGetAssignedHolidays({
    params: selectedAcs ? { acsId: selectedAcs.acsId } : undefined,
    queryOptions: { enabled: !!selectedAcs },
  });

  const invalidateMaster = () => queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAcsServices.queryKey });

  const { mutate: deleteMutate } = useDeleteAcsService({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        setCheckedRows([]);
        setSelectedAcs(null);
        invalidateMaster();
      },
      onError: (err) => toast.error(`삭제 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const { mutate: updateUseMutate } = useUpdateAcsServiceUse({
    mutationOptions: {
      // 낙관적 업데이트 — 서버 왕복(use-update + list 재조회)을 기다리지 않고 스위치를 즉시 반영
      onMutate: async ({ acsId, useYn }) => {
        await queryClient.cancelQueries({ queryKey: acsServiceQueryKeys.getAcsServices.queryKey });
        const previous = queryClient.getQueryData<AcsService[]>(acsServiceQueryKeys.getAcsServices.queryKey);
        queryClient.setQueryData<AcsService[]>(acsServiceQueryKeys.getAcsServices.queryKey, (old) => old?.map((acs) => (acs.acsId === acsId ? { ...acs, useYn } : acs)));
        return { previous };
      },
      // 토글 결과는 Switch 상태로 충분해 성공 토스트는 띄우지 않는다
      onError: (err, _vars, context) => {
        const ctx = context as { previous?: AcsService[] } | undefined;
        if (ctx?.previous) queryClient.setQueryData(acsServiceQueryKeys.getAcsServices.queryKey, ctx.previous);
        toast.error(`변경 실패: ${(err as Error).message ?? '오류'}`);
      },
      // 성공·실패 무관 서버 상태와 최종 동기화 (백그라운드 재조회라 스위치 반응을 막지 않음)
      onSettled: () => invalidateMaster(),
    },
  });

  const { mutate: cancelWorktimesMutate } = useCancelWorktimes({
    mutationOptions: {
      onSuccess: () => {
        toast.success('해제되었습니다.');
        setCheckedWorktimes([]);
        queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAssignedWorktimes._def });
        queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAcsWorktimes._def });
      },
      onError: (err) => toast.error(`해제 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const { mutate: cancelHolidaysMutate } = useCancelHolidays({
    mutationOptions: {
      onSuccess: () => {
        toast.success('해제되었습니다.');
        setCheckedHolidays([]);
        queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAssignedHolidays._def });
        queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAcsHolidays._def });
      },
      onError: (err) => toast.error(`해제 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const handleDelete = () => {
    if (checkedRows.length === 0) {
      toast.warning('삭제할 ACS 서비스를 선택하세요.');
      return;
    }
    checkedRows.forEach((row) => deleteMutate(row.acsId));
  };

  const handleCancelWorktimes = () => {
    if (!selectedAcs) return;
    if (checkedWorktimes.length === 0) {
      toast.warning('해제할 업무시간을 선택하세요.');
      return;
    }
    cancelWorktimesMutate({ acsId: selectedAcs.acsId, ids: checkedWorktimes.map((w) => w.worktimeId) });
  };

  const handleCancelHolidays = () => {
    if (!selectedAcs) return;
    if (checkedHolidays.length === 0) {
      toast.warning('해제할 휴일을 선택하세요.');
      return;
    }
    cancelHolidaysMutate({ acsId: selectedAcs.acsId, ids: checkedHolidays.map((h) => h.holiId) });
  };

  const masterColumnDefs: ColDef<AcsService>[] = useMemo(
    () => [
      { headerName: '시나리오 이름', field: 'serviceName', flex: 0.5, minWidth: 95 },
      { headerName: 'ACS ID', field: 'acsId', width: 125 },
      { headerName: 'ACS 서비스명', field: 'acsServiceName', flex: 0.5, minWidth: 95 },
      {
        headerName: 'ACS Type',
        field: 'acsType',
        width: 130,
        cellRenderer: (p: ICellRendererParams<AcsService>) => (
          <Tag color={p.value === 1 ? 'geekblue' : 'blue'} className="!m-0">
            {ACS_TYPE_LABELS[p.value as number] ?? p.value}
          </Tag>
        ),
      },
      { headerName: '중복 실행', field: 'dupYn', width: 110, valueFormatter: (p) => (p.value === 1 ? '사용' : '미사용') },
      { headerName: '최대 요청 건수', field: 'maxObReqCnt', width: 135 },
      { headerName: '제어 타입', field: 'controlType', width: 110, valueFormatter: (p) => CONTROL_TYPE_LABELS[p.value as number] ?? String(p.value ?? '') },
      { headerName: '동작주기', field: 'acsPeriod', width: 90 },
      { headerName: '시작일자', field: 'startDate', width: 110 },
      { headerName: '종료일자', field: 'finishDate', width: 110 },
      {
        headerName: 'ACS 사용',
        field: 'useYn',
        width: 100,
        cellRenderer: (p: ICellRendererParams<AcsService>) => (
          <Switch size="small" checked={p.value === 1} onChange={(checked) => p.data && updateUseMutate({ acsId: p.data.acsId, useYn: checked ? 1 : 0 })} />
        ),
      },
    ],
    [updateUseMutate],
  );

  const worktimeColumnDefs: ColDef<AcsWorktime>[] = useMemo(
    () => [
      { headerName: 'ID', field: 'worktimeId', width: 80 },
      { headerName: '업무시간명', field: 'worktimeName', flex: 1, minWidth: 120 },
      { headerName: '적용요일', field: 'weekdayByte', width: 150, valueFormatter: (p) => formatWeekdayByte(p.value as string) },
      { headerName: '시작', field: 'startTime', width: 80, valueFormatter: (p) => formatHHmm(p.value as string) },
      { headerName: '종료', field: 'finishTime', width: 80, valueFormatter: (p) => formatHHmm(p.value as string) },
    ],
    [],
  );

  const holidayColumnDefs: ColDef<AcsHoliday>[] = useMemo(
    () => [
      { headerName: 'ID', field: 'holiId', width: 80 },
      { headerName: '휴일명', field: 'holiName', flex: 1, minWidth: 120 },
      { headerName: '반복유형', field: 'repeatOpt', width: 90, valueFormatter: (p) => REPEAT_OPT_LABELS[p.value as number] ?? String(p.value ?? '') },
      { headerName: '휴일타입', field: 'holiType', width: 110, valueFormatter: (p) => HOLI_TYPE_LABELS[p.value as number] ?? String(p.value ?? '') },
      { headerName: '시작일자', field: 'startDate', width: 110 },
      { headerName: '종료일자', field: 'finishDate', width: 110 },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <AcsServiceEditDrawer ref={editDrawerRef} />
      <AcsWorktimeAssignDrawer ref={worktimeAssignRef} />
      <AcsHolidayAssignDrawer ref={holidayAssignRef} />
      <AcsDialConfigDrawer ref={dialConfigRef} />
      <AcsSystemControlDrawer ref={systemControlRef} />

      {/* ===== ① ACS 서비스 마스터 그리드 ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <PhoneOutgoing className="size-4 text-[#405189]" />
            <h3 className="text-sm font-semibold text-gray-800">ACS 서비스 관리</h3>
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{acsServices.length}개</span>
            {checkedRows.length > 0 && <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-blue-600 bg-blue-50">선택 {checkedRows.length}개</span>}
          </div>
          <div className="flex items-center gap-2">
            {checkedRows.length > 0 && (
              <Popconfirm title={`${checkedRows.length}건을 삭제할까요? (사용 중 콜리스트가 있으면 삭제되지 않습니다)`} onConfirm={handleDelete} okText="삭제" cancelText="취소">
                <Button color="red" variant="solid" icon={<Trash2 className="size-3.5" />}>
                  선택 삭제
                </Button>
              </Popconfirm>
            )}
            <Button icon={<SlidersHorizontal className="size-3.5" />} onClick={() => dialConfigRef.current?.open()}>
              발신 설정 관리
            </Button>
            <Button icon={<Settings2 className="size-3.5" />} onClick={() => systemControlRef.current?.open(selectedAcs?.acsId)}>
              시스템 제어
            </Button>
          </div>
        </div>
        <div className="border-t border-gray-200" />
        <div className="flex-1 min-h-0 p-5">
          <AgGridReact<AcsService>
            rowData={acsServices}
            columnDefs={masterColumnDefs}
            gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
            loading={isFetching}
            getRowId={(p) => String(p.data.acsId)}
            defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
            rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true }}
            onSelectionChanged={(e) => setCheckedRows(e.api.getSelectedRows())}
            onRowClicked={(e) => e.data && setSelectedAcs(e.data)}
            onRowDoubleClicked={(e) => e.data && editDrawerRef.current?.openEdit(e.data)}
          />
        </div>
      </div>

      {/* ===== ② 선택 ACS 배정 현황 (업무시간 / 휴일) ===== */}
      <div className="grid grid-cols-2 gap-4 h-[320px] flex-shrink-0">
        {/* 배정된 업무시간 */}
        <div className="bg-white bt-shadow flex flex-col min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-800">배정된 업무시간 {selectedAcs ? <span className="text-[#405189]">— {selectedAcs.acsServiceName}</span> : ''}</h3>
            <div className="flex items-center gap-2">
              <Button
                size="small"
                icon={<CalendarCheck className="size-3.5" />}
                disabled={!selectedAcs}
                onClick={() => selectedAcs && worktimeAssignRef.current?.open(selectedAcs.acsId)}
              >
                업무시간 배정
              </Button>
              <Button size="small" icon={<CalendarX className="size-3.5" />} disabled={!selectedAcs || checkedWorktimes.length === 0} onClick={handleCancelWorktimes}>
                업무시간 해제
              </Button>
            </div>
          </div>
          <div className="border-t border-gray-200" />
          <div className="flex-1 min-h-0 p-3">
            {selectedAcs ? (
              <AgGridReact<AcsWorktime>
                rowData={assignedWorktimes}
                columnDefs={worktimeColumnDefs}
                gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                loading={isWorktimeFetching}
                getRowId={(p) => String(p.data.worktimeId)}
                defaultColDef={{ sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
                onSelectionChanged={(e) => setCheckedWorktimes(e.api.getSelectedRows())}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Empty description="상단에서 ACS 서비스를 선택하세요" />
              </div>
            )}
          </div>
        </div>

        {/* 배정된 휴일 */}
        <div className="bg-white bt-shadow flex flex-col min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-800">배정된 휴일 {selectedAcs ? <span className="text-[#405189]">— {selectedAcs.acsServiceName}</span> : ''}</h3>
            <div className="flex items-center gap-2">
              <Button
                size="small"
                icon={<CalendarCheck className="size-3.5" />}
                disabled={!selectedAcs}
                onClick={() => selectedAcs && holidayAssignRef.current?.open(selectedAcs.acsId)}
              >
                휴일 배정
              </Button>
              <Button size="small" icon={<CalendarX className="size-3.5" />} disabled={!selectedAcs || checkedHolidays.length === 0} onClick={handleCancelHolidays}>
                휴일 해제
              </Button>
            </div>
          </div>
          <div className="border-t border-gray-200" />
          <div className="flex-1 min-h-0 p-3">
            {selectedAcs ? (
              <AgGridReact<AcsHoliday>
                rowData={assignedHolidays}
                columnDefs={holidayColumnDefs}
                gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                loading={isHolidayFetching}
                getRowId={(p) => String(p.data.holiId)}
                defaultColDef={{ sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
                onSelectionChanged={(e) => setCheckedHolidays(e.api.getSelectedRows())}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Empty description="상단에서 ACS 서비스를 선택하세요" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
