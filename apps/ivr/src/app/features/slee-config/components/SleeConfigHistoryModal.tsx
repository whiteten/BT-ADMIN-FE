/**
 * 환경변수 이력 모달 (AS-IS IPR30S3030 의 적용이력/예약결과/백업이력 통합).
 *
 * <p>구조:</p>
 * <ul>
 *   <li>헤더: 파일명 + 날짜범위 + 사유 + 검색</li>
 *   <li>Tab 1 적용 이력: 콤보 필터 (전체 / 즉시 / 예약) + ag-Grid (HIST + RESERVE 통합)</li>
 *   <li>Tab 2 백업 이력: ag-Grid (헤더) + 행 더블클릭 → BackupCompareDrawer</li>
 * </ul>
 *
 * <p>HA 그룹 정보 제거 — IR 시스템명만 노출 (사용자 정책).</p>
 */
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Modal, Select, Tabs, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Search } from 'lucide-react';
import BackupCompareDrawer, { type BackupCompareDrawerRef } from './BackupCompareDrawer';
import { sleeConfigQueryKeys, useGetBackups, useGetHistory } from '../hooks/useSleeConfigQueries';
import {
  APPLY_RESULT_LABELS,
  APPLY_STATUS_LABELS,
  RT_RESV_KIND_LABELS,
  SET_STATUS_LABELS,
  type SleeConfigBackupHeader,
  type SleeConfigHistoryRow,
} from '../types/sleeConfig.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const { RangePicker } = DatePicker;

interface OpenPayload {
  tenantId: number;
  configFile: string;
}

export interface SleeConfigHistoryModalRef {
  open: (payload: OpenPayload) => void;
  close: () => void;
}

const SleeConfigHistoryModal = forwardRef<SleeConfigHistoryModalRef>((_, ref) => {
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const compareDrawerRef = useRef<BackupCompareDrawerRef>(null);

  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<OpenPayload | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'backup'>('history');

  // ─── 검색 조건 ─────────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [applyReason, setApplyReason] = useState('');
  const [rtResvKind, setRtResvKind] = useState<number | undefined>(undefined); // undefined=전체

  // 확정된 쿼리 파라미터 (검색 버튼 누르면 갱신)
  const [historyParams, setHistoryParams] = useState<
    | {
        tenantId: number;
        configFile: string;
        rtResvKind?: number;
        startDate?: string;
        endDate?: string;
        applyReason?: string;
      }
    | undefined
  >(undefined);

  useImperativeHandle(ref, () => ({
    open: (p) => {
      setPayload(p);
      setActiveTab('history');
      // 기본 검색 기간: 오늘 (멘트 이력 모달과 동일)
      const today: [Dayjs, Dayjs] = [dayjs().startOf('day'), dayjs().endOf('day')];
      setDateRange(today);
      setApplyReason('');
      setRtResvKind(undefined);
      setHistoryParams({
        tenantId: p.tenantId,
        configFile: p.configFile,
        startDate: today[0].format('YYYY-MM-DDTHH:mm:ss'),
        endDate: today[1].format('YYYY-MM-DDTHH:mm:ss'),
      });
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const handleSearch = () => {
    if (!payload) return;
    setHistoryParams({
      tenantId: payload.tenantId,
      configFile: payload.configFile,
      rtResvKind,
      startDate: dateRange?.[0]?.format('YYYY-MM-DDTHH:mm:ss'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DDTHH:mm:ss'),
      applyReason: applyReason.trim() || undefined,
    });
  };

  // ─── Tab 1: 적용 이력 ──────────────────────────────────────────────────
  const { data: historyRows = [], isFetching: isHistoryFetching } = useGetHistory({
    params: historyParams,
    queryOptions: { enabled: visible && activeTab === 'history' && !!historyParams },
  });

  const historyColumnDefs: ColDef<SleeConfigHistoryRow>[] = useMemo(
    () => [
      {
        headerName: '구분',
        field: 'rtResvKind',
        width: 80,
        cellRenderer: (p: ICellRendererParams<SleeConfigHistoryRow>) => {
          const k = p.data?.rtResvKind;
          if (k == null) return '-';
          return <Tag color={k === 1 ? 'blue' : 'purple'}>{RT_RESV_KIND_LABELS[k] ?? k}</Tag>;
        },
      },
      {
        headerName: '범위',
        field: 'setStatus',
        width: 90,
        cellRenderer: (p: ICellRendererParams<SleeConfigHistoryRow>) => {
          const s = p.data?.setStatus;
          if (s == null) return '-';
          return <Tag color="default">{SET_STATUS_LABELS[s] ?? s}</Tag>;
        },
      },
      { headerName: '시스템', field: 'systemName', flex: 1, minWidth: 130 },
      { headerName: '환경파일', field: 'configFile', flex: 1, minWidth: 140 },
      {
        headerName: '작업일시',
        field: 'workTime',
        width: 160,
        valueFormatter: (p) => (p.value ? dayjs(p.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        headerName: '예약일시',
        field: 'applyDatetime',
        width: 160,
        valueFormatter: (p) => (p.value ? dayjs(p.value).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        headerName: '상태',
        field: 'applyStatus',
        width: 90,
        cellRenderer: (p: ICellRendererParams<SleeConfigHistoryRow>) => {
          const s = p.data?.applyStatus;
          if (s == null) return '-';
          const color = s === 50 ? 'green' : s === 55 ? 'red' : 'gold';
          return <Tag color={color}>{APPLY_STATUS_LABELS[s] ?? s}</Tag>;
        },
      },
      {
        headerName: '결과',
        field: 'applyResult',
        width: 90,
        cellRenderer: (p: ICellRendererParams<SleeConfigHistoryRow>) => {
          const r = p.data?.applyResult;
          if (r == null) {
            // 즉시 적용은 result 가 없지만 status 가 결과를 의미
            return p.data?.cancelTime ? <Tag color="default">취소</Tag> : '-';
          }
          const color = r === 1 ? 'green' : r === 2 ? 'red' : 'default';
          return <Tag color={color}>{APPLY_RESULT_LABELS[r] ?? r}</Tag>;
        },
      },
      { headerName: '작업자', field: 'workUserName', width: 110 },
      { headerName: '사유', field: 'applyReason', flex: 1.2, minWidth: 150, tooltipField: 'applyReason' },
    ],
    [],
  );

  // ─── Tab 2: 백업 이력 ──────────────────────────────────────────────────
  const backupParams = useMemo(() => (payload ? { tenantId: payload.tenantId, configFile: payload.configFile } : undefined), [payload]);

  const { data: backupRows = [], isFetching: isBackupFetching } = useGetBackups({
    params: backupParams,
    queryOptions: { enabled: visible && activeTab === 'backup' && !!backupParams },
  });

  const backupColumnDefs: ColDef<SleeConfigBackupHeader>[] = useMemo(
    () => [
      { headerName: '백업 ID', field: 'backupListId', width: 130 },
      { headerName: '작업자', field: 'workUserName', width: 130 },
      {
        headerName: '백업일시',
        field: 'workTime',
        flex: 1,
        minWidth: 200,
        valueFormatter: (p) => (p.value ? dayjs(p.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        headerName: '',
        width: 100,
        cellRenderer: (p: ICellRendererParams<SleeConfigBackupHeader>) =>
          p.data ? (
            <Button size="small" type="link" onClick={() => handleOpenCompare(p.data!)}>
              비교/복구
            </Button>
          ) : null,
      },
    ],
    [],
  );

  const handleOpenCompare = (row: SleeConfigBackupHeader) => {
    if (!payload) return;
    compareDrawerRef.current?.open({
      tenantId: payload.tenantId,
      configFile: payload.configFile,
      backupListId: row.backupListId,
      workTime: row.workTime,
      workUserName: row.workUserName,
    });
  };

  // ─── 복구 성공 시 전체 캐시 무효화 ──────────────────────────────────────
  const handleRestoreSuccess = () => {
    queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getConfigFiles._def });
    queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getCategories._def });
    queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getProperties._def });
    queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getBackups._def });
    queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getHistory._def });
  };

  // ─── 검색바 (양쪽 탭 공용 — 백업 탭에선 일부만 의미 있음) ─────────────
  const searchBar = (
    <div className="flex items-center gap-2 mb-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
      <RangePicker
        value={dateRange as never}
        onChange={(v) => setDateRange(v as [Dayjs | null, Dayjs | null] | null)}
        format="YYYY-MM-DD"
        placeholder={['시작일', '종료일']}
        disabled={activeTab !== 'history'}
      />
      <Input placeholder="적용 사유" value={applyReason} onChange={(e) => setApplyReason(e.target.value)} style={{ width: 200 }} disabled={activeTab !== 'history'} />
      {activeTab === 'history' && (
        <Select<string | number>
          value={rtResvKind ?? 'ALL'}
          onChange={(v) => setRtResvKind(v === 'ALL' ? undefined : Number(v))}
          style={{ width: 110 }}
          options={[
            { value: 'ALL', label: '전체' },
            { value: 1, label: '즉시' },
            { value: 2, label: '예약' },
          ]}
        />
      )}
      <Button type="primary" icon={<Search className="size-3.5" />} onClick={handleSearch} disabled={activeTab !== 'history'}>
        검색
      </Button>
    </div>
  );

  return (
    <>
      <Modal
        open={visible}
        onCancel={() => setVisible(false)}
        title={
          <span>
            환경변수 이력 — <span className="text-blue-700">{payload?.configFile ?? '-'}</span>
          </span>
        }
        width={1200}
        footer={[
          <Button key="close" onClick={() => setVisible(false)}>
            닫기
          </Button>,
        ]}
        destroyOnHidden
      >
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'history' | 'backup')}
          items={[
            {
              key: 'history',
              label: '적용 이력',
              children: (
                <>
                  {searchBar}
                  <div className="text-[12px] text-slate-500 mb-2">
                    조회 결과 <b>{historyRows.length}</b>건 — 즉시/예약 통합. RESERVE 가 있는 예약 건은 실시간 결과(취소/성공/실패)도 표시됩니다.
                  </div>
                  <div style={{ height: 460 }}>
                    <AgGridReact<SleeConfigHistoryRow>
                      rowData={historyRows}
                      columnDefs={historyColumnDefs}
                      gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                      loading={isHistoryFetching}
                      getRowId={(p) => `${p.data.svcResvId ?? 'none'}::${p.data.workTime ?? ''}::${p.data.systemName ?? ''}`}
                      defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                    />
                  </div>
                </>
              ),
            },
            {
              key: 'backup',
              label: '백업 이력',
              children: (
                <>
                  {searchBar}
                  <div className="text-[12px] text-slate-500 mb-2">
                    조회 결과 <b>{backupRows.length}</b>건 — 적용 시 자동 백업된 USERCONFIG 스냅샷 (최신 4개 유지). 행의 [비교/복구] 버튼으로 차이를 확인하고 복구할 수 있습니다.
                  </div>
                  <div style={{ height: 460 }}>
                    <AgGridReact<SleeConfigBackupHeader>
                      rowData={backupRows}
                      columnDefs={backupColumnDefs}
                      gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                      loading={isBackupFetching}
                      getRowId={(p) => String(p.data.backupListId)}
                      defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                      onRowDoubleClicked={(e) => e.data && handleOpenCompare(e.data)}
                    />
                  </div>
                </>
              ),
            },
          ]}
        />
      </Modal>

      <BackupCompareDrawer ref={compareDrawerRef} onRestoreSuccess={handleRestoreSuccess} />
    </>
  );
});

SleeConfigHistoryModal.displayName = 'SleeConfigHistoryModal';
export default SleeConfigHistoryModal;
