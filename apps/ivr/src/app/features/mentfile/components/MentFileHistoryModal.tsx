/**
 * 멘트파일 적용 이력 모달 (AS-IS IPR30S3020L3.do 확장 — 즉시+예약 통합).
 *
 * <p>구조:</p>
 * <ul>
 *   <li>헤더 검색바: 날짜범위 + 콤보(전체/즉시/예약) + 키워드 + [선택 N개만] 토글</li>
 *   <li>ag-Grid: 구분/멘트/파일/시스템/작업일시/예약일시/상태/결과/작업자</li>
 * </ul>
 *
 * <p>레거시는 예약(RT_SERV_KIND=2)만 조회했지만, 리뉴얼은 즉시+예약 통합 운영 이력.
 * 멘트파일은 환경변수처럼 DB 백업 이력/복구 탭이 없어 단일 탭으로 구성 (디스크 백업 자체는 적용 시점에 수행).</p>
 */
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Modal, Select, Switch, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Search } from 'lucide-react';
import { useGetMentFileHistory } from '../hooks/useMentFileQueries';
import type { MentFileHistoryRow } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const { RangePicker } = DatePicker;

interface OpenPayload {
  /** 그리드에서 체크된 멘트 ID. 비어있어도 OK (전체 조회) */
  checkedMentfileIds: number[];
}

export interface MentFileHistoryModalRef {
  open: (payload: OpenPayload) => void;
  close: () => void;
}

const MentFileHistoryModal = forwardRef<MentFileHistoryModalRef>((_, ref) => {
  const { gridOptions } = useAggridOptions();

  const [visible, setVisible] = useState(false);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);

  // ─── 검색 조건 ─────────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [rtServKind, setRtServKind] = useState<number | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [scopeToChecked, setScopeToChecked] = useState(true); // 체크된 멘트만 보기 토글

  // 확정 파라미터 (검색 버튼)
  const [queryParams, setQueryParams] = useState<
    | {
        mentfileIds?: number[];
        rtServKind?: number;
        startDate?: string;
        endDate?: string;
        keyword?: string;
      }
    | undefined
  >(undefined);

  useImperativeHandle(ref, () => ({
    open: (payload) => {
      setCheckedIds(payload.checkedMentfileIds);
      // 기본 검색 기간: 오늘
      const today: [Dayjs, Dayjs] = [dayjs().startOf('day'), dayjs().endOf('day')];
      setDateRange(today);
      setRtServKind(undefined);
      setKeyword('');
      const hasChecked = payload.checkedMentfileIds.length > 0;
      setScopeToChecked(hasChecked);
      // 자동 초기 조회 — 오늘 + 체크된 멘트만 (체크 있을 때)
      setQueryParams({
        mentfileIds: hasChecked ? payload.checkedMentfileIds : undefined,
        startDate: today[0].format('YYYY-MM-DDTHH:mm:ss'),
        endDate: today[1].format('YYYY-MM-DDTHH:mm:ss'),
      });
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const handleSearch = () => {
    setQueryParams({
      mentfileIds: scopeToChecked && checkedIds.length > 0 ? checkedIds : undefined,
      rtServKind,
      startDate: dateRange?.[0]?.format('YYYY-MM-DDTHH:mm:ss'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DDTHH:mm:ss'),
      keyword: keyword.trim() || undefined,
    });
  };

  const { data: rows = [], isFetching } = useGetMentFileHistory({
    params: queryParams,
    queryOptions: { enabled: visible && !!queryParams },
  });

  // ─── 그리드 컬럼 ─────────────────────────────────────────────────────
  const columnDefs: ColDef<MentFileHistoryRow>[] = useMemo(
    () => [
      {
        headerName: '구분',
        field: 'rtServKindCode',
        width: 80,
        cellRenderer: (p: ICellRendererParams<MentFileHistoryRow>) => {
          const k = p.data?.rtServKindCode;
          if (k == null) return '-';
          return <Tag color={k === 1 ? 'blue' : 'purple'}>{p.data?.rtServKindName ?? k}</Tag>;
        },
      },
      { headerName: '멘트명', field: 'mentName', flex: 1, minWidth: 140 },
      { headerName: '파일명', field: 'mentFile', flex: 1, minWidth: 160, tooltipField: 'mentFile' },
      { headerName: '시스템', field: 'systemName', width: 140 },
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
        field: 'applyStatusCode',
        width: 90,
        cellRenderer: (p: ICellRendererParams<MentFileHistoryRow>) => {
          const c = p.data?.applyStatusCode;
          if (c == null) return '-';
          const color = c === 50 ? 'green' : c === 55 ? 'red' : 'gold';
          return <Tag color={color}>{p.data?.applyStatusName ?? c}</Tag>;
        },
      },
      {
        headerName: '결과',
        field: 'applyResultCode',
        width: 90,
        cellRenderer: (p: ICellRendererParams<MentFileHistoryRow>) => {
          const c = p.data?.applyResultCode;
          if (c == null) return p.data?.cancelTime ? <Tag>취소</Tag> : '-';
          const color = c === 1 ? 'green' : c === 2 ? 'red' : 'default';
          return <Tag color={color}>{p.data?.applyResultName ?? c}</Tag>;
        },
      },
      { headerName: '작업자', field: 'workUserName', width: 110 },
    ],
    [],
  );

  return (
    <Modal
      title="멘트파일 적용 이력"
      open={visible}
      onCancel={() => setVisible(false)}
      width={1200}
      footer={[
        <Button key="close" onClick={() => setVisible(false)}>
          닫기
        </Button>,
      ]}
      destroyOnHidden
    >
      {/* 검색바 */}
      <div className="flex items-center gap-2 flex-wrap mb-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
        <RangePicker value={dateRange as never} onChange={(v) => setDateRange(v as [Dayjs | null, Dayjs | null] | null)} format="YYYY-MM-DD" placeholder={['시작일', '종료일']} />
        <Select<string | number>
          value={rtServKind ?? 'ALL'}
          onChange={(v) => setRtServKind(v === 'ALL' ? undefined : Number(v))}
          style={{ width: 110 }}
          options={[
            { value: 'ALL', label: '전체' },
            { value: 1, label: '즉시' },
            { value: 2, label: '예약' },
          ]}
        />
        <Input placeholder="멘트명/파일명 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} style={{ width: 220 }} />
        {checkedIds.length > 0 && (
          <div className="flex items-center gap-2 ml-2 px-2 py-1 rounded border border-slate-200 bg-white">
            <Switch size="small" checked={scopeToChecked} onChange={setScopeToChecked} />
            <span className="text-[12px] text-slate-600">선택 {checkedIds.length}건만</span>
          </div>
        )}
        <Button type="primary" icon={<Search className="size-3.5" />} onClick={handleSearch} className="ml-auto">
          검색
        </Button>
      </div>

      <div className="text-[12px] text-slate-500 mb-2">
        조회 결과 <b>{rows.length}</b>건 — 기준 테이블: TB_IR_MENTFILE_SYSTEM_HISTORY (즉시 + 예약 통합). 예약의 실시간 결과는 RESERVE 가 갱신될 때까지 미확정 상태로 표시됩니다.
      </div>

      <div style={{ height: 480 }}>
        <AgGridReact<MentFileHistoryRow>
          rowData={rows}
          columnDefs={columnDefs}
          gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
          loading={isFetching}
          getRowId={(p) => `${p.data.svcResvId ?? 'imm'}::${p.data.mentfileId}::${p.data.systemId}::${p.data.workTime ?? ''}`}
          defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
        />
      </div>
    </Modal>
  );
});

MentFileHistoryModal.displayName = 'MentFileHistoryModal';
export default MentFileHistoryModal;
