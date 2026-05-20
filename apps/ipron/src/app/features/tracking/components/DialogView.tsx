/**
 * IVR 대화(Dialog) 뷰 — TB_DM_IR_DIALOG_CDR.
 *
 * FORCUS_CDR_규격_v6.2 "ForCus Dialog CDR 상세":
 *  - Type 0/20 = IVR 발화(BOT, 좌측 말풍선)
 *  - Type 10(음성STT)/11(음성DTMF) = 고객 입력(CUSTOMER, 우측 말풍선)
 *  - text = 멘트 내용 또는 고객 입력값, mentId = IVR 멘트 ID
 */
import { Empty } from 'antd';
import type { DialogTurn } from '../types/tracking.types';

interface Props {
  turns: DialogTurn[];
  loading?: boolean;
}

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
      return '음성 인식 (STT)';
    case 11:
      return 'DTMF 입력';
    case 20:
      return '멀티모달';
    default:
      return type != null ? `Type ${type}` : '';
  }
};

function Bubble({ turn }: { turn: DialogTurn }) {
  const isBot = turn.speaker === 'BOT';
  const failed = turn.result === 'F';
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-2.5`}>
      <div className={`flex flex-col max-w-[68%] ${isBot ? 'items-start' : 'items-end'}`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[10px] font-semibold ${isBot ? 'text-violet-600' : 'text-blue-600'}`}>{isBot ? '🤖 IVR' : '🙋 고객'}</span>
          <span className="text-[9.5px] text-gray-400">{typeLabel(turn.type)}</span>
          {turn.startMs != null && <span className="text-[9.5px] text-gray-300 font-mono">{fmtTime(turn.startMs)}</span>}
        </div>
        <div
          className={`px-3 py-2 rounded-2xl text-[12px] leading-relaxed whitespace-pre-wrap break-words ${
            isBot ? 'bg-violet-50 text-gray-800 rounded-tl-sm border border-violet-100' : 'bg-blue-600 text-white rounded-tr-sm'
          } ${failed ? 'ring-1 ring-red-300' : ''}`}
        >
          {turn.text || <span className="text-gray-400 italic">(내용 없음)</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {turn.mentId && <span className="text-[9.5px] text-gray-400 font-mono">🔊 {turn.mentId}</span>}
          {turn.durationMs != null && turn.durationMs > 0 && <span className="text-[9.5px] text-gray-400">{Math.round(turn.durationMs / 1000)}s</span>}
          {failed && <span className="text-[9.5px] text-red-500 font-medium">실패</span>}
        </div>
      </div>
    </div>
  );
}

export default function DialogView({ turns, loading }: Props) {
  if (loading) return <div className="p-4 text-[12px] text-gray-500">불러오는 중...</div>;
  if (!turns || turns.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-[12px]">대화 기록이 없습니다</span>} />
      </div>
    );
  }
  return (
    <div className="p-4 bg-gradient-to-b from-gray-50/40 to-white">
      {turns.map((t, i) => (
        <Bubble key={`${t.seq}-${i}`} turn={t} />
      ))}
    </div>
  );
}
