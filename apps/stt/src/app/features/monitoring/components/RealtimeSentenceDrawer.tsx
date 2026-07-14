import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Descriptions, Drawer } from 'antd';
import dayjs from 'dayjs';
import { Headphones, MessageSquare, User } from 'lucide-react';
import { useGetRealtimeSentence } from '../hooks/useMonitoringQueries';
import type { RealtimeSentenceDrawerInfo, SttChatSentence } from '../types';
import NoData from '@/components/custom/NoData';
import { cn } from '@/lib/utils';

export interface RealtimeSentenceDrawerRef {
  open: (info: RealtimeSentenceDrawerInfo) => void;
  close: () => void;
}

function ChatBubble({ sentence }: { sentence: SttChatSentence }) {
  const isAgent = sentence.speaker === 'TX'; // TX: 상담사(오른쪽), RX: 고객(왼쪽)
  const displayTime = sentence.time ? dayjs(sentence.time, 'YYYYMMDDHHmmss').format('HH:mm:ss') : null;

  return (
    <div className={cn('flex max-w-[85%] items-start gap-2.5', isAgent && 'ml-auto flex-row-reverse')}>
      {/* 아바타 */}
      <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', isAgent ? 'bg-blue-500/10' : 'bg-emerald-500/10')}>
        {isAgent ? <Headphones size={14} className="text-blue-600" /> : <User size={14} className="text-emerald-600" />}
      </div>

      {/* 버블 + timestamp */}
      <div className={cn('flex items-end gap-1.5', isAgent && 'flex-row-reverse')}>
        <div className={cn('flex flex-col gap-0.5', isAgent && 'items-end')}>
          <span className={cn('mb-0.5 text-[10px] font-medium', isAgent ? 'text-blue-600/70' : 'text-emerald-600/70')}>{isAgent ? '상담사' : '고객'}</span>
          <div className={cn('rounded-2xl border px-3.5 py-2 shadow-sm', isAgent ? 'rounded-tr-md border-blue-100 bg-blue-50' : 'rounded-tl-md border-emerald-100 bg-emerald-50')}>
            <p className="whitespace-pre-wrap break-all text-[13px] leading-relaxed text-slate-700">{sentence.text}</p>
          </div>
        </div>
        {displayTime && <span className="shrink-0 pb-1 text-[10px] text-slate-400">{displayTime}</span>}
      </div>
    </div>
  );
}

const RealtimeSentenceDrawer = forwardRef<RealtimeSentenceDrawerRef>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<RealtimeSentenceDrawerInfo | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    open: (drawerInfo: RealtimeSentenceDrawerInfo) => {
      setInfo(drawerInfo);
      setAutoScroll(true);
      setOpen(true);
    },
    close: () => {
      setOpen(false);
      setInfo(null);
    },
  }));

  const handleClose = () => {
    setOpen(false);
    setInfo(null);
  };

  const { data: sentences = [], isLoading } = useGetRealtimeSentence({
    params: info?.ucidGkey ? { ucidGkey: info.ucidGkey } : undefined,
  });

  useEffect(() => {
    if (autoScroll && sentences.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sentences, autoScroll]);

  const contentStyle = { width: 180 };
  const descItems = info
    ? [
        { key: 'ucidGkey', label: '고유번호(UCID)', children: info.ucidGkey, span: 2 },
        ...(info.callDatetime ? [{ key: 'callDatetime', label: '통화일시', children: info.callDatetime, span: 1, contentStyle }] : []),
        ...(info.dnNo ? [{ key: 'dnNo', label: '내선번호', children: info.dnNo, span: 1, contentStyle }] : []),
        ...(info.inoutKind ? [{ key: 'inoutKind', label: 'I/O 구분', children: info.inoutKind, span: 1, contentStyle }] : []),
        ...(info.agentName ? [{ key: 'agentName', label: '상담사', children: info.agentName, span: 1, contentStyle }] : []),
        ...(info.channelId != null ? [{ key: 'channelId', label: '채널번호', children: info.channelId, span: 1, contentStyle }] : []),
        ...(info.channelStatusNm ? [{ key: 'channelStatusNm', label: '채널상태', children: info.channelStatusNm, span: 1, contentStyle }] : []),
      ]
    : [];

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="실시간 STT 상세"
      closable={{ placement: 'end' }}
      destroyOnHidden
      styles={{ body: { display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 24px' }, wrapper: { width: '40%' } }}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        {/* 녹취 정보 */}
        {descItems.length > 0 && (
          <div className="shrink-0 [&_table]:table-fixed">
            <Descriptions title="녹취정보" items={descItems} column={2} size="small" bordered labelStyle={{ width: 100, whiteSpace: 'nowrap' }} />
          </div>
        )}

        {/* STT 내용 */}
        <div className="flex flex-col flex-1 min-h-0 border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-3 border-b bg-gray-50 shrink-0">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="size-3.5 text-blue-500" />
              <span className="text-sm font-bold text-gray-700">STT 내용</span>
              <span className="text-[10px] text-gray-400">({sentences.length}건)</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="accent-blue-500" />
              자동스크롤
            </label>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto rounded-lg bg-slate-50 px-4 py-5 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">불러오는 중...</div>
            ) : sentences.length === 0 ? (
              <NoData message="실시간 STT 내용이 없습니다." />
            ) : (
              sentences.map((s) => <ChatBubble key={s.offset} sentence={s} />)
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>
    </Drawer>
  );
});

RealtimeSentenceDrawer.displayName = 'RealtimeSentenceDrawer';
export default RealtimeSentenceDrawer;
