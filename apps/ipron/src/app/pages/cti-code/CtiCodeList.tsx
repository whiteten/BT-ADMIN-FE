/**
 * 휴식/ACW 사유 코드 관리 페이지.
 *
 * 멀티테넌트 개편(상담사 관리 정합): 상단 테넌트 카드 슬라이더 제거.
 *   - 일반 콘솔: 테넌트 선택기 없음(토큰=활성 테넌트 스코프). 헤더에 요약(총/휴식/ACW)만.
 *   - 운영자 모드: 헤더에 대행 테넌트 ScopeSelect(공통) + 그 옆에 요약.
 * 하단: 코드 타입 토글(휴식/ACW) + 사유 코드 테이블.
 *
 * AS-IS SWAT IPR20S4040 마이그레이션 — 탭 2개를 Segmented 토글로 단순화.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Segmented } from 'antd';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CtiCodeFormDrawer, { type CtiCodeDrawerState } from '../../features/cti-code/components/CtiCodeFormDrawer';
import CtiCodeTable from '../../features/cti-code/components/CtiCodeTable';
import { useDeleteReasonCodesBatch, useGetCtiCodeTenantStats, useGetReasonCodes } from '../../features/cti-code/hooks/useCtiCodeQueries';
import { REASON_CODE_TYPE_ACW, REASON_CODE_TYPE_REST, type ReasonCodeResponse } from '../../features/cti-code/types';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '상담사 관리' }, { title: '코드 관리' }, { title: '휴식/후처리 사유코드 관리', path: '/ipron/cti-code-mgmt' }];

export default function CtiCodeList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

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

  const [codeType, setCodeType] = useState<number>(REASON_CODE_TYPE_REST);
  const [drawer, setDrawer] = useState<CtiCodeDrawerState>({ open: false });
  const [selectedRows, setSelectedRows] = useState<ReasonCodeResponse[]>([]);
  const modal = useModal();

  // 테넌트별 통계 — 운영자 대행 선택기 + 헤더 요약(총/휴식/ACW). view-all 로 전체 테넌트 반환.
  const { data: tenantStats = [], refetch: refetchTenants } = useGetCtiCodeTenantStats();

  // 사유 코드 목록
  const {
    data: reasonRows = [],
    isLoading: reasonLoading,
    refetch: refetchReasons,
  } = useGetReasonCodes({
    params: {
      codeType,
      tenantId: selectedTenantId ?? undefined,
    },
  });

  const { mutate: deleteReasonsBatch, isPending: isDeleting } = useDeleteReasonCodesBatch({
    mutationOptions: {
      onSuccess: () => {
        toast.success(`${selectedRows.length}건이 삭제되었습니다`);
        setSelectedRows([]);
        refetchReasons();
        refetchTenants();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '일괄 삭제 실패'),
    },
  });

  const selectedTenantName = selectedTenantId == null ? null : (tenantStats.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? `#${selectedTenantId}`);

  // 헤더 요약 — 현재 스코프(전체=합계 / 특정 테넌트=해당)의 총/휴식/ACW.
  const summary = useMemo(() => {
    const rows = selectedTenantId == null ? tenantStats : tenantStats.filter((t) => t.tenantId === selectedTenantId);
    return rows.reduce((a, t) => ({ total: a.total + (t.totalCnt ?? 0), rest: a.rest + (t.restCnt ?? 0), acw: a.acw + (t.acwCnt ?? 0) }), { total: 0, rest: 0, acw: 0 });
  }, [tenantStats, selectedTenantId]);

  const handleCreate = () => {
    if (selectedTenantId == null) {
      toast.warning('대행할 테넌트를 먼저 선택하세요');
      return;
    }
    if (reasonRows.length >= 30) {
      toast.warning('사유 코드를 30개 이상 등록할 수 없습니다');
      return;
    }
    setDrawer({ open: true, mode: 'create', codeType, tenantId: selectedTenantId, tenantName: selectedTenantName ?? undefined });
  };

  const handleEdit = (row: ReasonCodeResponse) => {
    setDrawer({ open: true, mode: 'edit', codeType: row.codeType, reason: row });
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () =>
        deleteReasonsBatch(
          selectedRows.map((r) => ({
            tenantId: r.tenantId,
            codeType: r.codeType,
            reasonCode: r.reasonCode,
          })),
        ),
      options: {
        title: '사유 코드 삭제',
        content: `선택한 ${selectedRows.length}건의 사유 코드를 삭제하시겠습니까?`,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 (스코프 선택 + 요약) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
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
          {/* 요약 — 총/휴식/ACW (운영자는 선택 뒤, 일반은 좌측). */}
          <div className={`flex items-center gap-4 text-[13px] ${operatorMode ? 'ml-3 pl-3 border-l border-gray-200' : ''}`}>
            <span className="text-gray-500">
              총 사유코드 <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              휴식 <b className="text-[#405189] font-semibold">{summary.rest.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              후처리(ACW) <b className="text-amber-600 font-semibold">{summary.acw.toLocaleString()}</b>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="text"
              size="small"
              icon={<RefreshCw className="size-3.5" />}
              onClick={() => {
                refetchTenants();
                refetchReasons();
              }}
            >
              새로고침
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 박스 2: 토글 + ag-Grid ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex items-center px-4 h-[56px] border-b border-gray-100">
          <Segmented
            value={codeType}
            onChange={(v) => setCodeType(Number(v))}
            options={[
              { label: '휴식 사유', value: REASON_CODE_TYPE_REST },
              { label: '후처리(ACW) 사유', value: REASON_CODE_TYPE_ACW },
            ]}
          />
          <span className={`ml-3 text-xs text-gray-500 ${selectedRows.length > 0 ? 'visible' : 'invisible'}`}>
            {reasonRows.length.toLocaleString()}건 중 {selectedRows.length}건 선택
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={handleBulkDelete}
              loading={isDeleting}
              disabled={selectedRows.length === 0}
              title={selectedRows.length === 0 ? '삭제할 사유 코드를 선택하세요' : '선택한 사유 코드 삭제'}
            >
              삭제
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
              등록
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {reasonRows.length === 0 && !reasonLoading ? (
            <div className="flex items-center justify-center h-full">
              <Empty description="등록된 사유 코드가 없습니다" />
            </div>
          ) : (
            <CtiCodeTable
              rowData={reasonRows}
              isLoading={reasonLoading}
              onRowDoubleClicked={handleEdit}
              onSelectionChanged={setSelectedRows}
              showTenantColumn={selectedTenantId === null}
            />
          )}
        </div>
      </div>

      <CtiCodeFormDrawer state={drawer} onClose={() => setDrawer({ open: false })} />
    </div>
  );
}

function extractMessage(err: unknown): string | undefined {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message;
}
