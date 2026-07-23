/**
 * 단말기 다건 삭제 Modal (DnBulkDeleteModal 패턴 — NUM-005 대응)
 *
 * - 확인 단계 → 진행 단계 → 완료/실패 단계.
 * - 청크 단위 순차 호출 + 진행률 표시.
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Progress } from 'antd';
import { deviceApi } from '../api/deviceApi';

const CHUNK_SIZE = 100;

interface DeviceBulkDeleteModalProps {
  open: boolean;
  devMasterIds: number[];
  onCancel: () => void;
  onSuccess: () => void;
}

type Phase = 'confirm' | 'running' | 'done' | 'error';

export default function DeviceBulkDeleteModal({ open, devMasterIds, onCancel, onSuccess }: DeviceBulkDeleteModalProps) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [completed, setCompleted] = useState(0);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (open) {
      setPhase('confirm');
      setCompleted(0);
      setChunkIndex(0);
      setErrorMsg(null);
      cancelRef.current = false;
    }
  }, [open]);

  const total = devMasterIds.length;
  const totalChunks = Math.max(1, Math.ceil(total / CHUNK_SIZE));
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  const handleDelete = async () => {
    if (total === 0) return;
    setPhase('running');
    setCompleted(0);
    setChunkIndex(0);
    setErrorMsg(null);
    cancelRef.current = false;

    let done = 0;
    for (let i = 0; i < totalChunks; i++) {
      if (cancelRef.current) {
        setErrorMsg(`사용자 요청으로 중단되었습니다. ${done.toLocaleString()}건 삭제됨.`);
        setPhase('error');
        return;
      }
      setChunkIndex(i);
      const chunk = devMasterIds.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, total));
      try {
        for (const id of chunk) {
          await deviceApi.remove(id);
        }
        done += chunk.length;
        setCompleted(done);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? '삭제 요청 실패';
        setErrorMsg(`청크 ${i + 1}/${totalChunks} 실패 (${msg}). 이전까지 ${done.toLocaleString()}건 삭제 완료. 남은 항목은 다시 선택해서 재시도하세요.`);
        setPhase('error');
        return;
      }
    }
    setPhase('done');
    onSuccess();
  };

  const handleClose = () => {
    if (phase === 'running') {
      cancelRef.current = true;
      return;
    }
    onCancel();
  };

  const footer =
    phase === 'confirm' ? (
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>취소</Button>
        <Button type="primary" danger onClick={handleDelete}>
          삭제
        </Button>
      </div>
    ) : phase === 'running' ? (
      <div className="flex justify-end gap-2">
        <Button onClick={handleClose} disabled={cancelRef.current}>
          중단
        </Button>
      </div>
    ) : (
      <div className="flex justify-end gap-2">
        <Button type="primary" onClick={onCancel}>
          닫기
        </Button>
      </div>
    );

  return (
    <Modal
      open={open}
      title={`선택한 ${total.toLocaleString()}개 단말기 삭제`}
      footer={footer}
      onCancel={handleClose}
      mask={{ closable: phase !== 'running' }}
      closable={phase !== 'running'}
      width={480}
      destroyOnHidden
    >
      {phase === 'confirm' && (
        <div className="space-y-3">
          <div className="text-sm text-gray-700">선택한 단말기를 삭제합니다. 프로비저닝 정보도 함께 삭제됩니다. 진행하시겠습니까?</div>
          {total > CHUNK_SIZE && (
            <Alert
              type="info"
              showIcon
              message="대량 삭제 안내"
              description={`${total.toLocaleString()}건을 ${CHUNK_SIZE.toLocaleString()}건씩 ${totalChunks}개 단위로 나누어 순차 처리합니다.`}
            />
          )}
        </div>
      )}

      {(phase === 'running' || phase === 'done' || phase === 'error') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              청크 {Math.min(chunkIndex + (phase === 'running' ? 1 : 0), totalChunks)} / {totalChunks}
            </span>
            <span className="font-semibold text-gray-800">
              {completed.toLocaleString()} / {total.toLocaleString()}
            </span>
          </div>
          <Progress percent={percent} status={phase === 'error' ? 'exception' : phase === 'done' ? 'success' : 'active'} showInfo />
          {phase === 'done' && <Alert type="success" showIcon message={`${completed.toLocaleString()}건 삭제 완료`} />}
          {phase === 'error' && errorMsg && <Alert type="error" showIcon message="삭제 중단" description={errorMsg} />}
        </div>
      )}
    </Modal>
  );
}
