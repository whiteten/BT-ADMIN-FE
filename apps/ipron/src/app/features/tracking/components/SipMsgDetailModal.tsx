/**
 * SIP 메시지 raw 상세 모달 — AS-IS poSipMsg 모달 미러.
 *
 * SIP 로그 본문의 화살표 (Detail) 클릭 시 열림.
 * AS-IS 동일 — 시스템 부하 경고 confirm 후 호출 (1회 표시).
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Spin, Tag, Tooltip } from 'antd';
import { Copy, Download, Maximize2, Minimize2 } from 'lucide-react';
import { type SipMsgResponse, sipMsgApi } from '../api/sipMsgApi';

interface Props {
  open: boolean;
  onClose: () => void;
  context: {
    file: string;
    position: number;
    length: number;
    segmentType: 'IE' | 'IC' | 'IR' | string;
    systemId: number | null;
    callDate: string | null;
  } | null;
}

type LoadState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; data: SipMsgResponse } | { kind: 'error'; message: string };

const SEGMENT_LABEL: Record<string, string> = { IE: '🔌 PBX', IR: '🤖 IVR', IC: '📞 CTI' };
const SEGMENT_COLOR: Record<string, string> = { IE: 'blue', IR: 'purple', IC: 'orange' };

function formatBytes(n: number | null | undefined): string {
  if (n == null) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function SipMsgDetailModal({ open, onClose, context }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const [maximized, setMaximized] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!open || !context?.file || context.systemId == null) return;
    setState({ kind: 'loading' });
    sipMsgApi
      .fetch({
        file: context.file,
        position: context.position,
        length: context.length,
        segmentType: context.segmentType,
        systemId: context.systemId,
        callDate: context.callDate,
      })
      .then((data) => setState({ kind: 'ready', data }))
      .catch((e) => setState({ kind: 'error', message: e?.message ?? String(e) }));
  }, [open, context]);

  const segLabel = context?.segmentType ? (SEGMENT_LABEL[context.segmentType] ?? context.segmentType) : '';
  const segColor = context?.segmentType ? (SEGMENT_COLOR[context.segmentType] ?? 'default') : 'default';

  const handleCopy = async () => {
    if (state.kind === 'ready' && state.data.body) {
      try {
        await navigator.clipboard.writeText(state.data.body);
      } catch {
        /* ignore */
      }
    }
  };
  const handleDownload = () => {
    if (state.kind === 'ready' && state.data.body) {
      const fname = `sip-msg-${context?.file ?? 'unknown'}-${context?.position ?? 0}.txt`;
      const blob = new Blob([state.data.body], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        setState({ kind: 'idle' });
        onClose();
      }}
      footer={null}
      width={maximized ? '95vw' : 1200}
      style={maximized ? { top: 20, paddingBottom: 0 } : undefined}
      styles={maximized ? { body: { maxHeight: 'calc(100vh - 160px)', overflow: 'auto' } } : undefined}
      title={
        <div className="flex items-center gap-2 flex-wrap pr-8">
          <span className="text-[14px] font-semibold">📨 SIP 메시지 상세</span>
          {context && segLabel && (
            <Tag color={segColor} className="!ml-1">
              {segLabel}
            </Tag>
          )}
          {context && (
            <span className="text-[11px] text-gray-500 font-mono truncate max-w-[450px]">
              {context.file} @ {context.position} ({context.length} B)
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Tooltip title="복사" placement="bottom">
              <button
                onClick={handleCopy}
                disabled={state.kind !== 'ready'}
                className="inline-flex items-center justify-center w-7 h-7 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded transition disabled:opacity-30"
              >
                <Copy size={14} />
              </button>
            </Tooltip>
            <Tooltip title="다운로드" placement="bottom">
              <button
                onClick={handleDownload}
                disabled={state.kind !== 'ready'}
                className="inline-flex items-center justify-center w-7 h-7 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded transition disabled:opacity-30"
              >
                <Download size={14} />
              </button>
            </Tooltip>
            <Tooltip title={maximized ? '원래 크기' : '전체 화면'} placement="bottom">
              <button
                onClick={() => setMaximized((v) => !v)}
                className="inline-flex items-center justify-center w-7 h-7 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded transition"
              >
                {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </Tooltip>
          </div>
        </div>
      }
      destroyOnHidden
    >
      {state.kind === 'loading' ? (
        <div className="flex justify-center items-center py-10">
          <Spin tip="SIP 장비 통신 중..." size="large" />
        </div>
      ) : state.kind === 'error' ? (
        <Alert type="error" message={state.message} showIcon className="my-3" />
      ) : state.kind === 'ready' ? (
        <div className="flex flex-col">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 px-1 mb-2 items-center">
            <span>
              크기 <span className="font-mono text-gray-700">{formatBytes(state.data.byteSize)}</span>
            </span>
            <span>
              일자 <span className="font-mono text-gray-700">{state.data.callDate}</span>
            </span>
            <span>
              system <span className="font-mono text-gray-700">{state.data.systemId ?? '-'}</span>
            </span>
          </div>
          {state.data.body ? (
            <pre
              ref={preRef}
              className="rounded border border-gray-700 overflow-auto text-[12px] leading-[1.4] p-3"
              style={{
                backgroundColor: '#000',
                color: '#F1F1F1',
                fontFamily: "'D2 Coding','Cascadia Mono','Consolas','Lucida Console','Courier New',monospace",
                whiteSpace: 'pre',
                maxHeight: maximized ? 'calc(100vh - 320px)' : '500px',
              }}
            >
              {state.data.body}
            </pre>
          ) : (
            <div className="text-center text-gray-500 py-8 text-[12px]">SIP 메시지 본문이 없습니다.</div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
