/**
 * CTI큐 배정 패널 — 배정 모드 전용 (PLAN-assign-redesign.md §3 A안 구현).
 *
 * - 기존 BsrCtiqAssignModal.tsx 를 대체. 모달 불필요, 같은 화면 탭 내 인라인 렌더.
 * - 트리 패널: BsrGroupManage 가 소유하는 ReadonlyTreePanel 을 배정 모드에서 treeGroups(전체 노드)로
 *   데이터만 스왑 — 이 컴포넌트는 트리 없이 "검색바 + 그리드 + 액션바" 만 렌더.
 * - 진입 시 scope=unassigned·limit50 자동 1회 검색 (bounded 예외 — 2026-06-12 사용자 승인).
 * - 행 더블클릭 단건 배정 (모든 행 confirm 경유 — PLAN §3-4).
 * - 트리 노드 선택 변경 → treeIds 파라미터 포함 즉시 재검색 (PLAN §3-1).
 * - ESC 키 → 관리 모드 복귀 (입력 포커스 중 오발동 방지: input/textarea/select 대상 제외).
 * - 그리드 9규칙 준수: useAggridOptions / rowSelection 객체 / tooltipField / null='-' /
 *   상주 배너 금지(모드 안내=타이틀 치환만) / GDN명 제거 / 수정버튼 금지.
 *
 * v1.1 수정 (2026-06-12 critic FAIL 반영):
 *   - ESC 복귀 키 핸들러
 *   - 액션바 레이아웃 1366px 클리핑 수정 (2행: 타이틀행·컨트롤행 분리)
 *   - 트리 클릭 → 즉시 재검색
 *   - 더블클릭 미배정 큐도 confirm 경유
 *   - "미지정" → '-' (bsrGroupName null/undefined 통일)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Modal, Segmented } from 'antd';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';
import type { BsrCtiqSearchItem, BsrCtiqSearchParams } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  /** 현재 선택된 BSR 그룹 ID */
  targetBsrGroupId: number;
  /** 현재 선택된 BSR 그룹명 — 타이틀·confirm 문구에 사용 */
  targetBsrGroupName: string;
  /** 현재 테넌트 ID — 검색 필수 파라미터 */
  tenantId: number;
  /**
   * 트리 패널 현재 선택 treeId (null=전체, 0=미배정은 제외).
   * 변경될 때마다 즉시 재검색 발사 (PLAN §3-1).
   */
  selectedTreeId: number | null;
  /** 검색 실행 콜백 (BsrGroupManage 의 useSearchBsrCtiq.mutate 위임) */
  onSearch: (params: BsrCtiqSearchParams) => void;
  searchResult: { total: number; items: BsrCtiqSearchItem[] };
  isSearching: boolean;
  /** 단건·다건 배정 콜백 */
  onAssign: (targetBsrGroupId: number, ctiqIds: number[]) => void;
  isAssigning: boolean;
  /** 완료 버튼 / ESC / 배정 성공 후 관리 모드 복귀 콜백 */
  onDone: () => void;
}

const LIMIT = 50;

/** 입력 대상 요소인지 확인 — ESC 오발동 방지 */
function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
}

export default function BsrCtiqAssignPanel({
  targetBsrGroupId,
  targetBsrGroupName,
  tenantId,
  selectedTreeId,
  onSearch,
  searchResult,
  isSearching,
  onAssign,
  isAssigning,
  onDone,
}: Props) {
  const { gridOptions } = useAggridOptions();

  // ─── 로컬 상태 ─────────────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState('');
  const [scope, setScope] = useState<'unassigned' | 'all'>('unassigned');
  const [selectedCtiqIds, setSelectedCtiqIds] = useState<number[]>([]);
  const [searched, setSearched] = useState(false);

  // 이관 confirm
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingCtiqIds, setPendingCtiqIds] = useState<number[]>([]);
  const [pendingCtiqName, setPendingCtiqName] = useState<string>('');

  const gridRef = useRef<import('ag-grid-react').AgGridReact<BsrCtiqSearchItem>>(null);

  // ─── ESC 키 → 관리 모드 복귀 ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isInputFocused()) {
        onDone();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDone]);

  // ─── 진입 시 자동 검색 (bounded: unassigned·limit50) ────────────────────────
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!isFirstRender.current) return;
    isFirstRender.current = false;
    // 마운트 = 배정 모드 진입. 자동 1회 검색.
    const treeIds = selectedTreeId != null && selectedTreeId > 0 ? [selectedTreeId] : undefined;
    onSearch({ tenantId, scope: 'unassigned', limit: LIMIT, treeIds });
    setSearched(true);
    setSelectedCtiqIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 트리 선택 변경 → 즉시 재검색 (PLAN §3-1) ───────────────────────────────
  const prevTreeIdRef = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    // 첫 렌더는 진입 시 자동검색이 처리 → skip
    if (prevTreeIdRef.current === undefined) {
      prevTreeIdRef.current = selectedTreeId;
      return;
    }
    if (prevTreeIdRef.current === selectedTreeId) return;
    prevTreeIdRef.current = selectedTreeId;

    const treeIds = selectedTreeId != null && selectedTreeId > 0 ? [selectedTreeId] : undefined;
    onSearch({
      tenantId,
      keyword: keyword.trim() || undefined,
      treeIds,
      scope,
      limit: LIMIT,
    });
    setSearched(true);
    setSelectedCtiqIds([]);
  }, [selectedTreeId, tenantId, keyword, scope, onSearch]);

  // ─── 핸들러 ────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const treeIds = selectedTreeId != null && selectedTreeId > 0 ? [selectedTreeId] : undefined;
    onSearch({
      tenantId,
      keyword: keyword.trim() || undefined,
      treeIds,
      scope,
      limit: LIMIT,
    });
    setSearched(true);
    setSelectedCtiqIds([]);
  }, [tenantId, keyword, selectedTreeId, scope, onSearch]);

  const handleScopeChange = useCallback((v: 'unassigned' | 'all') => {
    setScope(v);
    setSearched(false);
    setSelectedCtiqIds([]);
  }, []);

  /** 선택 N건 배정 */
  const handleAssignClick = useCallback(() => {
    if (selectedCtiqIds.length === 0) {
      toast.warning('배정할 CTI큐를 선택하세요');
      return;
    }
    const otherCount = searchResult.items.filter((item) => selectedCtiqIds.includes(item.ctiqId) && item.bsrGroupId != null && item.bsrGroupId !== targetBsrGroupId).length;
    if (otherCount > 0) {
      setPendingCtiqIds([...selectedCtiqIds]);
      setPendingCtiqName('');
      setConfirmVisible(true);
    } else {
      onAssign(targetBsrGroupId, selectedCtiqIds);
    }
  }, [selectedCtiqIds, searchResult.items, targetBsrGroupId, onAssign]);

  /** 이관 confirm OK */
  const handleTransferConfirm = useCallback(() => {
    setConfirmVisible(false);
    onAssign(targetBsrGroupId, pendingCtiqIds);
  }, [targetBsrGroupId, pendingCtiqIds, onAssign]);

  /**
   * 행 더블클릭 단건 배정 (PLAN §3-4 — 미배정 포함 모든 행 confirm 경유).
   * 미배정: "[큐명]을 [그룹명]에 배정하시겠습니까?" confirm.
   * 이관: 기존 이관 confirm 문구.
   */
  const handleRowDoubleClick = useCallback((e: RowDoubleClickedEvent<BsrCtiqSearchItem>) => {
    const item = e.data;
    if (!item) return;
    setPendingCtiqIds([item.ctiqId]);
    setPendingCtiqName(item.ctiqName ?? '');
    setConfirmVisible(true);
  }, []);

  // ─── 이관 confirm 건수 (다건용) ─────────────────────────────────────────────
  const otherCount = useMemo(
    () => searchResult.items.filter((item) => pendingCtiqIds.includes(item.ctiqId) && item.bsrGroupId != null && item.bsrGroupId !== targetBsrGroupId).length,
    [searchResult.items, pendingCtiqIds, targetBsrGroupId],
  );

  const showLimitNote = searched && searchResult.total > searchResult.items.length;

  // ─── 컬럼 정의 (9규칙 §4·§5·§6) ───────────────────────────────────────────
  // GDN명 제거 (PLAN §1 — 배정 결정 기여 없음). GDN번호 tooltipField='gdnName' 으로 흡수.
  const colDefs: ColDef<BsrCtiqSearchItem>[] = useMemo(() => {
    const base: ColDef<BsrCtiqSearchItem>[] = [
      {
        field: 'ctiqName',
        headerName: 'CTI큐명',
        flex: 2,
        minWidth: 100,
        tooltipField: 'ctiqName',
        filterValueGetter: ({ data }) => data?.ctiqName ?? '-',
        valueFormatter: ({ value }) => (value as string | null) ?? '-',
      },
      {
        field: 'gdnNo',
        headerName: 'GDN번호',
        width: 100,
        tooltipField: 'gdnName',
        filterValueGetter: ({ data }) => data?.gdnNo ?? '-',
        valueFormatter: ({ value }) => (value as string | null) ?? '-',
      },
      {
        field: 'treeName',
        headerName: '업무그룹명',
        width: 110,
        tooltipField: 'treeName',
        filterValueGetter: ({ data }) => data?.treeName ?? '-',
        valueFormatter: ({ value }) => (value as string | null) ?? '-',
      },
    ];
    // 전체 모드에서만 "소속 BSR그룹" 컬럼 추가 (이관 판단 핵심 — PLAN §1)
    if (scope === 'all') {
      base.push({
        field: 'bsrGroupName',
        headerName: '소속 BSR그룹',
        flex: 1,
        minWidth: 120,
        tooltipField: 'bsrGroupName',
        // 결함6: null/undefined/"미지정" 모두 '-' 통일 (PLAN §3-3 null='-')
        filterValueGetter: ({ data }) => data?.bsrGroupName ?? null ?? '-',
        valueFormatter: ({ value }) => (value as string | null | undefined) ?? '-',
      });
    }
    return base;
  }, [scope]);

  // gridOptions — pagination:false / sideBar:false (9규칙 §1)
  const panelGridOptions = useMemo(() => ({ ...gridOptions, pagination: false, statusBar: undefined, sideBar: false }), [gridOptions]);

  // confirm 문구: 단건 더블클릭 vs 다건 선택 배정
  const confirmContent = useMemo(() => {
    if (pendingCtiqIds.length === 1 && pendingCtiqName) {
      if (otherCount > 0) {
        // 이관 케이스
        return `[${pendingCtiqName}]은(는) 다른 BSR 그룹 소속입니다. [${targetBsrGroupName}](으)로 이관됩니다.`;
      }
      return `[${pendingCtiqName}]을(를) [${targetBsrGroupName}]에 배정하시겠습니까?`;
    }
    // 다건 선택
    if (otherCount > 0) {
      return `선택 ${pendingCtiqIds.length}건 중 ${otherCount}건은 다른 BSR 그룹 소속입니다. [${targetBsrGroupName}](으)로 이관됩니다.`;
    }
    return `선택 ${pendingCtiqIds.length}건을 [${targetBsrGroupName}]에 배정하시겠습니까?`;
  }, [pendingCtiqIds, pendingCtiqName, otherCount, targetBsrGroupName]);

  return (
    <>
      {/*
        결함2: 1366px 클리핑 수정 — 2행 레이아웃.
        1행: 타이틀(건수)
        2행: 검색 컨트롤 + 액션 버튼 (flex-wrap 허용, h-auto)
        → 트리(240px) + 스플리터(8px) + 이 패널(flex-1 min-w-0) 구조에서 안전
      */}
      <div className="px-3 py-1.5 border-b border-gray-100 flex flex-col gap-1 flex-shrink-0">
        {/* 1행: 타이틀 */}
        <div className="flex items-center">
          <span className="text-sm font-semibold text-gray-700 truncate">
            [{targetBsrGroupName}] 배정 후보 검색
            {searched && ` (${searchResult.total > LIMIT ? `총 ${searchResult.total.toLocaleString()}건 중 ${LIMIT}건` : `${searchResult.items.length.toLocaleString()}건`})`}
          </span>
        </div>
        {/* 2행: 검색 + 액션 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Input
            allowClear
            prefix={<Search className="size-3 text-gray-400" />}
            placeholder="큐명 / GDN번호"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 150 }}
            size="small"
          />
          <Segmented<'unassigned' | 'all'>
            size="small"
            options={[
              { label: '미배정만', value: 'unassigned' },
              { label: '전체', value: 'all' },
            ]}
            value={scope}
            onChange={handleScopeChange}
          />
          <Button size="small" icon={<Search className="size-3" />} onClick={handleSearch} loading={isSearching}>
            검색
          </Button>
          <Button size="small" type="primary" onClick={handleAssignClick} loading={isAssigning} disabled={selectedCtiqIds.length === 0}>
            {selectedCtiqIds.length > 0 ? `${selectedCtiqIds.length}건 배정` : '배정'}
          </Button>
          <Button size="small" onClick={onDone}>
            닫기
          </Button>
        </div>
      </div>

      {/* limit 초과 안내 — 상주 배너 아님, 조건부 표시 */}
      {showLimitNote && (
        <div className="mx-3 my-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded flex-shrink-0">
          총 <strong>{searchResult.total.toLocaleString()}</strong>건 중 {LIMIT}건 표시 — 검색어로 좁혀 주세요.
        </div>
      )}

      {/* 결과 그리드 */}
      <div className="flex-1 min-h-0">
        {!searched ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400 text-sm bg-white">
            <Search className="size-8 opacity-30" />
            검색 조건을 입력 후 검색하세요.
          </div>
        ) : (
          <AgGridReact<BsrCtiqSearchItem>
            ref={gridRef}
            {...panelGridOptions}
            rowData={searchResult.items}
            columnDefs={colDefs}
            loading={isSearching}
            rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }}
            suppressRowClickSelection={false}
            onSelectionChanged={(e) => setSelectedCtiqIds(e.api.getSelectedRows().map((r) => r.ctiqId))}
            onRowDoubleClicked={handleRowDoubleClick}
            overlayNoRowsTemplate="<span class='text-gray-400 text-sm'>검색된 데이터가 없습니다.</span>"
          />
        )}
      </div>

      {/* confirm — 단건(더블클릭) / 다건(선택 배정) / 이관 통합 */}
      <Modal open={confirmVisible} title="배정 확인" okText="확인" cancelText="취소" onOk={handleTransferConfirm} onCancel={() => setConfirmVisible(false)} width={400}>
        <p className="text-sm text-gray-700">{confirmContent}</p>
      </Modal>
    </>
  );
}
