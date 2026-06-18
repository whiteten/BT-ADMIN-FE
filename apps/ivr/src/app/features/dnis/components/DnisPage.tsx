/**
 * IVR 서비스 번호 관리 페이지 — AS-IS IPR20S6030 마이그레이션.
 *
 * <p>레이아웃: IVR/IPRON 표준 카드 슬라이더 스킨(ExtAdaptorList·McsDnis 동일).
 *   3개의 flat 박스(bg-white bt-shadow) — ① 노드 탭 헤더 ② 테넌트 카드 슬라이더 ③ DNIS 그리드.</p>
 * <p>데이터는 (노드 + 테넌트) 2단계 선택 → 둘 다 선택 시 그리드 로드.
 *   API/hooks/types·Sheet·Modal·ImportButton 은 변경 없이 그대로 재사용(화면 스킨만 표준화).</p>
 */
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input, Popconfirm, Tag } from 'antd';
import { Building2, ChevronLeft, ChevronRight, Copy, Download, Network, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DnisBatchCopyModal, { type DnisBatchCopyModalRef } from './DnisBatchCopyModal';
import DnisExcelImportButton from './DnisExcelImportButton';
import DnisSheet, { type DnisSheetRef } from './DnisSheet';
import { useGetTenants } from '../../ivr-ain-dnis/hooks/useIvrAinDnisQueries';
import { useGetNodes } from '../../ivr-dn-group/hooks/useIvrDnGroupQueries';
import { dnisQueryKeys, useDeleteDnis, useGetDnisList } from '../hooks/useDnisQueries';
import type { DnisItem } from '../types/dnis.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb = [
  { title: '시나리오 관리', path: '/ivr/scenario/dnis' },
  { title: 'IVR 서비스 번호 관리', path: '/ivr/scenario/dnis' },
];

export default function DnisPage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();

  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState('');
  const [confirmedKeyword, setConfirmedKeyword] = useState('');
  const [selectedRows, setSelectedRows] = useState<DnisItem[]>([]);

  const sheetRef = useRef<DnisSheetRef>(null);
  const batchCopyRef = useRef<DnisBatchCopyModalRef>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);

  const { data: nodes = [] } = useGetNodes();
  const { data: tenants = [] } = useGetTenants();

  // 진입 시 첫 노드 자동 선택
  useEffect(() => {
    if (!selectedNodeId && nodes.length > 0) {
      setSelectedNodeId(nodes[0].nodeId);
    }
  }, [nodes, selectedNodeId]);

  // 첫 테넌트 자동 선택
  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].tenantId);
    }
  }, [tenants, selectedTenantId]);

  const { data: dnisList = [], isFetching } = useGetDnisList({
    params: selectedNodeId && selectedTenantId ? { nodeId: selectedNodeId, tenantId: selectedTenantId, dnisNo: confirmedKeyword || undefined } : undefined,
    queryOptions: { enabled: !!selectedNodeId && !!selectedTenantId },
  });

  const { mutate: deleteMutate } = useDeleteDnis({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: dnisQueryKeys.list._def });
        setSelectedRows([]);
      },
      onError: (err) => toast.error(`삭제 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const handleDelete = () => {
    if (selectedRows.length === 0) {
      toast.warning('삭제할 항목을 선택하세요.');
      return;
    }
    selectedRows.forEach((row) => {
      deleteMutate({ dnisNo: row.dnisNo, serviceId: row.serviceId, nodeId: row.nodeId });
    });
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    if (!e.target.value.trim()) setConfirmedKeyword('');
  };

  const columnDefs: ColDef<DnisItem>[] = useMemo(
    () => [
      { headerName: '서비스번호', field: 'dnisNo', width: 120, cellClass: 'font-mono' },
      { headerName: '서비스번호명', field: 'dnisName', flex: 1, minWidth: 180 },
      {
        headerName: '시나리오타입',
        field: 'serviceTypeName',
        width: 110,
        cellRenderer: (p: ICellRendererParams<DnisItem>) => (
          <Tag color="blue" className="!m-0">
            {p.value ?? '-'}
          </Tag>
        ),
      },
      { headerName: '시나리오명', field: 'serviceName', flex: 1, minWidth: 160 },
      { headerName: '통신사', field: 'telcoKindName', width: 90 },
      { headerName: '설명', field: 'dnisDesc', flex: 1.2, minWidth: 180, tooltipField: 'dnisDesc' },
    ],
    [],
  );

  const selectedNode = useMemo(() => nodes.find((n) => n.nodeId === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const selectedTenant = useMemo(() => tenants.find((t) => t.tenantId === selectedTenantId) ?? null, [tenants, selectedTenantId]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <DnisSheet ref={sheetRef} selectedNode={selectedNode ? { nodeId: selectedNode.nodeId, nodeName: selectedNode.nodeName } : null} selectedTenantId={selectedTenantId} />
      <DnisBatchCopyModal ref={batchCopyRef} />

      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== ① 노드 탭 바 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              aria-label="이전 탭"
            >
              <ChevronLeft className="size-4 text-gray-500" />
            </button>
            <div ref={tabScrollRef} className="flex items-stretch max-w-[900px] min-w-0 overflow-x-auto divide-x divide-gray-200" style={{ scrollbarWidth: 'none' }}>
              {nodes.map((node) => {
                const isActive = selectedNodeId === node.nodeId;
                return (
                  <button
                    key={node.nodeId}
                    type="button"
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[140px] flex-shrink-0 transition-colors ${
                      isActive ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                    }`}
                    onClick={(e) => {
                      setSelectedNodeId(node.nodeId);
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }}
                  >
                    <Network className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{node.nodeName}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              aria-label="다음 탭"
            >
              <ChevronRight className="size-4 text-gray-500" />
            </button>
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="서비스번호 검색"
                value={keyword}
                onChange={handleSearchChange}
                onPressEnter={() => setConfirmedKeyword(keyword.trim())}
                style={{ width: 200 }}
              />
            </div>
          </div>
        </div>

        {/* ===== ② 테넌트 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 py-3 h-[150px]">
            {tenants.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
                <Empty description={false} imageStyle={{ height: 36 }} />
                <span className="text-sm">테넌트가 없습니다</span>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 w-full">
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none' }}>
                  {tenants.map((t) => {
                    const isSel = selectedTenantId === t.tenantId;
                    return (
                      <div
                        key={t.tenantId}
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[110px] flex-shrink-0 flex flex-col ${
                          isSel ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={(e) => {
                          setSelectedTenantId(t.tenantId);
                          (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5 min-w-0">
                          <Building2 className="size-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-800 truncate">{t.tenantName}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          테넌트 ID: <b className="text-gray-700">{t.tenantId}</b>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
              </div>
            )}
          </div>
        </div>

        {/* ===== ③ DNIS 그리드 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div>
              <div className="text-sm font-semibold text-gray-800">
                서비스번호별 시나리오
                {selectedNode && selectedTenant && (
                  <span className="ml-2 text-[12px] font-normal text-gray-400">
                    {selectedNode.nodeName} · {selectedTenant.tenantName}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                총 <b>{dnisList.length}</b>건 · 선택 <b>{selectedRows.length}</b>건
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedRows.length > 0 && (
                <Popconfirm title={`${selectedRows.length}건을 삭제할까요?`} onConfirm={handleDelete} okText="삭제" cancelText="취소">
                  <Button color="red" variant="solid" icon={<Trash2 className="size-3.5" />}>
                    선택 삭제
                  </Button>
                </Popconfirm>
              )}
              <Button icon={<Copy className="size-3.5" />} onClick={() => selectedNodeId && batchCopyRef.current?.open(selectedNodeId)} disabled={!selectedNodeId}>
                일괄복사
              </Button>
              <DnisExcelImportButton selectedNode={selectedNode ? { nodeId: selectedNode.nodeId } : null} selectedTenantId={selectedTenantId} />
              <Button color="cyan" variant="solid" icon={<Download className="size-3.5" />} onClick={() => exportToExcel(dnisList)} disabled={dnisList.length === 0}>
                내보내기
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => sheetRef.current?.openCreate()} disabled={!selectedNodeId || !selectedTenantId}>
                추가
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {selectedNode && selectedTenant ? (
              <AgGridReact<DnisItem>
                rowData={dnisList}
                columnDefs={columnDefs}
                gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                loading={isFetching}
                getRowId={(p) => `${p.data.nodeId}-${p.data.dnisNo}-${p.data.serviceId}`}
                defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
                onSelectionChanged={(e) => setSelectedRows(e.api.getSelectedRows())}
                onRowDoubleClicked={(e) => e.data && sheetRef.current?.openEdit(e.data)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <Empty description={false} />
                <span className="text-sm">상단에서 노드와 테넌트를 선택하세요</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 엑셀 내보내기 — 브라우저 측 단순 CSV (시트JS 의존성 없이 일단). */
function exportToExcel(rows: DnisItem[]) {
  if (rows.length === 0) {
    toast.warning('내보낼 데이터가 없습니다.');
    return;
  }
  const header = ['DNIS', '서비스번호명', '시나리오명', '시나리오타입', '통신사', '설명'];
  const lines = [header.join(',')];
  rows.forEach((r) => {
    lines.push([r.dnisNo, r.dnisName, r.serviceName, r.serviceTypeName, r.telcoKindName, r.dnisDesc ?? ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  });
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dnis_${new Date().getTime()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
