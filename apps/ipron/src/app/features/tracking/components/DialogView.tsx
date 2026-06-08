/**
 * IVR 대화(Dialog) 뷰 — TB_DM_IR_DIALOG_CDR.
 *
 * AS-IS (IPR30S1060 대화창) 레이아웃을 따른다:
 *  - BOT (IVR 멘트, type 0/20)      = 우측 정렬 (시스템 발화가 본문)
 *  - CUSTOMER (DTMF/STT, type 10/11) = 좌측 정렬 (입력에 대한 반응)
 *  - 시간은 말풍선 반대편에 표시
 *  - DTMF(type=11) 는 큰 숫자 박스로 시각 강조
 *  - 상단 type 필터 셀렉터 제공 (Start/멘트/DTMF/STT/실패만 등)
 *
 * FORCUS_CDR_규격_v6.2 "ForCus Dialog CDR 상세" type 코드:
 *  - 0  IVR 멘트 재생       (BOT)
 *  - 10 음성 인식 (STT)     (CUSTOMER)
 *  - 11 DTMF 입력           (CUSTOMER)
 *  - 20 멀티모달            (BOT)
 */
import { useState } from 'react';
import { Empty, Select } from 'antd';
import type { DialogTurn } from '../types';

interface Props {
  turns: DialogTurn[];
  loading?: boolean;
}

type FilterKey = 'all' | 'bot' | 'dtmf' | 'stt' | 'failed';

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'bot', label: '🤖 IVR 멘트만' },
  { value: 'dtmf', label: '🔢 DTMF 입력만' },
  { value: 'stt', label: '🎤 음성 인식(STT)만' },
  { value: 'failed', label: '⚠ 실패만' },
];

const fmtTime = (ms: number | null): string => {
  if (ms == null) return '';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const typeLabel = (type: number | null): string => {
  switch (type) {
    case 0:
      return 'IVR 멘트';
    case 10:
      return '음성 인식';
    case 11:
      return 'DTMF';
    case 20:
      return '멀티모달';
    default:
      return type != null ? `Type ${type}` : '';
  }
};

function applyFilter(turns: DialogTurn[], key: FilterKey): DialogTurn[] {
  if (key === 'all') return turns;
  return turns.filter((t) => {
    if (key === 'bot') return t.type === 0 || t.type === 20;
    if (key === 'dtmf') return t.type === 11;
    if (key === 'stt') return t.type === 10;
    if (key === 'failed') return t.result === 'F';
    return true;
  });
}

/** DTMF 한 키를 큰 숫자 박스로 (여러 자리면 박스를 가로로 나열) */
function DtmfBoxes({ text }: { text: string | null }) {
  const keys = (text ?? '').split('').filter((c) => /[0-9*#]/.test(c));
  if (keys.length === 0) {
    return <span className="text-gray-400 italic text-[12px]">(입력 없음)</span>;
  }
  return (
    <div className="flex gap-1">
      {keys.map((k, i) => (
        <span
          key={i}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border-2 border-gray-400 bg-white text-gray-800 font-mono text-[16px] font-bold shadow-sm"
        >
          {k}
        </span>
      ))}
    </div>
  );
}

function BotBubble({ turn }: { turn: DialogTurn }) {
  const failed = turn.result === 'F';
  return (
    <div className="flex justify-end items-start gap-2 mb-2.5">
      {/* 시간 (말풍선 좌측, 박스 외부) */}
      <div className="flex flex-col items-end pt-1.5 flex-shrink-0">
        <span className="text-[10px] text-gray-400 font-mono">{fmtTime(turn.startMs)}</span>
        {turn.mentId && <span className="text-[9.5px] text-gray-400 font-mono">🔊 {turn.mentId}</span>}
      </div>
      {/* 말풍선 (우측) */}
      <div className="flex flex-col items-end max-w-[68%]">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] text-gray-400">{typeLabel(turn.type)}</span>
          <span className="text-[10px] font-semibold text-blue-700">🤖 IVR</span>
        </div>
        <div
          className={`px-3 py-2 rounded-lg text-[12px] leading-relaxed whitespace-pre-wrap break-words bg-blue-50 text-gray-800 border border-blue-200 rounded-tr-sm ${
            failed ? 'ring-1 ring-red-400' : ''
          }`}
        >
          {turn.text || <span className="text-gray-400 italic">(내용 없음)</span>}
        </div>
        {(failed || (turn.durationMs != null && turn.durationMs > 0)) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {turn.durationMs != null && turn.durationMs > 0 && <span className="text-[9.5px] text-gray-400">{Math.round(turn.durationMs / 1000)}s</span>}
            {failed && <span className="text-[9.5px] text-red-500 font-medium">실패</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerBubble({ turn }: { turn: DialogTurn }) {
  const isDtmf = turn.type === 11;
  const failed = turn.result === 'F';
  return (
    <div className="flex justify-start items-start gap-2 mb-2.5">
      {/* 말풍선 (좌측) */}
      <div className="flex flex-col items-start max-w-[68%]">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-semibold text-emerald-700">🙋 고객</span>
          <span className="text-[10px] text-gray-400">{typeLabel(turn.type)}</span>
        </div>
        {isDtmf ? (
          <DtmfBoxes text={turn.text} />
        ) : (
          <div
            className={`px-3 py-2 rounded-lg text-[12px] leading-relaxed whitespace-pre-wrap break-words bg-gray-100 text-gray-800 border border-gray-200 rounded-tl-sm ${
              failed ? 'ring-1 ring-red-400' : ''
            }`}
          >
            {turn.text || <span className="text-gray-400 italic">(내용 없음)</span>}
          </div>
        )}
        {failed && <span className="text-[9.5px] text-red-500 font-medium mt-0.5">실패</span>}
      </div>
      {/* 시간 (말풍선 우측, 박스 외부) */}
      <div className="flex flex-col items-start pt-1.5 flex-shrink-0">
        <span className="text-[10px] text-gray-400 font-mono">{fmtTime(turn.startMs)}</span>
      </div>
    </div>
  );
}

export default function DialogView({ turns, loading }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');

  if (loading) return <div className="p-4 text-[12px] text-gray-500">불러오는 중...</div>;
  if (!turns || turns.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-[12px]">대화 기록이 없습니다</span>} />
      </div>
    );
  }

  const filtered = applyFilter(turns, filter);

  return (
    <div className="flex flex-col">
      {/* 상단 필터 셀렉터 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50/60">
        <span className="text-[11px] text-gray-500">
          총 <span className="font-semibold text-gray-700">{turns.length}</span>건
          {filter !== 'all' && (
            <>
              {' / 표시 '}
              <span className="font-semibold text-blue-700">{filtered.length}</span>건
            </>
          )}
        </span>
        <Select<FilterKey> size="small" value={filter} onChange={setFilter} options={FILTER_OPTIONS} style={{ width: 180 }} />
      </div>

      {/* 대화 본문 */}
      <div className="p-4 bg-gradient-to-b from-gray-50/40 to-white">
        {filtered.length === 0 ? (
          <div className="p-6 flex items-center justify-center">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-[12px]">필터에 맞는 항목이 없습니다</span>} />
          </div>
        ) : (
          filtered.map((t, i) => (t.speaker === 'BOT' ? <BotBubble key={`${t.seq}-${i}`} turn={t} /> : <CustomerBubble key={`${t.seq}-${i}`} turn={t} />))
        )}
      </div>
    </div>
  );
}
