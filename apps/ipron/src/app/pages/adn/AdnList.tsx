/**
 * ADN 관리 목록 페이지 (AS-IS SWAT IPR20S2023)
 * — DN 패턴 차용. ADN 은 노드 개념 없어 viewMode/탭 제거, 카드 슬라이더만.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Download, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { adnApi } from '../../features/adn/api/adnApi';
import AdnCopyDrawer, { type AdnCopyFormValues } from '../../features/adn/components/AdnCopyDrawer';
import AdnImportDrawer from '../../features/adn/components/AdnImportDrawer';
import AdnTable from '../../features/adn/components/AdnTable';
import AdnTenantCard from '../../features/adn/components/AdnTenantCard';
import { useCopyAdn, useDeleteAdns, useGetAdnTenants, useGetAdns } from '../../features/adn/hooks/useAdnQueries';
import type { AdnResponse } from '../../features/adn/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '번호자원관리', path: '/ipron/adn' },
  { title: 'DN관리', path: '/ipron/adn' },
  { title: 'ADN 설정', path: '/ipron/adn' },
];

export default function AdnList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const modal = useModal();
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<AdnResponse[]>([]);
  const [copyOpen, setCopyOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(true);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: adns = [], isLoading } = useGetAdns({});
  const { data: tenantStats = [] } = useGetAdnTenants();

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: deleteAdns, isPending: isDeleting } = useDeleteAdns({
    mutationOptions: {
      onSuccess: () => {
        toast.success('선택한 ADN 이 삭제되었습니다');
        setSelectedRows([]);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: copyAdn } = useCopyAdn({
    mutationOptions: {
      onSuccess: (rows) => {
        toast.success(`${rows.length}건 복사 완료`);
        setCopyOpen(false);
        setSelectedRows([]);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '복사 실패';
        toast.error(msg);
      },
    },
  });

  // ─── Derived ────────────────────────────────────────────────────────────
  const filteredAdns = useMemo(() => {
    let rows = adns;
    if (selectedTenantId !== null) {
      rows = rows.filter((r) => r.tenantId === selectedTenantId);
    }
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      rows = rows.filter((r) => {
        const fields: (string | number | null | undefined)[] = [r.dnNo, r.tenantName, r.md5Authid, r.loginAdn];
        return fields.some((f) => f != null && String(f).toLowerCase().includes(kw));
      });
    }
    return rows;
  }, [adns, selectedTenantId, searchText]);

  const totalStats = useMemo(() => {
    let totalCnt = 0;
    let loggedInCnt = 0;
    let loggedOutCnt = 0;
    for (const t of tenantStats) {
      totalCnt += t.totalCnt;
      loggedInCnt += t.loggedInCnt;
      loggedOutCnt += t.loggedOutCnt;
    }
    return { totalCnt, loggedInCnt, loggedOutCnt };
  }, [tenantStats]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleCreate = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedTenantId) params.set('tenantId', String(selectedTenantId));
    const qs = params.toString();
    navigate(`/ipron/adn/create${qs ? `?${qs}` : ''}`);
  }, [navigate, selectedTenantId]);

  const handleEdit = useCallback((adn: AdnResponse) => navigate(`/ipron/adn/${adn.dnId}/edit`), [navigate]);

  const handleDelete = useCallback(
    (adn: AdnResponse) => {
      modal.confirm.execute({
        onOk: () => deleteAdns([adn.dnId]),
        options: { title: 'ADN 삭제', content: `"${adn.dnNo}" ADN 을 삭제하시겠습니까?` },
      });
    },
    [modal, deleteAdns],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => deleteAdns(selectedRows.map((r) => r.dnId)),
      options: { title: 'ADN 일괄 삭제', content: `선택한 ${selectedRows.length}건의 ADN 을 삭제하시겠습니까?` },
    });
  }, [selectedRows, modal, deleteAdns]);

  const handleCopyOpen = useCallback(() => {
    if (selectedRows.length !== 1) {
      toast.warning('ADN 1건을 선택하세요');
      return;
    }
    if (selectedRows[0].md5Auth === 1) {
      toast.warning('MD5 인증이 설정된 ADN 은 복사할 수 없습니다');
      return;
    }
    setCopyOpen(true);
  }, [selectedRows]);

  const handleCopySubmit = useCallback(
    (values: AdnCopyFormValues) => {
      const source = selectedRows[0];
      if (!source) return;
      copyAdn({ sourceDnId: source.dnId, startDnNo: values.startDnNo, finishDnNo: values.finishDnNo });
    },
    [selectedRows, copyAdn],
  );

  const handleExport = async () => {
    try {
      const blob = await adnApi.exportExcel(selectedTenantId ? { tenantId: selectedTenantId } : undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ADN설정_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('엑셀 내보내기 완료');
    } catch (e) {
      console.error(e);
      toast.error('엑셀 내보내기 실패');
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 카드 슬라이더 박스 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[44px] border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">테넌트별 ADN 현황</span>
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="ADN 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Button icon={<Download className="size-3.5" />} onClick={handleExport}>
              엑셀
            </Button>
            <Button icon={<Upload className="size-3.5" />} onClick={() => setImportOpen(true)}>
              가져오기
            </Button>
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
                <AdnTenantCard tenantId={null} tenantName="전체" stats={totalStats} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">등록된 ADN 이 없습니다</span>
                  </div>
                ) : (
                  tenantStats.map((g) => (
                    <AdnTenantCard
                      key={g.tenantId}
                      tenantId={g.tenantId}
                      tenantName={g.tenantName ?? '-'}
                      stats={{ totalCnt: g.totalCnt, loggedInCnt: g.loggedInCnt, loggedOutCnt: g.loggedOutCnt }}
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

      {/* ===== ag-Grid 박스 ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">ADN 목록 ({filteredAdns.length.toLocaleString()}건)</span>
          {selectedRows.length > 0 && (
            <span className="text-xs text-gray-500">
              {filteredAdns.length.toLocaleString()}건 중 {selectedRows.length}건 선택
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={handleBulkDelete}
              loading={isDeleting}
              disabled={selectedRows.length === 0}
              title={selectedRows.length === 0 ? '삭제할 ADN 을 선택하세요' : '선택한 ADN 삭제'}
            >
              {selectedRows.length > 0 ? `삭제 (${selectedRows.length})` : '삭제'}
            </Button>
            <Button onClick={handleCopyOpen} disabled={selectedRows.length !== 1} title={selectedRows.length !== 1 ? 'ADN 1건을 선택하세요' : '선택한 ADN 복사 생성'}>
              복사 생성
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
              등록
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <AdnTable
            rowData={filteredAdns}
            isLoading={isLoading}
            onRowDoubleClicked={handleEdit}
            onDelete={handleDelete}
            onSelectionChanged={setSelectedRows}
            onBulkDelete={handleBulkDelete}
            selectedCount={selectedRows.length}
          />
        </div>
      </div>

      <AdnCopyDrawer open={copyOpen} source={selectedRows[0] ?? null} onCancel={() => setCopyOpen(false)} onSubmit={handleCopySubmit} />
      <AdnImportDrawer open={importOpen} onClose={() => setImportOpen(false)} />
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
