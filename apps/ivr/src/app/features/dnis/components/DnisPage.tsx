/**
 * IVR 서비스 번호 관리 페이지 — AS-IS IPR20S6030 마이그레이션.
 *
 * <p>레이아웃: 2개의 flat 박스(bg-white bt-shadow) — ① 툴바(노드 셀렉트 + 운영자모드 테넌트 스코프) ② DNIS 그리드.</p>
 * <p>노드는 필수 단일 선택(Select). 테넌트는 운영자모드에서만 ScopeSelect 로 대행/전체 전환하고,
 *   비운영자는 서버가 JWT 테넌트로 자동 스코프(선택 UI 없음).
 *   API/hooks/types·Sheet·Modal·ImportButton 은 변경 없이 그대로 재사용(화면 스킨만 표준화).</p>
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Popconfirm, Select } from 'antd';
import { Copy, Download, Network, Phone, Plus, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DnisBatchCopyModal, { type DnisBatchCopyModalRef } from './DnisBatchCopyModal';
import DnisExcelImportButton from './DnisExcelImportButton';
import DnisSheet, { type DnisSheetRef } from './DnisSheet';
import { useGetNodes } from '../../ivr-dn-group/hooks/useIvrDnGroupQueries';
import { SCENARIO_TYPE_COLORS } from '../../scenario/types';
import { dnisQueryKeys, useDeleteDnis, useGetDnisList } from '../hooks/useDnisQueries';
import type { DnisItem } from '../types/dnis.types';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb = [
  { title: '시나리오 관리', path: '/ivr/scenario/dnis' },
  { title: 'IVR 서비스 번호 관리', path: '/ivr/scenario/dnis' },
];

// 시나리오타입 뱃지 — 색상은 SCENARIO_TYPE_COLORS(도메인 SoT, scenario/types)로 화면 전반 통일.
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';
const DEFAULT_BADGE_CLASS = 'text-gray-500 bg-gray-100';

export default function DnisPage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): 헤더 미전달 → 서버가 TenantContext.isViewAllTenants() 로 전 테넌트 조회
  //  - 대행(actAsTenantId=X): apiClient 가 X-Act-As-Tenant 주입 → X 테넌트로 조회 스코프
  //  - 비운영자: 헤더 미주입 → 서버가 JWT 테넌트 기준으로 자신의 DNIS만 반환
  const myTenantId = useAuthStore((s) => (s.userInfo?.tenant ? Number(s.userInfo.tenant) : null));
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants ?? []);
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const actAsTenantIdNum = actAsTenantId !== null ? Number(actAsTenantId) : null;
  // 추가/가져오기(신규 row 생성) 대상 테넌트 — "전체" 스코프는 대상이 모호해 비활성 처리.
  const writeTargetTenantId = operatorMode ? actAsTenantIdNum : myTenantId;
  const showTenantColumn = operatorMode && actAsTenantId === null;

  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<DnisItem[]>([]);

  const sheetRef = useRef<DnisSheetRef>(null);
  const batchCopyRef = useRef<DnisBatchCopyModalRef>(null);

  const { data: nodes = [] } = useGetNodes();

  // 진입 시 첫 노드 자동 선택
  useEffect(() => {
    if (!selectedNodeId && nodes.length > 0) {
      setSelectedNodeId(nodes[0].nodeId);
    }
  }, [nodes, selectedNodeId]);

  const handleScopeChange = (tenantId: string | null) => {
    setActAsTenant(tenantId);
    setSelectedRows([]);
    void queryClient.invalidateQueries({ queryKey: dnisQueryKeys.list._def });
  };

  const { data: dnisList = [], isFetching } = useGetDnisList({
    params: selectedNodeId ? { nodeId: selectedNodeId } : undefined,
    queryOptions: { enabled: !!selectedNodeId },
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

  const columnDefs: ColDef<DnisItem>[] = useMemo(
    () => [
      { headerName: '테넌트', field: 'tenantName', flex: 2, hide: !showTenantColumn },
      { headerName: '서비스번호', field: 'dnisNo', flex: 2, cellClass: 'font-mono' },
      { headerName: '서비스번호명', field: 'dnisName', flex: 3 },
      {
        headerName: '시나리오타입',
        field: 'serviceTypeName',
        flex: 2,
        cellRenderer: (p: ICellRendererParams<DnisItem>) => {
          if (!p.data) return null;
          const color = p.data.serviceType != null ? SCENARIO_TYPE_COLORS[String(p.data.serviceType)] : null;
          return <Badge className={cn(BADGE_CLASS, color ? `${color.bg} ${color.text}` : DEFAULT_BADGE_CLASS)}>{p.data.serviceTypeName ?? '-'}</Badge>;
        },
      },
      { headerName: '시나리오명', field: 'serviceName', flex: 3 },
      { headerName: '통신사', field: 'telcoKindName', flex: 2 },
      { headerName: '설명', field: 'dnisDesc', flex: 3, tooltipField: 'dnisDesc' },
    ],
    [showTenantColumn],
  );

  const selectedNode = useMemo(() => nodes.find((n) => n.nodeId === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <DnisSheet ref={sheetRef} selectedNode={selectedNode ? { nodeId: selectedNode.nodeId, nodeName: selectedNode.nodeName } : null} selectedTenantId={writeTargetTenantId} />
      <DnisBatchCopyModal ref={batchCopyRef} />

      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== ① 툴바(노드 셀렉트 + 운영자모드 테넌트 스코프) ===== */}
        <div className="bg-white bt-shadow flex-shrink-0 px-5 h-[56px]">
          <header className="flex items-center gap-2 flex-wrap h-full">
            {/* 노드 필터 */}
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Network className="size-3.5 shrink-0 text-blue-600" />
              <Select<number>
                size="small"
                variant="borderless"
                value={selectedNodeId ?? undefined}
                onChange={setSelectedNodeId}
                options={nodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))}
                placeholder="노드 선택"
                style={{ width: 190 }}
                popupMatchSelectWidth={false}
              />
            </div>
            {operatorMode && (
              <ScopeSelect kind="tenant" options={availableTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))} value={actAsTenantId} onChange={handleScopeChange} />
            )}
          </header>
        </div>

        {/* ===== ② DNIS 그리드 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-[#405189]" />
              <h3 className="text-sm font-semibold text-gray-800">
                서비스번호별 시나리오 — <span className="text-[#405189]">{selectedNode?.nodeName ?? ''}</span>
              </h3>
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{dnisList.length}개</span>
              {selectedRows.length > 0 && <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-blue-600 bg-blue-50">선택 {selectedRows.length}개</span>}
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
              <DnisExcelImportButton selectedNode={selectedNode ? { nodeId: selectedNode.nodeId } : null} selectedTenantId={writeTargetTenantId} />
              <Button color="cyan" variant="solid" icon={<Download className="size-3.5" />} onClick={() => exportToExcel(dnisList)} disabled={dnisList.length === 0}>
                내보내기
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => sheetRef.current?.openCreate()} disabled={!selectedNodeId || !writeTargetTenantId}>
                추가
              </Button>
            </div>
          </div>
          <div className="border-t border-gray-200" />
          <div className="flex-1 min-h-0 p-5">
            {selectedNode ? (
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
              <div className="flex items-center justify-center h-full">
                <Empty description="상단에서 노드를 선택하세요" />
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
