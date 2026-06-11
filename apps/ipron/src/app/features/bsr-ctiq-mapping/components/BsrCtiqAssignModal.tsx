/**
 * CTI큐 배정 모달 (v2 재작성 — PLAN §2-1, §2-2, bsr-group-v3 목업 1:1).
 *
 * 변경 요약 (기존 대비):
 *  - 자동 전체조회 제거 → 초기 빈 상태 "검색 조건을 입력 후 검색하세요"
 *  - 업무그룹 필터: 클라이언트 후필터 → antd TreeSelect(다중선택, 서버 파라미터)
 *  - 대상 그룹 콤보 제거 → 좌측 선택 그룹 고정(targetBsrGroupId prop)
 *  - scope Segmented: 미배정만(기본) / 전체
 *  - 전체 모드에서만 "소속 BSR그룹" 컬럼 노출
 *  - 서버 limit 50 + total 안내 배너
 *  - 타 그룹 소속 큐 선택 시 이관 confirm 1문장
 *  - 탭 트리 패널 선택 노드 → TreeSelect 프리필
 *  - 푸터: [취소] [배정 (N)] (N=0이면 disabled)
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact, type AgGridReact as AgGridReactType } from 'ag-grid-react';
import { Button, Input, Modal, Segmented, TreeSelect } from 'antd';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';
import type { CtiQueueGroupResponse } from '../../cti-queue/types';
import type { BsrCtiqSearchItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  open: boolean;
  /** 현재 선택된 BSR 그룹 ID — 이관 대상이자 배정 대상 */
  targetBsrGroupId: number;
  /** 현재 선택된 BSR 그룹명 — confirm 문구에 사용 */
  targetBsrGroupName: string;
  /** 현재 테넌트 ID — 검색 필수 파라미터 */
  tenantId: number;
  /** 탭 트리 패널에서 현재 선택된 업무그룹 treeId (null=전체, 0=미배정) — 프리필용 */
  prefillTreeId?: number | null;
  /** 업무그룹 트리 데이터 — TreeSelect 옵션 구성용 */
  treeGroups: CtiQueueGroupResponse[];
  onClose: () => void;
  onSearch: (params: { tenantId: number; keyword?: string; treeIds?: number[]; scope: 'unassigned' | 'all'; limit: number }) => void;
  searchResult: { total: number; items: BsrCtiqSearchItem[] };
  isSearching: boolean;
  onAssign: (targetBsrGroupId: number, ctiqIds: number[]) => void;
  isAssigning: boolean;
}

const LIMIT = 50;

/** CtiQueueGroupResponse[] → antd TreeSelect dataSource 변환 */
function buildTreeSelectData(nodes: CtiQueueGroupResponse[]): object[] {
  return nodes.map((n) => ({
    title: n.treeName,
    value: n.treeId,
    key: n.treeId,
    children: n.children && n.children.length > 0 ? buildTreeSelectData(n.children) : undefined,
  }));
}

/** 트리에서 주어진 treeId 노드를 찾아 반환 */
function findTreeNode(nodes: CtiQueueGroupResponse[], treeId: number): CtiQueueGroupResponse | null {
  for (const n of nodes) {
    if (n.treeId === treeId) return n;
    const found = findTreeNode(n.children ?? [], treeId);
    if (found) return found;
  }
  return null;
}

export default function BsrCtiqAssignModal({
  open,
  targetBsrGroupId,
  targetBsrGroupName,
  tenantId,
  prefillTreeId,
  treeGroups,
  onClose,
  onSearch,
  searchResult,
  isSearching,
  onAssign,
  isAssigning,
}: Props) {
  const [keyword, setKeyword] = useState('');
  const [scope, setScope] = useState<'unassigned' | 'all'>('unassigned');
  const [selectedTreeIds, setSelectedTreeIds] = useState<number[]>([]);
  const [selectedCtiqIds, setSelectedCtiqIds] = useState<number[]>([]);
  const [searched, setSearched] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingCtiqIds, setPendingCtiqIds] = useState<number[]>([]);
  const gridRef = useRef<AgGridReactType<BsrCtiqSearchItem>>(null);
  const { gridOptions } = useAggridOptions();

  // 모달 open 시 초기화 + 프리필
  const handleAfterOpen = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) return;
      setKeyword('');
      setScope('unassigned');
      setSelectedCtiqIds([]);
      setSearched(false);
      // 탭 트리 패널 선택 노드 프리필 (null=전체, 0=미배정 제외)
      if (prefillTreeId != null && prefillTreeId > 0) {
        setSelectedTreeIds([prefillTreeId]);
      } else {
        setSelectedTreeIds([]);
      }
    },
    [prefillTreeId],
  );

  const treeSelectData = useMemo(() => buildTreeSelectData(treeGroups), [treeGroups]);

  const handleSearch = useCallback(() => {
    onSearch({
      tenantId,
      keyword: keyword.trim() || undefined,
      treeIds: selectedTreeIds.length > 0 ? selectedTreeIds : undefined,
      scope,
      limit: LIMIT,
    });
    setSearched(true);
    setSelectedCtiqIds([]);
  }, [tenantId, keyword, selectedTreeIds, scope, onSearch]);

  /** 전체 모드에서만 "소속 BSR그룹" 컬럼 노출 */
  const colDefs: ColDef<BsrCtiqSearchItem>[] = useMemo(
    () => [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 44,
        pinned: 'left' as const,
        suppressHeaderMenuButton: true,
      },
      { field: 'ctiqName', headerName: 'CTI큐명', flex: 1 },
      { field: 'gdnNo', headerName: 'GDN번호', width: 110 },
      { field: 'gdnName', headerName: 'GDN명', width: 130 },
      { field: 'treeName', headerName: '업무그룹명', width: 130, valueFormatter: ({ value }: { value: string | null | undefined }) => value ?? '미배정' },
      ...(scope === 'all'
        ? [
            {
              field: 'bsrGroupName' as keyof BsrCtiqSearchItem,
              headerName: '소속 BSR그룹',
              width: 160,
              valueFormatter: ({ value }: { value: unknown }) => (value ? String(value) : '—'),
            },
          ]
        : []),
    ],
    [scope],
  );

  const handleAssignClick = useCallback(() => {
    if (selectedCtiqIds.length === 0) {
      toast.warning('배정할 CTI큐를 선택하세요');
      return;
    }
    // 타 그룹 소속 큐 건수 확인
    const otherCount = searchResult.items.filter((item) => selectedCtiqIds.includes(item.ctiqId) && item.bsrGroupId != null && item.bsrGroupId !== targetBsrGroupId).length;
    if (otherCount > 0) {
      setPendingCtiqIds([...selectedCtiqIds]);
      setConfirmVisible(true);
    } else {
      onAssign(targetBsrGroupId, selectedCtiqIds);
    }
  }, [selectedCtiqIds, searchResult.items, targetBsrGroupId, onAssign]);

  const handleTransferConfirm = useCallback(() => {
    setConfirmVisible(false);
    onAssign(targetBsrGroupId, pendingCtiqIds);
  }, [targetBsrGroupId, pendingCtiqIds, onAssign]);

  const otherCount = useMemo(
    () => searchResult.items.filter((item) => selectedCtiqIds.includes(item.ctiqId) && item.bsrGroupId != null && item.bsrGroupId !== targetBsrGroupId).length,
    [searchResult.items, selectedCtiqIds, targetBsrGroupId],
  );

  const showLimitNote = searched && searchResult.total > searchResult.items.length;

  return (
    <>
      <Modal
        title={`CTI큐 배정 — [${targetBsrGroupName}]`}
        open={open}
        onCancel={onClose}
        width={880}
        destroyOnClose
        afterOpenChange={handleAfterOpen}
        footer={
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 mr-auto">
              선택 <strong className="text-[#405189]">{selectedCtiqIds.length}</strong>건
            </span>
            <Button onClick={onClose}>취소</Button>
            <Button type="primary" loading={isAssigning} disabled={selectedCtiqIds.length === 0} onClick={handleAssignClick}>
              배정 ({selectedCtiqIds.length})
            </Button>
          </div>
        }
      >
        {/* 검색 조건 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* 업무그룹 TreeSelect (다중, 220px) */}
          <TreeSelect
            style={{ width: 220 }}
            placeholder="업무그룹 선택 (다중)"
            treeData={treeSelectData}
            multiple
            treeCheckable
            showCheckedStrategy={TreeSelect.SHOW_PARENT}
            value={selectedTreeIds}
            onChange={(vals: number[]) => setSelectedTreeIds(vals ?? [])}
            allowClear
            treeDefaultExpandAll
            showSearch
            filterTreeNode={(input, node) =>
              String(node?.title ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            maxTagCount="responsive"
          />
          {/* 큐명 / GDN번호 키워드 */}
          <Input style={{ width: 200 }} placeholder="큐명 / GDN번호" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} allowClear />
          {/* Segmented: 미배정만(기본) / 전체 */}
          <Segmented<'unassigned' | 'all'>
            options={[
              { label: '미배정만', value: 'unassigned' },
              { label: '전체', value: 'all' },
            ]}
            value={scope}
            onChange={(v) => {
              setScope(v);
              setSearched(false);
              setSelectedCtiqIds([]);
            }}
          />
          <Button icon={<Search className="size-3.5" />} type="primary" onClick={handleSearch} loading={isSearching}>
            검색
          </Button>
        </div>

        {/* 총 건수 안내 */}
        {showLimitNote && (
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded mb-2">
            총 <strong>{searchResult.total.toLocaleString()}</strong>건 중 {LIMIT}건 표시 — 업무그룹·검색어로 좁혀 주세요.
          </div>
        )}

        {/* 결과 그리드 */}
        <div style={{ height: 340, position: 'relative' }}>
          {!searched ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 text-sm">
              <Search className="size-8 opacity-30" />
              검색 조건을 입력 후 검색하세요.
            </div>
          ) : searchResult.items.length === 0 && !isSearching ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 text-sm">
              <span className="text-3xl opacity-30">∅</span>
              검색된 데이터가 없습니다.
            </div>
          ) : (
            <AgGridReact<BsrCtiqSearchItem>
              ref={gridRef}
              {...gridOptions}
              rowData={searched ? searchResult.items : []}
              columnDefs={colDefs}
              loading={isSearching}
              rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true }}
              suppressRowClickSelection={false}
              onSelectionChanged={(e) => setSelectedCtiqIds(e.api.getSelectedRows().map((r) => r.ctiqId))}
            />
          )}
        </div>
      </Modal>

      {/* 이관 confirm */}
      <Modal open={confirmVisible} title="CTI큐 이관 확인" okText="확인" cancelText="취소" onOk={handleTransferConfirm} onCancel={() => setConfirmVisible(false)} width={400}>
        <p className="text-sm text-gray-700">
          선택 {pendingCtiqIds.length}건 중 {otherCount}건은 다른 BSR 그룹 소속입니다. [{targetBsrGroupName}](으)로 이관됩니다.
        </p>
      </Modal>
    </>
  );
}
