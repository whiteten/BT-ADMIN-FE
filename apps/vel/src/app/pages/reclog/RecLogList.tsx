import React, { useEffect, useRef, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Form, Input, Pagination, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetTenants } from '../../features/common/hooks/useCommonQueries';
import { recLogApi } from '../../features/reclog/api/recLogApi';
import RecReasonTypeModal, { type RecReasonTypeModalRef } from '../../features/reclog/components/RecReasonTypeModal';
import { useGetRecLogs } from '../../features/reclog/hooks/useRecLogQueries';
import { REALTIME_FLAG_LABELS, type RecLogItem, type RecLogSearchParams } from '../../features/reclog/types/rec-log';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb = [{ title: 'VEL' }, { title: '청취로그기본조회', path: '/vel/reclog/list' }];

const FORM_ITEM_STYLE = { '--ant-form-item-margin-bottom': '0px' } as React.CSSProperties;

const columnDefs: ColDef<RecLogItem>[] = [
  { field: 'workSdate', headerName: '일자', width: 185, minWidth: 170 },
  {
    field: 'realtimeFlag',
    headerName: '청취구분',
    width: 110,
    minWidth: 98,
    valueFormatter: ({ value }) => REALTIME_FLAG_LABELS[value as string] ?? (value as string),
  },
  { field: 'workerId', headerName: '매니저ID', width: 105, minWidth: 92 },
  {
    colId: 'recDate',
    field: 'recTime',
    headerName: '통화일자',
    width: 185,
    minWidth: 170,
    valueFormatter: ({ value }) => {
      if (!value) return '';
      const v = value as string;
      return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)} ${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}`;
    },
  },
  {
    field: 'endTime',
    headerName: '통화시간',
    width: 103,
    minWidth: 92,
    valueFormatter: ({ value }) => {
      if (!value) return '';
      const v = value as number;
      const h = Math.floor(v / 3600)
        .toString()
        .padStart(2, '0');
      const m = Math.floor((v % 3600) / 60)
        .toString()
        .padStart(2, '0');
      const s = (v % 60).toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
    },
  },
  //   { field: 'recReasonText', headerName: '청취사유분류', width: 110, minWidth: 90 },
  //   { field: 'recReason', headerName: '청취사유', flex: 1, minWidth: 100 },
  { field: 'userId', headerName: '상담원ID', width: 105, minWidth: 92 },
  { field: 'userName', headerName: '상담원명', width: 102, minWidth: 90 },
  { field: 'dnNo', headerName: '내선번호', width: 90, minWidth: 80 },
  { field: 'custTel', headerName: '전화번호', width: 140, minWidth: 120 },
  { field: 'callId', headerName: '콜아이디', flex: 1, minWidth: 220 },
  { field: 'workerIp', headerName: '접속IP', width: 165, minWidth: 140 },
];

const TERM_OPTIONS = [
  { value: 'T_0', label: '당일' },
  { value: 'W_1', label: '1주일' },
  { value: 'W_2', label: '2주일' },
  { value: 'M_1', label: '1개월' },
];

const INITIAL_VALUES = {
  startDate: dayjs(),
  endDate: dayjs(),
  startTime: dayjs('00:00:00', 'HH:mm:ss'),
  endTime: dayjs('23:59:59', 'HH:mm:ss'),
  termUnit: 'T_0',
};

const PAGE_SIZE_OPTIONS = [15, 20, 30, 40, 50];

export default function RecLogList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [form] = Form.useForm();
  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<RecLogItem>>(null);
  const reasonTypeModalRef = useRef<RecReasonTypeModalRef>(null);
  const [searchParams, setSearchParams] = useState<RecLogSearchParams | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  const { data: tenantsData } = useGetTenants();
  const tenantOptions = Array.isArray(tenantsData) ? tenantsData.map((t) => ({ value: t.tenantId, label: t.tenantName })) : [];

  useEffect(() => {
    if (tenantsData && tenantsData.length > 0 && !form.getFieldValue('tenantId')) {
      form.setFieldsValue({ tenantId: tenantsData[0].tenantId });
    }
  }, [tenantsData, form]);

  const handleValuesChange = (changedValues: Record<string, unknown>) => {
    if ('termUnit' in changedValues) {
      const today = dayjs();
      let start = today;
      switch (changedValues.termUnit) {
        case 'W_1':
          start = today.subtract(7, 'day');
          break;
        case 'W_2':
          start = today.subtract(14, 'day');
          break;
        case 'M_1':
          start = today.subtract(1, 'month');
          break;
        default:
          break;
      }
      form.setFieldsValue({ startDate: start, endDate: today });
    }
  };

  const { data, isFetching } = useGetRecLogs({
    params: searchParams ? { ...searchParams, page, size: pageSize } : undefined,
  });

  // 사용자가 [조회] 버튼을 눌러 발생한 검색에 한해서만 "결과 없음" 알림 표시.
  const searchTriggeredRef = useRef(false);
  useEffect(() => {
    if (!searchTriggeredRef.current) return;
    if (isFetching) return;
    if (data && (data.total ?? 0) === 0) {
      toast.info('조회 결과가 없습니다.');
    }
    searchTriggeredRef.current = false;
  }, [data, isFetching]);

  const handleSearch = () => {
    form
      .validateFields()
      .then((values) => {
        const startDate = values.startDate as Dayjs;
        const endDate = values.endDate as Dayjs;
        const startTimeVal = values.startTime as Dayjs | undefined;
        const endTimeVal = values.endTime as Dayjs | undefined;

        setPage(0);
        searchTriggeredRef.current = true;
        setSearchParams({
          tenantId: values.tenantId as string,
          startDate: startDate.format('YYYYMMDD'),
          startTime: startTimeVal?.format('HHmmss') ?? '000000',
          endDate: endDate.format('YYYYMMDD'),
          endTime: endTimeVal?.format('HHmmss') ?? '235959',
          findWorkerId: (values.findWorkerId as string) || undefined,
          findWorkerNm: (values.findWorkerNm as string) || undefined,
          findUserId: (values.findUserId as string) || undefined,
          findUserNm: (values.findUserNm as string) || undefined,
          findCustTel: (values.findCustTel as string) || undefined,
          findCallId: (values.findCallId as string) || undefined,
          findRealtimeFlag: (values.findRealtimeFlag as string) || undefined,
        });
      })
      .catch(() => {
        // 유효성 실패 시 Ant Design 인라인 메시지로 처리
      });
  };

  const handleReset = () => {
    form.resetFields();
    setSearchParams(null);
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 검색 조건 */}
      <div
        className="bg-white bt-shadow px-7 py-5"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSearch();
        }}
      >
        <Form
          form={form}
          layout="horizontal"
          labelAlign="left"
          colon={false}
          labelCol={{ style: { width: '64px', flexShrink: 0, display: 'flex', alignItems: 'center' } }}
          initialValues={INITIAL_VALUES}
          onValuesChange={handleValuesChange}
        >
          <div className="grid grid-cols-6 gap-x-6 gap-y-2">
            {/* Row 1: 테넌트 */}
            <Form.Item name="tenantId" label="테넌트" style={FORM_ITEM_STYLE}>
              <Select placeholder="테넌트 선택" options={tenantOptions} showSearch optionFilterProp="label" />
            </Form.Item>
            <div className="col-span-5" />

            {/* Row 2: 매니저 + 상담원 */}
            <Form.Item name="findWorkerId" label="매니저ID" style={FORM_ITEM_STYLE}>
              <Input placeholder="매니저 ID" />
            </Form.Item>
            <Form.Item name="findWorkerNm" label="매니저명" style={FORM_ITEM_STYLE}>
              <Input placeholder="매니저명" />
            </Form.Item>
            <Form.Item name="findUserId" label="상담원ID" style={FORM_ITEM_STYLE}>
              <Input placeholder="상담원 ID" />
            </Form.Item>
            <Form.Item name="findUserNm" label="상담원명" style={FORM_ITEM_STYLE}>
              <Input placeholder="상담원명" />
            </Form.Item>
            <div className="col-span-2" />

            {/* Row 3: 전화번호, 콜ID, 청취구분 */}
            <Form.Item name="findCustTel" label="전화번호" style={FORM_ITEM_STYLE}>
              <Input placeholder="전화번호" />
            </Form.Item>
            <Form.Item name="findCallId" label="콜아이디" style={FORM_ITEM_STYLE} className="col-span-2">
              <Input placeholder="콜 ID" />
            </Form.Item>
            <Form.Item name="findRealtimeFlag" label="청취구분" style={FORM_ITEM_STYLE}>
              <Select placeholder="전체" allowClear>
                {Object.entries(REALTIME_FLAG_LABELS).map(([value, label]) => (
                  <Select.Option key={value} value={value}>
                    {label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <div className="col-span-2" />

            {/* Row 4: 날짜 범위 + 버튼 */}
            <div className="col-span-6 flex items-center gap-1 mt-1 flex-wrap">
              <span style={{ width: '60px', flexShrink: 0 }} className="text-sm whitespace-nowrap">
                조회일자
              </span>
              <Form.Item name="startDate" noStyle rules={[{ required: true, message: '시작일을 선택하세요' }]}>
                <DatePicker format="YYYY-MM-DD" placeholder="시작일" style={{ width: 140 }} allowClear={false} />
              </Form.Item>
              <Form.Item name="startTime" noStyle>
                <TimePicker format="HH:mm:ss" style={{ width: 110 }} allowClear={false} />
              </Form.Item>
              <span className="text-gray-400 px-[18px]">~</span>
              <Form.Item name="endDate" noStyle rules={[{ required: true, message: '종료일을 선택하세요' }]}>
                <DatePicker format="YYYY-MM-DD" placeholder="종료일" style={{ width: 140 }} allowClear={false} />
              </Form.Item>
              <Form.Item name="endTime" noStyle>
                <TimePicker format="HH:mm:ss" style={{ width: 110 }} allowClear={false} />
              </Form.Item>
              <Form.Item name="termUnit" noStyle>
                <Select style={{ width: 80 }} options={TERM_OPTIONS} />
              </Form.Item>
              <div className="flex-1" />
            </div>
          </div>
        </Form>
      </div>

      {/* 툴바 */}
      <div className="bg-white bt-shadow px-7 py-3 flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>총 {(data?.total ?? 0).toLocaleString()}건</span>
          <Select
            size="small"
            value={pageSize}
            style={{ width: 70 }}
            options={PAGE_SIZE_OPTIONS.map((n) => ({ value: n, label: `${n}개` }))}
            onChange={(v) => {
              setPageSize(v);
              setPage(0);
            }}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button style={{ backgroundColor: '#ed8f14', borderColor: '#ed8f14', color: '#fff' }} onClick={handleSearch} loading={isFetching}>
            조회
          </Button>
          <Button type="primary" onClick={() => reasonTypeModalRef.current?.open()}>
            사유분류등록
          </Button>
          <Button onClick={handleReset}>초기화</Button>
          <Button
            onClick={() => {
              if (!searchParams) {
                toast.warning('먼저 조회를 실행하세요.');
                return;
              }
              recLogApi.exportExcel(searchParams);
            }}
          >
            Excel Export
          </Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex flex-col flex-1 bg-white bt-shadow overflow-hidden">
        {isFetching ? (
          <FallbackSpinner />
        ) : (
          <>
            <div className="flex-1 min-h-0 [&_.ag-header-cell-label]:justify-center">
              <AgGridReact<RecLogItem>
                ref={gridRef}
                rowData={data?.items ?? []}
                columnDefs={columnDefs}
                defaultColDef={{ ...(gridOptions.defaultColDef as ColDef<RecLogItem>), flex: undefined, cellStyle: { textAlign: 'center', fontVariantNumeric: 'tabular-nums' } }}
                gridOptions={gridOptions}
                pagination={false}
                statusBar={{ statusPanels: [] }}
                loading={isFetching}
              />
            </div>
            <div className="flex justify-center items-center px-4 py-3">
              <Pagination current={page + 1} pageSize={pageSize} total={data?.total ?? 0} showSizeChanger={false} onChange={(p) => setPage(p - 1)} />
            </div>
          </>
        )}
      </div>

      <RecReasonTypeModal ref={reasonTypeModalRef} />
    </div>
  );
}
