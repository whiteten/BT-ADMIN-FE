import { useState } from 'react';
import { ArrowRightLeft, Bot, ExternalLink, EyeOff, Lock, LockOpen, Monitor, PhoneOff, User } from 'lucide-react';
import { getTrackingItemConfig } from '../config/trackingItemConfig';
import type { TrackingFlowItem } from '../types/tracking.types';
import { cn } from '@/lib/utils';

/** 이퀄라이저 애니메이션 — "Now Playing" 인디케이터 */
function NowPlayingIndicator({ color = 'bg-blue-500' }: { color?: string }) {
  return (
    <div className="flex items-end gap-[2.5px] h-4 ml-1.5">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn('w-[3px] rounded-full', color)}
          style={{
            animation: `eq-bar 0.7s ease-in-out ${i * 0.12}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes eq-bar {
          0% { height: 3px; }
          50% { height: 14px; }
          100% { height: 6px; }
        }
        @keyframes bubble-glow-blue {
          0%, 100% { box-shadow: 0 0 8px 0px rgba(59,130,246,0.25), 0 1px 3px rgba(0,0,0,0.08); }
          50% { box-shadow: 0 0 16px 3px rgba(59,130,246,0.35), 0 1px 3px rgba(0,0,0,0.08); }
        }
        @keyframes bubble-glow-green {
          0%, 100% { box-shadow: 0 0 8px 0px rgba(16,185,129,0.25), 0 1px 3px rgba(0,0,0,0.08); }
          50% { box-shadow: 0 0 16px 3px rgba(16,185,129,0.35), 0 1px 3px rgba(0,0,0,0.08); }
        }
        @keyframes bubble-glow-violet {
          0%, 100% { box-shadow: 0 0 8px 0px rgba(139,92,246,0.25), 0 1px 3px rgba(0,0,0,0.08); }
          50% { box-shadow: 0 0 16px 3px rgba(139,92,246,0.35), 0 1px 3px rgba(0,0,0,0.08); }
        }
      `}</style>
    </div>
  );
}

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
  /** 강조된 Seq 번호 (NLU 카드에서 클릭 시 확대 표시용) */
  highlightedSeq?: number | null;
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
  /** 녹취 재생 중 하이라이트할 버블 인덱스 (items 배열 기준) */
  audioPlayingIdx?: number | null;
  /** 버블 DOM 참조 콜백 (auto-scroll용) */
  onBubbleRef?: (idx: number, el: HTMLDivElement | null) => void;
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
        <span className="text-[10px] text-slate-400 tabular-nums">#{item.seq}</span>
        <Icon size={11} className={cn(cfg.color, 'shrink-0')} />
        <span className="text-xs text-slate-500 break-all">{text}</span>
      </div>
    </div>
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
  isAudioPlaying,
}: {
  item: TrackingFlowItem;
  isSelected?: boolean;
  onClick?: () => void;
  onIfeLink?: (item: TrackingFlowItem) => void;
  botRight: boolean;
  revealed?: string;
  decrypting?: boolean;
  onEncryptedClick?: (item: TrackingFlowItem) => void;
  isAudioPlaying?: boolean;
}) {
  const isLocked = item.encrypted === true && revealed == null;
  const wasDecrypted = item.encrypted === true && revealed != null;
  const isMaskedAfterDecrypt = item.masked === true && wasDecrypted;
  const lockedText = item.entityTag ? `🏷️ ${item.entityTag}` : '🔒 암호화된 내용';
  const text = isLocked ? lockedText : (revealed ?? item.description ?? item.typeName);
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
              {isAudioPlaying && <NowPlayingIndicator color="bg-blue-500" />}
              {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
              <span className="text-[10px] font-medium text-blue-600/70">보이스봇</span>
              <span className="text-[10px] text-slate-400 tabular-nums">#{item.seq}</span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-slate-400 tabular-nums">#{item.seq}</span>
              <span className="text-[10px] font-medium text-blue-600/70">보이스봇</span>
              {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
              {isAudioPlaying && <NowPlayingIndicator color="bg-blue-500" />}
            </>
          )}
        </div>
        <div className={cn('flex items-center gap-1', botRight && 'flex-row-reverse')}>
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 shadow-sm border transition-all duration-300',
              botRight ? 'rounded-br-md' : 'rounded-bl-md',
              isSelected && 'ring-2 ring-blue-300 ring-offset-1',
              isLocked
                ? 'bg-amber-50/80 border-amber-200 border-dashed cursor-pointer hover:bg-amber-100/80 transition-colors'
                : wasDecrypted
                  ? 'bg-amber-50/80 border-amber-200'
                  : isAudioPlaying
                    ? 'bg-blue-100 border-blue-400 border-[1.5px]'
                    : 'bg-blue-50 border-blue-100',
            )}
            onClick={isLocked ? handleLockClick : undefined}
            title={isLocked ? '클릭하여 열람 (감사 로그 기록됨)' : undefined}
            style={isAudioPlaying && !isLocked && !wasDecrypted ? { animation: 'bubble-glow-blue 1.8s ease-in-out infinite' } : undefined}
          >
            {isLocked ? (
              <div className="flex items-start gap-1.5">
                <Lock size={12} className={cn('text-amber-600 shrink-0 mt-0.5', decrypting && 'animate-pulse')} />
                <p className="text-[13px] text-amber-800 leading-relaxed font-medium break-all whitespace-pre-wrap">{decrypting ? '복호화 중…' : lockedText}</p>
              </div>
            ) : wasDecrypted ? (
              <div className="flex items-start gap-1.5">
                {isMaskedAfterDecrypt ? <EyeOff size={12} className="text-amber-600 shrink-0 mt-0.5" /> : <LockOpen size={12} className="text-amber-600 shrink-0 mt-0.5" />}
                <p className="text-[13px] text-amber-800 leading-relaxed font-medium break-all whitespace-pre-wrap">{text}</p>
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
  isAudioPlaying,
}: {
  item: TrackingFlowItem;
  isSelected?: boolean;
  onClick?: () => void;
  botRight: boolean;
  revealed?: string;
  decrypting?: boolean;
  onEncryptedClick?: (item: TrackingFlowItem) => void;
  isAudioPlaying?: boolean;
}) {
  const isFailed = item.result?.startsWith('F') === true;
  const isDtmf = item.inputMethod === 'DTMF';
  const isLocked = item.encrypted === true && revealed == null;
  const wasDecrypted = item.encrypted === true && revealed != null;
  // 마스킹은 서버에서 처리되어 description/revealed에 이미 적용된 상태로 내려옴.
  // 아래 플래그는 UI 인디케이터(EyeOff 아이콘 등) 용도로만 사용.
  const isMaskedOnly = item.masked === true && !item.encrypted;
  const isMaskedAfterDecrypt = item.masked === true && wasDecrypted;

  // Entity Tag: 암호화 시 암호문 대신 태그 표시
  const lockedText = item.entityTag ? `🏷️ ${item.entityTag}` : '🔒 암호화된 내용';
  const isUnrecognized = !item.encrypted && !isFailed && item.description == null && item.dialogRole === 'CUSTOMER';
  const text = isLocked ? lockedText : (revealed ?? item.description ?? (isFailed ? '인식 실패' : isUnrecognized ? '' : item.typeName));
  const isRight = !botRight;

  // STT(emerald) vs DTMF(violet) 컬러 테마
  const colors = isDtmf
    ? {
        avatar: 'bg-violet-500/10',
        icon: 'text-violet-600',
        label: 'text-violet-600/70',
        bg: 'bg-violet-50',
        border: 'border-violet-100',
        playBg: 'bg-violet-100',
        playBorder: 'border-violet-400',
        indicator: 'bg-violet-500',
        glow: 'bubble-glow-violet',
        labelText: '고객(DTMF)',
      }
    : {
        avatar: 'bg-emerald-500/10',
        icon: 'text-emerald-600',
        label: 'text-emerald-600/70',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        playBg: 'bg-emerald-100',
        playBorder: 'border-emerald-400',
        indicator: 'bg-emerald-500',
        glow: 'bubble-glow-green',
        labelText: '고객',
      };

  const handleLockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (decrypting) return;
    onEncryptedClick?.(item);
  };

  // 마스킹은 서버에서 description/revealed에 이미 적용됨 — 클라이언트는 그대로 표시.
  const displayText = text;

  return (
    <div
      className={cn('flex items-start gap-2.5 max-w-[80%]', isRight && 'ml-auto flex-row-reverse', isFailed && 'opacity-60', onClick && !isLocked && 'cursor-pointer')}
      onClick={isLocked ? undefined : onClick}
    >
      {/* 아바타 */}
      <div className={cn('flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center', isFailed ? 'bg-slate-100' : colors.avatar)}>
        <User size={14} className={cn(isFailed ? 'text-slate-400' : colors.icon)} />
      </div>

      {/* 말풍선 */}
      <div className={cn('flex flex-col gap-0.5', isRight && 'items-end')}>
        <div className="flex items-center gap-1.5 mb-0.5">
          {isRight ? (
            <>
              {isAudioPlaying && <NowPlayingIndicator color={colors.indicator} />}
              {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
              <span className={cn('text-[10px] font-medium', colors.label)}>{colors.labelText}</span>
              <span className="text-[10px] text-slate-400 tabular-nums">#{item.seq}</span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-slate-400 tabular-nums">#{item.seq}</span>
              <span className={cn('text-[10px] font-medium', colors.label)}>{colors.labelText}</span>
              {item.startTime && <span className="text-[10px] text-slate-500 tabular-nums">{item.startTime}</span>}
              {isAudioPlaying && <NowPlayingIndicator color={colors.indicator} />}
            </>
          )}
          {isFailed && <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">인식 실패</span>}
        </div>
        <div
          className={cn(
            'border rounded-2xl px-3.5 py-2 shadow-sm transition-all duration-300',
            isRight ? 'rounded-br-md' : 'rounded-bl-md',
            isLocked
              ? 'bg-amber-50/80 border-amber-200 border-dashed cursor-pointer hover:bg-amber-100/80 transition-colors'
              : wasDecrypted
                ? 'bg-amber-50/80 border-amber-200'
                : isAudioPlaying
                  ? cn(colors.playBg, colors.playBorder, 'border-[1.5px]')
                  : isFailed
                    ? 'bg-slate-50 border-slate-200'
                    : cn(colors.bg, colors.border),
            isSelected && 'ring-2 ring-blue-300 ring-offset-1',
          )}
          onClick={isLocked ? handleLockClick : undefined}
          title={isLocked ? '클릭하여 열람 (감사 로그 기록됨)' : undefined}
          style={isAudioPlaying && !isLocked && !wasDecrypted ? { animation: `${colors.glow} 1.8s ease-in-out infinite` } : undefined}
        >
          {isLocked ? (
            <div className="flex items-start gap-1.5">
              <Lock size={12} className={cn('text-amber-600 shrink-0 mt-0.5', decrypting && 'animate-pulse')} />
              <p className="text-[13px] text-amber-800 leading-relaxed font-medium break-all whitespace-pre-wrap">{decrypting ? '복호화 중…' : lockedText}</p>
            </div>
          ) : wasDecrypted ? (
            <div className="flex items-start gap-1.5">
              {isMaskedAfterDecrypt ? <EyeOff size={12} className="text-amber-600 shrink-0 mt-0.5" /> : <LockOpen size={12} className="text-amber-600 shrink-0 mt-0.5" />}
              <p className="text-[13px] text-amber-800 leading-relaxed font-medium break-all whitespace-pre-wrap min-h-5">{displayText}</p>
            </div>
          ) : isMaskedOnly ? (
            <div className="flex items-start gap-1.5">
              <EyeOff size={12} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[13px] text-slate-700 leading-relaxed break-all whitespace-pre-wrap">{displayText}</p>
            </div>
          ) : (
            <p
              className={cn(
                'text-[13px] leading-relaxed break-all whitespace-pre-wrap',
                isFailed ? 'text-slate-400 italic' : isUnrecognized ? 'text-slate-400 italic min-h-5' : 'text-slate-700',
              )}
            >
              {text}
            </p>
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
  highlightedSeq,
  onIfeLink,
  revealedBubbles,
  onEncryptedClick,
  decryptingBubbleKey,
  audioPlayingIdx,
  onBubbleRef,
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
        const isHighlighted = highlightedSeq != null && highlightedSeq === item.seq;
        const handleClick = onItemClick ? () => onItemClick(item) : undefined;

        // 암호화 버블 관련 파생 상태
        const revealed = item.encrypted && item.bubbleKey ? revealedBubbles?.[item.bubbleKey] : undefined;
        const decrypting = item.bubbleKey != null && decryptingBubbleKey === item.bubbleKey;

        // 숨김 처리
        if (role === 'HIDDEN') return null;

        // 멀티모달 고객 (Type=3/21) 숨김
        if (item.type === 3 || item.type === 21) return null;

        // 멀티모달 이미지 (Type=2/20): imagePath가 있으면 이미지 버블
        if ((item.type === 2 || item.type === 20) && item.imagePath) {
          return <ImageBubble key={idx} item={item} onClick={handleClick} botRight={botRight} />;
        }
        // Type=2/20인데 imagePath 없으면 (실시간 트래킹 등) 숨김
        if (item.type === 2 || item.type === 20) return null;

        // 시스템 이벤트 → 중앙 작은 배지
        if (role === 'SYSTEM') {
          return <SystemBubble key={idx} item={item} />;
        }

        // 녹취 재생 하이라이트 여부
        const isAudioPlaying = audioPlayingIdx != null && audioPlayingIdx === idx;

        // 봇 발화
        if (role === 'BOT') {
          return (
            <div
              key={idx}
              ref={(el) => onBubbleRef?.(idx, el)}
              className={cn('transition-transform duration-300', isHighlighted && 'scale-105', botRight ? 'origin-right' : 'origin-left')}
            >
              <BotBubble
                item={item}
                isSelected={isSelected}
                onClick={handleClick}
                onIfeLink={onIfeLink}
                botRight={botRight}
                revealed={revealed}
                decrypting={decrypting}
                onEncryptedClick={onEncryptedClick}
                isAudioPlaying={isAudioPlaying}
              />
            </div>
          );
        }

        // 고객 입력
        if (role === 'CUSTOMER') {
          return (
            <div
              key={idx}
              ref={(el) => onBubbleRef?.(idx, el)}
              className={cn('transition-transform duration-300', isHighlighted && 'scale-105', botRight ? 'origin-left' : 'origin-right')}
            >
              <CustomerBubble
                item={item}
                isSelected={isSelected}
                onClick={handleClick}
                botRight={botRight}
                revealed={revealed}
                decrypting={decrypting}
                onEncryptedClick={onEncryptedClick}
                isAudioPlaying={isAudioPlaying}
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
