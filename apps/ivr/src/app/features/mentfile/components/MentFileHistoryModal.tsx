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
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Input, Modal, Select, Switch, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Search } from 'lucide-react';
import { useGetMentFileHistory } from '../hooks/useMentFileQueries';
import { MENT_HIST_KIND_LABELS, MENT_HIST_STATUS_LABELS, type MentFileHistoryRow } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { codeFilter } from '@/libs/shared-ui/src/lib/aggridCodeColumn';

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
      // 자동 초기 조회 — 오늘 + 체크된 멘트만 (체크 있을 때). endOf('day') 로 마지막일 포함.
      setQueryParams({
        mentfileIds: hasChecked ? payload.checkedMentfileIds : undefined,
        startDate: today[0].startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
        endDate: today[1].endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
      });
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  // 검색조건 변경 시 자동 재조회 — debounce 300ms (키워드 타이핑 시 호출 폭주 방지)
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setQueryParams({
        mentfileIds: scopeToChecked && checkedIds.length > 0 ? checkedIds : undefined,
        rtServKind,
        startDate: dateRange?.[0]?.startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
        endDate: dateRange?.[1]?.endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
        keyword: keyword.trim() || undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [visible, dateRange, rtServKind, keyword, scopeToChecked, checkedIds]);

  const handleSearch = () => {
    // 명시적 다시 조회 — useEffect 와 동일 로직. debounce 무시하고 즉시.
    setQueryParams({
      mentfileIds: scopeToChecked && checkedIds.length > 0 ? checkedIds : undefined,
      rtServKind,
      startDate: dateRange?.[0]?.startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
      endDate: dateRange?.[1]?.endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
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
          return <Tag color={k === 0 ? 'blue' : 'purple'}>{MENT_HIST_KIND_LABELS[k] ?? k}</Tag>;
        },
        ...codeFilter<MentFileHistoryRow>('rtServKindCode', MENT_HIST_KIND_LABELS),
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
        width: 110,
        cellRenderer: (p: ICellRendererParams<MentFileHistoryRow>) => {
          // 예약취소는 상태코드가 아니라 플래그 — 라벨 오버라이드 (레거시 IPR30S3025 동일)
          if (p.data?.canceled) return <Tag color="default">예약취소</Tag>;
          const c = p.data?.applyStatusCode;
          if (c == null) return '-';
          // 성공류(20/30/50) green / 실패류(25/35/55) red / 미처리(9) orange / 예약(10) gold
          const color = c === 50 || c === 20 || c === 30 ? 'green' : c === 55 || c === 25 || c === 35 ? 'red' : c === 9 ? 'orange' : 'gold';
          return <Tag color={color}>{MENT_HIST_STATUS_LABELS[c] ?? c}</Tag>;
        },
        ...codeFilter<MentFileHistoryRow>('applyStatusCode', MENT_HIST_STATUS_LABELS),
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
            { value: 0, label: '즉시' },
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
        조회 결과 <b>{rows.length}</b>건 — 기준 테이블: TB_IR_MENTFILE_SYSTEM_HISTORY (즉시 + 예약 통합). 상태는 BE 가 예약취소/미처리까지 계산한 단일 코드 기준입니다.
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
