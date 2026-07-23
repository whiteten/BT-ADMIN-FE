/**
 * DN 엑셀 가져오기 Drawer (IPR20S2020).
 *
 * - 노드/테넌트 고정. 엑셀 양식은 export 와 동일한 15컬럼.
 * - 백엔드는 비동기 + 청크(500) 처리. FE 는 1초 polling 으로 진행률 갱신.
 * - 한 행 실패해도 나머지는 계속 진행, 실패 행은 실시간 누적 표시.
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Progress, Tag, Upload } from 'antd';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from '@/shared-util';
import { dnApi } from '../api/dnApi';

interface DnImportDrawerProps {
  open: boolean;
  nodeId: number | null;
  tenantId: number | null;
  nodeName?: string | null;
  tenantName?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportProgress {
  taskId: string;
  total: number;
  processed: number;
  success: number;
  failedCount: number;
  failed: Array<{ rowNum: number; dnNo: string; reason: string }>;
  done: boolean;
  errorMessage: string | null;
}

type Phase = 'idle' | 'uploading' | 'polling' | 'done';

export default function DnImportDrawer({ open, nodeId, tenantId, nodeName, tenantName, onClose, onSuccess }: DnImportDrawerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Drawer 열릴 때마다 상태 초기화
  useEffect(() => {
    if (open) {
      setFile(null);
      setPhase('idle');
      setProgress(null);
      setErrorMsg(null);
    }
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [open]);

  const startPolling = (taskId: string) => {
    setPhase('polling');
    pollTimer.current = setInterval(async () => {
      try {
        const status = await dnApi.getImportStatus(taskId);
        setProgress(status);
        if (status.done) {
          if (pollTimer.current) {
            clearInterval(pollTimer.current);
            pollTimer.current = null;
          }
          setPhase('done');
          if (status.errorMessage) {
            setErrorMsg(status.errorMessage);
            toast.error(`가져오기 실패: ${status.errorMessage}`);
          } else if (status.failedCount === 0) {
            toast.success(`가져오기 완료 — 전체 ${status.total}건 모두 등록`);
          } else {
            toast.warning(`가져오기 완료 — 성공 ${status.success}, 실패 ${status.failedCount}`);
          }
          onSuccess();
        }
      } catch (e) {
        console.error('[dn-import] status polling failed', e);
      }
    }, 1000);
  };

  const handleStart = async () => {
    if (!nodeId || !tenantId || !file) return;
    setPhase('uploading');
    setErrorMsg(null);
    try {
      const { taskId } = await dnApi.startImport({ nodeId, tenantId, file });
      // 즉시 빈 progress 로 표시 (taskId 발급 시점에서 total 은 백엔드가 파싱 후 갱신)
      setProgress({
        taskId,
        total: 0,
        processed: 0,
        success: 0,
        failedCount: 0,
        failed: [],
        done: false,
        errorMessage: null,
      });
      startPolling(taskId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message ?? '가져오기 시작 실패';
      setErrorMsg(message);
      setPhase('idle');
      toast.error(message);
    }
  };

  const handleClose = () => {
    if (phase === 'uploading' || phase === 'polling') {
      // 진행 중에는 closable=false 로 막혀 있지만 안전망
      return;
    }
    onClose();
  };

  const percent = progress && progress.total > 0 ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0;

  const inProgress = phase === 'uploading' || phase === 'polling';

  return (
    <Drawer
      title="DN 엑셀 가져오기"
      open={open}
      onClose={handleClose}
      size={560}
      placement="right"
      mask={{ closable: !inProgress }}
      closable={{ placement: 'end', disabled: inProgress }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={inProgress}>
            {phase === 'done' ? '닫기' : '취소'}
          </Button>
          {phase !== 'done' && (
            <Button type="primary" onClick={handleStart} disabled={!nodeId || !tenantId || !file || inProgress} loading={inProgress}>
              가져오기 시작
            </Button>
          )}
        </div>
      }
    >
      <Alert
        type="info"
        showIcon
        className="!mb-4"
        message={`${nodeName ?? '-'} / ${tenantName ?? '-'} 로 일괄 등록됩니다`}
        description={
          <div className="space-y-1 text-xs">
            <div>엑셀 양식은 내보내기와 동일한 15컬럼입니다 (테넌트/노드 컬럼은 무시되고 위 노드/테넌트로 강제 등록).</div>
            <div>이미 존재하는 DN, 누락된 필수값은 실패 처리되며 나머지는 계속 진행됩니다.</div>
            <div className="text-gray-500">백엔드는 500건 단위 청크로 처리하며 진행률은 1초마다 갱신됩니다.</div>
          </div>
        }
      />

      {phase === 'idle' && (
        <Upload.Dragger
          accept=".xlsx,.xls"
          maxCount={1}
          beforeUpload={(f) => {
            setFile(f);
            return false; // 자동 업로드 차단 — 시작 버튼으로 트리거
          }}
          onRemove={() => setFile(null)}
          fileList={file ? [{ uid: '1', name: file.name, status: 'done', size: file.size, type: file.type }] : []}
        >
          <p className="ant-upload-drag-icon">
            <FileSpreadsheet className="inline size-10 text-[#405189]" />
          </p>
          <p className="ant-upload-text">엑셀 파일을 끌어다 놓거나 클릭하여 선택</p>
          <p className="ant-upload-hint text-xs">.xlsx / .xls 만 지원</p>
        </Upload.Dragger>
      )}

      {progress && (phase === 'polling' || phase === 'done' || phase === 'uploading') && (
        <div className="mt-4 p-4 border border-gray-200 rounded-md bg-white space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              <Tag color={phase === 'done' ? (errorMsg ? 'red' : 'green') : 'blue'}>
                {phase === 'uploading' && '업로드 중...'}
                {phase === 'polling' && '처리 중'}
                {phase === 'done' && (errorMsg ? '실패' : '완료')}
              </Tag>
            </span>
            <span className="font-semibold text-gray-800">
              {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}건
            </span>
          </div>
          <Progress percent={percent} status={errorMsg ? 'exception' : phase === 'done' ? 'success' : 'active'} showInfo />
          <div className="flex justify-between text-xs">
            <span className="text-green-600 font-medium">성공 {progress.success.toLocaleString()}</span>
            <span className="text-red-600 font-medium">실패 {progress.failedCount.toLocaleString()}</span>
          </div>

          {progress.failed.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <div className="text-xs text-gray-700 font-medium mb-2">실패 행 ({progress.failed.length})</div>
              <div className="max-h-[200px] overflow-y-auto text-[11px] space-y-1">
                {progress.failed.map((f, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-gray-400 shrink-0">행{f.rowNum}</span>
                    <span className="text-gray-700 shrink-0">{f.dnNo || '-'}</span>
                    <span className="text-red-600 truncate">{f.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-red-600 border-t border-gray-100 pt-3">
              <Download className="inline size-3.5 mr-1" />
              {errorMsg}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
