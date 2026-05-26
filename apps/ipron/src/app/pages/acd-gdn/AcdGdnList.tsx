/**
 * ACD 그룹DN 관리 목록 페이지 (Phase 1).
 *
 * 레이아웃: AdnList 패턴 차용 + 우측 멤버 패널 360px.
 *  - 상단 테넌트 카드 슬라이더 (확장/접기 토글)
 *  - 좌 ag-Grid (그룹DN 목록) + 우 멤버 패널 (선택 그룹DN 의 멤버)
 *  - 노드 탭바는 Phase 2 (mockup 의 노드 selector)
 *
 * 등록/수정은 Drawer (인라인 — 라우팅 페이지 별도 X).
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AcdGdnFormDrawer from '../../features/acd-gdn/components/AcdGdnFormDrawer';
import AcdGdnMemberPanel from '../../features/acd-gdn/components/AcdGdnMemberPanel';
import AcdGdnTable from '../../features/acd-gdn/components/AcdGdnTable';
import AcdGdnTenantCard from '../../features/acd-gdn/components/AcdGdnTenantCard';
import { useDeleteAcdGdns, useGetAcdGdnTenants, useGetAcdGdns } from '../../features/acd-gdn/hooks/useAcdGdnQueries';
import type { GdnResponse } from '../../features/acd-gdn/types';
import { useGetDnProfileTenants } from '../../features/dn-profile/hooks/useDnProfileQueries';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '번호자원관리', path: '/ipron/acd-gdn' },
  { title: 'DN관리', path: '/ipron/acd-gdn' },
  { title: 'ACD 그룹DN', path: '/ipron/acd-gdn' },
];

export default function AcdGdnList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── State ──────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<GdnResponse[]>([]);
  const [selectedGdn, setSelectedGdn] = useState<GdnResponse | null>(null);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<GdnResponse | null>(null);
  const [cardExpanded, setCardExpanded] = useState(true);

  // ─── Queries ────────────────────────────────────────────────────────
  const { data: gdns = [], isLoading } = useGetAcdGdns({});
  const { data: tenantStats = [] } = useGetAcdGdnTenants();
  const { data: allTenants = [] } = useGetDnProfileTenants();

  const tenantOptions = useMemo(() => allTenants.map((t) => ({ value: t.tenantId, label: t.tenantName ?? String(t.tenantId) })), [allTenants]);

  // ─── Mutations ──────────────────────────────────────────────────────
  const { mutate: deleteGdns, isPending: isDeleting } = useDeleteAcdGdns({
    mutationOptions: {
      onSuccess: () => {
        toast.success('선택한 그룹DN 이 삭제되었습니다');
        setSelectedRows([]);
        setSelectedGdn(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패';
        toast.error(msg);
      },
    },
  });

  // ─── Derived ────────────────────────────────────────────────────────
  const filteredGdns = useMemo(() => {
    let rows = gdns;
    if (selectedTenantId !== null) {
      rows = rows.filter((r) => r.tenantId === selectedTenantId);
    }
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      rows = rows.filter((r) => {
        const fields: (string | number | null | undefined)[] = [r.gdnNo, r.gdnName, r.tenantName, r.aniNo];
        return fields.some((f) => f != null && String(f).toLowerCase().includes(kw));
      });
    }
    return rows;
  }, [gdns, selectedTenantId, searchText]);

  const totalStats = useMemo(() => {
    let totalCnt = 0;
    let acdActiveCnt = 0;
    let blockedCnt = 0;
    let huntingCnt = 0;
    for (const t of tenantStats) {
      totalCnt += t.totalCnt;
      acdActiveCnt += t.acdActiveCnt;
      blockedCnt += t.blockedCnt;
      huntingCnt += t.huntingCnt;
    }
    return { totalCnt, acdActiveCnt, blockedCnt, huntingCnt };
  }, [tenantStats]);

  // ─── Handlers ───────────────────────────────────────────────────────
  const handleCreate = useCallback(() => {
    setDrawerDetail(null);
    setDrawerMode('create');
  }, []);

  const handleEdit = useCallback((gdn: GdnResponse) => {
    setDrawerDetail(gdn);
    setDrawerMode('edit');
  }, []);

  const handleDelete = useCallback(
    (gdn: GdnResponse) => {
      modal.confirm.execute({
        onOk: () => deleteGdns([gdn.gdnId]),
        options: { title: '그룹DN 삭제', content: `"${gdn.gdnNo} / ${gdn.gdnName}" 그룹DN 을 삭제하시겠습니까?` },
      });
    },
    [modal, deleteGdns],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => deleteGdns(selectedRows.map((r) => r.gdnId)),
      options: { title: '그룹DN 일괄 삭제', content: `선택한 ${selectedRows.length}건의 그룹DN 을 삭제하시겠습니까?` },
    });
  }, [selectedRows, modal, deleteGdns]);

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 카드 슬라이더 박스 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[44px] border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">테넌트별 ACD 그룹DN 현황</span>
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="그룹DN 번호/이름 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 220 }}
            />
          </div>
        </div>

        {cardExpanded ? (
          <div className="flex items-center h-[140px] px-4 py-3">
            <div className="relative flex items-center gap-2 w-full">
              <Button
                type="text"
                icon={<ChevronLeft className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
              <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <AcdGdnTenantCard tenantId={null} tenantName="전체" stats={totalStats} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">등록된 그룹DN 이 없습니다</span>
                  </div>
                ) : (
                  tenantStats.map((g) => (
                    <AcdGdnTenantCard
                      key={g.tenantId}
                      tenantId={g.tenantId}
                      tenantName={g.tenantName ?? '-'}
                      stats={{
                        totalCnt: g.totalCnt,
                        acdActiveCnt: g.acdActiveCnt,
                        blockedCnt: g.blockedCnt,
                        huntingCnt: g.huntingCnt,
                      }}
                      selected={selectedTenantId === g.tenantId}
                      onClick={(e) => {
                        setSelectedTenantId(g.tenantId);
                        (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                      }}
                    />
                  ))
                )}
              </div>
              <Button
                type="text"
                icon={<ChevronRight className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
              <Button
                type="text"
                icon={<ChevronsUp className="size-4" />}
                onClick={() => setCardExpanded(false)}
                title="카드 접기"
                className="!flex-shrink-0 !w-8 !h-8 !p-0 !text-gray-400 hover:!text-[#405189]"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center h-[44px] px-4">
            <div className="relative flex items-center gap-2 w-full">
              <div className="flex gap-2 overflow-x-auto flex-1 items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <CompactTenantPill name="전체" count={totalStats.totalCnt} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.map((g) => (
                  <CompactTenantPill
                    key={g.tenantId}
                    name={g.tenantName ?? '-'}
                    count={g.totalCnt}
                    selected={selectedTenantId === g.tenantId}
                    onClick={() => setSelectedTenantId(g.tenantId)}
                  />
                ))}
              </div>
              <Button
                type="text"
                icon={<ChevronsDown className="size-4" />}
                onClick={() => setCardExpanded(true)}
                title="카드 펼치기"
                className="!flex-shrink-0 !w-8 !h-8 !p-0 !text-gray-400 hover:!text-[#405189]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ===== 메인 박스: 좌 그리드 + 우 멤버 패널 ===== */}
      <div className="grid grid-cols-[1fr_360px] gap-4 flex-1 min-h-0">
        {/* 좌: ag-Grid */}
        <div className="bg-white bt-shadow flex flex-col min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">ACD 그룹DN 목록 ({filteredGdns.length.toLocaleString()}건)</span>
            {selectedRows.length > 0 && (
              <span className="text-xs text-gray-500">
                {filteredGdns.length.toLocaleString()}건 중 {selectedRows.length}건 선택
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                danger
                icon={<Trash2 className="size-3.5" />}
                onClick={handleBulkDelete}
                loading={isDeleting}
                disabled={selectedRows.length === 0}
                title={selectedRows.length === 0 ? '삭제할 그룹DN 을 선택하세요' : '선택한 그룹DN 삭제'}
              >
                {selectedRows.length > 0 ? `삭제 (${selectedRows.length})` : '삭제'}
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                등록
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <AcdGdnTable
              rowData={filteredGdns}
              isLoading={isLoading}
              onRowClicked={setSelectedGdn}
              onRowDoubleClicked={handleEdit}
              onDelete={handleDelete}
              onSelectionChanged={setSelectedRows}
              onBulkDelete={handleBulkDelete}
              selectedCount={selectedRows.length}
            />
          </div>
        </div>

        {/* 우: 멤버 패널 */}
        <AcdGdnMemberPanel selectedGdn={selectedGdn} />
      </div>

      {/* ===== 등록/수정 드로어 ===== */}
      {drawerMode && (
        <AcdGdnFormDrawer
          open={!!drawerMode}
          mode={drawerMode}
          detail={drawerDetail}
          defaultTenantId={selectedTenantId}
          defaultNodeId={0}
          tenantOptions={tenantOptions}
          onClose={() => setDrawerMode(null)}
          onSaved={() => setDrawerMode(null)}
        />
      )}
    </div>
  );
}

interface CompactTenantPillProps {
  name: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}

function CompactTenantPill({ name, count, selected, onClick }: CompactTenantPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${name} · ${count.toLocaleString()}건`}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
        selected
          ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
          : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
      }`}
    >
      <span className="font-medium truncate max-w-[120px]">{name}</span>
      <span className={`text-[11px] ${selected ? 'text-white/80' : 'text-gray-400'}`}>{count.toLocaleString()}</span>
    </button>
  );
}
