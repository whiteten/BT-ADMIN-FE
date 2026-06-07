/**
 * 단말기 이력 조회 페이지 (IPR20S2130)
 * Pattern: 검색 폼 + 서버 페이징 ag-Grid + Excel 다운로드
 *
 * 검색 조건: 기간 / MAC주소 / 사용자명 / 내선범위 / 사용상태 / 변경사유
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, GridReadyEvent, IDatasource, IGetRowsParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Form, Input, Select, Space } from 'antd';
import { Download, Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { deviceHistoryApi } from '../../features/device/api/deviceHistoryApi';
import type { DevHistoryResponse, DevHistorySearchParams } from '../../features/device/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb = [
  { title: '번호자원관리', path: '/ipron/dn' },
  { title: '단말관리', path: '/ipron/device' },
  { title: '단말기 이력 조회', path: '/ipron/device/history' },
];

interface SearchForm {
  dateRange?: [import('dayjs').Dayjs | null, import('dayjs').Dayjs | null];
  macAddr?: string;
  ieUsername?: string;
  startDn?: string;
  endDn?: string;
  devStatus?: string;
  changeCode?: string;
}

const PAGE_SIZE = 20;

// 공통코드 기반 선택지 (CC_USED_STATUS)
const DEV_STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: '1', label: '사용' },
  { value: '0', label: '미사용' },
];

// 공통코드 기반 선택지 (PHONE_CHANGE_CODE)
const CHANGE_CODE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'ADD', label: '추가' },
  { value: 'DEL', label: '삭제' },
  { value: 'CHG', label: '변경' },
  { value: 'MAC', label: 'MAC변경' },
];

export default function DeviceHistoryList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions } = useAggridOptions();

  const [form] = Form.useForm<SearchForm>();
  const [searchParams, setSearchParams] = useState<DevHistorySearchParams>({ page: 0, size: PAGE_SIZE });
  const gridRef = useRef<AgGridReact<DevHistoryResponse>>(null);
  // 최신 searchParams를 datasource 클로저에서 참조하기 위한 ref
  const searchParamsRef = useRef<DevHistorySearchParams>({ page: 0, size: PAGE_SIZE });

  // ─── ag-Grid Infinite Scroll Datasource ─────────────────────────────────────
  // datasource는 한 번만 생성. searchParamsRef 통해 최신 파라미터를 클로저 없이 참조.
  const datasourceRef = useRef<IDatasource>({
    getRows: async (params: IGetRowsParams) => {
      const page = Math.floor(params.startRow / PAGE_SIZE);
      try {
        const result = await deviceHistoryApi.list({
          ...searchParamsRef.current,
          page,
          size: PAGE_SIZE,
        });
        params.successCallback(result.items, result.total);
      } catch (err: unknown) {
        params.failCallback();
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        const msg = e?.response?.data?.message ?? e?.message ?? '단말기 이력 조회에 실패했습니다.';
        toast.error(msg);
      }
    },
  });

  // 검색 파라미터 변경 시 ref 동기화 후 캐시 purge → getRows 재호출
  useEffect(() => {
    searchParamsRef.current = searchParams;
    // api가 준비된 이후에만 purge (onGridReady 이후 searchParams 변경 시)
    if (gridRef.current?.api) {
      gridRef.current.api.purgeInfiniteCache();
    }
  }, [searchParams]);

  const handleGridReady = useCallback((params: GridReadyEvent) => {
    params.api.setGridOption('datasource', datasourceRef.current);
    params.api.sizeColumnsToFit();
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const vals = form.getFieldsValue();
    const p: DevHistorySearchParams = { page: 0, size: PAGE_SIZE };
    if (vals.dateRange?.[0]) p.strDate = vals.dateRange[0].format('YYYYMMDD');
    if (vals.dateRange?.[1]) p.endDate = vals.dateRange[1].format('YYYYMMDD');
    if (vals.macAddr?.trim()) p.macAddr = vals.macAddr.trim();
    if (vals.ieUsername?.trim()) p.ieUsername = vals.ieUsername.trim();
    if (vals.startDn?.trim()) p.startDn = vals.startDn.trim();
    if (vals.endDn?.trim()) p.endDn = vals.endDn.trim();
    if (vals.devStatus) p.devStatus = vals.devStatus;
    if (vals.changeCode) p.changeCode = vals.changeCode;
    setSearchParams(p);
  }, [form]);

  const handleReset = useCallback(() => {
    form.resetFields();
    setSearchParams({ page: 0, size: PAGE_SIZE });
  }, [form]);

  const handleExcel = useCallback(async () => {
    try {
      const { page: _p, size: _s, ...excelParams } = searchParams;
      const blob = await deviceHistoryApi.exportExcel(excelParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      a.download = `단말기이력조회_${ts}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('엑셀 내보내기 완료');
    } catch (e: unknown) {
      const err = e as { response?: { data?: Blob } };
      let message = '엑셀 내보내기 실패';
      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const json = JSON.parse(text);
          if (json?.message) message = String(json.message);
        } catch {
          /* noop */
        }
      }
      toast.error(message);
    }
  }, [searchParams]);

  // ─── Column Defs ─────────────────────────────────────────────────────────────
  const columnDefs: ColDef<DevHistoryResponse>[] = useMemo(
    () => [
      { field: 'mdfyTime', headerName: '변경일시', flex: 1.3, minWidth: 155 },
      { field: 'macAddr', headerName: 'MAC 주소', flex: 1.2, minWidth: 140 },
      { field: 'dnNo', headerName: '대표DN', flex: 0.8, minWidth: 100 },
      { field: 'ieUsername', headerName: '사용자명', flex: 1, minWidth: 110 },
      { field: 'devStatusName', headerName: '사용상태', flex: 0.8, minWidth: 90 },
      { field: 'changeCodeName', headerName: '변경사유', flex: 0.9, minWidth: 100 },
      { field: 'changeDesc', headerName: '변경설명', flex: 2, minWidth: 180 },
    ],
    [],
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 검색 폼 ===== */}
      <div className="bg-white bt-shadow px-5 py-4 flex-shrink-0">
        <div className="flex flex-wrap items-end gap-x-0 gap-y-3 w-full">
          <Form form={form} layout="inline" onFinish={handleSearch} className="flex flex-wrap gap-y-3 flex-1">
            <Form.Item name="dateRange" label="기간">
              <DatePicker.RangePicker format="YYYY-MM-DD" placeholder={['시작일', '종료일']} />
            </Form.Item>
            <Form.Item name="macAddr" label="MAC주소">
              <Input placeholder="MAC 주소" style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="ieUsername" label="사용자명">
              <Input placeholder="사용자명" style={{ width: 130 }} />
            </Form.Item>
            <Form.Item label="내선범위">
              <Space.Compact>
                <Form.Item name="startDn" noStyle>
                  <Input placeholder="시작" style={{ width: 90 }} />
                </Form.Item>
                <Input placeholder="~" disabled style={{ width: 36, textAlign: 'center', background: '#fafafa' }} />
                <Form.Item name="endDn" noStyle>
                  <Input placeholder="종료" style={{ width: 90 }} />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="devStatus" label="사용상태">
              <Select options={DEV_STATUS_OPTIONS} style={{ width: 100 }} defaultValue="" />
            </Form.Item>
            <Form.Item name="changeCode" label="변경사유">
              <Select options={CHANGE_CODE_OPTIONS} style={{ width: 100 }} defaultValue="" />
            </Form.Item>
          </Form>
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <Button type="primary" icon={<Search className="size-3.5" />} onClick={handleSearch}>
              검색
            </Button>
            <Button onClick={handleReset}>초기화</Button>
          </div>
        </div>
      </div>

      {/* ===== ag-Grid ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center h-[44px] flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">단말기 이력 조회</span>
          <div className="ml-auto">
            <Button icon={<Download className="size-3.5" />} onClick={handleExcel}>
              엑셀
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
          <AgGridReact<DevHistoryResponse>
            ref={gridRef}
            columnDefs={columnDefs}
            gridOptions={{
              ...gridOptions,
              pagination: false,
              statusBar: undefined,
              sideBar: false,
            }}
            rowModelType="infinite"
            cacheBlockSize={PAGE_SIZE}
            infiniteInitialRowCount={1}
            onGridReady={handleGridReady}
          />
        </div>
      </div>
    </div>
  );
}
