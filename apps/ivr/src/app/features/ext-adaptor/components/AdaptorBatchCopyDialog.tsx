/**
 * 어댑터 배치복사 Dialog (AS-IS IPR20S6042_BatchCopy.jsp)
 *
 * - 원본(현재 선택 시스템)의 어댑터 전체를 체크한 대상 시스템들로 "덮어쓰기 복사"
 * - 대상 시스템 목록 = 전체 FOCUS 시스템에서 원본 제외 (기존 ivr-system-list 재사용)
 * - 대상 시스템의 기존 어댑터는 모두 삭제 후 원본을 복사 (레거시 동등) → 경고 표시
 */
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Alert, Modal, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { toast } from '@/shared-util';
import { useBatchCopyAdaptors } from '../hooks/useExtAdaptorQueries';
import type { AdaptorSystem } from '../types/extAdaptor';

export interface AdaptorBatchCopyDialogRef {
  /** sourceSystem = 원본, candidates = 대상 후보(원본 제외된 전체 FOCUS 시스템) */
  open: (sourceSystem: AdaptorSystem, candidates: AdaptorSystem[]) => void;
  close: () => void;
}

interface Props {
  onSuccess?: () => void;
}

const AdaptorBatchCopyDialog = forwardRef<AdaptorBatchCopyDialogRef, Props>(({ onSuccess }, ref) => {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<AdaptorSystem | null>(null);
  const [candidates, setCandidates] = useState<AdaptorSystem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const batchCopyMutation = useBatchCopyAdaptors();

  useImperativeHandle(ref, () => ({
    open: (sourceSystem, cands) => {
      setSource(sourceSystem);
      setCandidates(cands);
      setSelectedIds([]);
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const columns = useMemo<ColumnsType<AdaptorSystem>>(
    () => [
      { title: '노드', dataIndex: 'nodeName', width: 160 },
      { title: '시스템', dataIndex: 'systemName' },
      {
        title: '현재 어댑터',
        dataIndex: 'adaptorCount',
        width: 110,
        align: 'center',
        render: (v?: number) => (v ? <Tag>{v}개</Tag> : <span className="text-gray-400">0</span>),
      },
    ],
    [],
  );

  const handleCopy = () => {
    if (!source) return;
    if (selectedIds.length === 0) {
      toast.warning('대상 시스템을 선택하세요');
      return;
    }
    batchCopyMutation.mutate(
      { sourceSystemId: source.systemId, targetSystemIds: selectedIds },
      {
        onSuccess: (result) => {
          toast.success(`${result.targetCount}개 시스템에 어댑터 ${result.sourceCount}개씩 복사되었습니다`);
          setOpen(false);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Modal
      title={`어댑터 배치복사 — 원본: ${source?.systemName ?? ''}`}
      open={open}
      onCancel={() => setOpen(false)}
      onOk={handleCopy}
      okText="복사"
      cancelText="취소"
      okButtonProps={{ loading: batchCopyMutation.isPending, disabled: selectedIds.length === 0 }}
      width={640}
      destroyOnClose
    >
      <Alert type="warning" showIcon message="덮어쓰기 복사" description="선택한 대상 시스템의 기존 어댑터는 모두 삭제된 뒤 원본 시스템의 어댑터로 교체됩니다." className="mb-3" />
      <Table<AdaptorSystem>
        rowKey="systemId"
        size="small"
        columns={columns}
        dataSource={candidates}
        pagination={false}
        scroll={{ y: 320 }}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as number[]),
        }}
      />
    </Modal>
  );
});

AdaptorBatchCopyDialog.displayName = 'AdaptorBatchCopyDialog';
export default AdaptorBatchCopyDialog;
