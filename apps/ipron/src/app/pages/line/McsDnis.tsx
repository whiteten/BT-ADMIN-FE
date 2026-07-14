/**
 * DNIS 관리 (MCS) 메인 페이지
 * AS-IS: IPR20S1033
 *
 * 상단: 통신사 탭(전체/공통/KT/SKT/LGU+) + GDN 카드 슬라이더
 * 하단: 선택된 GDN의 DNIS 그리드
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, RowSelectionOptions, SelectionChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input, Select } from 'antd';
import { ChevronDown, Layers, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DnisDrawer, { type DnisDrawerRef } from '../../features/mcs-dnis/components/DnisDrawer';
import GdnCardSlider from '../../features/mcs-dnis/components/GdnCardSlider';
import GdnDrawer, { type GdnDrawerRef } from '../../features/mcs-dnis/components/GdnDrawer';
import { mcsDnisQueryKeys, useDeleteMcsDnis, useDeleteMcsGdn, useGetMcsDnisList, useGetMcsGdns, useGetNodes } from '../../features/mcs-dnis/hooks/useMcsDnisQueries';
import { type McsdDnis, type McsdGdn, NETWORK_OPERATOR_LABELS, NETWORK_OPERATOR_OPTIONS, type NetworkOperator } from '../../features/mcs-dnis/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '미디어 관리', path: '/ipron/line/mcs-dnis' },
  { title: 'DNIS관리(MCS)', path: '/ipron/line/mcs-dnis' },
];

export default function McsDnis() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────
  // null = 전체, '0'~'3' = 통신사 필터
  const [selectedOp, setSelectedOp] = useState<NetworkOperator | null>(null);
  const [selectedGdnNo, setSelectedGdnNo] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedDnis, setSelectedDnis] = useState<McsdDnis[]>([]);

  // ─── Refs ───────────────────────────────────────────────────────────────
  const gdnDrawerRef = useRef<GdnDrawerRef>(null);
  const dnisDrawerRef = useRef<DnisDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: gdnList = [], isLoading: isGdnLoading } = useGetMcsGdns();
  const { data: nodes = [] } = useGetNodes();

  // 검색 활성 여부
  const isSearching = searchText.trim().length > 0;

  // 전체 DNIS (검색용) — gdnNo 없이 호출 시 전체 조회
  const { data: allDnisList = [] } = useGetMcsDnisList({
    params: undefined,
    queryOptions: { enabled: true },
  });

  // 검색 키워드 매칭되는 DNIS
  const searchMatchedDnis = useMemo(() => {
    if (!isSearching) return [] as McsdDnis[];
    const kw = searchText.trim().toLowerCase();
    return allDnisList.filter((d) => [d.mcsdGdnNo, d.startDnis, d.nodeName, String(d.count)].some((v) => v?.toString().toLowerCase().includes(kw)));
  }, [allDnisList, isSearching, searchText]);

  // 매칭 DNIS가 속한 GDN 번호 set
  const matchedGdnNoSet = useMemo(() => {
    if (!isSearching) return null;
    return new Set(searchMatchedDnis.map((d) => d.mcsdGdnNo));
  }, [isSearching, searchMatchedDnis]);

  // 통신사 + 검색 조건이 적용된 GDN 카드 목록
  const filteredGdnList = useMemo(() => {
    let list = gdnList;
    if (matchedGdnNoSet) list = list.filter((g) => matchedGdnNoSet.has(g.mcsdGdnNo));
    if (selectedOp !== null) list = list.filter((g) => g.networkOp === selectedOp);
    return list;
  }, [gdnList, matchedGdnNoSet, selectedOp]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      setSelectedOp(null);
      setSelectedGdnNo(null);
    }
  };

  const selectedGdn = useMemo(() => (selectedGdnNo ? (gdnList.find((g) => g.mcsdGdnNo === selectedGdnNo) ?? null) : null), [gdnList, selectedGdnNo]);

  // 통신사 변경 시 다른 통신사에 속한 GDN 선택 자동 해제
  useEffect(() => {
    if (selectedOp === null || !selectedGdn) return;
    if (selectedGdn.networkOp !== selectedOp) {
      setSelectedGdnNo(null);
    }
  }, [selectedOp, selectedGdn]);

  // Auto-select: 진입 시 첫 번째 GDN 카드 자동 선택
  useEffect(() => {
    if (!selectedGdnNo && filteredGdnList.length > 0 && !isSearching) {
      setSelectedGdnNo(filteredGdnList[0].mcsdGdnNo);
    }
  }, [filteredGdnList, selectedGdnNo, isSearching]);

  const dnisParams = useMemo(() => (selectedGdnNo ? { gdnNo: selectedGdnNo } : undefined), [selectedGdnNo]);
  const { data: selectedGdnDnisList = [], isLoading: isDnisLoading } = useGetMcsDnisList({
    params: dnisParams,
    queryOptions: { enabled: !!selectedGdnNo && !isSearching },
  });

  // 그리드에 표시할 DNIS:
  //  - 검색 중: searchMatchedDnis (선택 GDN 있으면 그 GDN으로 추가 필터)
  //  - 검색 아님: 선택된 GDN의 DNIS
  const dnisList = useMemo(() => {
    if (isSearching) {
      return selectedGdnNo ? searchMatchedDnis.filter((d) => d.mcsdGdnNo === selectedGdnNo) : searchMatchedDnis;
    }
    return selectedGdnDnisList;
  }, [isSearching, searchMatchedDnis, selectedGdnDnisList, selectedGdnNo]);

  // ─── Invalidation ───────────────────────────────────────────────────────
  const invalidateGdnList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: mcsDnisQueryKeys.getGdnList().queryKey });
  }, [queryClient]);

  const invalidateDnisList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: mcsDnisQueryKeys.getDnisList(dnisParams).queryKey });
  }, [queryClient, dnisParams]);

  // 대표번호 등록 성공 시 해당 통신사 + 대표번호로 포커싱
  const handleGdnDrawerSuccess = useCallback(
    (created?: { mcsdGdnNo: string; networkOp: NetworkOperator }) => {
      invalidateGdnList();
      if (created) {
        setSelectedOp(created.networkOp);
        setSelectedGdnNo(created.mcsdGdnNo);
      }
    },
    [invalidateGdnList],
  );

  // ─── GDN CUD ───────────────────────────────────────────────────────────
  const { mutate: deleteGdn } = useDeleteMcsGdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('대표번호가 삭제되었습니다');
        setSelectedGdnNo(null);
        invalidateGdnList();
      },
    },
  });

  const handleCreateGdn = useCallback(() => {
    gdnDrawerRef.current?.open(undefined, selectedOp);
  }, [selectedOp]);

  const handleEditGdn = useCallback((gdn: McsdGdn) => {
    gdnDrawerRef.current?.open(gdn);
  }, []);

  const handleDeleteGdn = useCallback(
    (gdn: McsdGdn) => {
      modal.confirm.execute({
        onOk: () => deleteGdn({ gdnNo: gdn.mcsdGdnNo }),
        options: {
          title: '대표번호 삭제',
          content: `"${gdn.mcsdGdnNo}" 대표번호를 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteGdn],
  );

  // ─── DNIS CUD ──────────────────────────────────────────────────────────
  const { mutate: deleteDnis } = useDeleteMcsDnis({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DNIS가 삭제되었습니다');
        invalidateDnisList();
      },
    },
  });

  const handleCreateDnis = useCallback(() => {
    if (!selectedGdn) {
      toast.error('대표번호를 먼저 선택하세요');
      return;
    }
    dnisDrawerRef.current?.open(undefined, selectedGdn.mcsdGdnNo, nodes);
  }, [selectedGdn, nodes]);

  const handleDeleteSelectedDnis = useCallback(() => {
    if (selectedDnis.length === 0) return;
    modal.confirm.execute({
      onOk: () => {
        selectedDnis.forEach((dnis) =>
          deleteDnis({
            gdnNo: dnis.mcsdGdnNo,
            seq: dnis.seq,
            nodeId: dnis.nodeId,
          }),
        );
        setSelectedDnis([]);
      },
      options: {
        title: 'DNIS 삭제',
        content: `선택한 ${selectedDnis.length}건을 삭제하시겠습니까?`,
      },
    });
  }, [modal, deleteDnis, selectedDnis]);

  // GDN 번호 → 통신사 매핑 (그리드에서 통신사 컬럼 표시용)
  const gdnNoToOpMap = useMemo(() => {
    const map = new Map<string, NetworkOperator>();
    for (const g of gdnList) map.set(g.mcsdGdnNo, g.networkOp);
    return map;
  }, [gdnList]);

  // ─── Row selection ──────────────────────────────────────────────────────
  const dnisRowSelection = useMemo<RowSelectionOptions>(
    () => ({ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }),
    [],
  );

  // ─── ag-Grid Column Defs ───────────────────────────────────────────────
  const columnDefs: ColDef<McsdDnis>[] = useMemo(
    () => [
      {
        headerName: '통신사',
        colId: 'networkOp',
        flex: 0.8,
        minWidth: 90,
        valueGetter: (params) => {
          const op = params.data ? gdnNoToOpMap.get(params.data.mcsdGdnNo) : undefined;
          return op ? NETWORK_OPERATOR_LABELS[op] : '-';
        },
      },
      { headerName: '대표번호', field: 'mcsdGdnNo', flex: 1.2, minWidth: 140, tooltipField: 'mcsdGdnNo' },
      {
        headerName: '노드명',
        field: 'nodeName',
        flex: 1,
        minWidth: 120,
        tooltipField: 'nodeName',
        valueFormatter: (params) => params.data?.nodeName ?? (params.data?.nodeId ? `노드 ${params.data.nodeId}` : '-'),
      },
      { headerName: '시작DNIS', field: 'startDnis', flex: 1.2, minWidth: 140, tooltipField: 'startDnis' },
      { headerName: '개수', field: 'count', flex: 0.6, minWidth: 80, filter: 'agNumberColumnFilter' },
    ],
    [gdnNoToOpMap],
  );

  const gridHeaderText = useMemo(() => {
    if (isSearching && !selectedGdn) return `검색 결과 DNIS (${dnisList.length}건)`;
    if (!selectedGdn) return 'DNIS 목록';
    const telco = NETWORK_OPERATOR_LABELS[selectedGdn.networkOp] ?? '';
    return `${telco} / ${selectedGdn.mcsdGdnNo} DNIS (${dnisList.length}건)`;
  }, [selectedGdn, dnisList.length, isSearching]);

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 통신사 Select + 검색 + 추가 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 h-[56px] gap-3">
            {/* 통신사 선택 */}
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Layers className="size-3.5 shrink-0 text-blue-600" />
              <Select
                size="small"
                variant="borderless"
                value={selectedOp ?? '__all__'}
                onChange={(v) => setSelectedOp(v === '__all__' ? null : (v as NetworkOperator))}
                options={[{ value: '__all__', label: '전체' }, ...NETWORK_OPERATOR_OPTIONS]}
                style={{ width: 150 }}
                popupMatchSelectWidth={false}
              />
            </div>

            {/* 요약 — 총 대표번호 */}
            <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
              <span className="text-gray-500">
                총 대표번호 <b className="text-gray-800 font-semibold">{filteredGdnList.length.toLocaleString()}</b>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="DNIS 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreateGdn}>
                대표번호 추가
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 카드 슬라이더 박스 (GDN) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* 대표번호 카드 — 항상 펼침 */}
          <GdnCardSlider
            gdnList={filteredGdnList}
            isLoading={isGdnLoading}
            selectedGdnNo={selectedGdnNo}
            onSelect={setSelectedGdnNo}
            onEdit={handleEditGdn}
            onDelete={handleDeleteGdn}
          />
        </div>

        {/* ===== 하단: DNIS 그리드 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
            <div className="flex items-center gap-2">
              <Button danger icon={<Trash2 className="size-3.5" />} disabled={selectedDnis.length === 0} onClick={handleDeleteSelectedDnis}>
                삭제
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreateDnis} disabled={!selectedGdn}>
                DNIS 추가
              </Button>
            </div>
          </div>

          <div className="flex-1">
            {selectedGdn || isSearching ? (
              <AgGridReact<McsdDnis>
                rowData={dnisList}
                columnDefs={columnDefs}
                gridOptions={{
                  ...gridOptions,
                  statusBar: undefined,
                  pagination: false,
                  sideBar: false,
                }}
                rowSelection={dnisRowSelection}
                loading={isDnisLoading}
                getRowId={(params) => `${params.data.mcsdGdnNo}-${params.data.seq}-${params.data.nodeId}`}
                defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
                onRowDoubleClicked={() => {
                  // 더블클릭 무반응 (수정 불가 항목)
                }}
                onSelectionChanged={(e: SelectionChangedEvent<McsdDnis>) => {
                  setSelectedDnis(e.api.getSelectedRows());
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Empty description="상단에서 대표번호를 선택하거나 DNIS를 검색하세요" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Drawers ===== */}
      <GdnDrawer ref={gdnDrawerRef} onSuccess={handleGdnDrawerSuccess} />
      <DnisDrawer ref={dnisDrawerRef} onSuccess={invalidateDnisList} />
    </div>
  );
}
