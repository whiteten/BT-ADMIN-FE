import { useEffect, useMemo, useRef, useState } from 'react';
import type { CellStyle, ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Checkbox, DatePicker, Divider, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Download } from 'lucide-react';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetCampaignOptionList, useGetTenantOptionList } from '../../../features/statistics/hooks/useStatisticsQueries';
import type { AchievementResultStatListItem } from '../../../features/statistics/types/statistics.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/fca/statistics' },
  { title: '캠페인 통계', path: '/fca/statistics/campaign' },
  { title: '캠페인 성과결과 통계', path: '/fca/statistics/campaign/achievement-result' },
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

// 성공률/실패율 강조 스타일 (레거시 clsTransRateCol)
const accentCellStyle = (params: { node?: { rowPinned?: string | null } }): CellStyle => ({
  ...numberCellStyle(params),
  backgroundColor: '#ffe8e8',
});

// 퍼센트 포맷터 (null/0이면 빈값)
const percentFormatter = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return '';
  return `${value}%`;
};

// 평균통화시간 포맷터 (초 단위 가정)
const durationFormatter = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return '';
  const sec = Number(value);
  if (Number.isNaN(sec)) return String(value);
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default function AchievementResultStatistics() {
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
  const [tenantIds, setTenantIds] = useState<string[]>([]);
  const [campaignSelections, setCampaignSelections] = useState<string[]>([]);

  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<AchievementResultStatListItem>>(null);
  const [rowData, setRowData] = useState<AchievementResultStatListItem[]>([]);

  // disabledDate 함수
  const disabledDate = useMemo(() => createDisabledDate(), []);
  const disabledEndDate = useMemo(() => createEndDisabledDate(startDate, timeUnit), [startDate, timeUnit]);

  // 테넌트 옵션
  const { data: tenantOptionList } = useGetTenantOptionList();
  const tenantSelectOptions = useMemo(
    () => (tenantOptionList ?? []).filter((t) => Boolean(t?.tenantId && t?.tenantName)).map((t) => ({ label: String(t.tenantName), value: String(t.tenantId) })),
    [tenantOptionList],
  );

  // 캠페인 옵션 (선택된 테넌트 기준)
  const tenantIdNums = useMemo(() => tenantIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n)), [tenantIds]);
  const { data: campaignOptionList } = useGetCampaignOptionList({
    params: { tenantIds: tenantIdNums },
    queryOptions: { enabled: tenantIdNums.length > 0 },
  });
  const campaignSelectOptions = useMemo(
    () =>
      (campaignOptionList ?? []).map((c) => {
        const tid = String(c.tenantId ?? '');
        const hasList = c.campaignListId != null && String(c.campaignListId).length > 0;
        const value = hasList ? `L:${tid}:${c.campaignListId}` : `C:${tid}:${c.campaignId}`;
        const label = hasList ? `${c.campaignName} / ${c.campaignListName ?? ''}` : c.campaignName;
        return { label, value };
      }),
    [campaignOptionList],
  );

  // 테넌트 변경 시 캠페인 선택 초기화
  useEffect(() => {
    setCampaignSelections([]);
  }, [tenantIds]);

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

  // NOTE: 기존 구현은 캠페인 발신결과 통계 API(stat-campaign-call-result)에 의존했지만,
  // 해당 API는 제거되어 현재 화면은 조회/엑셀을 비활성화한다.
  const isLoading = false;
  const isExporting = false;
  const summaryRow: AchievementResultStatListItem[] = [];

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
    if (tenantIds.length === 0) {
      toast.warning('테넌트를 선택해주세요.');
      return;
    }

    if (campaignSelections.length === 0) {
      toast.warning('캠페인을 선택해주세요.');
      return;
    }

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

    setRowData([]);
    toast.warning('발신결과 통계(stat-campaign-call-result)가 제거되어 조회할 수 없습니다.');
  };

  const columnDefs: ColDef<AchievementResultStatListItem>[] = [
    { headerName: '설문완료 건수', field: 'surveyCompleteCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '부정답변 건수', field: 'negativeAnswerCnt', width: 120, cellStyle: numberCellStyle },
    { headerName: '성공률', field: 'successRatePct', width: 100, valueFormatter: percentFormatter, cellStyle: accentCellStyle },
    { headerName: '평균통화시간', field: 'avgCallDurationSec', width: 120, valueFormatter: durationFormatter, cellStyle: numberCellStyle },
  ];

  const { permissions } = useNavigationStore();
  const hasExcelPermission = permissions.includes('fca:stats-call-result:excel');

  const handleExcelDownload = async () => {
    if (!rowData?.length) {
      toast.warning('다운로드할 데이터가 없습니다.');
      return;
    }

    toast.warning('발신결과 통계(stat-campaign-call-result)가 제거되어 엑셀 다운로드를 할 수 없습니다.');
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
            <Divider orientation="vertical" className="!h-5 !m-0" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#495057] shrink-0">테넌트</span>
              <Select
                mode="multiple"
                value={tenantIds}
                onChange={(value) => setTenantIds(value ?? [])}
                allowClear
                showSearch
                maxTagCount="responsive"
                options={tenantSelectOptions}
                placeholder="테넌트를 선택하세요."
                optionFilterProp="label"
                style={{ width: '15rem' }}
                popupMatchSelectWidth={false}
                dropdownRender={(menu) => (
                  <>
                    <div
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (tenantIds.length === tenantSelectOptions.length) {
                          setTenantIds([]);
                        } else {
                          setTenantIds(tenantSelectOptions.map((o) => o.value));
                        }
                      }}
                    >
                      <Checkbox
                        checked={tenantIds.length === tenantSelectOptions.length && tenantSelectOptions.length > 0}
                        indeterminate={tenantIds.length > 0 && tenantIds.length < tenantSelectOptions.length}
                      />
                      <span className="text-sm">전체 선택</span>
                    </div>
                    <Divider style={{ margin: '4px 0' }} />
                    {menu}
                  </>
                )}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#495057] shrink-0">캠페인</span>
              <Select
                mode="multiple"
                value={campaignSelections}
                onChange={(value) => setCampaignSelections(value ?? [])}
                allowClear
                showSearch
                maxTagCount="responsive"
                options={campaignSelectOptions}
                placeholder="캠페인·시나리오를 선택하세요."
                optionFilterProp="label"
                style={{ width: '20rem' }}
                popupMatchSelectWidth={false}
                disabled={tenantIds.length === 0}
                dropdownRender={(menu) => (
                  <>
                    <div
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (campaignSelections.length === campaignSelectOptions.length) {
                          setCampaignSelections([]);
                        } else {
                          setCampaignSelections(campaignSelectOptions.map((o) => o.value));
                        }
                      }}
                    >
                      <Checkbox
                        checked={campaignSelections.length === campaignSelectOptions.length && campaignSelectOptions.length > 0}
                        indeterminate={campaignSelections.length > 0 && campaignSelections.length < campaignSelectOptions.length}
                      />
                      <span className="text-sm">전체 선택</span>
                    </div>
                    <Divider style={{ margin: '4px 0' }} />
                    {menu}
                  </>
                )}
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
          <AgGridReact<AchievementResultStatListItem>
            ref={gridRef}
            rowModelType="clientSide"
            rowData={rowData}
            getRowId={(params) =>
              `${params.data.tenantId ?? ''}_${params.data.campaignId ?? ''}_${params.data.campaignListId ?? ''}_${params.data.psrTimeKey ?? ''}_${params.data.seq ?? ''}`
            }
            columnDefs={columnDefs}
            gridOptions={{ ...gridOptions, statusBar: undefined }}
            loading={isLoading}
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
