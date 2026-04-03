import { Bot, ExternalLink, Monitor, PhoneOff, User } from 'lucide-react';
import { getTrackingItemConfig } from '../config/trackingItemConfig';
import type { TrackingFlowItem } from '../types/tracking.types';
import { cn } from '@/lib/utils';

interface TrackingDialogViewProps {
  items: TrackingFlowItem[];
  callEnded?: boolean;
  /** 아이템 클릭 콜백 (대화이력 NLU 분석 등에 활용) */
  onItemClick?: (item: TrackingFlowItem) => void;
  /** 선택된 Seq 번호 (선택 링 표시용) */
  selectedSeq?: number | null;
  /** 강조된 Seq 번호 (NLU 카드에서 클릭 시 하이라이트용) */
  highlightedSeq?: number | null;
  /** IFE 링크 클릭 콜백 (type=0 봇 버블에서 시나리오 아이템 이동) */
  onIfeLink?: (item: TrackingFlowItem) => void;
  /** 버블 요소 ref 등록 콜백 */
  setBubbleRef?: (seq: number, el: HTMLDivElement | null) => void;
}

function EmptyState() {
  return <p className="py-6 text-center text-sm text-slate-400">트래킹 조회중입니다.</p>;
}

function MenuEntryDivider({ item }: { item: TrackingFlowItem }) {
  const label = item.menuName ?? item.menuId;
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs font-medium text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200">
        {label}
        {item.startTime && <span className="ml-1.5 text-slate-400 font-normal">{item.startTime}</span>}
      </span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

function SystemBubble({ item }: { item: TrackingFlowItem }) {
  const cfg = getTrackingItemConfig(item.type);
  const Icon = cfg.icon;
  const text = item.description ?? item.typeName;

  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full max-w-[80%]">
        <Icon size={11} className={cn(cfg.color, 'shrink-0')} />
        <span className="text-xs text-slate-500 break-all">{text}</span>
      </div>
    </div>
  );
}

function BotBubble({ item, isSelected, onClick, onIfeLink }: { item: TrackingFlowItem; isSelected?: boolean; onClick?: () => void; onIfeLink?: (item: TrackingFlowItem) => void }) {
  const text = item.description ?? item.typeName;
  const hasIfeLink = item.type === 0 && item.subFlowId != null && onIfeLink != null;

  return (
    <div className={cn('flex items-start gap-2.5 max-w-[80%]', onClick && 'cursor-pointer')} onClick={onClick}>
      {/* 아바타 */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
        <Bot size={14} className="text-blue-600" />
      </div>

      {/* 말풍선 */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-medium text-blue-600/70">보이스봇</span>
          {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
        </div>
        <div className="flex items-center gap-1">
          <div className={cn('bg-blue-50 border border-blue-100 rounded-2xl rounded-bl-md px-3.5 py-2 shadow-sm', isSelected && 'ring-2 ring-blue-300 ring-offset-1')}>
            <p className="text-[13px] text-slate-700 leading-relaxed break-all whitespace-pre-wrap">{text}</p>
          </div>
          {hasIfeLink && (
            <button
              type="button"
              title="IFE 시나리오 보기"
              className="flex-shrink-0 p-1 rounded hover:bg-blue-100 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onIfeLink(item);
              }}
            >
              <ExternalLink size={12} className="text-blue-400 hover:text-blue-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerBubble({ item, isSelected, isHighlighted, onClick }: { item: TrackingFlowItem; isSelected?: boolean; isHighlighted?: boolean; onClick?: () => void }) {
  const isFailed = item.result?.startsWith('F') === true;
  const text = item.description ?? (isFailed ? '인식 실패' : item.typeName);

  return (
    <div className={cn('flex items-start gap-2.5 max-w-[80%] ml-auto flex-row-reverse', isFailed && 'opacity-60', onClick && 'cursor-pointer')} onClick={onClick}>
      {/* 아바타 */}
      <div className="relative flex-shrink-0 w-7 h-7">
        {/* 리플: 원형 테두리가 바깥으로 퍼져나가며 사라짐 */}
        {isHighlighted && !isFailed && (
          <span
            className="absolute inset-0 rounded-full border-2 border-blue-400"
            style={{
              animation: 'bubble-ripple 0.8s ease-out forwards',
            }}
          />
        )}
        <div
          className={cn(
            'relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300',
            isFailed ? 'bg-slate-100' : isHighlighted ? 'bg-blue-500/30 scale-110' : 'bg-emerald-500/10',
          )}
        >
          <User size={14} className={cn(isFailed ? 'text-slate-400' : isHighlighted ? 'text-blue-600' : 'text-emerald-600', 'transition-colors duration-300')} />
        </div>
        <style>{`
          @keyframes bubble-ripple {
            0% { transform: scale(1); opacity: 0.7; }
            100% { transform: scale(2.5); opacity: 0; }
          }
        `}</style>
      </div>

      {/* 말풍선 */}
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
          <span className="text-[10px] font-medium text-emerald-600/70">고객</span>
        </div>
        <div
          className={cn(
            'border rounded-2xl rounded-br-md px-3.5 py-2 shadow-sm',
            isFailed ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50 border-emerald-100',
            isSelected && 'ring-2 ring-blue-300 ring-offset-1',
          )}
        >
          <p className={cn('text-[13px] leading-relaxed break-all whitespace-pre-wrap', isFailed ? 'text-slate-400 italic' : 'text-slate-700')}>{text}</p>
        </div>
      </div>
    </div>
  );
}

/** 멀티모달 이미지 버블 (Type=2, 보이는 ARS) */
function ImageBubble({ item, onClick }: { item: TrackingFlowItem; onClick?: () => void }) {
  return (
    <div className={cn('flex items-start gap-2.5 max-w-[80%]', onClick && 'cursor-pointer')} onClick={onClick}>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
        <Monitor size={14} className="text-blue-600" />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-medium text-blue-600/70">보이스봇</span>
          {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl rounded-bl-md p-2 shadow-sm">
          <img src={item.imagePath!} alt="보이는 ARS" className="max-w-[280px] rounded-lg" loading="lazy" />
        </div>
      </div>
    </div>
  );
}

function CallEndedBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg">
      <PhoneOff size={14} className="text-slate-400 shrink-0" />
      <span className="text-xs text-slate-500 font-medium">콜이 종료되었습니다.</span>
    </div>
  );
}

/** 대화 채팅 버블 UI (실시간 트래킹 + 대화이력 공용) */
export default function TrackingDialogView({ items, callEnded, onItemClick, selectedSeq, highlightedSeq, onIfeLink, setBubbleRef }: TrackingDialogViewProps) {
  if (items.length === 0 && !callEnded) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-3 px-1">
      {items.map((item, idx) => {
        const role = item.dialogRole;
        const isSelected = selectedSeq != null && selectedSeq === item.seq;
        const isHighlighted = highlightedSeq != null && highlightedSeq === item.seq;
        const handleClick = onItemClick ? () => onItemClick(item) : undefined;

        // 숨김 처리
        if (role === 'HIDDEN') return null;

        // 멀티모달 고객 (Type=3) 숨김
        if (item.type === 3) return null;

        // 멀티모달 이미지 (Type=2): imagePath가 있으면 이미지 버블
        if (item.type === 2 && item.imagePath) {
          return <ImageBubble key={idx} item={item} onClick={handleClick} />;
        }
        // Type=2인데 imagePath 없으면 (실시간 트래킹 등) 숨김
        if (item.type === 2) return null;

        // 메뉴 진입 → 구분선 (menuId 또는 menuName이 있을 때만)
        if (item.type === 0 && (item.menuId || item.menuName)) {
          return <MenuEntryDivider key={idx} item={item} />;
        }

        // 시스템 이벤트 → 중앙 작은 배지
        if (role === 'SYSTEM') {
          return <SystemBubble key={idx} item={item} />;
        }

        // 봇 발화 → 우측 말풍선
        if (role === 'BOT') {
          return (
            <div key={idx} ref={(el) => setBubbleRef?.(item.seq, el)}>
              <BotBubble item={item} isSelected={isSelected} onClick={handleClick} onIfeLink={onIfeLink} />
            </div>
          );
        }

        // 고객 입력 → 좌측 말풍선
        if (role === 'CUSTOMER') {
          return (
            <div key={idx} ref={(el) => setBubbleRef?.(item.seq, el)} className="transition-all duration-300">
              <CustomerBubble item={item} isSelected={isSelected} isHighlighted={isHighlighted} onClick={handleClick} />
            </div>
          );
        }

        return null;
      })}
      {callEnded && <CallEndedBanner />}
    </div>
  );
}
