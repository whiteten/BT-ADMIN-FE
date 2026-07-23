/**
 * DN 관리 목록 페이지 (IPR20S2020)
 *
 * 멀티테넌트 개편(상담사 관리 / 내선 프로파일 정합): byNode/byTenant 뷰전환 + 탭바 + 카드 슬라이더 제거
 *   → 상단에 테넌트 ScopeSelect + 노드 Select 두 필터(각 "전체" 포함) + 요약.
 *   기본 순서 테넌트→노드, 가운데 ↔ 버튼으로 순서 스위칭 가능.
 *   노드는 서버 param(nodeId) — 노드 변경 시 서버 재조회, "전체 노드"는 nodeId 미전달.
 *   테넌트/검색은 클라이언트 필터.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────────────┐
 * │ [노드▼] [테넌트▼]  총/활성/비활성   🔍[검색] [엑셀][가져오기] │ ← 헤더
 * ├──────────────────────────────────────────────────────────────┤
 * │ {헤더 텍스트} [삭제][여유번호][복사][일괄등록][등록]          │
 * ├──────────────────────────────────────────────────────────────┤
 * │ ag-Grid (필터된 DN 목록, 체크박스 다건)                        │
 * └──────────────────────────────────────────────────────────────┘
 *
 * 더블클릭 → 수정 페이지 이동
 * 체크 다건 + 상단 "삭제" → 일괄 삭제
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Empty, Input, Modal, Select, Table } from 'antd';
import { ArrowLeftRight, Download, Network, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { dnApi } from '../../features/dn/api/dnApi';
import DnBatchDialog from '../../features/dn/components/DnBatchDialog';
import DnBulkDeleteModal from '../../features/dn/components/DnBulkDeleteModal';
import DnCopyDrawer from '../../features/dn/components/DnCopyDrawer';
import DnImportDrawer from '../../features/dn/components/DnImportDrawer';
import DnTable from '../../features/dn/components/DnTable';
import { dnQueryKeys, useDeleteDns, useGetDnOptions, useGetDns } from '../../features/dn/hooks/useDnQueries';
import type { DnResponse } from '../../features/dn/types';
import { useGetDnProfileNodes } from '../../features/dn-profile/hooks/useDnProfileQueries';
import { nodeScopeQueryKeys } from '../../features/node-scope/hooks/useNodeScope';
import { useNodeTenantScope } from '../../features/node-scope/hooks/useNodeTenantScope';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '번호자원관리' }, { title: '교환기 번호관리' }, { title: '내선', path: '/ipron/dn' }];

export default function DnList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();

  // ─── State ────────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<DnResponse[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  // 갭7: 여유번호 검색 다이얼로그
  const [freeDnOpen, setFreeDnOpen] = useState(false);
  const [freeDnStartNo, setFreeDnStartNo] = useState('');
  const [freeDnEndNo, setFreeDnEndNo] = useState('');
  const [freeDnResult, setFreeDnResult] = useState<string[] | null>(null);
  const [freeDnLoading, setFreeDnLoading] = useState(false);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: allNodes = [] } = useGetDnProfileNodes();

  // 테넌트↔노드 스코프 — 공통 규칙(기본 테넌트→노드, ↔로 뒤집기). useNodeTenantScope 참조.
  const {
    operatorMode,
    tenantFirst,
    toggleOrder,
    nodes: assignedNodes,
    tenants: assignedTenants,
    selectedNodeId,
    setSelectedNodeId,
    tenantFilter,
    setTenantFilter,
    selectedTenantId,
    selectedTenantName,
  } = useNodeTenantScope(allNodes);

  // 목록 조회 파라미터 — 노드만 서버 필터(nodeId). "전체 노드"는 nodeId 미전달.
  // 테넌트 + 텍스트 검색은 클라이언트 필터.
  const listParams = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (selectedNodeId) p.nodeId = selectedNodeId;
    return p;
  }, [selectedNodeId]);

  const { data: dns = [], isLoading: isDnsLoading } = useGetDns({ params: listParams });

  // 폼 옵션 (COS / 프로파일) — 선택된 노드+테넌트 있을 때만
  const optionsParams = useMemo(() => {
    if (selectedNodeId && selectedTenantId) {
      return { nodeId: selectedNodeId, tenantId: selectedTenantId };
    }
    return null;
  }, [selectedNodeId, selectedTenantId]);
  const { data: options } = useGetDnOptions(optionsParams);
  const profileOptions = useMemo(() => options?.dnProfiles ?? [], [options]);
  const cosOptions = useMemo(() => options?.cos ?? [], [options]);

  // ─── Derived — 테넌트/검색 클라이언트 필터 ────────────────────────────────
  const dnsForGrid = useMemo(() => {
    let rows = dns;
    if (selectedTenantId != null) rows = rows.filter((d) => d.tenantId === selectedTenantId);
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      rows = rows.filter((d) => {
        const fields: (string | number | null | undefined)[] = [
          d.dnNo,
          d.loginAdn,
          d.ipv4Address,
          d.ipv6Address,
          d.md5Authid,
          d.dnProfileName,
          d.cosName,
          d.deviceTypeName,
          d.tenantName,
          d.nodeName,
        ];
        return fields.some((f) => f != null && String(f).toLowerCase().includes(kw));
      });
    }
    return rows;
  }, [dns, selectedTenantId, searchText]);

  // 헤더 요약 — 현재 필터 기준 총/활성/비활성 (dnStatus '1' = 활성).
  const summary = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const d of dnsForGrid) {
      if (d.dnStatus === '1') active += 1;
      else inactive += 1;
    }
    return { total: dnsForGrid.length, active, inactive };
  }, [dnsForGrid]);

  const invalidateDns = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dnQueryKeys.getList._def });
    queryClient.invalidateQueries({ queryKey: nodeScopeQueryKeys.getNodeTenants.queryKey });
  }, [queryClient]);

  // ─── Mutations ────────────────────────────────────────────────────────────
  const { mutate: deleteDns, isPending: isDeleting } = useDeleteDns({
    mutationOptions: {
      onSuccess: () => {
        toast.success('선택한 DN이 삭제되었습니다');
        setSelectedRows([]);
        invalidateDns();
      },
    },
  });

  // 일괄 등록은 DnBatchDialog(Drawer) 내부에서 청크 분할 + Progress 처리.
  // 부모는 onSuccess 에서 Drawer 닫기 + 목록 갱신만 담당.

  // ─── DN actions ───────────────────────────────────────────────────────────
  const handleDnCreate = () => {
    const params = new URLSearchParams();
    if (selectedNodeId) params.set('nodeId', String(selectedNodeId));
    if (selectedTenantId) params.set('tenantId', String(selectedTenantId));
    const qs = params.toString();
    navigate(`/ipron/dn/create${qs ? `?${qs}` : ''}`);
  };

  const handleDnEdit = (dn: DnResponse) => {
    navigate(`/ipron/dn/${dn.dnId}/edit`);
  };

  // 갭6: 삭제 전 SCA/SNR 연관 건수 확인 (SWAT IPR20S2020S_RelationCount 정합)
  // SCA/SNR 존재 시 삭제 차단 후 안내 메시지 표시
  const handleDnDelete = async (dn: DnResponse) => {
    try {
      const relationCount = await dnApi.getRelationCount(dn.dnId);
      if (relationCount > 0) {
        Modal.error({
          title: '삭제 불가',
          content: `"${dn.dnNo}" 내선은 SCA 또는 SNR 정보(${relationCount}건)를 포함하고 있어 삭제할 수 없습니다.\n내선 상세에서 해당 정보를 먼저 삭제 후 다시 시도해주세요.`,
        });
        return;
      }
    } catch {
      // 관계 조회 실패 시 경고 후 진행 허용
      toast.warning('연관 데이터 조회에 실패했습니다. 삭제 진행 시 주의하세요');
    }
    modal.confirm.execute({
      onOk: () => deleteDns([dn.dnId]),
      options: {
        title: '내선 삭제',
        content: `"${dn.dnNo}" 내선을 삭제하시겠습니까?`,
      },
    });
  };

  const handleDnDeleteSelected = () => {
    if (selectedRows.length === 0) return;
    // 대량/소량 모두 Bulk Delete Modal 로 통일 — 진행률 + 청크 분할 호출 일관된 UX
    setBulkDeleteOpen(true);
  };

  // 갭7: 여유번호 검색 핸들러 (SWAT IPR20S2020_FreeDn.jsp doRemainNumSearch() 정합)
  const handleFreeDnSearch = async () => {
    if (!selectedNodeId) {
      toast.warning('노드를 선택해주세요');
      return;
    }
    if (!freeDnStartNo) {
      toast.warning('시작DN을 입력해주세요');
      return;
    }
    if (!freeDnEndNo) {
      toast.warning('끝DN을 입력해주세요');
      return;
    }
    const start = Number(freeDnStartNo);
    const end = Number(freeDnEndNo);
    if (end - start + 1 > 1000) {
      toast.warning(`시작DN과 끝DN의 범위가 너무 큽니다. (최대 1,000)`);
      return;
    }
    setFreeDnLoading(true);
    try {
      const result = await dnApi.getFreeDnRange({ nodeId: selectedNodeId, startNo: freeDnStartNo, endNo: freeDnEndNo });
      setFreeDnResult(result?.freeDnNumbers ?? []);
    } catch {
      toast.error('여유번호 조회에 실패했습니다');
      setFreeDnResult([]);
    } finally {
      setFreeDnLoading(false);
    }
  };

  const handleBatchOpen = () => {
    if (!selectedNodeId || !selectedTenantId) {
      toast.warning('일괄 등록은 노드와 테넌트를 선택한 후 가능합니다');
      return;
    }
    setBatchOpen(true);
  };

  const handleImport = () => {
    if (!selectedNodeId || !selectedTenantId) {
      toast.warning('가져오기는 노드와 테넌트를 선택한 후 가능합니다');
      return;
    }
    setImportOpen(true);
  };
  const handleExport = async () => {
    try {
      const blob = await dnApi.exportExcel(listParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      a.download = `내선관리_${ts}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('엑셀 내보내기 완료');
    } catch (e: unknown) {
      // responseType=blob 이라 에러 응답이 Blob 으로 옴 → JSON 파싱해서 서버 message 추출
      const err = e as { response?: { data?: Blob } };
      let message = '엑셀 내보내기 실패';
      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const json = JSON.parse(text);
          if (json?.message) message = String(json.message);
        } catch {
          /* JSON 아니면 기본 메시지 */
        }
      }
      toast.error(message);
      console.error(e);
    }
  };

  const selectedNodeName = assignedNodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스1: 헤더 (노드/테넌트 스코프 + 요약 + 검색/액션) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-3">
          {/* 스코프 필터 — 기본 테넌트→노드, ↔ 버튼으로 순서 스위칭 */}
          {(() => {
            const nodeFilterEl = (
              <div key="node" className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
                <Network className="size-3.5 shrink-0 text-blue-600" />
                <Select
                  size="small"
                  variant="borderless"
                  value={selectedNodeId ?? '__all__'}
                  onChange={(v) => setSelectedNodeId(v === '__all__' ? null : Number(v))}
                  options={[{ value: '__all__', label: '전체 노드' }, ...assignedNodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))]}
                  style={{ width: 150 }}
                  popupMatchSelectWidth={false}
                />
              </div>
            );
            const tenantFilterEl = (
              <ScopeSelect
                key="tenant"
                kind="tenant"
                options={assignedTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))}
                value={tenantFilter == null ? null : String(tenantFilter)}
                onChange={(id) => {
                  setTenantFilter(id == null ? null : Number(id));
                  setSelectedRows([]);
                }}
              />
            );
            const swapBtnEl = (
              <button
                key="swap"
                type="button"
                onClick={toggleOrder}
                title="테넌트/노드 순서 전환"
                className="inline-flex items-center justify-center size-7 rounded-md border border-gray-200 text-gray-400 hover:text-[#405189] hover:border-[#c5cbe0] transition"
              >
                <ArrowLeftRight className="size-3.5" />
              </button>
            );
            // 일반 모드: 노드 Select만. 운영자 모드: 테넌트+노드(스위칭 가능).
            if (!operatorMode) return nodeFilterEl;
            return tenantFirst ? [tenantFilterEl, swapBtnEl, nodeFilterEl] : [nodeFilterEl, swapBtnEl, tenantFilterEl];
          })()}
          {/* 요약 — 총/활성/비활성 */}
          <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
            <span className="text-gray-500">
              총 DN <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              활성 <b className="text-blue-600 font-semibold">{summary.active.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              비활성 <b className="text-gray-400 font-semibold">{summary.inactive.toLocaleString()}</b>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="DN 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Button icon={<Download className="size-3.5" />} onClick={handleExport}>
              엑셀
            </Button>
            <Button icon={<Upload className="size-3.5" />} onClick={handleImport}>
              가져오기
            </Button>
            {/* 갭7: 여유번호 검색 버튼 — 엑셀/가져오기 옆으로 이동 */}
            <Button
              onClick={() => {
                setFreeDnResult(null);
                setFreeDnStartNo('');
                setFreeDnEndNo('');
                setFreeDnOpen(true);
              }}
              disabled={!selectedNodeId}
              title={!selectedNodeId ? '노드를 선택하세요' : '사용 가능한 여유번호 검색'}
            >
              여유번호
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 박스2: ag-Grid (필터된 DN 목록) ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">DN 목록</span>
          <span className="text-xs text-gray-500">
            총 {dnsForGrid.length.toLocaleString()}건{selectedRows.length > 0 ? ` · 선택 ${selectedRows.length}건` : ''}
          </span>
          {/* 우측 액션 버튼 영역 — 항상 표시, 선택/상태에 따라 disabled */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={handleDnDeleteSelected}
              loading={isDeleting}
              disabled={selectedRows.length === 0}
              title={selectedRows.length === 0 ? '삭제할 DN 을 선택하세요' : '선택한 DN 삭제'}
            >
              삭제
            </Button>
            <Button onClick={() => setCopyOpen(true)} disabled={selectedRows.length !== 1} title={selectedRows.length !== 1 ? 'DN 1건을 선택하세요' : '선택한 DN 복사 생성'}>
              복사 생성
            </Button>
            <Button onClick={handleBatchOpen} disabled={!selectedNodeId || !selectedTenantId}>
              일괄 등록
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleDnCreate}>
              등록
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <DnTable
            rowData={dnsForGrid}
            isLoading={isDnsLoading}
            onRowDoubleClicked={handleDnEdit}
            onDelete={handleDnDelete}
            onSelectionChanged={setSelectedRows}
            onBulkDelete={handleDnDeleteSelected}
            selectedCount={selectedRows.length}
          />
        </div>
      </div>

      {/* 일괄 등록 Drawer — 청크 분할 + Progress 는 내부에서 처리 */}
      <DnBatchDialog
        open={batchOpen}
        nodeId={selectedNodeId}
        tenantId={selectedTenantId}
        nodeName={selectedNodeName}
        tenantName={selectedTenantName}
        profileOptions={profileOptions}
        cosOptions={cosOptions}
        defaultCosId={options?.defaultCosId ?? null}
        onCancel={() => setBatchOpen(false)}
        onSuccess={() => {
          setBatchOpen(false);
          setSelectedRows([]);
          invalidateDns();
        }}
      />

      {/* 복사 생성 Drawer (AS-IS IPR20S2020_Copy.jsp) */}
      <DnCopyDrawer
        open={copyOpen}
        source={selectedRows[0] ?? null}
        onCancel={() => setCopyOpen(false)}
        onSuccess={() => {
          setCopyOpen(false);
          setSelectedRows([]);
          queryClient.invalidateQueries({ queryKey: dnQueryKeys.getList._def });
        }}
      />

      {/* 다건 삭제 Modal — 500건 초과 시 자동 청크 분할 + 진행률 표시 */}
      <DnBulkDeleteModal
        open={bulkDeleteOpen}
        dnIds={selectedRows.map((r) => r.dnId)}
        onCancel={() => setBulkDeleteOpen(false)}
        onSuccess={() => {
          setBulkDeleteOpen(false);
          setSelectedRows([]);
          invalidateDns();
        }}
      />

      {/* 엑셀 가져오기 Drawer — 비동기 + 1초 polling 진행률 */}
      <DnImportDrawer
        open={importOpen}
        nodeId={selectedNodeId}
        tenantId={selectedTenantId}
        nodeName={selectedNodeName}
        tenantName={selectedTenantName}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          invalidateDns();
        }}
      />

      {/* 갭7: 여유번호 검색 모달 (SWAT IPR20S2020_FreeDn.jsp 정합) */}
      <Modal title="여유번호 검색" open={freeDnOpen} onCancel={() => setFreeDnOpen(false)} footer={null} width={600}>
        <div className="flex gap-2 mb-4 items-end">
          <div>
            <div className="text-xs text-gray-500 mb-1">시작번호</div>
            <Input
              placeholder="예: 1000"
              value={freeDnStartNo}
              onChange={(e) => setFreeDnStartNo(e.target.value.replace(/\D/g, ''))}
              style={{ width: 140 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFreeDnSearch();
              }}
            />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">끝번호</div>
            <Input
              placeholder="예: 1999"
              value={freeDnEndNo}
              onChange={(e) => setFreeDnEndNo(e.target.value.replace(/\D/g, ''))}
              style={{ width: 140 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFreeDnSearch();
              }}
            />
          </div>
          <Button type="primary" onClick={handleFreeDnSearch} loading={freeDnLoading}>
            검색
          </Button>
        </div>
        {freeDnResult !== null &&
          (freeDnResult.length === 0 ? (
            <Empty description="사용 가능한 여유번호가 없습니다." />
          ) : (
            <div>
              <div className="text-sm text-gray-500 mb-2">사용 가능한 여유번호 {freeDnResult.length.toLocaleString()}건</div>
              <Table
                size="small"
                pagination={false}
                dataSource={freeDnResult.map((dn, i) => ({ key: i, dn }))}
                columns={[{ title: 'DN 번호', dataIndex: 'dn', key: 'dn', align: 'center' as const }]}
                scroll={{ y: 320 }}
              />
            </div>
          ))}
      </Modal>
    </div>
  );
}
