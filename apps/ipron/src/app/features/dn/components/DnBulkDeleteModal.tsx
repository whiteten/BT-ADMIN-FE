/**
 * DN 다건 삭제 Modal
 *
 * - 확인 단계 → 진행 단계 → 완료/실패 단계를 한 Modal 안에서 처리.
 * - 500건 초과 시 자동으로 청크 분할 순차 호출 (HTTP 431 / TCP payload 회피).
 * - 진행 중엔 닫기 비활성화, 실패 시 "여기까지 삭제됨 + 남은 범위 재시도" 안내.
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Progress } from 'antd';
import { dnApi } from '../api/dnApi';

/** 한 요청당 최대 DN 건수 — IDS TCP frame 여유 유지 + 트랜잭션 시간 제어용.
 *  URL 길이 제한은 POST+body 전환으로 해소됨 (BFF flow ipron-dn-delete-batch). */
const CHUNK_SIZE = 500;

interface DnBulkDeleteModalProps {
  open: boolean;
  dnIds: number[];
  onCancel: () => void;
  onSuccess: () => void;
}

type Phase = 'confirm' | 'running' | 'done' | 'error';

export default function DnBulkDeleteModal({ open, dnIds, onCancel, onSuccess }: DnBulkDeleteModalProps) {
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

  const total = dnIds.length;
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
      const chunk = dnIds.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, total));
      try {
        await dnApi.deleteBatch(chunk);
        done += chunk.length;
        setCompleted(done);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? '삭제 요청 실패';
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
      title={`선택한 ${total.toLocaleString()}개 내선 삭제`}
      footer={footer}
      onCancel={handleClose}
      maskClosable={phase !== 'running'}
      closable={phase !== 'running'}
      width={480}
      destroyOnClose
    >
      {phase === 'confirm' && (
        <div className="space-y-3">
          <div className="text-sm text-gray-700">선택한 {total}건의 내선을 삭제하시겠습니까?</div>
          {total > CHUNK_SIZE && (
            <Alert
              type="info"
              showIcon
              message={`대량 삭제 안내`}
              description={`${total.toLocaleString()}건을 ${CHUNK_SIZE.toLocaleString()}건씩 ${totalChunks}개 청크로 나누어 순차 처리합니다. 중간에 실패하면 실패 청크 이전까지만 삭제됩니다.`}
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
