/**
 * SIP 로그 조회 모달 — AS-IS IPR30S1060.jsp doSipLogSearch() 미러.
 *
 * - 콜트래킹 상세 → hop 카드 → "📡 SIP 로그" 버튼 클릭 시 열림
 * - segmentType 별 다른 장비/포트 호출 (IE=9354 / IR=9356 / IC=9358)
 * - 응답 = 평문 SIP 메시지 (RFC 3261)
 * - 캐시 없음 — 매번 IR/IE/IC 장비 실시간 호출
 *
 * 본문 뷰는 IrLogPrettyView 재사용 (검색/finder/복사/다운로드 동일 UX).
 */
import { useEffect, useState } from 'react';
import { Alert, Modal, Spin, Tag, Tooltip } from 'antd';
import { Maximize2, Minimize2 } from 'lucide-react';
import IrLogPrettyView from './IrLogPrettyView';
import SipMsgDetailModal from './SipMsgDetailModal';
import { type SipLogResponse, sipLogApi } from '../api/sipLogApi';
import { parseDetailCall } from '../api/sipMsgApi';

interface Props {
  open: boolean;
  onClose: () => void;
  context: {
    ucid: string | null;
    hop: number;
    segmentType: 'IE' | 'IC' | 'IR' | string | null;
    systemId: number | null;
    callDate: string | null;
  } | null;
}

type LoadState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; data: SipLogResponse } | { kind: 'error'; message: string };

function formatBytes(n: number | null | undefined): string {
  if (n == null) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const SEGMENT_LABEL: Record<string, string> = {
  IE: '🔌 PBX',
  IR: '🤖 IVR',
  IC: '📞 CTI',
};
const SEGMENT_COLOR: Record<string, string> = {
  IE: 'blue',
  IR: 'purple',
  IC: 'orange',
};

export default function SipLogModal({ open, onClose, context }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const [maximized, setMaximized] = useState(false);
  const [msgContext, setMsgContext] = useState<React.ComponentProps<typeof SipMsgDetailModal>['context']>(null);

  const handleDetailClick = (detailRaw: string) => {
    const parsed = parseDetailCall(detailRaw);
    if (!parsed || !context) return;
    setMsgContext({
      file: parsed.file,
      position: parsed.position,
      length: parsed.length,
      segmentType: context.segmentType ?? 'IE',
      systemId: context.systemId,
      callDate: context.callDate,
    });
  };

  useEffect(() => {
    if (!open || !context?.ucid || !context.segmentType || context.systemId == null) return;
    setState({ kind: 'loading' });
    sipLogApi
      .fetch({
        ucid: context.ucid,
        segmentType: context.segmentType,
        systemId: context.systemId,
        callDate: context.callDate,
      })
      .then((data) => setState({ kind: 'ready', data }))
      .catch((e) => setState({ kind: 'error', message: e?.message ?? String(e) }));
  }, [open, context]);

  const missing: string[] = [];
  if (context) {
    if (!context.ucid) missing.push('UCID');
    if (!context.segmentType) missing.push('segmentType');
    if (context.systemId == null) missing.push('systemId');
  }
  const blocked = context != null && missing.length > 0;

  const segLabel = context?.segmentType ? (SEGMENT_LABEL[context.segmentType] ?? context.segmentType) : '';
  const segColor = context?.segmentType ? (SEGMENT_COLOR[context.segmentType] ?? 'default') : 'default';

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
          <span className="text-[14px] font-semibold">📡 SIP 로그</span>
          {context && segLabel && (
            <Tag color={segColor} className="!ml-1">
              {segLabel}
            </Tag>
          )}
          {context && <Tag className="!ml-1">HOP {String(context.hop).padStart(4, '0')}</Tag>}
          {context?.ucid && <span className="text-[11px] text-gray-400 font-mono truncate max-w-[400px]">{context.ucid}</span>}
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
          message="SIP 로그 조회에 필요한 정보가 부족합니다"
          description={
            <div className="text-[12px] space-y-1.5">
              <div>
                다음 값이 없어 장비에 조회할 수 없습니다: <span className="font-semibold text-red-600">{missing.join(', ')}</span>
              </div>
              <div className="font-mono text-[11px] text-gray-500">
                ucid={String(context?.ucid ?? 'null')} · segment={String(context?.segmentType ?? 'null')} · systemId={String(context?.systemId ?? 'null')} · callDate=
                {String(context?.callDate ?? 'null')}
              </div>
            </div>
          }
        />
      ) : state.kind === 'loading' ? (
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
            <IrLogPrettyView
              body={state.data.body}
              ucid={state.data.ucid}
              hop={context?.hop ?? 0}
              maxHeight={maximized ? 'calc(100vh - 320px)' : '500px'}
              onDetailClick={handleDetailClick}
              hideMarkerFinder
            />
          ) : (
            <div className="text-center text-gray-500 py-8 text-[12px]">장비에서 해당 호의 SIP 메시지를 찾지 못했습니다.</div>
          )}
        </div>
      ) : null}
      <SipMsgDetailModal open={msgContext != null} onClose={() => setMsgContext(null)} context={msgContext} />
    </Modal>
  );
}
