import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Descriptions, Drawer } from 'antd';
import { MessageSquare } from 'lucide-react';
import { useGetSttChatContent } from '../hooks/useSttChatContentQueries';
import type { SttChatSentence, SttRealSentenceDrawerInfo } from '../types';
import { cn } from '@/lib/utils';

export interface SttRealSentenceDrawerRef {
  open: (info: SttRealSentenceDrawerInfo) => void;
  close: () => void;
}

/** YYYYMMDDHHMMSS → HH:MM:SS */
function formatStime(time: string): string {
  if (!time || time.length < 14) return '';
  return `${time.slice(8, 10)}:${time.slice(10, 12)}:${time.slice(12, 14)}`;
}

function ChatBubble({ sentence }: { sentence: SttChatSentence }) {
  const isFrom = sentence.speaker === 'TX';
  return (
    <div className={cn('flex', isFrom ? 'justify-end' : 'justify-start')}>
      <div className={cn('relative max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm', isFrom ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800')}>
        <p className="break-all leading-relaxed">{sentence.text}</p>
        {sentence.time && <p className={cn('text-[11px] mt-1 text-right', isFrom ? 'text-blue-100' : 'text-gray-400')}>{formatStime(sentence.time)}</p>}
      </div>
    </div>
  );
}

const SttRealSentenceDrawer = forwardRef<SttRealSentenceDrawerRef>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<SttRealSentenceDrawerInfo | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    open: (drawerInfo: SttRealSentenceDrawerInfo) => {
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

  const { data: sentences = [], isLoading } = useGetSttChatContent({
    params: info?.ucidGkey ? { ucidGkey: info.ucidGkey } : undefined,
  });

  useEffect(() => {
    if (autoScroll && sentences.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sentences, autoScroll]);

  const descItems = [
    ...(info?.ucidGkey ? [{ key: 'ucidGkey', label: '녹취키', children: info.ucidGkey }] : []),
    ...(info?.dnNo ? [{ key: 'dnNo', label: '내선번호', children: info.dnNo }] : []),
    ...(info?.channelId != null ? [{ key: 'channelId', label: '채널번호', children: `#${info.channelId}` }] : []),
    ...(info?.agentName ? [{ key: 'agentName', label: '상담사', children: info.agentName }] : []),
    ...(info?.channelStatusNm ? [{ key: 'channelStatusNm', label: '상태', children: info.channelStatusNm }] : []),
    ...(info?.progressRate ? [{ key: 'progressRate', label: '진행률', children: info.progressRate }] : []),
  ];

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="실시간 STT 상세"
      closable={{ placement: 'end' }}
      width={520}
      destroyOnHidden
      styles={{ body: { display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 24px' } }}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        {/* 채널/내선 정보 */}
        {descItems.length > 0 && (
          <div className="shrink-0">
            <Descriptions items={descItems} column={2} size="small" bordered />
          </div>
        )}

        {/* STT 내용 */}
        <div className="flex flex-col flex-1 min-h-0 border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 shrink-0">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="size-3.5 text-blue-500" />
              <span className="text-xs font-bold text-gray-700">STT 내용</span>
              <span className="text-[10px] text-gray-400">({sentences.length}건)</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="accent-blue-500" />
              자동스크롤
            </label>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">불러오는 중...</div>
            ) : sentences.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">수신된 STT 내용이 없습니다.</div>
            ) : (
              sentences.map((s, idx) => <ChatBubble key={`${s.offset}-${idx}`} sentence={s} />)
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 shrink-0">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            TX (송신)
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
            RX (수신)
          </span>
        </div>
      </div>
    </Drawer>
  );
});

SttRealSentenceDrawer.displayName = 'SttRealSentenceDrawer';
export default SttRealSentenceDrawer;
