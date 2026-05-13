/**
 * 로그인 이력 탭
 * - 사용자의 로그인 시도 기록 조회
 * - DatePicker로 기간 조정 (기본 7일, 최대 90일)
 * - ag-Grid 사용 (프로젝트 표준)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBreadcrumbStore } from '@/shared-store';
import { useNavigate, useParams } from 'react-router-dom';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Col, DatePicker, Row, Tag, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useSearchLoginLogs } from '../../../features/user/hooks/useLoginAuditLogQueries';
import { FAILURE_REASON_LABELS, LOGIN_RESULT_LABELS, type LoginAuditLog } from '../../../features/user/types/loginAuditLog.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const { RangePicker } = DatePicker;

/**
 * 로그인 결과 색상 (Antd Tag용)
 */
const LOGIN_RESULT_TAG_COLORS: Record<string, string> = {
  SUCCESS: 'green',
  FAILURE: 'red',
  LOCKED: 'orange',
};

/** 최대 조회 기간 (일) - 3개월 */
const MAX_SEARCH_DAYS = 90;

export default function UserLoginHistoryTab() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const numericUserId = userId ? Number(userId) : undefined;
  const { gridOptions } = useAggridOptions();

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);

  // 로그인 이력 조회
  const { data, isLoading, refetch } = useSearchLoginLogs({
    params: {
      userId: numericUserId,
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
      size: 9999,
    },
    queryOptions: {
      enabled: !!numericUserId,
    },
  });

  const rowData = useMemo(() => data?.items ?? [], [data]);

  // ag-Grid 컬럼 정의
  const columnDefs: ColDef<LoginAuditLog>[] = useMemo(
    () => [
      {
        headerName: '일시',
        field: 'createdAt',
        width: 170,
        valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        headerName: '결과',
        field: 'result',
        width: 90,
        cellRenderer: (params: ICellRendererParams<LoginAuditLog>) => {
          const value = params.value as string;
          if (!value) return '-';
          return <Tag color={LOGIN_RESULT_TAG_COLORS[value] ?? 'default'}>{LOGIN_RESULT_LABELS[value as keyof typeof LOGIN_RESULT_LABELS] ?? value}</Tag>;
        },
      },
      {
        headerName: '실패사유',
        field: 'failureReason',
        width: 130,
        valueFormatter: (params) => (params.value ? (FAILURE_REASON_LABELS[params.value as keyof typeof FAILURE_REASON_LABELS] ?? params.value) : '-'),
      },
      {
        headerName: 'IP 주소',
        field: 'clientIp',
        flex: 1,
      },
    ],
    [],
  );

  // 기간 변경 시 데이터 다시 조회 (최대 90일 제한)
  const handleDateRangeChange = useCallback((dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates?.[0] && dates?.[1]) {
      const daysDiff = dates[1].diff(dates[0], 'day');
      if (daysDiff > MAX_SEARCH_DAYS) {
        message.warning(`조회 기간은 최대 ${MAX_SEARCH_DAYS}일(약 3개월)을 초과할 수 없습니다.`);
        return;
      }
      const newRange: [Dayjs, Dayjs] = [dates[0], dates[1]];
      setDateRange(newRange);
    }
  }, []);

  // RangePicker에서 날짜 비활성화 (미래 날짜 및 90일 초과)
  const disabledDate = useCallback((current: Dayjs, info: { from?: Dayjs }) => {
    // 미래 날짜 비활성화
    if (current > dayjs().endOf('day')) {
      return true;
    }
    // 시작일이 선택된 경우, 시작일로부터 90일 이후 비활성화
    if (info.from) {
      const maxDate = info.from.add(MAX_SEARCH_DAYS, 'day');
      return current > maxDate;
    }
    return false;
  }, []);

  // dateRange 변경 시 refetch
  useEffect(() => {
    if (numericUserId) {
      refetch();
    }
  }, [dateRange, numericUserId, refetch]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 기간 선택 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600 shrink-0">조회기간</span>
        <RangePicker value={dateRange} onChange={handleDateRangeChange} disabledDate={disabledDate} inputReadOnly allowClear={false} style={{ width: 280 }} />
        <span className="text-xs text-gray-400">최대 90일</span>
      </div>

      {/* 데이터 그리드 (ag-Grid) */}
      <div className="flex-1 min-h-0">
        <AgGridReact<LoginAuditLog> rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isLoading} />
      </div>

      {/* 버튼 */}
      <Row gutter={20} justify="center" className="shrink-0 bg-white z-10 py-3 border-t border-gray-100">
        <Col>
          <Button variant="solid" onClick={() => navigate('../list')}>
            취소
          </Button>
        </Col>
      </Row>
    </div>
  );
}
