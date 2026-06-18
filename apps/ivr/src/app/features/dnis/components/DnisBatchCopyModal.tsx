/**
 * DNIS 일괄복사 Modal — AS-IS IPR20S6030 일괄복사 팝업.
 *
 * <p>destructive: 대상 노드의 같은 테넌트 DNIS 모두 삭제 후 원본을 복제.</p>
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Checkbox, Modal } from 'antd';
import { toast } from '@/shared-util';
import { useGetNodes } from '../../ivr-dn-group/hooks/useIvrDnGroupQueries';
import { dnisQueryKeys, useBatchCopyDnis } from '../hooks/useDnisQueries';

export interface DnisBatchCopyModalRef {
  open: (sourceNodeId: number) => void;
}

const DnisBatchCopyModal = forwardRef<DnisBatchCopyModalRef>((_, ref) => {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [sourceNodeId, setSourceNodeId] = useState<number | null>(null);
  const [targetIds, setTargetIds] = useState<number[]>([]);

  const { data: nodes = [] } = useGetNodes();
  const { mutate: copyMutate, isPending } = useBatchCopyDnis({
    mutationOptions: {
      onSuccess: (result) => {
        const totalDeleted = result.nodeResults.reduce((s, r) => s + r.deletedCount, 0);
        const totalInserted = result.nodeResults.reduce((s, r) => s + r.insertedCount, 0);
        toast.success(`일괄복사 완료: 삭제 ${totalDeleted}건, 복제 ${totalInserted}건 (대상 ${result.nodeResults.length}개 노드)`);
        queryClient.invalidateQueries({ queryKey: dnisQueryKeys.list._def });
        setVisible(false);
      },
      onError: (err) => toast.error(`일괄복사 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  useImperativeHandle(ref, () => ({
    open: (src) => {
      setSourceNodeId(src);
      setTargetIds([]);
      setVisible(true);
    },
  }));

  const sourceNode = nodes.find((n) => n.nodeId === sourceNodeId);
  const targetCandidates = nodes.filter((n) => n.nodeId !== sourceNodeId);

  const handleSubmit = () => {
    if (!sourceNodeId) return;
    if (targetIds.length === 0) {
      toast.warning('대상 노드를 선택하세요.');
      return;
    }
    copyMutate({ sourceNodeId, targetNodeIds: targetIds });
  };

  return (
    <Modal
      title={`일괄복사 — ${sourceNode?.nodeName ?? ''} → 대상 노드`}
      open={visible}
      onCancel={() => setVisible(false)}
      width={480}
      footer={[
        <Button key="cancel" onClick={() => setVisible(false)}>
          취소
        </Button>,
        <Button key="ok" type="primary" danger loading={isPending} onClick={handleSubmit}>
          복사 실행 ({targetIds.length})
        </Button>,
      ]}
      destroyOnHidden
    >
      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-3">
        ⚠ 대상 노드의 <b>기존 DNIS 는 삭제</b> 후 원본 노드의 DNIS 로 교체됩니다 (destructive).
      </div>
      <Checkbox.Group value={targetIds} onChange={(v) => setTargetIds(v as number[])} className="flex flex-col gap-2 w-full">
        {targetCandidates.map((n) => (
          <Checkbox key={n.nodeId} value={n.nodeId} className="!ml-0 hover:bg-slate-50 rounded p-2">
            <span className="text-sm">{n.nodeName}</span>
            <span className="ml-2 text-xs text-slate-400">(노드 ID: {n.nodeId})</span>
          </Checkbox>
        ))}
      </Checkbox.Group>
    </Modal>
  );
});

DnisBatchCopyModal.displayName = 'DnisBatchCopyModal';
export default DnisBatchCopyModal;
