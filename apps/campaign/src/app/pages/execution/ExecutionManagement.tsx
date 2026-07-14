import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Checkbox, DatePicker, Divider, Input, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { fuzzyFilter, toast } from '@/shared-util';
import ExecutionCard from '../../features/execution/execution-management/components/ExecutionCard';
import {
  EXECUTION_BATCH_CHANGE_OPTIONS,
  EXECUTION_CARD_SCROLL_STEP,
  EXECUTION_DETAIL_SEARCH_CONDITION_OPTIONS,
  EXECUTION_MONITORING_MODE_OPTIONS,
  EXECUTION_PROCESS_STATUS_FILTER_OPTIONS,
  EXECUTION_PROCESS_STATUS_FILTER_STATUS_MAP,
  EXECUTION_PROGRESS_ROUND_OPTIONS,
  EXECUTION_TARGET_STATUS_FILTER_OPTIONS,
} from '../../features/execution/execution-management/constants/executionManagementConstants';
import { createExecutionTargetColumnDefs, getDetailSearchFieldText } from '../../features/execution/execution-management/constants/executionManagementGridColumns';
import { MOCK_CAMPAIGN_EXECUTIONS, MOCK_EXECUTION_TARGETS } from '../../features/execution/execution-management/constants/executionManagementMockData';
import {
  EXECUTION_MONITORING_MODE,
  EXECUTION_PROCESS_STATUS_FILTER,
  type ExecutionBatchChangeAction,
  type ExecutionDetailSearchCondition,
  type ExecutionMonitoringMode,
  type ExecutionProcessStatusFilter,
  type ExecutionTargetItem,
  type ExecutionTargetStatus,
} from '../../features/execution/execution-management/types';
import { useGetCampaignOptionList, useGetTenantOptionList } from '../../features/statistics/hooks/useCampaignStatisticsQueries';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '실행', path: '/campaign/execution' },
  { title: '캠페인 실행관리', path: '/campaign/execution/execution-management' },
];

const EXECUTION_MANAGEMENT_TENANT_STORAGE_KEY = 'campaign-execution-management:tenant-ids';
const EXECUTION_MANAGEMENT_CAMPAIGN_STORAGE_KEY = 'campaign-execution-management:campaign-selections';
const EXECUTION_MANAGEMENT_SCENARIO_STORAGE_KEY = 'campaign-execution-management:scenario-selections';

const EXECUTION_TARGET_GRID_HEIGHT = 400;

type AppliedFilters = {
  tenantIds: string[];
  campaignSelections: string[];
  scenarioSelections: string[];
  monitoringMode: ExecutionMonitoringMode;
  executionDateRange: { start: string; end: string } | null;
  progressRounds: number[];
  processStatusFilters: ExecutionProcessStatusFilter[];
  onlyWithTargets: boolean;
};

const EMPTY_APPLIED_FILTERS: AppliedFilters = {
  tenantIds: [],
  campaignSelections: [],
  scenarioSelections: [],
  monitoringMode: EXECUTION_MONITORING_MODE.MANUAL,
  executionDateRange: null,
  progressRounds: [],
  processStatusFilters: [],
  onlyWithTargets: false,
};

type AppliedDetailFilters = {
  processStatus: ExecutionTargetStatus | null;
  searchCondition: ExecutionDetailSearchCondition | null;
  searchKeyword: string;
};

const EMPTY_APPLIED_DETAIL_FILTERS: AppliedDetailFilters = {
  processStatus: null,
  searchCondition: null,
  searchKeyword: '',
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

function toScenarioOptionValue(tenantId: string | number, campaignId: string, campaignListId: string | number) {
  return `L:${tenantId}:${campaignId}:${campaignListId}`;
}

function parseScenarioListIds(selections: string[]): string[] {
  const campaignListIds: string[] = [];
  const seen = new Set<string>();
  for (const v of selections) {
    if (!v.startsWith('L:')) continue;
    const parts = v.split(':');
    if (parts.length < 4) continue;
    const listId = parts[parts.length - 1];
    if (seen.has(listId)) continue;
    seen.add(listId);
    campaignListIds.push(listId);
  }
  return campaignListIds;
}

function isAllOptionsSelected<T>(selected: T[], options: { value: T }[]) {
  if (options.length === 0) return false;
  const selectedSet = new Set(selected);
  return options.every((o) => selectedSet.has(o.value));
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

export default function ExecutionManagement() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { gridOptions } = useAggridOptions();
  const isInitialTenantHydrationDone = useRef(false);
  const cardScrollRef = useRef<HTMLDivElement>(null);

  const [tenantIds, setTenantIds] = useState<string[]>(() => loadStoredStringArray(EXECUTION_MANAGEMENT_TENANT_STORAGE_KEY));
  const [campaignSelections, setCampaignSelections] = useState<string[]>(() => loadStoredStringArray(EXECUTION_MANAGEMENT_CAMPAIGN_STORAGE_KEY).filter((v) => v.startsWith('C:')));
  const [scenarioSelections, setScenarioSelections] = useState<string[]>(() => {
    const fromScenarioKey = loadStoredStringArray(EXECUTION_MANAGEMENT_SCENARIO_STORAGE_KEY);
    if (fromScenarioKey.length > 0) return fromScenarioKey;
    return loadStoredStringArray(EXECUTION_MANAGEMENT_CAMPAIGN_STORAGE_KEY).filter((v) => v.startsWith('L:'));
  });
  const [monitoringMode, setMonitoringMode] = useState<ExecutionMonitoringMode>(EXECUTION_MONITORING_MODE.MANUAL);
  const [executionDateRange, setExecutionDateRange] = useState<[Dayjs | null, Dayjs | null] | null>([dayjs('2026-05-01'), dayjs('2026-05-23')]);
  const [progressRounds, setProgressRounds] = useState<number[]>(EXECUTION_PROGRESS_ROUND_OPTIONS.map((o) => o.value));
  const [processStatusFilters, setProcessStatusFilters] = useState<ExecutionProcessStatusFilter[]>(EXECUTION_PROCESS_STATUS_FILTER_OPTIONS.map((o) => o.value));
  const [onlyWithTargets, setOnlyWithTargets] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    ...EMPTY_APPLIED_FILTERS,
    executionDateRange: { start: '2026-05-01', end: '2026-05-23' },
    progressRounds: EXECUTION_PROGRESS_ROUND_OPTIONS.map((o) => o.value),
    processStatusFilters: EXECUTION_PROCESS_STATUS_FILTER_OPTIONS.map((o) => o.value),
  });

  const executionList = MOCK_CAMPAIGN_EXECUTIONS;
  const executionTargets = MOCK_EXECUTION_TARGETS;
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>('exec-001');
  const [checkedExecutionIds, setCheckedExecutionIds] = useState<string[]>([]);
  const [checkedTargetIds, setCheckedTargetIds] = useState<string[]>([]);

  const [detailProcessStatus, setDetailProcessStatus] = useState<ExecutionTargetStatus | null>(null);
  const [detailSearchCondition, setDetailSearchCondition] = useState<ExecutionDetailSearchCondition | null>(null);
  const [detailSearchKeyword, setDetailSearchKeyword] = useState('');
  const [batchChangeAction, setBatchChangeAction] = useState<ExecutionBatchChangeAction | null>(null);
  const [appliedDetailFilters, setAppliedDetailFilters] = useState<AppliedDetailFilters>(EMPTY_APPLIED_DETAIL_FILTERS);
  const [inquiryTime, setInquiryTime] = useState(dayjs().format('HH:mm:ss'));

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

  const scenarioSelectOptions = useMemo(() => {
    const selectedCampaigns = new Set(campaignSelections);
    const seen = new Set<string>();
    const options: { label: string; value: string }[] = [];
    for (const c of campaignOptionList ?? []) {
      if (c.campaignListId == null || String(c.campaignListId).length === 0) continue;
      const tenantId = String(c.tenantId ?? '');
      const campaignKey = `C:${tenantId}:${c.campaignId}`;
      if (!selectedCampaigns.has(campaignKey)) continue;
      const value = toScenarioOptionValue(tenantId, c.campaignId, c.campaignListId);
      if (seen.has(value)) continue;
      seen.add(value);
      const listLabel = c.campaignListName?.trim() ? c.campaignListName : String(c.campaignListId);
      options.push({ label: listLabel, value });
    }
    return options;
  }, [campaignOptionList, campaignSelections]);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  useEffect(() => {
    if (!isInitialTenantHydrationDone.current) {
      isInitialTenantHydrationDone.current = true;
      return;
    }
    setCampaignSelections([]);
    setScenarioSelections([]);
  }, [tenantIds]);

  useEffect(() => {
    if (!campaignOptionList) return;

    const validValues = new Set(scenarioSelectOptions.map((o) => o.value));
    setScenarioSelections((prev) => {
      const next: string[] = [];
      for (const v of prev) {
        if (validValues.has(v)) {
          next.push(v);
          continue;
        }
        if (!v.startsWith('L:')) continue;
        const parts = v.split(':');
        if (parts.length !== 3) continue;
        const listId = parts[2];
        const legacyMatch = scenarioSelectOptions.find((o) => o.value.endsWith(`:${listId}`));
        if (legacyMatch) next.push(legacyMatch.value);
      }
      return [...new Set(next)];
    });
  }, [campaignOptionList, scenarioSelectOptions]);

  useEffect(() => {
    localStorage.setItem(EXECUTION_MANAGEMENT_TENANT_STORAGE_KEY, JSON.stringify(tenantIds));
  }, [tenantIds]);

  useEffect(() => {
    localStorage.setItem(EXECUTION_MANAGEMENT_CAMPAIGN_STORAGE_KEY, JSON.stringify(campaignSelections));
  }, [campaignSelections]);

  useEffect(() => {
    localStorage.setItem(EXECUTION_MANAGEMENT_SCENARIO_STORAGE_KEY, JSON.stringify(scenarioSelections));
  }, [scenarioSelections]);

  const filteredExecutions = useMemo(() => {
    let items = executionList;

    if (appliedFilters.tenantIds.length > 0) {
      items = items.filter((item) => appliedFilters.tenantIds.includes(item.tenantId));
    }

    const campaignIds = parseCampaignIds(appliedFilters.campaignSelections);
    if (campaignIds.length > 0) {
      items = items.filter((item) => campaignIds.includes(item.campaignId));
    }

    const scenarioListIds = parseScenarioListIds(appliedFilters.scenarioSelections);
    const allScenariosSelected = isAllOptionsSelected(appliedFilters.scenarioSelections, scenarioSelectOptions);
    if (scenarioListIds.length > 0 && !allScenariosSelected) {
      items = items.filter((item) => scenarioListIds.includes(item.scenarioListId));
    }

    if (appliedFilters.executionDateRange) {
      const { start, end } = appliedFilters.executionDateRange;
      items = items.filter((item) => item.executionDate >= start && item.executionDate <= end);
    }

    const allRoundsSelected = isAllOptionsSelected(appliedFilters.progressRounds, EXECUTION_PROGRESS_ROUND_OPTIONS);
    if (appliedFilters.progressRounds.length > 0 && !allRoundsSelected) {
      items = items.filter((item) => appliedFilters.progressRounds.includes(item.round));
    }

    const allStatusSelected = isAllOptionsSelected(appliedFilters.processStatusFilters, EXECUTION_PROCESS_STATUS_FILTER_OPTIONS);
    if (appliedFilters.processStatusFilters.length > 0 && !allStatusSelected) {
      items = items.filter((item) =>
        appliedFilters.processStatusFilters.some((filter) => {
          if (filter === EXECUTION_PROCESS_STATUS_FILTER.WAITING) return item.waitingCount > 0;
          const allowedStatuses = EXECUTION_PROCESS_STATUS_FILTER_STATUS_MAP[filter];
          return allowedStatuses.includes(item.status);
        }),
      );
    }

    if (appliedFilters.onlyWithTargets) {
      items = items.filter((item) => item.targetCount > 0);
    }

    return items;
  }, [appliedFilters, executionList, scenarioSelectOptions]);

  useEffect(() => {
    if (filteredExecutions.length === 0) {
      setSelectedExecutionId(null);
      return;
    }

    const stillExists = filteredExecutions.some((item) => item.executionId === selectedExecutionId);
    if (!stillExists) {
      setSelectedExecutionId(filteredExecutions[0].executionId);
    }
  }, [filteredExecutions, selectedExecutionId]);

  useEffect(() => {
    const validIds = new Set(filteredExecutions.map((item) => item.executionId));
    setCheckedExecutionIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [filteredExecutions]);

  const allExecutionsChecked = filteredExecutions.length > 0 && filteredExecutions.every((item) => checkedExecutionIds.includes(item.executionId));
  const someExecutionsChecked = checkedExecutionIds.length > 0 && !allExecutionsChecked;

  const targetColumnDefs = useMemo(
    () =>
      createExecutionTargetColumnDefs({
        onDetailClick: (targetId) => navigate(`/campaign/execution/execution-management/targets/${targetId}`),
      }),
    [navigate],
  );

  const baseTargetRowData = useMemo(() => {
    if (!selectedExecutionId) return [];
    return executionTargets.filter((item) => item.executionId === selectedExecutionId);
  }, [executionTargets, selectedExecutionId]);

  const targetRowData = useMemo(() => {
    let items = baseTargetRowData;

    if (appliedDetailFilters.processStatus) {
      items = items.filter((item) => item.processStatus === appliedDetailFilters.processStatus);
    }

    const keyword = appliedDetailFilters.searchKeyword.trim();
    if (!keyword) return items;

    const searchCondition = appliedDetailFilters.searchCondition;
    if (searchCondition) {
      return fuzzyFilter(keyword, items, (item) => getDetailSearchFieldText(item, searchCondition));
    }

    return fuzzyFilter(keyword, items, (item) => `${item.customerName} ${item.customerNumber} ${item.phoneNumber} ${item.callId ?? ''}`);
  }, [appliedDetailFilters, baseTargetRowData]);

  useEffect(() => {
    setCheckedTargetIds([]);
    setAppliedDetailFilters(EMPTY_APPLIED_DETAIL_FILTERS);
    setDetailProcessStatus(null);
    setDetailSearchCondition(null);
    setDetailSearchKeyword('');
    setBatchChangeAction(null);
    setInquiryTime(dayjs().format('HH:mm:ss'));
  }, [selectedExecutionId]);

  const handleSearch = () => {
    setAppliedFilters({
      tenantIds,
      campaignSelections,
      scenarioSelections,
      monitoringMode,
      executionDateRange:
        executionDateRange?.[0] && executionDateRange?.[1]
          ? {
              start: executionDateRange[0].format('YYYY-MM-DD'),
              end: executionDateRange[1].format('YYYY-MM-DD'),
            }
          : null,
      progressRounds,
      processStatusFilters,
      onlyWithTargets,
    });
    setInquiryTime(dayjs().format('HH:mm:ss'));
  };

  const handleCardSelect = (executionId: string) => {
    setSelectedExecutionId(executionId);
    document.getElementById(`exec-card-${executionId}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const handleStop = () => {
    if (checkedExecutionIds.length === 0) {
      toast.warning('중지할 실행 항목을 선택하세요.');
      return;
    }
    toast.info(`선택한 ${checkedExecutionIds.length}건의 실행을 중지 요청했습니다.`);
  };

  const handleProceed = () => {
    if (checkedExecutionIds.length === 0) {
      toast.warning('진행할 실행 항목을 선택하세요.');
      return;
    }
    toast.info(`선택한 ${checkedExecutionIds.length}건의 실행을 진행 요청했습니다.`);
  };

  const handleExcelDownload = () => {
    toast.info('엑셀 다운로드를 요청했습니다.');
  };

  const handleDetailSearch = () => {
    setAppliedDetailFilters({
      processStatus: detailProcessStatus,
      searchCondition: detailSearchCondition,
      searchKeyword: detailSearchKeyword,
    });
    setCheckedTargetIds([]);
    setInquiryTime(dayjs().format('HH:mm:ss'));
  };

  const handleBatchApply = () => {
    if (!batchChangeAction) {
      toast.warning('일괄변경 항목을 선택하세요.');
      return;
    }
    if (checkedTargetIds.length === 0) {
      toast.warning('일괄변경할 실행대상을 선택하세요.');
      return;
    }
    toast.info('선택한 실행대상에 일괄변경을 적용했습니다.');
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full shrink-0 flex-col gap-3 bg-white bt-shadow px-7 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-sm font-medium text-[#495057]">테넌트</span>
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
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
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
            <span className="shrink-0 text-sm font-medium text-[#495057]">캠페인</span>
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
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
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
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-sm font-medium text-[#495057]">시나리오</span>
            <Select
              mode="multiple"
              value={scenarioSelections}
              onChange={(value) => setScenarioSelections(value ?? [])}
              allowClear
              showSearch
              maxTagCount="responsive"
              options={scenarioSelectOptions}
              placeholder="시나리오를 선택하세요."
              optionFilterProp="label"
              style={{ width: '15rem' }}
              popupMatchSelectWidth={false}
              disabled={tenantIds.length === 0 || campaignSelections.length === 0}
              dropdownRender={(menu) => (
                <>
                  <div
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (scenarioSelections.length === scenarioSelectOptions.length) {
                        setScenarioSelections([]);
                      } else {
                        setScenarioSelections(scenarioSelectOptions.map((o) => o.value));
                      }
                    }}
                  >
                    <Checkbox
                      checked={scenarioSelections.length === scenarioSelectOptions.length && scenarioSelectOptions.length > 0}
                      indeterminate={scenarioSelections.length > 0 && scenarioSelections.length < scenarioSelectOptions.length}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-sm font-medium text-[#495057]">모니터링</span>
              <Select
                value={monitoringMode}
                onChange={setMonitoringMode}
                options={[...EXECUTION_MONITORING_MODE_OPTIONS]}
                style={{ width: '8rem' }}
                popupMatchSelectWidth={false}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-sm font-medium text-[#495057]">실행일자</span>
              <DatePicker.RangePicker
                value={executionDateRange}
                onChange={(dates) => setExecutionDateRange(dates)}
                format="YYYY-MM-DD"
                placeholder={['시작일', '종료일']}
                allowClear
                inputReadOnly
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-sm font-medium text-[#495057]">진행차수</span>
              <Select
                mode="multiple"
                value={progressRounds}
                onChange={(value) => setProgressRounds(value ?? [])}
                allowClear
                maxTagCount="responsive"
                options={EXECUTION_PROGRESS_ROUND_OPTIONS}
                placeholder="전체"
                style={{ width: '12rem' }}
                popupMatchSelectWidth={false}
                dropdownRender={(menu) => (
                  <>
                    <div
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (progressRounds.length === EXECUTION_PROGRESS_ROUND_OPTIONS.length) {
                          setProgressRounds([]);
                        } else {
                          setProgressRounds(EXECUTION_PROGRESS_ROUND_OPTIONS.map((o) => o.value));
                        }
                      }}
                    >
                      <Checkbox
                        checked={progressRounds.length === EXECUTION_PROGRESS_ROUND_OPTIONS.length}
                        indeterminate={progressRounds.length > 0 && progressRounds.length < EXECUTION_PROGRESS_ROUND_OPTIONS.length}
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
              <span className="shrink-0 text-sm font-medium text-[#495057]">처리상태</span>
              <Select
                mode="multiple"
                value={processStatusFilters}
                onChange={(value) => setProcessStatusFilters(value ?? [])}
                allowClear
                maxTagCount="responsive"
                options={[...EXECUTION_PROCESS_STATUS_FILTER_OPTIONS]}
                placeholder="전체"
                style={{ width: '12rem' }}
                popupMatchSelectWidth={false}
                dropdownRender={(menu) => (
                  <>
                    <div
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (processStatusFilters.length === EXECUTION_PROCESS_STATUS_FILTER_OPTIONS.length) {
                          setProcessStatusFilters([]);
                        } else {
                          setProcessStatusFilters(EXECUTION_PROCESS_STATUS_FILTER_OPTIONS.map((o) => o.value));
                        }
                      }}
                    >
                      <Checkbox
                        checked={processStatusFilters.length === EXECUTION_PROCESS_STATUS_FILTER_OPTIONS.length}
                        indeterminate={processStatusFilters.length > 0 && processStatusFilters.length < EXECUTION_PROCESS_STATUS_FILTER_OPTIONS.length}
                      />
                      <span className="text-sm">전체 선택</span>
                    </div>
                    <Divider style={{ margin: '4px 0' }} />
                    {menu}
                  </>
                )}
              />
            </div>
            <Checkbox checked={onlyWithTargets} onChange={(e) => setOnlyWithTargets(e.target.checked)}>
              대상존재만
            </Checkbox>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
              검색
            </Button>
            <Button onClick={handleStop}>중지</Button>
            <Button type="primary" onClick={handleProceed}>
              진행
            </Button>
            <Button icon={<Download className="size-4" />} onClick={handleExcelDownload}>
              엑셀 다운로드
            </Button>
          </div>
        </div>
      </div>

      <section className="bg-white bt-shadow p-5">
        <div className="mb-3 flex items-center gap-2">
          <Checkbox
            checked={allExecutionsChecked}
            indeterminate={someExecutionsChecked}
            disabled={filteredExecutions.length === 0}
            onChange={(e) => {
              if (e.target.checked) {
                setCheckedExecutionIds(filteredExecutions.map((item) => item.executionId));
              } else {
                setCheckedExecutionIds([]);
              }
            }}
          />
          <h3 className="text-sm font-semibold text-gray-800">캠페인 실행목록</h3>
          <span className="text-xs text-gray-400">({filteredExecutions.length})</span>
          {checkedExecutionIds.length > 0 && <span className="text-xs text-blue-600">{checkedExecutionIds.length}건 선택</span>}
        </div>
        {filteredExecutions.length === 0 ? (
          <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
            조건에 맞는 실행 항목이 없습니다.
          </div>
        ) : (
          <div className="relative flex w-full items-center gap-2">
            <Button
              type="text"
              icon={<ChevronLeft className="size-5" />}
              onClick={() => cardScrollRef.current?.scrollBy({ left: -EXECUTION_CARD_SCROLL_STEP, behavior: 'smooth' })}
              className="!h-8 !w-8 !shrink-0 !p-0"
              aria-label="이전 실행"
            />
            <div ref={cardScrollRef} className="flex flex-1 gap-3 overflow-x-auto px-1 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {filteredExecutions.map((item) => (
                <ExecutionCard
                  key={item.executionId}
                  item={item}
                  selected={selectedExecutionId === item.executionId}
                  checked={checkedExecutionIds.includes(item.executionId)}
                  onSelect={() => handleCardSelect(item.executionId)}
                  onCheckedChange={(checked) => {
                    setCheckedExecutionIds((prev) => (checked ? [...prev, item.executionId] : prev.filter((id) => id !== item.executionId)));
                  }}
                  onDetail={() => navigate(`/campaign/execution/execution-management/${item.executionId}`)}
                />
              ))}
            </div>
            <Button
              type="text"
              icon={<ChevronRight className="size-5" />}
              onClick={() => cardScrollRef.current?.scrollBy({ left: EXECUTION_CARD_SCROLL_STEP, behavior: 'smooth' })}
              className="!h-8 !w-8 !shrink-0 !p-0"
              aria-label="다음 실행"
            />
          </div>
        )}
      </section>

      <section className="bg-white bt-shadow p-5">
        <header className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 lg:flex-nowrap">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800">실행대상 목록</h3>
            {selectedExecutionId && <span className="text-xs text-gray-400">({targetRowData.length})</span>}
            <span className="text-xs text-gray-400">조회시간: {inquiryTime}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-sm font-medium text-[#495057]">처리상태</span>
              <Select
                value={detailProcessStatus ?? undefined}
                onChange={(value) => setDetailProcessStatus(value ?? null)}
                placeholder="전체"
                allowClear
                options={[...EXECUTION_TARGET_STATUS_FILTER_OPTIONS]}
                style={{ width: '12rem' }}
                popupMatchSelectWidth={false}
                disabled={!selectedExecutionId}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-sm font-medium text-[#495057]">조회조건</span>
              <Select
                value={detailSearchCondition ?? undefined}
                onChange={(value) => setDetailSearchCondition(value ?? null)}
                placeholder="전체"
                allowClear
                options={[...EXECUTION_DETAIL_SEARCH_CONDITION_OPTIONS]}
                style={{ width: '10rem' }}
                popupMatchSelectWidth={false}
                disabled={!selectedExecutionId}
              />
              <Input
                value={detailSearchKeyword}
                onChange={(e) => setDetailSearchKeyword(e.target.value)}
                onPressEnter={handleDetailSearch}
                placeholder="검색어를 입력하세요."
                prefix={<Search className="size-4 text-gray-400" />}
                allowClear
                style={{ width: '15rem' }}
                disabled={!selectedExecutionId}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="primary" icon={<Search className="size-4" />} onClick={handleDetailSearch} disabled={!selectedExecutionId}>
                검색
              </Button>
              <Select
                value={batchChangeAction ?? undefined}
                onChange={(value) => setBatchChangeAction(value ?? null)}
                placeholder="일괄변경"
                allowClear
                options={[...EXECUTION_BATCH_CHANGE_OPTIONS]}
                style={{ width: '8rem' }}
                popupMatchSelectWidth={false}
                disabled={!selectedExecutionId}
              />
              <Button color="orange" variant="solid" onClick={handleBatchApply} disabled={!selectedExecutionId}>
                적용
              </Button>
            </div>
          </div>
        </header>
        <div className="w-full" style={{ height: EXECUTION_TARGET_GRID_HEIGHT }}>
          <AgGridReact<ExecutionTargetItem>
            rowModelType="clientSide"
            rowData={targetRowData}
            getRowId={(params) => params.data.targetId}
            columnDefs={targetColumnDefs}
            gridOptions={{
              ...gridOptions,
              rowSelection: 'multiple',
              suppressRowClickSelection: true,
            }}
            onSelectionChanged={(event) => {
              const ids = event.api.getSelectedRows().map((row) => row.targetId);
              setCheckedTargetIds(ids);
            }}
          />
        </div>
      </section>
    </div>
  );
}
