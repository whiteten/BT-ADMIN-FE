import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Checkbox, DatePicker, Divider, Input, Select, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { ChevronLeft, ChevronRight, Download, Plus, Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { fuzzyFilter, toast } from '@/shared-util';
import {
  RECEIVE_FILE_DETAIL_SEARCH_CONDITION,
  RECEIVE_FILE_DETAIL_SEARCH_CONDITION_OPTIONS,
  RECEIVE_FILE_RECEIVE_STATE_FILTER_OPTIONS,
  RECEIVE_FILE_RECEIVE_STATE_FILTER_STATUS_MAP,
  RECEIVE_FILE_STATUS_COLORS,
  RECEIVE_FILE_STATUS_LABELS,
  type ReceiveFileDetailSearchCondition,
  type ReceiveFileReceiveStateFilter,
} from '../../features/execution/receive-file/constants/receiveFileListConstants';
import { MOCK_RECEIVE_FILE_DETAILS, MOCK_RECEIVE_FILE_SUMMARIES } from '../../features/execution/receive-file/constants/receiveFileListMockData';
import type { ReceiveFileDetailItem, ReceiveFileStatus, ReceiveFileSummary } from '../../features/execution/receive-file/types';
import { useGetCampaignOptionList, useGetTenantOptionList } from '../../features/statistics/hooks/useCampaignStatisticsQueries';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '실행' }, { title: '수신파일', path: '/campaign/execution/receive-file' }];

const RECEIVE_FILE_TENANT_STORAGE_KEY = 'campaign-receive-file:tenant-ids';
const RECEIVE_FILE_CAMPAIGN_STORAGE_KEY = 'campaign-receive-file:campaign-selections';
const RECEIVE_FILE_SCENARIO_STORAGE_KEY = 'campaign-receive-file:scenario-selections';

/** 수신대상목록 AG-Grid 고정 높이 — 화면 크기와 무관하게 리스트 영역 유지, 작은 화면은 페이지 스크롤 */
const RECEIVE_TARGET_GRID_HEIGHT = 400;

/** 수신파일 카드 1장 너비(260px) + gap(12px) — 좌우 화살표 스크롤 간격 */
const RECEIVE_FILE_CARD_SCROLL_STEP = 272;

type AppliedFilters = {
  tenantIds: string[];
  campaignSelections: string[];
  scenarioSelections: string[];
  receiveStateFilter: ReceiveFileReceiveStateFilter | null;
  receivedDateRange: { start: string; end: string } | null;
};

const EMPTY_APPLIED_FILTERS: AppliedFilters = {
  tenantIds: [],
  campaignSelections: [],
  scenarioSelections: [],
  receiveStateFilter: null,
  receivedDateRange: null,
};

type AppliedDetailFilters = {
  searchCondition: ReceiveFileDetailSearchCondition | null;
  searchKeyword: string;
};

const EMPTY_APPLIED_DETAIL_FILTERS: AppliedDetailFilters = {
  searchCondition: null,
  searchKeyword: '',
};

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');
const formatNumber = (value?: number) => (value != null ? value.toLocaleString() : '-');

const EXTRA_INFO_COLUMN_COUNT = 12;

const receiveTargetColumnDefs: ColDef<ReceiveFileDetailItem>[] = [
  { headerName: '고객명', field: 'customerName', flex: 1, minWidth: 100 },
  { headerName: '휴대전화', field: 'mobilePhone', flex: 1.1, minWidth: 120 },
  { headerName: '고객번호', field: 'customerNumber', flex: 1.1, minWidth: 120 },
  ...Array.from({ length: EXTRA_INFO_COLUMN_COUNT }, (_, index) => ({
    headerName: `부가정보${index + 1}`,
    field: `extraInfo${index + 1}` as keyof ReceiveFileDetailItem,
    flex: 1,
    minWidth: 100,
    valueFormatter: ({ value }: { value?: string }) => value ?? '-',
  })),
  {
    headerName: '작업일시',
    field: 'workDateTime',
    flex: 1.2,
    minWidth: 160,
    valueFormatter: ({ value }) => formatDateTime(value as string),
  },
];

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

function isAllOptionsSelected(selected: string[], options: { value: string }[]) {
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

function getDetailSearchFieldText(item: ReceiveFileDetailItem, condition: ReceiveFileDetailSearchCondition): string {
  switch (condition) {
    case RECEIVE_FILE_DETAIL_SEARCH_CONDITION.CUSTOMER_NAME:
      return item.customerName;
    case RECEIVE_FILE_DETAIL_SEARCH_CONDITION.CUSTOMER_NUMBER:
      return item.customerNumber;
    case RECEIVE_FILE_DETAIL_SEARCH_CONDITION.MOBILE_PHONE:
      return item.mobilePhone;
    case RECEIVE_FILE_DETAIL_SEARCH_CONDITION.CUSTOMER_KEY:
      return item.customerKey;
  }
}

function ReceiveStatusTag({ status }: { status: ReceiveFileStatus }) {
  const colors = RECEIVE_FILE_STATUS_COLORS[status];
  return (
    <Tag
      style={{
        color: colors.color,
        backgroundColor: colors.bgColor,
        borderColor: colors.borderColor,
        marginInlineEnd: 0,
      }}
    >
      {RECEIVE_FILE_STATUS_LABELS[status]}
    </Tag>
  );
}

function ReceiveFileCard({ item, selected, onSelect }: { item: ReceiveFileSummary; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      id={`rf-card-${item.receiveFileId}`}
      onClick={onSelect}
      className={`shrink-0 w-[260px] text-left rounded-lg border p-4 transition-colors cursor-pointer ${
        selected ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] text-gray-500">수신일자</span>
          <span className="font-medium text-gray-800">{item.receivedDate}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-gray-500">파일명</span>
          <span className="font-medium text-gray-800 truncate" title={item.fileName}>
            {item.fileName}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-gray-500">캠페인명</span>
          <span className="text-gray-800 truncate" title={item.campaignName}>
            {item.campaignName}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-gray-500">시나리오</span>
          <span className="text-gray-800 truncate" title={item.scenarioName}>
            {item.scenarioName}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-500">대상</span>
          <span className="font-medium text-gray-800">{formatNumber(item.targetCount)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-500">수신상태</span>
          <ReceiveStatusTag status={item.receiveStatus} />
        </div>
        <div className="flex flex-col gap-0.5 pt-1 border-t border-gray-100">
          <span className="text-[11px] text-gray-500">작업일시</span>
          <span className="text-gray-700">{formatDateTime(item.workDateTime)}</span>
        </div>
      </div>
    </button>
  );
}

export default function ReceiveFileList() {
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions } = useAggridOptions();
  const isInitialTenantHydrationDone = useRef(false);
  const cardScrollRef = useRef<HTMLDivElement>(null);

  const [tenantIds, setTenantIds] = useState<string[]>(() => loadStoredStringArray(RECEIVE_FILE_TENANT_STORAGE_KEY));
  const [campaignSelections, setCampaignSelections] = useState<string[]>(() => loadStoredStringArray(RECEIVE_FILE_CAMPAIGN_STORAGE_KEY).filter((v) => v.startsWith('C:')));
  const [scenarioSelections, setScenarioSelections] = useState<string[]>(() => {
    const fromScenarioKey = loadStoredStringArray(RECEIVE_FILE_SCENARIO_STORAGE_KEY);
    if (fromScenarioKey.length > 0) return fromScenarioKey;
    return loadStoredStringArray(RECEIVE_FILE_CAMPAIGN_STORAGE_KEY).filter((v) => v.startsWith('L:'));
  });
  const [receiveStateFilter, setReceiveStateFilter] = useState<ReceiveFileReceiveStateFilter | null>(null);
  const [receivedDateRange, setReceivedDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(EMPTY_APPLIED_FILTERS);
  const [selectedReceiveFileId, setSelectedReceiveFileId] = useState<string | null>(null);
  const [receiveFileSummaries, setReceiveFileSummaries] = useState(MOCK_RECEIVE_FILE_SUMMARIES);
  const [receiveFileDetails, setReceiveFileDetails] = useState(MOCK_RECEIVE_FILE_DETAILS);
  const [detailSearchCondition, setDetailSearchCondition] = useState<ReceiveFileDetailSearchCondition | null>(null);
  const [detailSearchKeyword, setDetailSearchKeyword] = useState('');
  const [appliedDetailFilters, setAppliedDetailFilters] = useState<AppliedDetailFilters>(EMPTY_APPLIED_DETAIL_FILTERS);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

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
    localStorage.setItem(RECEIVE_FILE_TENANT_STORAGE_KEY, JSON.stringify(tenantIds));
  }, [tenantIds]);

  useEffect(() => {
    localStorage.setItem(RECEIVE_FILE_CAMPAIGN_STORAGE_KEY, JSON.stringify(campaignSelections));
  }, [campaignSelections]);

  useEffect(() => {
    localStorage.setItem(RECEIVE_FILE_SCENARIO_STORAGE_KEY, JSON.stringify(scenarioSelections));
  }, [scenarioSelections]);

  const filteredSummaries = useMemo(() => {
    let items = receiveFileSummaries;

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

    if (appliedFilters.receiveStateFilter) {
      const allowedStatuses = RECEIVE_FILE_RECEIVE_STATE_FILTER_STATUS_MAP[appliedFilters.receiveStateFilter];
      items = items.filter((item) => allowedStatuses.includes(item.receiveStatus));
    }

    if (appliedFilters.receivedDateRange) {
      const { start, end } = appliedFilters.receivedDateRange;
      items = items.filter((item) => item.receivedDate >= start && item.receivedDate <= end);
    }

    return items;
  }, [appliedFilters, receiveFileSummaries, scenarioSelectOptions]);

  useEffect(() => {
    if (filteredSummaries.length === 0) {
      setSelectedReceiveFileId(null);
      return;
    }

    const stillExists = filteredSummaries.some((item) => item.receiveFileId === selectedReceiveFileId);
    if (!stillExists) {
      setSelectedReceiveFileId(filteredSummaries[0].receiveFileId);
    }
  }, [filteredSummaries, selectedReceiveFileId]);

  const handleCardSelect = (receiveFileId: string) => {
    setSelectedReceiveFileId(receiveFileId);
    setSelectedDetailId(null);
    document.getElementById(`rf-card-${receiveFileId}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const baseDetailRowData = useMemo(() => {
    if (!selectedReceiveFileId) return [];
    return receiveFileDetails.filter((item) => item.receiveFileId === selectedReceiveFileId);
  }, [receiveFileDetails, selectedReceiveFileId]);

  const detailRowData = useMemo(() => {
    const keyword = appliedDetailFilters.searchKeyword.trim();
    if (!keyword) return baseDetailRowData;

    const searchCondition = appliedDetailFilters.searchCondition;
    if (searchCondition) {
      return fuzzyFilter(keyword, baseDetailRowData, (item) => getDetailSearchFieldText(item, searchCondition));
    }

    return fuzzyFilter(keyword, baseDetailRowData, (item) => `${item.customerName} ${item.customerNumber} ${item.mobilePhone} ${item.customerKey}`);
  }, [appliedDetailFilters, baseDetailRowData]);

  useEffect(() => {
    setSelectedDetailId(null);
    setAppliedDetailFilters(EMPTY_APPLIED_DETAIL_FILTERS);
    setDetailSearchCondition(null);
    setDetailSearchKeyword('');
  }, [selectedReceiveFileId]);

  const handleSearch = () => {
    setAppliedFilters({
      tenantIds,
      campaignSelections,
      scenarioSelections,
      receiveStateFilter,
      receivedDateRange:
        receivedDateRange?.[0] && receivedDateRange?.[1]
          ? {
              start: receivedDateRange[0].format('YYYY-MM-DD'),
              end: receivedDateRange[1].format('YYYY-MM-DD'),
            }
          : null,
    });
  };

  const handleDelete = () => {
    if (!selectedReceiveFileId) {
      toast.warning('삭제할 수신파일을 선택하세요.');
      return;
    }

    modal.confirm.delete({
      onOk: () => {
        setReceiveFileSummaries((prev) => prev.filter((item) => item.receiveFileId !== selectedReceiveFileId));
        setSelectedReceiveFileId(null);
        toast.success('수신파일이 삭제되었습니다.');
      },
    });
  };

  const handleFetch = () => {
    toast.info('수신파일 가져오기를 요청했습니다.');
  };

  const handleDetailSearch = () => {
    setAppliedDetailFilters({
      searchCondition: detailSearchCondition,
      searchKeyword: detailSearchKeyword,
    });
    setSelectedDetailId(null);
  };

  const handleDetailAdd = () => {
    if (!selectedReceiveFileId) {
      toast.warning('수신파일을 먼저 선택하세요.');
      return;
    }

    toast.info('수신대상 추가 기능은 준비 중입니다.');
  };

  const handleDetailDelete = () => {
    if (!selectedDetailId) {
      toast.warning('삭제할 수신대상을 선택하세요.');
      return;
    }

    modal.confirm.delete({
      onOk: () => {
        setReceiveFileDetails((prev) => prev.filter((item) => item.detailId !== selectedDetailId));
        setSelectedDetailId(null);
        toast.success('수신대상이 삭제되었습니다.');
      },
    });
  };

  const handleDetailRowClick = (detailId: string) => {
    setSelectedDetailId((prev) => (prev === detailId ? null : detailId));
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-3 w-full bg-white bt-shadow px-7 py-5 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
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
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#495057] shrink-0">시나리오</span>
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
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
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
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#495057] shrink-0">수신상태</span>
            <Select
              value={receiveStateFilter ?? undefined}
              onChange={(value) => setReceiveStateFilter(value ?? null)}
              placeholder="전체"
              allowClear
              options={[...RECEIVE_FILE_RECEIVE_STATE_FILTER_OPTIONS]}
              style={{ width: '10rem' }}
              popupMatchSelectWidth={false}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#495057] shrink-0">기간</span>
            <DatePicker.RangePicker
              value={receivedDateRange}
              onChange={(dates) => setReceivedDateRange(dates)}
              format="YYYY-MM-DD"
              placeholder={['시작일', '종료일']}
              allowClear
              inputReadOnly
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
            검색
          </Button>
          <Button danger onClick={handleDelete}>
            삭제
          </Button>
          <Button icon={<Download className="size-4" />} onClick={handleFetch}>
            가져오기
          </Button>
        </div>
      </div>

      <section className="bg-white bt-shadow p-5">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">수신파일목록</h3>
          <span className="text-xs text-gray-400">({filteredSummaries.length})</span>
        </div>
        {filteredSummaries.length === 0 ? (
          <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
            조건에 맞는 수신파일이 없습니다.
          </div>
        ) : (
          <div className="relative flex w-full items-center gap-2">
            <Button
              type="text"
              icon={<ChevronLeft className="size-5" />}
              onClick={() => cardScrollRef.current?.scrollBy({ left: -RECEIVE_FILE_CARD_SCROLL_STEP, behavior: 'smooth' })}
              className="!h-8 !w-8 !shrink-0 !p-0"
              aria-label="이전 수신파일"
            />
            <div ref={cardScrollRef} className="flex flex-1 gap-3 overflow-x-auto px-1 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {filteredSummaries.map((item) => (
                <ReceiveFileCard
                  key={item.receiveFileId}
                  item={item}
                  selected={selectedReceiveFileId === item.receiveFileId}
                  onSelect={() => handleCardSelect(item.receiveFileId)}
                />
              ))}
            </div>
            <Button
              type="text"
              icon={<ChevronRight className="size-5" />}
              onClick={() => cardScrollRef.current?.scrollBy({ left: RECEIVE_FILE_CARD_SCROLL_STEP, behavior: 'smooth' })}
              className="!h-8 !w-8 !shrink-0 !p-0"
              aria-label="다음 수신파일"
            />
          </div>
        )}
      </section>

      <section className="bg-white bt-shadow p-5">
        <header className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 lg:flex-nowrap">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800">수신대상목록</h3>
            {selectedReceiveFileId && <span className="text-xs text-gray-400">({detailRowData.length})</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-sm font-medium text-[#495057]">조회조건</span>
              <Select
                value={detailSearchCondition ?? undefined}
                onChange={(value) => setDetailSearchCondition(value ?? null)}
                placeholder="전체"
                allowClear
                options={[...RECEIVE_FILE_DETAIL_SEARCH_CONDITION_OPTIONS]}
                style={{ width: '10rem' }}
                popupMatchSelectWidth={false}
                disabled={!selectedReceiveFileId}
              />
              <Input
                value={detailSearchKeyword}
                onChange={(e) => setDetailSearchKeyword(e.target.value)}
                onPressEnter={handleDetailSearch}
                placeholder="검색어를 입력하세요."
                prefix={<Search className="size-4 text-gray-400" />}
                allowClear
                style={{ width: '15rem' }}
                disabled={!selectedReceiveFileId}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="primary" icon={<Search className="size-4" />} onClick={handleDetailSearch} disabled={!selectedReceiveFileId}>
                검색
              </Button>
              <Button type="primary" icon={<Plus className="size-4" />} onClick={handleDetailAdd} disabled={!selectedReceiveFileId}>
                추가
              </Button>
              <Button danger onClick={handleDetailDelete} disabled={!selectedReceiveFileId}>
                삭제
              </Button>
            </div>
          </div>
        </header>
        <div className="w-full" style={{ height: RECEIVE_TARGET_GRID_HEIGHT }}>
          <AgGridReact<ReceiveFileDetailItem>
            rowModelType="clientSide"
            rowData={detailRowData}
            getRowId={(params) => params.data.detailId}
            columnDefs={receiveTargetColumnDefs}
            gridOptions={gridOptions}
            onRowClicked={(event) => {
              if (event.data?.detailId) handleDetailRowClick(event.data.detailId);
            }}
            getRowClass={(params) => (params.data?.detailId === selectedDetailId ? 'ag-row-selected' : undefined)}
          />
        </div>
      </section>
    </div>
  );
}
