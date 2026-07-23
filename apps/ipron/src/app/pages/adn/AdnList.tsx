/**
 * ADN 관리 목록 페이지 (AS-IS SWAT IPR20S2023)
 * — DN 패턴 차용. ADN 은 노드 개념 없어 viewMode/탭 제거, 카드 슬라이더만.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { Download, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { adnApi } from '../../features/adn/api/adnApi';
import AdnCopyDrawer, { type AdnCopyFormValues } from '../../features/adn/components/AdnCopyDrawer';
import AdnFormDrawer from '../../features/adn/components/AdnFormDrawer';
import AdnImportDrawer from '../../features/adn/components/AdnImportDrawer';
import AdnTable from '../../features/adn/components/AdnTable';
import { useCopyAdn, useDeleteAdns, useGetAdnTenants, useGetAdns } from '../../features/adn/hooks/useAdnQueries';
import type { AdnResponse } from '../../features/adn/types';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '번호자원관리' }, { title: '교환기 번호관리' }, { title: 'ADN', path: '/ipron/adn' }];

export default function AdnList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();

  // ctx 테넌트 (JWT — 사용자 본인 테넌트)
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): tenantId 미전달 → apiClient 가 X-View-All-Tenants 주입 → 전체 테넌트 조회
  //  - 대행(actAsTenantId=X): tenantId=X 로 조회 스코프 + apiClient 가 X-Act-As-Tenant 주입 → X 대행 CUD
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const opTenantId = actAsTenantId ? Number(actAsTenantId) : null;
  // 조회/등록 스코프: 일반=활성테넌트 / 운영자=대행테넌트(null=전체).
  const selectedTenantId = operatorMode ? opTenantId : ctxTenantId;

  // ─── State ──────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  /**
   * ADN 상태 필터 — AS-IS SWAT IPR20S2023 srchAdnStatus 콤보 대응.
   * TB_CC_COMMONCODE (CLASS_CD='DN_STATUS', ADDCOND1_VALUE='ADN'): '8'=로그인, '9'=로그아웃.
   * null = 전체.
   */
  const [dnStatusFilter, setDnStatusFilter] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<AdnResponse[]>([]);
  const [copyOpen, setCopyOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // 등록/수정 드로어 (전체페이지 라우트 → Drawer 전환). 복사/가져오기 드로어와 중첩 방지를 위해 단일 상태로 관리.
  const [formDrawer, setFormDrawer] = useState<{ open: boolean; mode: 'create' | 'edit'; dnId: number | null }>({
    open: false,
    mode: 'create',
    dnId: null,
  });

  // ─── Queries ────────────────────────────────────────────────────────────
  // dnStatus 는 BE 서버 필터로 전달 (AS-IS SWAT AND A.DN_STATUS=#dnStatus# 대응).
  // dnStatusFilter 변경 시 쿼리 캐시 키가 달라져 자동 재요청된다.
  const { data: adns = [], isLoading } = useGetAdns({
    params: dnStatusFilter ? { dnStatus: dnStatusFilter } : undefined,
  });
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
    // dnStatus 필터는 BE 서버에서 처리 (useGetAdns params로 전달). 클라이언트 재필터 불필요.
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      rows = rows.filter((r) => {
        const fields: (string | number | null | undefined)[] = [r.dnNo, r.tenantName, r.md5Authid, r.loginAdn];
        return fields.some((f) => f != null && String(f).toLowerCase().includes(kw));
      });
    }
    return rows;
  }, [adns, selectedTenantId, searchText]);

  // 헤더 요약 — 현재 스코프(전체=합계 / 특정 테넌트=해당)의 총/로그인/로그아웃.
  const summary = useMemo(() => {
    const rows = selectedTenantId == null ? tenantStats : tenantStats.filter((t) => t.tenantId === selectedTenantId);
    return rows.reduce((a, t) => ({ total: a.total + t.totalCnt, loggedIn: a.loggedIn + t.loggedInCnt, loggedOut: a.loggedOut + t.loggedOutCnt }), {
      total: 0,
      loggedIn: 0,
      loggedOut: 0,
    });
  }, [tenantStats, selectedTenantId]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  // 등록/수정 드로어 오픈 시 복사·가져오기 드로어를 닫아 중첩을 방지한다.
  const handleCreate = useCallback(() => {
    // 운영자 전체(view-all) 모드에서도 등록 허용 — 테넌트 미지정 시 드로어 폼에서 필수 선택하게 강제(CallScreenList.handleCreate 동일).
    setCopyOpen(false);
    setImportOpen(false);
    setFormDrawer({ open: true, mode: 'create', dnId: null });
  }, []);

  const handleEdit = useCallback((adn: AdnResponse) => {
    setCopyOpen(false);
    setImportOpen(false);
    setFormDrawer({ open: true, mode: 'edit', dnId: adn.dnId });
  }, []);

  const handleFormSaved = useCallback(() => {
    // 등록/수정 성공 후 드로어 닫기 (목록 캐시는 mutation onSuccess 에서 무효화됨).
    setFormDrawer((prev) => ({ ...prev, open: false }));
  }, []);

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
    // 등록/수정 드로어와 중첩 방지
    setFormDrawer((prev) => ({ ...prev, open: false }));
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
      const exportParams: { tenantId?: number; dnStatus?: string } = {};
      if (selectedTenantId) exportParams.tenantId = selectedTenantId;
      if (dnStatusFilter) exportParams.dnStatus = dnStatusFilter;
      const blob = await adnApi.exportExcel(Object.keys(exportParams).length ? exportParams : undefined);
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
      {/* ===== 박스 1: 헤더 (스코프 선택 + 요약) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-3">
          {/* 운영자 모드: 대행 테넌트 선택(공통 ScopeSelect). 일반 콘솔은 브레드크럼이 화면명 표기. */}
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={tenantStats.map((t) => ({ id: t.tenantId, name: t.tenantName ?? `테넌트 ${t.tenantId}`, count: t.totalCnt }))}
              value={actAsTenantId}
              onChange={(id) => {
                setActAsTenant(id);
                setSelectedRows([]);
              }}
            />
          )}
          {/* 요약 — 총/로그인/로그아웃 (운영자는 선택 뒤, 일반은 좌측). */}
          <div className={`flex items-center gap-4 text-[13px] ${operatorMode ? 'ml-3 pl-3 border-l border-gray-200' : ''}`}>
            <span className="text-gray-500">
              총 ADN <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              로그인 <b className="text-green-600 font-semibold">{summary.loggedIn.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              로그아웃 <b className="text-gray-500 font-semibold">{summary.loggedOut.toLocaleString()}</b>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* AS-IS srchAdnStatus 콤보 — TB_CC_COMMONCODE CLASS_CD='DN_STATUS' ADDCOND1_VALUE='ADN' */}
            <Select
              allowClear
              placeholder="상태"
              value={dnStatusFilter ?? undefined}
              onChange={(val: string | undefined) => setDnStatusFilter(val ?? null)}
              style={{ width: 110 }}
              options={[
                { value: '8', label: '로그인' },
                { value: '9', label: '로그아웃' },
              ]}
            />
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
            <Button
              icon={<Upload className="size-3.5" />}
              onClick={() => {
                setFormDrawer((prev) => ({ ...prev, open: false }));
                setImportOpen(true);
              }}
            >
              가져오기
            </Button>
          </div>
        </div>
      </div>

      {/* ===== ag-Grid 박스 ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2 h-[44px] flex-shrink-0">
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
              삭제
            </Button>
            <Button onClick={handleCopyOpen} disabled={selectedRows.length !== 1} title={selectedRows.length !== 1 ? 'ADN 1건을 선택하세요' : '선택한 ADN 복사 생성'}>
              복사 생성
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
              등록
            </Button>
          </div>
        </div>
        <div className="border-t border-gray-200" />
        <div className="flex-1 min-h-0 p-5">
          <AdnTable
            rowData={filteredAdns}
            isLoading={isLoading}
            onRowDoubleClicked={handleEdit}
            onSelectionChanged={setSelectedRows}
            onBulkDelete={handleBulkDelete}
            selectedCount={selectedRows.length}
          />
        </div>
      </div>

      <AdnFormDrawer
        open={formDrawer.open}
        mode={formDrawer.mode}
        dnId={formDrawer.dnId}
        defaultTenantId={selectedTenantId}
        onClose={() => setFormDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={handleFormSaved}
      />
      <AdnCopyDrawer open={copyOpen} source={selectedRows[0] ?? null} onCancel={() => setCopyOpen(false)} onSubmit={handleCopySubmit} />
      <AdnImportDrawer open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
