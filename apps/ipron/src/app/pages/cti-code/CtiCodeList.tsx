/**
 * 휴식/ACW 사유 코드 관리 페이지.
 *
 * 상단: 박스 1 헤더 + 박스 2 테넌트 카드 슬라이더 (상담사 관리/스킬셋 관리 패턴 일치)
 * 하단: 코드 타입 토글(휴식/ACW) + 사유 코드 테이블
 *
 * AS-IS SWAT IPR20S4040 마이그레이션 — 탭 2개를 Segmented 토글로 단순화.
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Empty, Segmented } from 'antd';
import { ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CtiCodeFormDrawer, { type CtiCodeDrawerState } from '../../features/cti-code/components/CtiCodeFormDrawer';
import CtiCodeTable from '../../features/cti-code/components/CtiCodeTable';
import CtiCodeTenantCard from '../../features/cti-code/components/CtiCodeTenantCard';
import { useDeleteReasonCodesBatch, useGetCtiCodeTenantStats, useGetReasonCodes } from '../../features/cti-code/hooks/useCtiCodeQueries';
import { REASON_CODE_TYPE_ACW, REASON_CODE_TYPE_REST, type ReasonCodeResponse } from '../../features/cti-code/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '상담사 관리', path: '/ipron/agent-master' },
  { title: '코드 관리', path: '/ipron/media-type' },
  { title: '휴식/후처리 사유코드 관리', path: '/ipron/cti-code-mgmt' },
];

export default function CtiCodeList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // ctx 테넌트 (JWT — 사용자 본인 테넌트) — 페이지 진입 시 자동 선택
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(ctxTenantId);
  const [codeType, setCodeType] = useState<number>(REASON_CODE_TYPE_REST);
  const [drawer, setDrawer] = useState<CtiCodeDrawerState>({ open: false });
  const [cardExpanded, setCardExpanded] = useState(false);
  const [selectedRows, setSelectedRows] = useState<ReasonCodeResponse[]>([]);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const modal = useModal();

  // ctx 비동기 로드 시 동기화
  useEffect(() => {
    if (ctxTenantId != null && selectedTenantId === null) {
      setSelectedTenantId(ctxTenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxTenantId]);

  // 테넌트별 통계 (상단 카드 슬라이더)
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

  const handleCreate = () => {
    if (selectedTenantId == null) {
      toast.warning('테넌트를 먼저 선택하세요');
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

  const selectedTenantName = selectedTenantId == null ? null : (tenantStats.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? `#${selectedTenantId}`);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 (별도 박스) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          <span className="text-sm font-semibold text-gray-700">휴식/후처리(ACW) 사유 현황</span>
          {selectedTenantName && (
            <span className="ml-3 text-xs text-gray-500">
              테넌트: <span className="font-medium text-gray-700">{selectedTenantName}</span>
            </span>
          )}
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

      {/* ===== 박스 2: 테넌트 카드 슬라이더 (별도 박스) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
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
                {tenantStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">등록된 사유 코드가 없습니다</span>
                  </div>
                ) : (
                  tenantStats.map((t) => (
                    <CtiCodeTenantCard
                      key={t.tenantId}
                      tenantId={t.tenantId}
                      tenantName={t.tenantName ?? '-'}
                      stats={{ totalCnt: t.totalCnt, restCnt: t.restCnt, acwCnt: t.acwCnt }}
                      selected={selectedTenantId === t.tenantId}
                      onClick={(e) => {
                        setSelectedTenantId(t.tenantId);
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
                {tenantStats.map((t) => (
                  <CompactTenantPill
                    key={t.tenantId}
                    name={t.tenantName ?? '-'}
                    count={t.totalCnt}
                    selected={selectedTenantId === t.tenantId}
                    onClick={() => setSelectedTenantId(t.tenantId)}
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

      {/* ===== 박스 3: 토글 + ag-Grid ===== */}
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
