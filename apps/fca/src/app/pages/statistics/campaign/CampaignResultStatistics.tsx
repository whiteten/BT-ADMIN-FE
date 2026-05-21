import { useEffect, useMemo, useRef, useState } from 'react';
import type { CellStyle, ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, DatePicker, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Download } from 'lucide-react';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { downloadBlob, extractFileName, toast } from '@/shared-util';
import { statisticsApi } from '../../../features/statistics/api/statisticsApi';
import { useGetCampaignResultStatList } from '../../../features/statistics/hooks/useStatisticsQueries';
import type { CampaignResultStatListItem } from '../../../features/statistics/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/fca/statistics' },
  { title: '캠페인 통계', path: '/fca/statistics/campaign' },
  { title: '캠페인 통계', path: '/fca/statistics/campaign/campaign-result' },
];

// timeUnit별 최대 검색 기간 (일 단위) — 레거시 IPR94S1310 기준
// 일별: 3개월, 월별: 6개월, 년별: 2년
const MAX_DATE_RANGE: Record<string, number> = {
  DD: 92,
  MM: 186,
  YY: 730,
};

const DATE_RANGE_LABEL: Record<string, string> = {
  DD: '3개월',
  MM: '6개월',
  YY: '2년',
};

const getMaxDays = (unit: string) => MAX_DATE_RANGE[unit] ?? 92;
const getPickerMode = (unit: string): 'date' | 'month' | 'year' => {
  if (unit === 'MM') return 'month';
  if (unit === 'YY') return 'year';
  return 'date';
};
const getDatePickerFormat = (unit: string): string => {
  if (unit === 'MM') return 'YYYY-MM';
  if (unit === 'YY') return 'YYYY';
  return 'YYYY-MM-DD';
};

const validateDateRange = (start: Dayjs, end: Dayjs, unit: string): boolean => {
  if (end.isBefore(start, 'day')) return false;
  return end.diff(start, 'day') <= getMaxDays(unit);
};

// 시작일 비활성화 함수 (미래 날짜)
const createDisabledDate = () => (current: Dayjs) => {
  if (!current) return false;
  return current.isAfter(dayjs(), 'day');
};

// 종료일 비활성화 함수 (미래 + 시작일 이전 + 최대범위 초과)
const createEndDisabledDate = (start: Dayjs | null, unit: string) => (current: Dayjs) => {
  if (!current) return false;
  if (current.isAfter(dayjs(), 'day')) return true;
  if (start) {
    if (current.isBefore(start, 'day')) return true;
    if (current.diff(start, 'day') > getMaxDays(unit)) return true;
  }
  return false;
};

// 셀 스타일 헬퍼
const numberCellStyle = (params: { node?: { rowPinned?: string | null } }): CellStyle =>
  params.node?.rowPinned === 'bottom'
    ? { display: 'flex', fontWeight: 'bold', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' }
    : { display: 'flex', fontWeight: 'normal', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' };

export default function CampaignResultStatistics() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // 검색 조건 상태
  const [timeUnit, setTimeUnit] = useState<string>('DD');
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(7, 'day').startOf('day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('day'));

  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<CampaignResultStatListItem>>(null);
  const [rowData, setRowData] = useState<CampaignResultStatListItem[]>([]);
  const [displayTimeUnit, setDisplayTimeUnit] = useState<string>('DD');

  // disabledDate 함수
  const disabledDate = useMemo(() => createDisabledDate(), []);
  const disabledEndDate = useMemo(() => createEndDisabledDate(startDate, timeUnit), [startDate, timeUnit]);

  // fromTime / toTime 계산 (UI state에서 직접 도출)
  const fromTime = (() => {
    if (!startDate) return '';
    if (timeUnit === 'DD') return startDate.format('YYYYMMDD');
    if (timeUnit === 'MM') return startDate.format('YYYYMM');
    return startDate.format('YYYY');
  })();

  const toTime = (() => {
    if (!endDate) return '';
    if (timeUnit === 'DD') return endDate.format('YYYYMMDD');
    if (timeUnit === 'MM') return endDate.format('YYYYMM');
    return endDate.format('YYYY');
  })();

  const campaignStatParams = useMemo(
    () => ({
      timeUnit,
      fromTime,
      toTime,
    }),
    [timeUnit, fromTime, toTime],
  );

  // 캠페인 통계 조회 (BFF: stat-campaign-result)
  const {
    data: campaignResultStatData,
    isLoading: isLoadingCampaignResultStatList,
    refetch,
  } = useGetCampaignResultStatList({
    params: campaignStatParams,
    queryOptions: { enabled: false },
  });

  useEffect(() => {
    if (campaignResultStatData !== undefined) setRowData(campaignResultStatData.items);
  }, [campaignResultStatData]);

  // BE에서 받은 summary에 '전체합계' 라벨 주입
  const summaryRow: CampaignResultStatListItem[] = campaignResultStatData?.summary ? [{ ...campaignResultStatData.summary, tenantName: '전체합계' }] : [];

  // startDate 또는 timeUnit 변경 시 endDate 자동 조정
  useEffect(() => {
    if (startDate && endDate) {
      const maxDays = getMaxDays(timeUnit);
      if (endDate.isBefore(startDate, 'day')) {
        setEndDate(startDate);
      } else if (endDate.diff(startDate, 'day') > maxDays) {
        const maxEnd = startDate.add(maxDays, 'day');
        setEndDate(maxEnd.isAfter(dayjs(), 'day') ? dayjs() : maxEnd);
      }
    }
  }, [endDate, startDate, timeUnit]);

  const handleSearch = () => {
    if (!startDate || !endDate) {
      toast.warning('검색일자를 선택해주세요.');
      return;
    }

    if (!validateDateRange(startDate, endDate, timeUnit)) {
      toast.warning(`검색 기간은 ${DATE_RANGE_LABEL[timeUnit]} 이내로 설정해주세요.`);
      return;
    }

    if (fromTime && toTime && fromTime > toTime) {
      toast.warning('시작일자가 종료일자보다 늦을 수 없습니다.');
      return;
    }

    setDisplayTimeUnit(timeUnit);
    refetch();
  };

  const columnDefs: ColDef<CampaignResultStatListItem>[] = [
    { headerName: '대상건수', field: 'totalTargetCnt', width: 100, cellStyle: numberCellStyle },
    { headerName: '발신진행건수(실시간)', field: 'outboundProgressCnt', width: 250, cellStyle: numberCellStyle },
    { headerName: '총발신시도건수(누적)', field: 'outboundAttemptCnt', width: 250, cellStyle: numberCellStyle },
    { headerName: '진행율', field: 'progressRatePct', width: 90, cellStyle: numberCellStyle, cellRenderer: 'percentBarRenderer' },
    { headerName: '재시도발신건수', field: 'retryOutboundCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '본인통화건수', field: 'selfCallCnt', width: 110, cellStyle: numberCellStyle },
    { headerName: '본인통화완료율', field: 'selfCallCompleteRatePct', width: 120, cellStyle: numberCellStyle, cellRenderer: 'percentBarRenderer' },
    { headerName: '실패건수', field: 'failCnt', width: 100, cellStyle: numberCellStyle },
    { headerName: '평균대화턴수', field: 'avgDialogTurnCnt', width: 110, cellStyle: numberCellStyle },
    { headerName: '부재건수', field: 'absentCnt', width: 100, cellStyle: numberCellStyle },
    {
      headerName: '발신시도별 동인통화 성공율',
      field: 'outboundAttemptSelfCallSuccessRatePct',
      width: 300,
      cellStyle: numberCellStyle,
      cellRenderer: 'percentBarRenderer',
    },
    { headerName: '검증실패율', field: 'verifyFailRatePct', width: 100, cellStyle: numberCellStyle, cellRenderer: 'percentBarRenderer' },
  ];

  const { permissions } = useNavigationStore();
  const hasExcelPermission = permissions.includes('fca:stats-campaign:excel');

  const [isExporting, setIsExporting] = useState(false);

  const handleExcelDownload = async () => {
    if (!rowData?.length) {
      toast.warning('다운로드할 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    try {
      const response = await statisticsApi.exportCampaignResultStatExcel({
        ...campaignStatParams,
        timeUnit: displayTimeUnit,
      });
      const fileName = extractFileName(response.headers['content-disposition'], `CAMPAIGN_RESULT_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
      downloadBlob(response.data, fileName);
    } catch {
      toast.error('엑셀 다운로드에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-start gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#495057] shrink-0">구분</span>
              <Select
                value={timeUnit}
                onChange={(v) => setTimeUnit(v)}
                options={[
                  { label: '일별', value: 'DD' },
                  { label: '월별', value: 'MM' },
                  { label: '년별', value: 'YY' },
                ]}
                className="!max-w-[110px] !min-w-[90px]"
                popupMatchSelectWidth={false}
              />
              <span className="text-sm font-medium text-[#495057] shrink-0">조회기간</span>
              <DatePicker
                value={startDate}
                onChange={(date) => setStartDate(date)}
                picker={getPickerMode(timeUnit)}
                format={getDatePickerFormat(timeUnit)}
                disabledDate={disabledDate}
                inputReadOnly
                allowClear={false}
              />
              <span className="text-sm font-medium text-[#495057] shrink-0">~</span>
              <DatePicker
                value={endDate}
                onChange={(date) => setEndDate(date)}
                picker={getPickerMode(timeUnit)}
                format={getDatePickerFormat(timeUnit)}
                disabledDate={disabledEndDate}
                inputReadOnly
                allowClear={false}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button type="primary" onClick={handleSearch}>
              조회
            </Button>
            {hasExcelPermission && (
              <Button color="cyan" variant="solid" loading={isExporting} icon={<Download className="size-4" />} onClick={handleExcelDownload}>
                Export
              </Button>
            )}
          </div>
        </header>
        <div className="w-full h-full">
          <AgGridReact<CampaignResultStatListItem>
            ref={gridRef}
            rowModelType="clientSide"
            rowData={rowData}
            getRowId={(params) => `${params.data.tenantId ?? ''}_${params.data.campaignId ?? ''}_${params.data.campaignListId ?? ''}_${params.data.psrTimeKey}_${params.data.seq}`}
            columnDefs={columnDefs}
            gridOptions={{ ...gridOptions, statusBar: undefined }}
            loading={isLoadingCampaignResultStatList}
            pagination={false}
            rowNumbers={false}
            sideBar={false}
            pinnedBottomRowData={summaryRow}
            rowClassRules={{
              '!bg-[#F8F9FA]': (params) => params.node.rowPinned === 'bottom',
            }}
          />
        </div>
      </div>
    </div>
  );
}
