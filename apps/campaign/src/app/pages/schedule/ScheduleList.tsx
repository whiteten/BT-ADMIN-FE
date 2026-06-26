import { useEffect, useMemo, useRef, useState } from 'react';
import { type BreadcrumbProps, Button, Checkbox, DatePicker, Divider, Input, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { fuzzyFilter, toast } from '@/shared-util';
import ScheduleListGrid from '../../features/schedule/components/ScheduleListGrid';
import { SCHEDULE_STATUS_FILTER_OPTIONS, SCHEDULE_TYPE_FILTER_OPTIONS, type ScheduleStatus, type ScheduleType } from '../../features/schedule/constants/scheduleConstants';
import { MOCK_SCHEDULE_LIST } from '../../features/schedule/constants/scheduleMockData';
import { useGetCampaignOptionList, useGetTenantOptionList } from '../../features/statistics/hooks/useCampaignStatisticsQueries';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '스케줄', path: '/campaign/schedule' },
  { title: '캠페인 스케줄 이력', path: '/campaign/schedule/schedule-list' },
];

const SCHEDULE_LIST_TENANT_STORAGE_KEY = 'campaign-schedule-list:tenant-ids';
const SCHEDULE_LIST_CAMPAIGN_STORAGE_KEY = 'campaign-schedule-list:campaign-selections';

type AppliedFilters = {
  tenantIds: string[];
  campaignSelections: string[];
  executionDateRange: { start: string; end: string } | null;
  scheduleName: string;
  scheduleTypeFilter: ScheduleType | null;
  scheduleStatusFilter: ScheduleStatus | null;
};

const DEFAULT_EXECUTION_DATE_RANGE: [Dayjs, Dayjs] = [dayjs().subtract(7, 'day').startOf('day'), dayjs().startOf('day')];

function toExecutionDateRangeFilter(dates: [Dayjs | null, Dayjs | null] | null): { start: string; end: string } | null {
  if (!dates?.[0] || !dates[1]) return null;
  return {
    start: dates[0].format('YYYY-MM-DD'),
    end: dates[1].format('YYYY-MM-DD'),
  };
}

const INITIAL_APPLIED_FILTERS: AppliedFilters = {
  tenantIds: [],
  campaignSelections: [],
  executionDateRange: toExecutionDateRangeFilter(DEFAULT_EXECUTION_DATE_RANGE),
  scheduleName: '',
  scheduleTypeFilter: null,
  scheduleStatusFilter: null,
};

function parseCampaignIds(selections: string[]): string[] {
  const campaignIds: string[] = [];
  for (const v of selections) {
    if (!v.startsWith('C:')) continue;
    const parts = v.split(':');
    if (parts.length >= 3) campaignIds.push(parts.slice(2).join(':'));
  }
  return campaignIds;
}

function loadStoredStringArray(key: string): string[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export default function ScheduleList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const isInitialTenantHydrationDone = useRef(false);
  const [tenantIds, setTenantIds] = useState<string[]>(() => loadStoredStringArray(SCHEDULE_LIST_TENANT_STORAGE_KEY));
  const [campaignSelections, setCampaignSelections] = useState<string[]>(() => loadStoredStringArray(SCHEDULE_LIST_CAMPAIGN_STORAGE_KEY).filter((v) => v.startsWith('C:')));
  const [executionDateRange, setExecutionDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(DEFAULT_EXECUTION_DATE_RANGE);
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<ScheduleType | null>(null);
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<ScheduleStatus | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(INITIAL_APPLIED_FILTERS);

  const { data: tenantOptionList } = useGetTenantOptionList();
  const tenantSelectOptions = useMemo(
    () => (tenantOptionList ?? []).filter((t) => Boolean(t?.tenantId && t?.tenantName)).map((t) => ({ label: String(t.tenantName), value: String(t.tenantId) })),
    [tenantOptionList],
  );

  const tenantIdNums = useMemo(() => tenantIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n)), [tenantIds]);
  const { data: campaignOptionList } = useGetCampaignOptionList({
    params: { tenantIds: tenantIdNums },
    queryOptions: { enabled: tenantIdNums.length > 0 },
  });
  const campaignSelectOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { label: string; value: string }[] = [];
    for (const c of campaignOptionList ?? []) {
      const tid = String(c.tenantId ?? '');
      const value = `C:${tid}:${c.campaignId}`;
      if (seen.has(value)) continue;
      seen.add(value);
      options.push({ label: c.campaignName, value });
    }
    return options;
  }, [campaignOptionList]);

  useEffect(() => {
    if (!isInitialTenantHydrationDone.current) {
      isInitialTenantHydrationDone.current = true;
      return;
    }
    setCampaignSelections([]);
  }, [tenantIds]);

  useEffect(() => {
    localStorage.setItem(SCHEDULE_LIST_TENANT_STORAGE_KEY, JSON.stringify(tenantIds));
  }, [tenantIds]);

  useEffect(() => {
    localStorage.setItem(SCHEDULE_LIST_CAMPAIGN_STORAGE_KEY, JSON.stringify(campaignSelections));
  }, [campaignSelections]);

  const filteredList = useMemo(() => {
    let items = MOCK_SCHEDULE_LIST;

    if (appliedFilters.tenantIds.length > 0) {
      items = items.filter((item) => appliedFilters.tenantIds.includes(item.tenantId));
    }

    const campaignIds = parseCampaignIds(appliedFilters.campaignSelections);
    if (campaignIds.length > 0) {
      items = items.filter((item) => campaignIds.includes(item.campaignId));
    }

    if (appliedFilters.executionDateRange) {
      const { start, end } = appliedFilters.executionDateRange;
      items = items.filter((item) => item.executionDate >= start && item.executionDate <= end);
    }

    if (appliedFilters.scheduleTypeFilter) {
      items = items.filter((item) => item.scheduleType === appliedFilters.scheduleTypeFilter);
    }

    if (appliedFilters.scheduleStatusFilter) {
      items = items.filter((item) => item.status === appliedFilters.scheduleStatusFilter);
    }

    const keyword = appliedFilters.scheduleName.trim();
    if (keyword) {
      items = fuzzyFilter(keyword, items, (item) => item.scheduleName);
    }

    return items;
  }, [appliedFilters]);

  const handleSearch = () => {
    if (tenantIds.length === 0) {
      toast.warning('테넌트를 선택해주세요.');
      return;
    }

    if (campaignSelections.length === 0) {
      toast.warning('캠페인을 선택해주세요.');
      return;
    }

    setAppliedFilters({
      tenantIds,
      campaignSelections,
      executionDateRange: toExecutionDateRangeFilter(executionDateRange),
      scheduleName,
      scheduleTypeFilter,
      scheduleStatusFilter,
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center gap-3 w-full bg-white bt-shadow px-7 py-5 flex-wrap">
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
            placeholder="캠페인을 선택하세요."
            optionFilterProp="label"
            style={{ width: '15rem' }}
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
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">실행일자</span>
              <DatePicker.RangePicker
                value={executionDateRange}
                onChange={(dates) => setExecutionDateRange(dates)}
                format="YYYY-MM-DD"
                placeholder={['시작일', '종료일']}
                allowClear
                inputReadOnly
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">스케줄명</span>
              <Input
                placeholder="스케줄명 검색"
                prefix={<Search className="w-4 h-4 text-gray-400" />}
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
                style={{ width: 220 }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">스케줄 구분</span>
              <Select
                value={scheduleTypeFilter ?? undefined}
                onChange={(value) => setScheduleTypeFilter(value ?? null)}
                placeholder="선택"
                allowClear
                options={[...SCHEDULE_TYPE_FILTER_OPTIONS]}
                className="!min-w-[120px]"
                popupMatchSelectWidth={false}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">스케줄 상태</span>
              <Select
                value={scheduleStatusFilter ?? undefined}
                onChange={(value) => setScheduleStatusFilter(value ?? null)}
                placeholder="선택"
                allowClear
                options={[...SCHEDULE_STATUS_FILTER_OPTIONS]}
                className="!min-w-[120px]"
                popupMatchSelectWidth={false}
              />
            </div>
          </div>
          <div className="flex items-center shrink-0">
            <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
              검색
            </Button>
          </div>
        </header>
        <div className="w-full h-full">
          <ScheduleListGrid rowData={filteredList} />
        </div>
      </div>
    </div>
  );
}
