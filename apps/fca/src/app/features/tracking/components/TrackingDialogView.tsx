import { useState } from 'react';
import { ArrowRightLeft, Bot, ExternalLink, Lock, LockOpen, Monitor, PhoneOff, User } from 'lucide-react';
import { getTrackingItemConfig } from '../config/trackingItemConfig';
import type { TrackingFlowItem } from '../types/tracking.types';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'bt-dialog-bot-right';

function readLayout(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

interface TrackingDialogViewProps {
  items: TrackingFlowItem[];
  callEnded?: boolean;
  /** 아이템 클릭 콜백 (대화이력에서 고객 버블 클릭 → NLU 카드 이동 등에 활용) */
  onItemClick?: (item: TrackingFlowItem) => void;
  /** 선택된 Seq 번호 (선택 링 표시용) */
  selectedSeq?: number | null;
  /** IFE 링크 클릭 콜백 (type=0 봇 버블에서 시나리오 아이템 이동) */
  onIfeLink?: (item: TrackingFlowItem) => void;
  /**
   * 복호화된 버블 맵 (bubbleKey → 평문). 콜봇 이력 전용 — 실시간 트래킹에서는 생략.
   * 값이 있으면 🔓 "복호화됨" 배지와 함께 평문을 렌더링합니다.
   */
  revealedBubbles?: Record<string, string>;
  /** 🔒 아이콘 클릭 시 호출 — 사유 모달을 열어야 합니다 */
  onEncryptedClick?: (item: TrackingFlowItem) => void;
  /** 복호화 진행 중인 버블의 키 (스피너 표시용) */
  decryptingBubbleKey?: string | null;
}

function EmptyState() {
  return <p className="py-6 text-center text-sm text-slate-400">트래킹 조회중입니다.</p>;
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

function DecryptedBadge({ align }: { align: 'left' | 'right' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-[1px]',
        align === 'right' ? 'ml-1' : 'mr-1',
      )}
      title="감사 로그에 열람 이력이 기록되었습니다"
    >
      <LockOpen size={8} /> 복호화됨
    </span>
  );
}

function BotBubble({
  item,
  isSelected,
  onClick,
  onIfeLink,
  botRight,
  revealed,
  decrypting,
  onEncryptedClick,
}: {
  item: TrackingFlowItem;
  isSelected?: boolean;
  onClick?: () => void;
  onIfeLink?: (item: TrackingFlowItem) => void;
  botRight: boolean;
  revealed?: string;
  decrypting?: boolean;
  onEncryptedClick?: (item: TrackingFlowItem) => void;
}) {
  const isLocked = item.encrypted === true && revealed == null;
  const wasDecrypted = item.encrypted === true && revealed != null;
  const text = isLocked ? '🔒 암호화된 내용' : (revealed ?? item.description ?? item.typeName);
  const hasIfeLink = item.type === 0 && item.subFlowId != null && onIfeLink != null && !isLocked;

  const handleLockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (decrypting) return;
    onEncryptedClick?.(item);
  };

  return (
    <div
      className={cn('flex items-start gap-2.5 max-w-[80%]', botRight && 'ml-auto flex-row-reverse', onClick && !isLocked && 'cursor-pointer')}
      onClick={isLocked ? undefined : onClick}
    >
      {/* 아바타 */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
        <Bot size={14} className="text-blue-600" />
      </div>

      {/* 말풍선 */}
      <div className={cn('flex flex-col gap-0.5', botRight && 'items-end')}>
        <div className="flex items-center gap-1.5 mb-0.5">
          {botRight ? (
            <>
              {wasDecrypted && <DecryptedBadge align="right" />}
              {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
              <span className="text-[10px] font-medium text-blue-600/70">보이스봇</span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-medium text-blue-600/70">보이스봇</span>
              {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
              {wasDecrypted && <DecryptedBadge align="left" />}
            </>
          )}
        </div>
        <div className={cn('flex items-center gap-1', botRight && 'flex-row-reverse')}>
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 shadow-sm border',
              botRight ? 'rounded-br-md' : 'rounded-bl-md',
              isSelected && 'ring-2 ring-blue-300 ring-offset-1',
              isLocked
                ? 'bg-amber-50/80 border-amber-200 border-dashed cursor-pointer hover:bg-amber-100/80 transition-colors'
                : wasDecrypted
                  ? 'bg-blue-50 border-amber-200'
                  : 'bg-blue-50 border-blue-100',
            )}
            onClick={isLocked ? handleLockClick : undefined}
            title={isLocked ? '클릭하여 열람 (감사 로그 기록됨)' : undefined}
          >
            {isLocked ? (
              <div className="flex items-center gap-1.5">
                <Lock size={12} className={cn('text-amber-600 shrink-0', decrypting && 'animate-pulse')} />
                <p className="text-[13px] text-amber-800 leading-relaxed font-medium select-none">{decrypting ? '복호화 중…' : '암호화된 내용 (클릭하여 열람)'}</p>
              </div>
            ) : (
              <p className="text-[13px] text-slate-700 leading-relaxed break-all whitespace-pre-wrap">{text}</p>
            )}
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

function CustomerBubble({
  item,
  isSelected,
  onClick,
  botRight,
  revealed,
  decrypting,
  onEncryptedClick,
}: {
  item: TrackingFlowItem;
  isSelected?: boolean;
  onClick?: () => void;
  botRight: boolean;
  revealed?: string;
  decrypting?: boolean;
  onEncryptedClick?: (item: TrackingFlowItem) => void;
}) {
  const isFailed = item.result?.startsWith('F') === true;
  const isLocked = item.encrypted === true && revealed == null;
  const wasDecrypted = item.encrypted === true && revealed != null;
  const text = isLocked ? '🔒 암호화된 내용' : (revealed ?? item.description ?? (isFailed ? '인식 실패' : item.typeName));
  const isRight = !botRight;

  const handleLockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (decrypting) return;
    onEncryptedClick?.(item);
  };

  return (
    <div
      className={cn('flex items-start gap-2.5 max-w-[80%]', isRight && 'ml-auto flex-row-reverse', isFailed && 'opacity-60', onClick && !isLocked && 'cursor-pointer')}
      onClick={isLocked ? undefined : onClick}
    >
      {/* 아바타 */}
      <div className={cn('flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center', isFailed ? 'bg-slate-100' : 'bg-emerald-500/10')}>
        <User size={14} className={cn(isFailed ? 'text-slate-400' : 'text-emerald-600')} />
      </div>

      {/* 말풍선 */}
      <div className={cn('flex flex-col gap-0.5', isRight && 'items-end')}>
        <div className="flex items-center gap-1.5 mb-0.5">
          {isRight ? (
            <>
              {wasDecrypted && <DecryptedBadge align="right" />}
              {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
              <span className="text-[10px] font-medium text-emerald-600/70">고객</span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-medium text-emerald-600/70">고객</span>
              {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
              {wasDecrypted && <DecryptedBadge align="left" />}
            </>
          )}
        </div>
        <div
          className={cn(
            'border rounded-2xl px-3.5 py-2 shadow-sm',
            isRight ? 'rounded-br-md' : 'rounded-bl-md',
            isLocked
              ? 'bg-amber-50/80 border-amber-200 border-dashed cursor-pointer hover:bg-amber-100/80 transition-colors'
              : wasDecrypted
                ? 'bg-emerald-50 border-amber-200'
                : isFailed
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-emerald-50 border-emerald-100',
            isSelected && 'ring-2 ring-blue-300 ring-offset-1',
          )}
          onClick={isLocked ? handleLockClick : undefined}
          title={isLocked ? '클릭하여 열람 (감사 로그 기록됨)' : undefined}
        >
          {isLocked ? (
            <div className="flex items-center gap-1.5">
              <Lock size={12} className={cn('text-amber-600 shrink-0', decrypting && 'animate-pulse')} />
              <p className="text-[13px] text-amber-800 leading-relaxed font-medium select-none">{decrypting ? '복호화 중…' : '암호화된 내용 (클릭하여 열람)'}</p>
            </div>
          ) : (
            <p className={cn('text-[13px] leading-relaxed break-all whitespace-pre-wrap', isFailed ? 'text-slate-400 italic' : 'text-slate-700')}>{text}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** 멀티모달 이미지 버블 (Type=2, 보이는 ARS) */
function ImageBubble({ item, onClick, botRight }: { item: TrackingFlowItem; onClick?: () => void; botRight: boolean }) {
  return (
    <div className={cn('flex items-start gap-2.5 max-w-[80%]', botRight && 'ml-auto flex-row-reverse', onClick && 'cursor-pointer')} onClick={onClick}>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
        <Monitor size={14} className="text-blue-600" />
      </div>
      <div className={cn('flex flex-col gap-0.5', botRight && 'items-end')}>
        <div className="flex items-center gap-1.5 mb-0.5">
          {botRight ? (
            <>
              {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
              <span className="text-[10px] font-medium text-blue-600/70">보이스봇</span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-medium text-blue-600/70">보이스봇</span>
              {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
            </>
          )}
        </div>
        <div className={cn('bg-blue-50 border border-blue-100 rounded-2xl p-2 shadow-sm', botRight ? 'rounded-br-md' : 'rounded-bl-md')}>
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
export default function TrackingDialogView({
  items,
  callEnded,
  onItemClick,
  selectedSeq,
  onIfeLink,
  revealedBubbles,
  onEncryptedClick,
  decryptingBubbleKey,
}: TrackingDialogViewProps) {
  const [botRight, setBotRight] = useState(readLayout);

  const handleToggle = () => {
    setBotRight((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  if (items.length === 0 && !callEnded) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-3 px-1">
      {/* 레이아웃 토글: 좌/우 위치를 시각적으로 표현 */}
      <div className="flex justify-end">
        <button
          type="button"
          className="flex items-center gap-0 rounded-full border border-slate-200 bg-white shadow-sm hover:shadow transition-shadow cursor-pointer overflow-hidden"
          onClick={handleToggle}
        >
          {/* 왼쪽 */}
          <span
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors',
              botRight ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700',
            )}
          >
            {botRight ? (
              <>
                <User size={11} /> 고객
              </>
            ) : (
              <>
                <Bot size={11} /> 봇
              </>
            )}
          </span>
          {/* 스왑 아이콘 */}
          <span className="flex items-center px-1.5 text-slate-300">
            <ArrowRightLeft size={11} />
          </span>
          {/* 오른쪽 */}
          <span
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors',
              botRight ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700',
            )}
          >
            {botRight ? (
              <>
                <Bot size={11} /> 봇
              </>
            ) : (
              <>
                <User size={11} /> 고객
              </>
            )}
          </span>
        </button>
      </div>

      {items.map((item, idx) => {
        const role = item.dialogRole;
        const isSelected = selectedSeq != null && selectedSeq === item.seq;
        const handleClick = onItemClick ? () => onItemClick(item) : undefined;

        // 암호화 버블 관련 파생 상태
        const revealed = item.encrypted && item.bubbleKey ? revealedBubbles?.[item.bubbleKey] : undefined;
        const decrypting = item.bubbleKey != null && decryptingBubbleKey === item.bubbleKey;

        // 숨김 처리
        if (role === 'HIDDEN') return null;

        // 멀티모달 고객 (Type=3) 숨김
        if (item.type === 3) return null;

        // 멀티모달 이미지 (Type=2): imagePath가 있으면 이미지 버블
        if (item.type === 2 && item.imagePath) {
          return <ImageBubble key={idx} item={item} onClick={handleClick} botRight={botRight} />;
        }
        // Type=2인데 imagePath 없으면 (실시간 트래킹 등) 숨김
        if (item.type === 2) return null;

        // 시스템 이벤트 → 중앙 작은 배지
        if (role === 'SYSTEM') {
          return <SystemBubble key={idx} item={item} />;
        }

        // 봇 발화
        if (role === 'BOT') {
          return (
            <div key={idx}>
              <BotBubble
                item={item}
                isSelected={isSelected}
                onClick={handleClick}
                onIfeLink={onIfeLink}
                botRight={botRight}
                revealed={revealed}
                decrypting={decrypting}
                onEncryptedClick={onEncryptedClick}
              />
            </div>
          );
        }

        // 고객 입력
        if (role === 'CUSTOMER') {
          return (
            <div key={idx}>
              <CustomerBubble
                item={item}
                isSelected={isSelected}
                onClick={handleClick}
                botRight={botRight}
                revealed={revealed}
                decrypting={decrypting}
                onEncryptedClick={onEncryptedClick}
              />
            </div>
          );
        }

        return null;
      })}
      {callEnded && <CallEndedBanner />}
    </div>
  );
}
