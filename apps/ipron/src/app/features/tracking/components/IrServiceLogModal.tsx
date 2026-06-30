/**
 * IR 서비스 로그 조회 모달.
 *
 * - 콜트래킹 상세 → IR hop 카드 → "📜 서비스 로그" 버튼 클릭 시 열림
 * - 진입 시 GET /bff/ipron-ir-svc-log-fetch 1회 호출
 * - 캐시 hit 이면 DB 메타 + 로컬 파일 read (빠름)
 * - 캐시 miss 이면 IR 장비 TCP 호출 후 응답 (수 초 대기 가능)
 *
 * AS-IS IPR30S1060_logViewer + IPR30S1061S_logTrace 대응. PacketLogModal 패턴 미러.
 */
import { useEffect, useState } from 'react';
import { Alert, Modal, Spin, Tag, Tooltip } from 'antd';
import { Maximize2, Minimize2 } from 'lucide-react';
import IrLogPrettyView from './IrLogPrettyView';
import { type IrServiceLogResponse, irServiceLogApi } from '../api/irServiceLogApi';

interface Props {
  open: boolean;
  onClose: () => void;
  context: {
    ucid: string | null;
    hop: number;
    systemId: number | null;
    sleeId: number | null;
    callDate: string | null; // YYYYMMDD
  } | null;
}

type LoadState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; data: IrServiceLogResponse } | { kind: 'error'; message: string };

function formatBytes(n: number | null | undefined): string {
  if (n == null) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function formatExpire(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('ko-KR', { hour12: false });
  } catch {
    return iso;
  }
}

export default function IrServiceLogModal({ open, onClose, context }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!open || !context?.ucid) return;
    setState({ kind: 'loading' });
    irServiceLogApi
      .fetch({
        ucid: context.ucid,
        hop: context.hop,
        systemId: context.systemId,
        sleeId: context.sleeId,
        callDate: context.callDate,
      })
      .then((data) => setState({ kind: 'ready', data }))
      .catch((e) => setState({ kind: 'error', message: e?.message ?? String(e) }));
  }, [open, context]);

  // blocked — UCID 가 없으면 호출 불가
  const blocked = context != null && (!context.ucid || context.systemId == null);
  const missing: string[] = [];
  if (context) {
    if (!context.ucid) missing.push('UCID');
    if (context.systemId == null) missing.push('systemId');
  }

  return (
    <Modal
      open={open}
      onCancel={() => {
        setState({ kind: 'idle' });
        onClose();
      }}
      footer={null}
      width={maximized ? '95vw' : 1280}
      style={maximized ? { top: 20, paddingBottom: 0 } : undefined}
      styles={maximized ? { body: { maxHeight: 'calc(100vh - 160px)', overflow: 'auto' } } : undefined}
      title={
        <div className="flex items-center gap-2 flex-wrap pr-8">
          <span className="text-[14px] font-semibold">📜 IR 서비스 로그</span>
          {context && (
            <Tag color="purple" className="!ml-1">
              HOP {String(context.hop).padStart(4, '0')}
            </Tag>
          )}
          {context?.ucid && <span className="text-[11px] text-gray-400 font-mono truncate max-w-[400px]">{context.ucid}</span>}
          {state.kind === 'ready' && (
            <Tag color={state.data.cacheHit ? 'green' : 'blue'} className="!ml-1">
              {state.data.cacheHit ? '📦 캐시 적중' : '🆕 IR 신규 조회'}
            </Tag>
          )}
          <Tooltip title={maximized ? '원래 크기' : '전체 화면'} placement="bottom">
            <button
              onClick={() => setMaximized((v) => !v)}
              className="ml-auto inline-flex items-center justify-center w-7 h-7 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded transition"
            >
              {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </Tooltip>
        </div>
      }
      destroyOnHidden
    >
      {blocked ? (
        <Alert
          type="warning"
          showIcon
          message="IR 서비스 로그 조회에 필요한 정보가 부족합니다"
          description={
            <div className="text-[12px] space-y-1.5">
              <div>
                다음 값이 없어 IR 장비에 조회할 수 없습니다: <span className="font-semibold text-red-600">{missing.join(', ')}</span>
              </div>
              <div className="font-mono text-[11px] text-gray-500">
                ucid={String(context?.ucid ?? 'null')} · hop={String(context?.hop ?? 'null')} · systemId=
                {String(context?.systemId ?? 'null')} · sleeId={String(context?.sleeId ?? 'null')} · callDate=
                {String(context?.callDate ?? 'null')}
              </div>
            </div>
          }
        />
      ) : state.kind === 'loading' ? (
        <div className="flex justify-center items-center py-10">
          <Spin tip="IR 장비 통신 중..." size="large" />
        </div>
      ) : state.kind === 'error' ? (
        <Alert type="error" message={state.message} showIcon className="my-3" />
      ) : state.kind === 'ready' ? (
        <div className="flex flex-col">
          {/* 메타 라인 */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 px-1 mb-2 items-center">
            <span>
              원본 <span className="font-mono text-gray-700">{formatBytes(state.data.originalSize)}</span>
            </span>
            <span>
              저장 <span className="font-mono text-gray-700">{formatBytes(state.data.compressedSize)}</span>
              {state.data.contentEncoding === 'gzip' && state.data.originalSize && state.data.compressedSize ? (
                <span className="text-gray-400"> ({((1 - state.data.compressedSize / state.data.originalSize) * 100).toFixed(0)}% 압축)</span>
              ) : null}
            </span>
            <span>
              만료 <span className="font-mono text-gray-700">{formatExpire(state.data.expireAt)}</span>
            </span>
            {state.data.target && (
              <span>
                target <span className="font-mono text-gray-700">{state.data.target}</span>
              </span>
            )}
            {state.data.version && (
              <span>
                ver <span className="font-mono text-gray-700">{state.data.version}</span>
              </span>
            )}
          </div>

          {/* 본문 — pretty viewer (라인 분리 + 마커 + finder + 복사/다운로드) */}
          {state.data.body ? (
            <IrLogPrettyView body={state.data.body} ucid={state.data.ucid} hop={state.data.nextHop} maxHeight={maximized ? 'calc(100vh - 320px)' : '500px'} />
          ) : (
            <div className="text-center text-gray-500 py-8 text-[12px]">IR 장비에 해당 HOP 의 서비스 로그가 없습니다.</div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
