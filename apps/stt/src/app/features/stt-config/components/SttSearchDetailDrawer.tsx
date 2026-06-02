import { Fragment, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Descriptions, Drawer, Empty, Select, Spin } from 'antd';
import type { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { Headphones, User } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetSttResultSentence, useGetSttSearchListen } from '../hooks/useSearchQueries';
import type { SttResultSentenceItem, SttSearchItem, SttSearchListenParams } from '../types';
import SttAudioPlayer, { type SttAudioPlayerRef } from './SttAudioPlayer';
import { cn } from '@/lib/utils';

function getListenErrorMessage(error: Error): string {
  const buffer = (error as AxiosError<ArrayBuffer>).response?.data;
  if (buffer instanceof ArrayBuffer) {
    try {
      const text = new TextDecoder().decode(buffer);
      const json = JSON.parse(text) as { message?: string };
      if (json.message) return json.message;
    } catch {
      // ignore parse errors
    }
  }
  return '음성 파일을 불러올 수 없습니다.';
}

export interface SttSearchDetailDrawerRef {
  open: (row: SttSearchItem, keyword?: string) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  row: SttSearchItem | null;
  keyword: string;
}

function splitByKeyword(text: string, keyword: string): Array<{ text: string; match: boolean }> {
  if (!keyword) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const kw = keyword.toLowerCase();
  const result: Array<{ text: string; match: boolean }> = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(kw, i);
    if (idx === -1) {
      result.push({ text: text.slice(i), match: false });
      break;
    }
    if (idx > i) result.push({ text: text.slice(i, idx), match: false });
    result.push({ text: text.slice(idx, idx + kw.length), match: true });
    i = idx + kw.length;
  }
  return result;
}

const RXTX_LABEL: Record<string, string> = {
  '': '전체',
  '1': '고객',
  '2': '상담원',
};

const RXTX_OPTIONS = [
  { label: '전체', value: '' },
  { label: '고객', value: '1' },
  { label: '상담원', value: '2' },
];

const LISTEN_TYPE_MAP: Record<string, string> = {
  '': '3',
  '1': '4',
  '2': '5',
};

const INOUT_LABEL: Record<string, string> = {
  '0': '인바운드',
  '1': '아웃바운드',
};

function formatArmsOffset(armsoffset: number): string {
  const totalSeconds = Math.floor(armsoffset / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function SentenceBubble({
  item,
  isActive,
  keyword,
  onClick,
  domRef,
}: {
  item: SttResultSentenceItem;
  isActive: boolean;
  keyword: string;
  onClick: () => void;
  domRef?: (el: HTMLDivElement | null) => void;
}) {
  const rxtx = String(item.rxtxKind);
  const isCustomer = rxtx === '1';
  const label = RXTX_LABEL[rxtx] ?? rxtx;
  const timestamp = formatArmsOffset(item.armsoffset);

  return (
    <div ref={domRef} className={cn('flex max-w-[80%] cursor-pointer items-start gap-2.5', !isCustomer && 'ml-auto flex-row-reverse')} onClick={onClick}>
      <div className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full', isCustomer ? 'bg-emerald-500/10' : 'bg-blue-500/10')}>
        {isCustomer ? <User size={14} className="text-emerald-600" /> : <Headphones size={14} className="text-blue-600" />}
      </div>

      <div className={cn('flex flex-col gap-0.5', !isCustomer && 'items-end')}>
        <div className={cn('mb-0.5 flex items-center gap-1.5', !isCustomer && 'flex-row-reverse')}>
          <span className={cn('text-[10px] font-medium', isCustomer ? 'text-emerald-600/70' : 'text-blue-600/70')}>{label}</span>
          <span className="tabular-nums text-[10px] text-slate-500">{timestamp}</span>
        </div>
        <div
          className={cn(
            'rounded-2xl border px-3.5 py-2 shadow-sm transition-colors',
            isCustomer
              ? cn('rounded-tl-md', isActive ? 'border-emerald-400 bg-emerald-100 shadow-md' : 'border-emerald-100 bg-emerald-50')
              : cn('rounded-tr-md', isActive ? 'border-blue-400 bg-blue-100 shadow-md' : 'border-blue-100 bg-blue-50'),
          )}
        >
          <p className="whitespace-pre-wrap break-all text-[13px] leading-relaxed text-slate-700">
            {splitByKeyword(item.sentence, keyword).map(({ text, match }, i) =>
              match ? (
                <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5 not-italic">
                  {text}
                </mark>
              ) : (
                <Fragment key={i}>{text}</Fragment>
              ),
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

const SttSearchDetailDrawer = forwardRef<SttSearchDetailDrawerRef>((_, ref) => {
  const [state, setState] = useState<DrawerState>({ open: false, row: null, keyword: '' });
  const audioPlayerRef = useRef<SttAudioPlayerRef>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [rxtxKind, setRxtxKind] = useState('');
  const bubbleRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useImperativeHandle(ref, () => ({
    open: (row, keyword = '') => setState({ open: true, row, keyword }),
    close: () => setState((prev) => ({ ...prev, open: false })),
  }));

  const handleClose = () => setState((prev) => ({ ...prev, open: false }));

  // 행이 바뀌면 재생 위치·화자구분 초기화
  useEffect(() => {
    setCurrentTimeMs(0);
    setRxtxKind('');
    bubbleRefs.current.clear();
  }, [state.row]);

  // 화자구분 변경 시 재생 위치 초기화
  useEffect(() => {
    setCurrentTimeMs(0);
    bubbleRefs.current.clear();
  }, [rxtxKind]);

  const { data: sentences, isLoading } = useGetSttResultSentence({
    params: state.row ? { ucidGkey: state.row.ucidGkey, ...(rxtxKind && { rxtxKind }) } : ({ ucidGkey: '' } as never),
    queryOptions: { enabled: state.open && !!state.row },
  });

  const listenParams: SttSearchListenParams | undefined =
    state.row?.recSystemIp && state.row.saFilename
      ? {
          recSystemIp: state.row.recSystemIp,
          request: {
            saFilepath: state.row.saFilepath ?? '',
            saFilename: state.row.saFilename,
            saFileformat: '1',
            playerWidth: '800',
            type: LISTEN_TYPE_MAP[rxtxKind] ?? '3',
          },
        }
      : undefined;

  const {
    data: listenData,
    isLoading: isListenLoading,
    error: listenError,
  } = useGetSttSearchListen({
    params: listenParams as unknown as Record<string, unknown>,
    queryOptions: { enabled: state.open && !!listenParams },
  });

  useEffect(() => {
    if (!listenError) return;
    toast.warning(getListenErrorMessage(listenError));
  }, [listenError]);

  // 현재 재생 중인 문장 인덱스 (armsoffset <= currentTimeMs 인 마지막 항목)
  const activeIdx = sentences && currentTimeMs > 0 ? sentences.reduce((acc, s, i) => (s.armsoffset <= currentTimeMs ? i : acc), -1) : -1;

  // 키워드 매칭 문장의 armsoffset 목록
  const keywordOffsets = state.keyword && sentences ? sentences.filter((s) => s.sentence.toLowerCase().includes(state.keyword.toLowerCase())).map((s) => s.armsoffset) : [];

  // 자동 스크롤
  useEffect(() => {
    if (!autoScroll || activeIdx < 0) return;
    bubbleRefs.current.get(activeIdx)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIdx, autoScroll]);

  const handleBubbleClick = (armsoffset: number) => {
    audioPlayerRef.current?.seekMs(armsoffset);
  };

  const handleTimeUpdate = (ms: number) => {
    setCurrentTimeMs(ms);
  };

  return (
    <Drawer
      open={state.open}
      onClose={handleClose}
      title="STT 상세 정보"
      closable={{ placement: 'end' }}
      destroyOnHidden
      styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }, wrapper: { width: '45%' } }}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* 통화 정보 */}
        {state.row && (
          <div className="flex-shrink-0">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="통화일시">{state.row.callDatetime ? dayjs(state.row.callDatetime).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
              <Descriptions.Item label="고유번호">
                <span className="font-mono">{state.row.ucidGkey ?? '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="통화시간">{state.row.talkTime ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="I/O 구분">{INOUT_LABEL[state.row.inoutKind] ?? state.row.inoutKind}</Descriptions.Item>
              <Descriptions.Item label="상담원">
                {state.row.agentName ?? '-'}
                {state.row.agentId && <span className="ml-1.5 text-[11px] text-gray-400">({state.row.agentId})</span>}
              </Descriptions.Item>
              <Descriptions.Item label="내선번호">{state.row.dnNo ?? '-'}</Descriptions.Item>
            </Descriptions>
          </div>
        )}

        {/* 오디오 플레이어 */}
        {listenParams && (
          <div className="flex-shrink-0">
            {isListenLoading ? (
              <div className="flex h-[88px] items-center justify-center rounded-xl border border-slate-200 bg-white">
                <Spin size="small" tip="음성을 불러오는 중..." />
              </div>
            ) : listenData?.audioBlob ? (
              <SttAudioPlayer ref={audioPlayerRef} listenData={listenData} onTimeUpdate={handleTimeUpdate} autoPlay highlights={keywordOffsets} />
            ) : (
              <div className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-[12px] text-slate-400">음성 파일을 불러올 수 없습니다.</span>
              </div>
            )}
          </div>
        )}

        {/* 대화 버블 헤더 */}
        <div className="flex flex-shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-500">통화 내용</span>
            <Select value={rxtxKind} onChange={setRxtxKind} options={RXTX_OPTIONS} popupMatchSelectWidth={false} style={{ width: 100, fontSize: '12px' }} />
          </div>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="h-3.5 w-3.5 cursor-pointer accent-blue-500" />
            <span className="text-[12px] text-slate-500">자동 스크롤</span>
          </label>
        </div>

        {/* 대화 버블 영역 */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-lg bg-slate-50 px-4 py-5">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spin tip="대화 내용을 불러오는 중..." />
            </div>
          ) : !sentences || sentences.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Empty description="대화 내용이 없습니다." />
            </div>
          ) : (
            <div className="flex flex-col gap-3 px-1">
              {sentences.map((item, idx) => (
                <SentenceBubble
                  key={`${item.armsoffset}-${idx}`}
                  item={item}
                  isActive={idx === activeIdx}
                  keyword={state.keyword}
                  onClick={() => handleBubbleClick(item.armsoffset)}
                  domRef={(el) => {
                    if (el) bubbleRefs.current.set(idx, el);
                    else bubbleRefs.current.delete(idx);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
});

SttSearchDetailDrawer.displayName = 'SttSearchDetailDrawer';
export default SttSearchDetailDrawer;
