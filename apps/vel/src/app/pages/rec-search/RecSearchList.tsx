/**
 * 통화내역조회 (V5).
 *
 * 호전환여부(findTranTelText) 검색조건 / 호전환번호(tranTel) 그리드 컬럼은 V5 마이그레이션
 * (2026-05-19)에서 제거됨. V5 TB_REC_FILE이 60+컬럼 → 18컬럼 축약본으로 정리되면서
 * TRAN_TEL 컬럼 자체가 사라졌기 때문(함께 사라진 컬럼: RING_TIME, MFU_IP, MEDIA_*,
 * ENC_KEY 등). DB 스키마 결정이 변경되지 않는 한 화면 복구 불가.
 * 상세: C:\swat\context.md — "V5 마이그레이션 전환" 섹션.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, RowSelectionOptions } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { AutoComplete, Button, DatePicker, Form, Input, Modal, Pagination, Select, Space, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { downloadBlob, extractFileName, toast } from '@/shared-util';
import { useGetAgents, useGetGroups, useGetTenants } from '../../features/common/hooks/useCommonQueries';
import MonitoringAgentPopup, { type MonitoringAgentPopupRef } from '../../features/monitoring/components/MonitoringAgentPopup';
import MonitoringGroupPopup, { type MonitoringGroupPopupRef } from '../../features/monitoring/components/MonitoringGroupPopup';
import { recSearchApi } from '../../features/rec-search/api/recSearchApi';
import RecInfoUpdateModal, { type RecInfoUpdateModalRef } from '../../features/rec-search/components/RecInfoUpdateModal';
import RecMarkingModal, { type RecMarkingModalRef } from '../../features/rec-search/components/RecMarkingModal';
import { recSearchQueryKeys, useGetCustInfoFields, useGetMarkCodes, useGetRecordings, useUpdateMarking } from '../../features/rec-search/hooks/useRecSearchQueries';
import { CALL_KIND_LABELS, type RecFileListItem, type RecSearchParams } from '../../features/rec-search/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb = [{ title: 'VEL' }, { title: '통화내역조회', path: '/vel/rec-search/list' }];

const SearchIcon = () => (
  <svg viewBox="64 64 896 896" width="14" height="14" fill="currentColor">
    <path d="M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z" />
  </svg>
);

const PAGE_SIZE_OPTIONS = [15, 20, 30, 40, 50];

const FORM_ITEM_STYLE = { '--ant-form-item-margin-bottom': '0px' } as React.CSSProperties;

const TERM_OPTIONS = [
  { value: 'T_0', label: '당일' },
  { value: 'W_1', label: '1주일' },
  { value: 'W_2', label: '2주일' },
  { value: 'M_1', label: '1개월' },
];

const columnDefs: ColDef<RecFileListItem>[] = [
  //   { field: 'mediaVoice', headerName: '음성', width: 70, minWidth: 70, valueFormatter: ({ value }) => (value === 'Y' ? '●' : '') },
  //   { field: 'listenGrantYn', headerName: '청취권한', width: 90, minWidth: 90, valueFormatter: ({ value }) => (value === 'Y' ? '허용' : '불가') },
  {
    colId: 'recDate',
    headerName: '녹취일자',
    width: 110,
    minWidth: 110,
    valueGetter: ({ data }) => {
      const v = data?.recTime;
      return v ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : '';
    },
  },
  {
    colId: 'recTimeOnly',
    headerName: '녹취시간',
    width: 90,
    minWidth: 90,
    valueGetter: ({ data }) => {
      const v = data?.recTime;
      return v ? `${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12)}` : '';
    },
  },
  { field: 'groupId', headerName: '그룹', width: 110, minWidth: 80 },
  { field: 'userId', headerName: '상담원ID', width: 100, minWidth: 80 },
  { field: 'userName', headerName: '상담원명', width: 100, minWidth: 80 },
  { field: 'custTel', headerName: '전화번호', width: 140, minWidth: 100 },
  { field: 'dnNo', headerName: '내선번호', width: 90, minWidth: 80 },
  {
    field: 'endTime',
    headerName: '통화시간',
    width: 100,
    minWidth: 80,
    valueFormatter: ({ value }) => {
      if (!value) return '';
      const h = Math.floor(value / 3600)
        .toString()
        .padStart(2, '0');
      const m = Math.floor((value % 3600) / 60)
        .toString()
        .padStart(2, '0');
      const s = (value % 60).toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
    },
  },
  { field: 'callKind', headerName: '통화구분', width: 90, minWidth: 70, valueFormatter: ({ value }) => CALL_KIND_LABELS[value] ?? value },
  { field: 'callId', headerName: '콜 ID', flex: 1, minWidth: 200 },
  { field: 'markMemo', headerName: '마킹메모', width: 130, minWidth: 80 },
];

// AG-Grid 34는 rowSelection·selectionColumnDef·getRowStyle prop의 "참조"가 바뀌면 현재 선택을 초기화한다.
// 이 화면은 onSelectionChanged→setSelectedRows로 매 선택마다 리렌더되므로, 인라인 객체로 두면
// 선택 직후 리렌더에서 새 참조가 만들어져 체크가 즉시 풀린다. 정적 prop은 모듈 상수로 고정한다.
const ROW_SELECTION: RowSelectionOptions<RecFileListItem> = {
  mode: 'multiRow',
  checkboxes: true,
  headerCheckbox: true,
  enableClickSelection: true,
};

const SELECTION_COLUMN_DEF = {
  pinned: 'left' as const,
  width: 50,
  minWidth: 50,
  resizable: false,
  sortable: false,
  headerClass: 'flex! items-center! justify-center!',
  cellStyle: ({ data: row }: { data?: RecFileListItem }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    ...(row?.markColor ? { backgroundColor: `#${row.markColor}` } : {}),
  }),
};

const getRowStyle = ({ data: row }: { data?: RecFileListItem }) => (row?.markColor ? { backgroundColor: `#${row.markColor}` } : undefined);

const toSeconds = (t: Dayjs | undefined | null): number => {
  if (!t) return 0;
  return t.hour() * 3600 + t.minute() * 60 + t.second();
};

const INITIAL_VALUES = {
  recStartDate: dayjs(),
  recEndDate: dayjs(),
  recStartTime: dayjs('00:00:00', 'HH:mm:ss'),
  recEndTime: dayjs('23:59:59', 'HH:mm:ss'),
  callTimeStart: dayjs('00:00:00', 'HH:mm:ss'),
  callTimeEnd: dayjs('00:00:00', 'HH:mm:ss'),
  termUnit: 'T_0',
  findCallKind: '',
  findMarkKind: '',
  findField: '',
};

export default function RecSearchList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [form] = Form.useForm();
  const { gridOptions } = useAggridOptions();
  // 선택 시 리렌더에서 참조가 바뀌면 AG-Grid가 선택을 초기화하므로 안정적인 참조로 고정한다.
  const defaultColDef = useMemo<ColDef<RecFileListItem>>(
    () => ({ ...(gridOptions.defaultColDef as ColDef<RecFileListItem>), flex: undefined, cellStyle: { textAlign: 'center', fontVariantNumeric: 'tabular-nums' } }),
    [gridOptions.defaultColDef],
  );
  const gridRef = useRef<AgGridReact<RecFileListItem>>(null);
  const infoUpdateModalRef = useRef<RecInfoUpdateModalRef>(null);
  const markingModalRef = useRef<RecMarkingModalRef>(null);
  const groupPopupRef = useRef<MonitoringGroupPopupRef>(null);
  const agentPopupRef = useRef<MonitoringAgentPopupRef>(null);
  const queryClient = useQueryClient();
  const { mutate: deleteMarking, isPending: isDeletingMarking } = useUpdateMarking();
  const userInfo = useAuthStore((s) => s.userInfo);
  const [searchParams, setSearchParams] = useState<RecSearchParams | null>({
    startDate: `${dayjs().format('YYYYMMDD')}000000`,
    endDate: `${dayjs().format('YYYYMMDD')}235959`,
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [selectedRows, setSelectedRows] = useState<RecFileListItem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [groupOptions, setGroupOptions] = useState<{ value: string; label: string; groupId: string }[]>([]);
  const [agentOptions, setAgentOptions] = useState<{ value: string; label: string }[]>([]);

  const { data: tenantsData } = useGetTenants();
  const tenantOptions = [{ value: '', label: '선택하세요!' }, ...(Array.isArray(tenantsData) ? tenantsData.map((t) => ({ value: t.tenantId, label: t.tenantName })) : [])];

  const findTenantId = Form.useWatch('findTenantId', form) as string | undefined;
  const popupTenantId = findTenantId || userInfo?.tenant;

  const { data: allGroups = [] } = useGetGroups({
    params: popupTenantId ? { tenantId: popupTenantId, userId: userInfo?.userAccount, grantId: userInfo?.roles?.[0] } : undefined,
    queryOptions: { enabled: false }, // TB_MNG_GROUP 보류 — 임시 비활성
  });
  const allGroupMap = new Map(allGroups.map((g) => [g.groupId, g]));

  const { data: allAgents = [] } = useGetAgents({
    params: popupTenantId ? { tenantId: popupTenantId, userId: userInfo?.userAccount, grantId: userInfo?.roles?.[0] } : undefined,
    queryOptions: { enabled: false }, // TB_MNG_USERINFO 보류 — 임시 비활성
  });

  const { data: markCodeOptions = [] } = useGetMarkCodes({
    params: popupTenantId ? { tenantId: popupTenantId } : undefined,
  });

  const { data: custInfoFields = [] } = useGetCustInfoFields({
    params: popupTenantId ? { tenantId: popupTenantId } : undefined,
  });

  const getGroupPath = (groupId: string): string => {
    const parts: string[] = [];
    let cur = allGroupMap.get(groupId);
    while (cur) {
      parts.unshift(cur.groupName);
      cur = cur.parentId ? allGroupMap.get(cur.parentId) : undefined;
    }
    return parts.join('/');
  };

  const handleGroupInputSearch = (val: string) => {
    setSelectedGroupId('');
    if (!val.trim()) {
      setGroupOptions([]);
      return;
    }
    const filtered = allGroups.filter((g) => g.groupName.includes(val) || g.groupId.includes(val));
    setGroupOptions(filtered.slice(0, 20).map((g) => ({ value: g.groupId, label: getGroupPath(g.groupId), groupId: g.groupId })));
  };

  const handleGroupOptionSelect = (_val: string, option: { value: string; label: string; groupId: string }) => {
    setSelectedGroupId(option.groupId);
    form.setFieldsValue({ findGroupId: option.label });
    setGroupOptions([]);
  };

  const handleGroupPopupOpen = () => {
    if (!popupTenantId) {
      toast.warning('테넌트를 선택하세요.');
      return;
    }
    groupPopupRef.current?.open({ tenantId: popupTenantId, userId: userInfo?.userAccount, grantId: userInfo?.roles?.[0] }, (group, fullPath) => {
      setSelectedGroupId(group.groupId);
      form.setFieldsValue({ findGroupId: fullPath });
    });
  };

  const handleAgentInputChange = (val: string) => {
    if (!val) {
      setSelectedAgentId('');
      setAgentOptions([]);
      return;
    }
    const filtered = allAgents.filter((a) => a.userId.includes(val) || a.userName.includes(val));
    setAgentOptions(filtered.slice(0, 20).map((a) => ({ value: a.userId, label: `[${a.userId}]${a.userName}` })));
  };

  const handleAgentSelect = (val: string) => {
    const agent = allAgents.find((a) => a.userId === val);
    setSelectedAgentId(val);
    form.setFieldsValue({ findUserIdText: agent ? `${agent.userName}(${agent.userId})` : val });
    setAgentOptions([]);
  };

  const handleAgentPopupOpen = () => {
    if (!popupTenantId) {
      toast.warning('테넌트를 선택하세요.');
      return;
    }
    agentPopupRef.current?.open({ tenantId: popupTenantId, userId: userInfo?.userAccount, grantId: userInfo?.roles?.[0] }, (agent) => {
      setSelectedAgentId(agent.userId);
      form.setFieldsValue({ findUserIdText: `${agent.userName}(${agent.userId})` });
    });
  };

  const { data, isFetching } = useGetRecordings({
    params: searchParams ? { ...searchParams, page, size: pageSize } : undefined,
  });

  // 사용자가 [조회] 버튼을 눌러 발생한 검색에 한해서만 "결과 없음" 알림 표시.
  // (페이지 진입 자동조회/페이지네이션 이동 시에는 알림 안 띄움)
  const searchTriggeredRef = useRef(false);
  useEffect(() => {
    if (!searchTriggeredRef.current) return;
    if (isFetching) return;
    if (data && (data.total ?? 0) === 0) {
      toast.info('조회 결과가 없습니다.');
    }
    searchTriggeredRef.current = false;
  }, [data, isFetching]);

  const handleValuesChange = (changedValues: Record<string, unknown>) => {
    if ('termUnit' in changedValues) {
      const today = dayjs();
      let start = today;
      switch (changedValues.termUnit) {
        case 'T_0':
          start = today;
          break;
        case 'W_1':
          start = today.subtract(7, 'day');
          break;
        case 'W_2':
          start = today.subtract(14, 'day');
          break;
        case 'M_1':
          start = today.subtract(1, 'month');
          break;
      }
      form.setFieldsValue({ recStartDate: start, recEndDate: today });
    }
  };

  const handleSearch = () => {
    form.validateFields().then((values) => {
      const startDate = values.recStartDate as Dayjs;
      const endDate = values.recEndDate as Dayjs;
      const startTime = values.recStartTime as Dayjs | undefined;
      const endTime = values.recEndTime as Dayjs | undefined;

      const startTimeStr = startTime?.format('HHmmss') ?? '000000';
      const endTimeStr = endTime?.format('HHmmss') ?? '235959';

      const callMin = toSeconds(values.callTimeStart as Dayjs | undefined);
      const callMax = toSeconds(values.callTimeEnd as Dayjs | undefined);

      setPage(0);
      searchTriggeredRef.current = true;
      setSearchParams({
        startDate: `${startDate.format('YYYYMMDD')}${startTimeStr}`,
        endDate: `${endDate.format('YYYYMMDD')}${endTimeStr}`,
        findTenantId: (values.findTenantId as string) || undefined,
        findGroupId: selectedGroupId || undefined,
        findDnText: values.findDnText ?? undefined,
        findUserIdText: selectedAgentId || undefined,
        findCustTelText: values.findCustTelText ?? undefined,
        findCallKind: values.findCallKind || undefined,
        findCallIdText: values.findCallIdText ?? undefined,
        callTimeMin: callMin > 0 ? callMin : undefined,
        callTimeMax: callMax > 0 ? callMax : undefined,
        findMarkKind: values.findMarkKind || undefined,
        findField: values.findField || undefined,
        findFieldText: values.findFieldText || undefined,
      });
    });
  };

  const handleReset = () => {
    form.resetFields();
    setSearchParams(null);
    setPage(0);
    setSelectedRows([]);
    setSelectedGroupId('');
    setSelectedAgentId('');
    setGroupOptions([]);
    setAgentOptions([]);
  };

  // 녹취 재생은 새창(/vel/rec-search/player, chromeless)으로 띄운다. 재생목록은 localStorage로 전달
  // (실시간 감청 새창과 동일 패턴). 모달 대신 새창을 쓰면 다중 녹취를 동시에 듣거나 목록 화면을
  // 점유하지 않고 청취할 수 있다.
  const openPlayer = (rows: RecFileListItem[], startIndex = 0) => {
    if (rows.length === 0) return;
    const key = `vel-rec-player-${Date.now()}`;
    localStorage.setItem(key, JSON.stringify({ playlist: rows, startIndex }));
    // 팝업을 화면(현재 모니터) 중앙에서 띄운다. dualScreenLeft/screenX는 멀티모니터 보정용.
    const w = 720;
    const h = 720;
    const dualLeft = window.screenLeft ?? window.screenX;
    const dualTop = window.screenTop ?? window.screenY;
    const screenW = window.innerWidth || document.documentElement.clientWidth || window.screen.width;
    const screenH = window.innerHeight || document.documentElement.clientHeight || window.screen.height;
    const left = Math.max(0, dualLeft + (screenW - w) / 2);
    const top = Math.max(0, dualTop + (screenH - h) / 2);
    window.open(`/vel/rec-search/player?playerId=${key}`, `RecPlayer-${key}`, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  };

  const handlePlay = (row: RecFileListItem) => openPlayer([row], 0);

  const handleBatchPlay = () => {
    if (selectedRows.length === 0) return;
    const hasShort = selectedRows.some((r) => !r.endTime || r.endTime < 1);
    if (hasShort) {
      toast.warning('1초 이상의 녹취만 청취 가능합니다.');
      return;
    }
    openPlayer(selectedRows, 0);
  };

  const handleExcelExport = () => {
    if (!searchParams) {
      toast.warning('먼저 조회를 실행하세요.');
      return;
    }
    const qs = new URLSearchParams();
    (Object.entries(searchParams) as [string, string | number | undefined][]).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    window.open(`/api/bff/vel-rec-excel?${qs.toString()}`, '_blank');
  };

  const handleDownload = async () => {
    if (selectedRows.length !== 1) return;
    const recKey = selectedRows[0].recKey;
    setIsDownloading(true);
    try {
      const response = await recSearchApi.downloadRecording(recKey);
      const fileName = extractFileName(response.headers['content-disposition'], `${recKey}.mp3`);
      downloadBlob(response.data, fileName);
    } catch {
      toast.error('다운로드에 실패했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleMarkingOpen = () => {
    if (selectedRows.length === 0) {
      toast.warning('마킹등록 할 통화내역을 선택하세요');
      return;
    }
    Modal.confirm({
      title: '마킹등록',
      content: `선택한 통화내역 ${selectedRows.length}건을 마킹등록 하시겠습니까?`,
      okText: '확인',
      cancelText: '취소',
      onOk: () => {
        markingModalRef.current?.open(selectedRows);
      },
    });
  };

  const handleMarkingDelete = () => {
    if (selectedRows.length === 0) return;
    Modal.confirm({
      title: '마킹 삭제',
      content: `선택한 ${selectedRows.length}건의 마킹을 삭제하시겠습니까?`,
      okText: '삭제',
      cancelText: '취소',
      okButtonProps: { danger: true },
      onOk: () => {
        const recKeys = selectedRows.filter((r) => r.markCode).map((r) => r.recKey);
        if (recKeys.length === 0) {
          toast.warning('마킹된 항목이 없습니다.');
          return;
        }
        const promises = recKeys.map(
          (recKey) => new Promise<void>((resolve, reject) => deleteMarking({ recKey, markCode: '', markMemo: '' }, { onSuccess: resolve, onError: reject })),
        );
        Promise.all(promises)
          .then(() => {
            toast.success('마킹이 삭제되었습니다.');
            queryClient.invalidateQueries({ queryKey: recSearchQueryKeys.getRecordings._def });
          })
          .catch(() => toast.error('마킹 삭제에 실패했습니다.'));
      },
    });
  };

  const handleSelectionChanged = (e: { api: { getSelectedRows: () => RecFileListItem[] }; source?: string }) => {
    const rows = e.api.getSelectedRows();

    console.log('[REC] onSelectionChanged', { source: e.source, count: rows.length, keys: rows.map((r) => r.recKey) });
    setSelectedRows(rows);
  };

  const handleRowDoubleClicked = (e: { data?: RecFileListItem }) => {
    if (e.data) handlePlay(e.data);
  };

  console.log('[REC] render', { selectedCount: selectedRows.length, isFetching, rows: data?.items?.length ?? 0 });

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
          labelCol={{ style: { width: '80px', flexShrink: 0, display: 'flex', alignItems: 'center' } }}
          initialValues={{ ...INITIAL_VALUES, findTenantId: userInfo?.tenant ?? '' }}
          onValuesChange={handleValuesChange}
        >
          <div className="grid grid-cols-6 gap-x-4 gap-y-2">
            {/* Row 1: 테넌트 */}
            <Form.Item name="findTenantId" label="테넌트" style={FORM_ITEM_STYLE}>
              <Select
                placeholder="선택하세요!"
                options={tenantOptions}
                showSearch
                optionFilterProp="label"
                onChange={() => {
                  setSelectedGroupId('');
                  setSelectedAgentId('');
                  setGroupOptions([]);
                  setAgentOptions([]);
                  form.setFieldsValue({ findGroupId: '', findUserIdText: '' });
                }}
              />
            </Form.Item>
            <div className="col-span-5" />

            {/* Row 2: 내선번호, 그룹, 상담사 */}
            <Form.Item name="findDnText" label="내선번호" style={FORM_ITEM_STYLE}>
              <Input placeholder="내선번호" />
            </Form.Item>
            {/* 그룹/상담사 — TB_MNG_GROUP/USERINFO 보류라 임시 비활성 */}
            <Form.Item name="findGroupId" label="그룹" style={FORM_ITEM_STYLE}>
              <Space.Compact style={{ width: '100%' }}>
                <AutoComplete
                  options={groupOptions}
                  onSearch={handleGroupInputSearch}
                  onSelect={handleGroupOptionSelect}
                  onChange={(val) => {
                    if (!val) {
                      setSelectedGroupId('');
                      setGroupOptions([]);
                    }
                  }}
                  allowClear
                  placeholder="(보류)"
                  style={{ width: '100%' }}
                  disabled
                />
                <Button icon={<SearchIcon />} onClick={handleGroupPopupOpen} disabled />
              </Space.Compact>
            </Form.Item>
            <Form.Item name="findUserIdText" label="상담사ID" style={FORM_ITEM_STYLE}>
              <Space.Compact style={{ width: '100%' }}>
                <AutoComplete
                  options={agentOptions}
                  onSearch={handleAgentInputChange}
                  onSelect={handleAgentSelect}
                  onChange={(val) => {
                    if (!val) {
                      setSelectedAgentId('');
                      setAgentOptions([]);
                    }
                  }}
                  allowClear
                  placeholder="(보류)"
                  style={{ width: '100%' }}
                  disabled
                />
                <Button icon={<SearchIcon />} onClick={handleAgentPopupOpen} disabled />
              </Space.Compact>
            </Form.Item>
            <div className="col-span-3" />

            {/* Row 3: 전화번호, 추가검색어 (V5: 고객명/고객번호 제거) */}
            <Form.Item name="findCustTelText" label="전화번호" style={FORM_ITEM_STYLE}>
              <Input placeholder="전화번호" />
            </Form.Item>
            <Form.Item name="findField" label="추가검색어" style={FORM_ITEM_STYLE}>
              <Select>
                <Select.Option value="">선택하세요!</Select.Option>
                {custInfoFields.map((f) => (
                  <Select.Option key={f.colId} value={f.colId}>
                    {f.colText}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="findFieldText" labelCol={{ style: { width: 0 } }} style={FORM_ITEM_STYLE}>
              <Input placeholder="검색어" />
            </Form.Item>
            <div className="col-span-3" />

            {/* Row 4: 통화구분, 마킹구분, 콜아이디 (호전환여부는 V5에서 제거 — 파일 상단 주석 참조) */}
            <Form.Item name="findCallKind" label="통화구분" style={FORM_ITEM_STYLE}>
              <Select>
                <Select.Option value="">선택하세요!</Select.Option>
                <Select.Option value="1">수신</Select.Option>
                <Select.Option value="2">발신</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="findMarkKind" label="마킹구분" style={FORM_ITEM_STYLE}>
              <Select>
                <Select.Option value="">선택하세요!</Select.Option>
                {markCodeOptions.map((mc) => (
                  <Select.Option key={mc.markCode} value={mc.markCode}>
                    {mc.markName}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="findCallIdText" label="콜아이디" style={FORM_ITEM_STYLE}>
              <Input placeholder="콜 ID" />
            </Form.Item>

            {/* Row 5: 녹취일자 + 통화시간 + 버튼 */}
            <div className="col-span-5 flex items-center gap-1 mt-1 flex-wrap">
              <span style={{ width: '76px', flexShrink: 0 }} className="text-sm whitespace-nowrap">
                녹취일자
              </span>
              <Form.Item name="recStartDate" noStyle rules={[{ required: true, message: '시작일을 선택하세요' }]}>
                <DatePicker format="YYYY-MM-DD" placeholder="시작일" style={{ width: 140 }} allowClear={false} />
              </Form.Item>
              <Form.Item name="recStartTime" noStyle>
                <TimePicker format="HH:mm:ss" style={{ width: 110 }} allowClear={false} />
              </Form.Item>
              <span className="text-gray-400 px-1">~</span>
              <Form.Item name="recEndDate" noStyle rules={[{ required: true, message: '종료일을 선택하세요' }]}>
                <DatePicker format="YYYY-MM-DD" placeholder="종료일" style={{ width: 140 }} allowClear={false} />
              </Form.Item>
              <Form.Item name="recEndTime" noStyle>
                <TimePicker format="HH:mm:ss" style={{ width: 110 }} allowClear={false} />
              </Form.Item>
              <Form.Item name="termUnit" noStyle>
                <Select style={{ width: 80 }} options={TERM_OPTIONS} />
              </Form.Item>

              <span className="text-sm whitespace-nowrap ml-3" style={{ flexShrink: 0, width: '80px' }}>
                통화시간
              </span>
              <Form.Item name="callTimeStart" noStyle>
                <TimePicker format="HH:mm:ss" style={{ width: 110 }} allowClear={false} />
              </Form.Item>
              <span className="text-gray-400 px-1">~</span>
              <Form.Item name="callTimeEnd" noStyle>
                <TimePicker format="HH:mm:ss" style={{ width: 110 }} allowClear={false} />
              </Form.Item>
            </div>
          </div>
        </Form>
      </div>

      {/* 툴바 */}
      <div className="bg-white bt-shadow px-7 py-3 flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-600 mr-4">
          <span className="ml-1">총 {(data?.total ?? 0).toLocaleString()}건</span>
          {/* <span>페이지당</span> */}
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
          <Button type="primary" disabled={selectedRows.length !== 1} onClick={() => infoUpdateModalRef.current?.open(selectedRows[0])}>
            정보수정
          </Button>
          <Button type="primary" disabled={selectedRows.length === 0} onClick={handleMarkingOpen}>
            마킹등록
          </Button>
          <Button type="primary" disabled={selectedRows.length === 0 || isDeletingMarking} onClick={handleMarkingDelete}>
            마킹삭제
          </Button>
          <Button disabled={selectedRows.length === 0} onClick={handleBatchPlay}>
            일괄재생
          </Button>
          <Button disabled={selectedRows.length !== 1 || isDownloading} loading={isDownloading} onClick={handleDownload}>
            다운로드
          </Button>
          <Button onClick={handleExcelExport}>Excel Export</Button>
          <Button onClick={handleReset}>초기화</Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex flex-col flex-1 bg-white bt-shadow overflow-hidden">
        {isFetching ? (
          <FallbackSpinner />
        ) : (
          <>
            <style>{`
              .ag-cell[col-id="ag-Grid-SelectionColumn"] .ag-selection-checkbox {
                position: absolute !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                margin: 0 !important;
              }
            `}</style>
            <div className="flex-1 min-h-0 [&_.ag-header-cell-label]:justify-center [&_.ag-row-number-cell]:bg-transparent! [&_.ag-header-select-all]:absolute! [&_.ag-header-select-all]:inset-0! [&_.ag-header-select-all]:flex! [&_.ag-header-select-all]:items-center! [&_.ag-header-select-all]:justify-center! [&_.ag-header-select-all]:z-10!">
              <AgGridReact<RecFileListItem>
                ref={gridRef}
                rowData={data?.items ?? []}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                gridOptions={gridOptions}
                pagination={false}
                statusBar={{ statusPanels: [] }}
                rowSelection={ROW_SELECTION}
                selectionColumnDef={SELECTION_COLUMN_DEF}
                getRowId={({ data: row }) => row.recKey}
                loading={isFetching}
                onRowDoubleClicked={handleRowDoubleClicked}
                onSelectionChanged={handleSelectionChanged}
                onRowClicked={(e) => {
                  console.log('[REC] onRowClicked', { recKey: e.data?.recKey, isSelected: e.node.isSelected() });
                }}
                onRowSelected={(e) => {
                  console.log('[REC] onRowSelected', { recKey: e.data?.recKey, isSelected: e.node.isSelected(), source: e.source });
                }}
                getRowStyle={getRowStyle}
              />
            </div>
            <div className="flex justify-center items-center px-4 py-3">
              <Pagination current={page + 1} pageSize={pageSize} total={data?.total ?? 0} showSizeChanger={false} onChange={(p) => setPage(p - 1)} />
            </div>
          </>
        )}
      </div>
      <RecInfoUpdateModal ref={infoUpdateModalRef} />
      <RecMarkingModal ref={markingModalRef} />
      <MonitoringGroupPopup ref={groupPopupRef} />
      <MonitoringAgentPopup ref={agentPopupRef} />
    </div>
  );
}
