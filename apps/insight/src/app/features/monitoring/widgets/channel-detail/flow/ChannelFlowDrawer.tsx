import { useEffect, useRef, useState } from 'react';
import { Descriptions, Drawer } from 'antd';
import { ChevronsDown, Lock, Pin } from 'lucide-react';
import type { ChannelFlowItem, ChannelFlowTarget } from './types';
import { useChannelFlowSocket } from './useChannelFlowSocket';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

/** 셀에서 넘겨받는 표시 보조 정보(소켓 상세가 오기 전 헤더 폴백). */
export interface ChannelFlowMeta {
  no?: string;
  service?: string;
  menu?: string;
  ani?: string;
  dnis?: string;
}

interface ChannelFlowDrawerProps {
  open: boolean;
  target: ChannelFlowTarget | null;
  meta?: ChannelFlowMeta;
  onClose: () => void;
}

/**
 * 채널 상세 드로어 — serviceType 분기로 BE 가 내려준 정규화 플로우를 렌더.
 * DIALOG(sourceType) → 대화 버블(BOT 좌 / 고객 우), TRACKING → IVR 스텝 목록.
 */
export default function ChannelFlowDrawer({ open, target, meta, onClose }: ChannelFlowDrawerProps) {
  const { detail, connected, track, untrack } = useChannelFlowSocket();
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 드로어 열림/닫힘 → WS TRACK / UNTRACK
  useEffect(() => {
    if (open && target) {
      setAutoScroll(true);
      track(target);
      return () => untrack();
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.ucid, target?.systemId, target?.sleeChno]);

  // 새 상세 수신 시 자동 스크롤
  useEffect(() => {
    if (!autoScroll) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [detail, autoScroll]);

  const session = detail?.session;
  const isDialog = detail?.sourceType === 'DIALOG';
  // 트래킹 뷰는 화면 표시 의미 없는 내부 노드(멀티모달 placeholder 등) 없이 그대로 노출.
  const flow = detail?.trackingFlow ?? [];
  const isLoading = open && !detail;

  const extra = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        title="자동 스크롤"
        onClick={() => setAutoScroll(true)}
        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
          autoScroll ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
        }`}
      >
        <ChevronsDown size={13} />
        <span>자동</span>
      </button>
      <button
        type="button"
        title="스크롤 고정"
        onClick={() => setAutoScroll(false)}
        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
          !autoScroll ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
        }`}
      >
        <Pin size={13} />
        <span>고정</span>
      </button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>채널 상세{meta?.no ? ` · CH ${meta.no}` : ''}</span>
          {detail && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${isDialog ? 'bg-violet-100 text-violet-600' : 'bg-sky-100 text-sky-600'}`}>
              {isDialog ? '대화' : '트래킹'}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              connected ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-pulse bg-emerald-500' : 'bg-gray-400'}`} />
            {connected ? 'LIVE' : '연결중…'}
          </span>
        </div>
      }
      extra={extra}
      closable={{ placement: 'end' }}
      size={560}
      destroyOnHidden
      styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* 세션 정보 */}
        <Descriptions column={2} size="small" bordered className="flex-shrink-0">
          <Descriptions.Item label="시나리오" span={2}>
            {session?.serviceName ?? meta?.service ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="UCID" span={2}>
            <span className="font-mono text-[12px]">{session?.ucid ?? target?.ucid ?? '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label="발신">{session?.ani ?? meta?.ani ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="착신">{session?.dnis ?? meta?.dnis ?? '-'}</Descriptions.Item>
        </Descriptions>

        {/* 콜 종료 배너 */}
        {detail?.callEnded && <div className="flex-shrink-0 rounded-md bg-amber-50 px-3 py-1.5 text-[12px] font-medium text-amber-700">콜이 종료되었습니다.</div>}

        {/* 플로우 */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <FallbackSpinner />
          ) : flow.length === 0 ? (
            <NoData message="표시할 트래킹/대화 데이터가 없습니다." />
          ) : isDialog ? (
            <DialogBubbles items={flow} />
          ) : (
            <TrackingSteps items={flow} />
          )}
        </div>
      </div>
    </Drawer>
  );
}

/** DIALOG — 대화 버블 (BOT 좌 / 고객 우). */
function DialogBubbles({ items }: { items: ChannelFlowItem[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => {
        const customer = it.dialogRole === 'CUSTOMER';
        return (
          <div key={`${it.seq ?? i}-${i}`} className={`flex ${customer ? 'flex-row-reverse' : 'flex-row'} items-end gap-1.5`}>
            <div
              className={`max-w-[78%] rounded-lg border px-2.5 py-1.5 text-[12.5px] leading-relaxed ${
                customer ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-gray-200 bg-white text-gray-800'
              }`}
            >
              {it.encrypted && (
                <span className="mr-1 inline-flex items-center text-amber-500" title="암호화된 발화">
                  <Lock size={11} />
                </span>
              )}
              {it.description ?? (it.encrypted ? '🔒 암호화' : it.typeName)}
            </div>
            {it.startTime && <span className="mb-0.5 text-[10px] text-gray-400">{it.startTime}</span>}
          </div>
        );
      })}
    </div>
  );
}

/** TRACKING — IVR 스텝 목록. */
function TrackingSteps({ items }: { items: ChannelFlowItem[] }) {
  return (
    <div className="flex flex-col gap-1">
      {items.map((it, i) => (
        <div key={`${it.seq ?? i}-${i}`} className="flex items-start gap-2 rounded-md border border-gray-100 bg-white px-2.5 py-1.5">
          <span className="mt-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{it.typeName ?? `T${it.type}`}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {it.startTime && <span className="font-mono text-[10.5px] text-gray-400">{it.startTime}</span>}
              {it.result && <span className="text-[10.5px] font-medium text-emerald-600">{it.result}</span>}
            </div>
            {it.description && (
              <div className="truncate text-[12px] text-gray-800" title={it.description}>
                {it.description}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
