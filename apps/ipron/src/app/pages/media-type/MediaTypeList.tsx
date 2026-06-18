/**
 * 미디어타입 관리 페이지.
 *
 * 상단: 박스 1 헤더 (h=56px 한 줄 — IPRON 표준 패턴) — 현황 + 통계 인디케이터 + 새로고침
 * 하단: ag-Grid (다중 선택 + 일괄 삭제 + 더블클릭 수정)
 *
 * AS-IS SWAT IPR10S6060 마이그레이션 — 시스템 코드(테넌트 무관)이므로 카드 슬라이더 박스는 생략.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Modal } from 'antd';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import MediaTypeFormDrawer, { type MediaTypeDrawerState } from '../../features/media-type/components/MediaTypeFormDrawer';
import MediaTypeTable from '../../features/media-type/components/MediaTypeTable';
import { useDeleteMediaType, useGetMediaTypeMeta, useGetMediaTypes } from '../../features/media-type/hooks/useMediaTypeQueries';
import type { MediaTypeResponse } from '../../features/media-type/types';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '상담사 관리', path: '/ipron/agent-master' },
  { title: '코드 관리', path: '/ipron/media-type' },
  { title: '미디어 코드 관리', path: '/ipron/media-type' },
];

export default function MediaTypeList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [drawer, setDrawer] = useState<MediaTypeDrawerState>({ open: false });
  const [selectedRows, setSelectedRows] = useState<MediaTypeResponse[]>([]);

  const { data: rows = [], isLoading, refetch } = useGetMediaTypes();

  const { data: meta = [], refetch: refetchMeta } = useGetMediaTypeMeta();

  const { mutate: deleteMt, isPending: isDeleting } = useDeleteMediaType({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어 코드가 삭제되었습니다');
        setSelectedRows([]);
        refetch();
        refetchMeta();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '삭제 실패'),
    },
  });

  const stats = useMemo(() => {
    const total = rows.length;
    const metaTotal = meta.length;
    const unassigned = meta.filter((m) => !m.inUse).length;
    const lastWork = rows.reduce<string | null>((acc, r) => {
      if (!r.workTime) return acc;
      if (!acc || r.workTime > acc) return r.workTime;
      return acc;
    }, null);
    return { total, metaTotal, unassigned, lastWork };
  }, [rows, meta]);

  const handleEdit = (row: MediaTypeResponse) => setDrawer({ open: true, mode: 'edit', row });

  const handleDelete = (row: MediaTypeResponse) => {
    Modal.confirm({
      title: '미디어 코드 삭제',
      content: `미디어 코드 "${row.mediaAlias}" (#${row.mediaType}) 를 삭제하시겠습니까?`,
      okType: 'danger',
      onOk: () => deleteMt(row.mediaType),
    });
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;
    Modal.confirm({
      title: '미디어 코드 일괄 삭제',
      content: `선택한 ${selectedRows.length}건의 미디어 코드를 삭제하시겠습니까?`,
      okType: 'danger',
      onOk: () => selectedRows.forEach((r) => deleteMt(r.mediaType)),
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 (IPRON 표준 — 56px 한 줄) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          <span className="text-sm font-semibold text-gray-700">미디어 코드 현황</span>
          <div className="ml-3 flex items-center gap-3 text-xs text-gray-500">
            <span>
              등록 <span className="font-medium text-blue-600">{stats.total.toLocaleString()}</span> / {stats.metaTotal.toLocaleString()}
            </span>
            <span>
              미배정 <span className="font-medium text-amber-500">{stats.unassigned.toLocaleString()}</span>
            </span>
            {stats.lastWork && (
              <span>
                최근 수정 <span className="font-medium text-gray-700">{String(stats.lastWork).replace('T', ' ').slice(0, 16)}</span>
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="text"
              size="small"
              icon={<RefreshCw className="size-3.5" />}
              onClick={() => {
                refetch();
                refetchMeta();
              }}
            >
              새로고침
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 박스 2: 그리드 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex items-center px-4 h-[56px] border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">미디어 코드 목록 ({rows.length.toLocaleString()}건)</span>
          {selectedRows.length > 0 && (
            <span className="ml-3 text-xs text-gray-500">
              {rows.length.toLocaleString()}건 중 {selectedRows.length}건 선택
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={handleBulkDelete}
              loading={isDeleting}
              disabled={selectedRows.length === 0}
              title={selectedRows.length === 0 ? '삭제할 미디어 코드를 선택하세요' : '선택한 미디어 코드 삭제'}
            >
              {selectedRows.length > 0 ? `삭제 (${selectedRows.length})` : '삭제'}
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => setDrawer({ open: true, mode: 'create' })}>
              등록
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {rows.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Empty description="등록된 미디어 코드가 없습니다" />
            </div>
          ) : (
            <MediaTypeTable
              rowData={rows}
              isLoading={isLoading}
              onRowDoubleClicked={handleEdit}
              onDelete={handleDelete}
              onSelectionChanged={setSelectedRows}
              onBulkDelete={handleBulkDelete}
              selectedCount={selectedRows.length}
            />
          )}
        </div>
      </div>

      <MediaTypeFormDrawer state={drawer} onClose={() => setDrawer({ open: false })} />
    </div>
  );
}

function extractMessage(err: unknown): string | undefined {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message;
}
