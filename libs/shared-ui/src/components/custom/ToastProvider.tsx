import { type ReactNode, useEffect, useRef } from 'react';
import { AlertTriangle, Bell, CheckCircle2, ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown, Info, type LucideIcon, X, XCircle } from 'lucide-react';
import { useLayoutStore } from '@/shared-store';
import { type ToastItem, type ToastType, useToastStore } from '@/shared-util';

interface TypeMeta {
  Icon: LucideIcon;
  iconColor: string;
  barColor: string;
  /** conic-gradient에 넣을 실제 색값 (Tailwind 클래스는 gradient에 못 씀) */
  ringColor: string;
}

const TYPE_META: Record<ToastType, TypeMeta> = {
  info: { Icon: Info, iconColor: 'text-blue-500', barColor: 'bg-blue-500', ringColor: '#3b82f6' },
  success: { Icon: CheckCircle2, iconColor: 'text-green-500', barColor: 'bg-green-500', ringColor: '#22c55e' },
  warning: { Icon: AlertTriangle, iconColor: 'text-amber-500', barColor: 'bg-amber-500', ringColor: '#f59e0b' },
  error: { Icon: XCircle, iconColor: 'text-red-500', barColor: 'bg-red-500', ringColor: '#ef4444' },
  default: { Icon: Bell, iconColor: 'text-gray-500', barColor: 'bg-gray-400', ringColor: '#9ca3af' },
};

/** 링의 남은 시간 트랙(빈 부분) 색 */
const RING_TRACK_COLOR = '#e5e7eb';

/** 활성 카드 뒤에 깔리는 장식용 겹침 카드(최대 2장). index key 회피용 고정 키. */
const GHOST_KEYS = ['ghost-1', 'ghost-2'];

/** 화면 가장자리 여백(px) — 하단 bottom-4(16px)와 동일 값을 상단에도 준다 */
const EDGE_GAP = 16;

/** 남은 시간 링(SVG) 반지름 — 32px 박스에 stroke 3 기준 */
const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface ToastCardProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
  /** 카드 하단에 붙일 푸터(접힘 모드의 네비게이션 바) */
  footer?: ReactNode;
}

/** 알림 카드 1장 — 접힘(활성)·펼침(목록) 공용 */
const ToastCard = ({ item, onDismiss, footer }: ToastCardProps) => {
  const meta = TYPE_META[item.type];
  const duration = item.autoClose === false ? 0 : item.autoClose;
  // 링은 JS tick 없이 CSS 애니메이션으로 감긴다(60fps, hover 정지는 play-state).
  // 중간 마운트(카드 넘김·펼침 전환) 보정: 이미 지난 시간만큼 음수 delay로 애니메이션 위치를 맞춘다.
  // ⚠ delay는 마운트 때 1회만 계산(ref lazy init) — 애니메이션 startTime이 마운트에 고정되므로
  // 리렌더마다 재계산해 넣으면 흐른 시간에 delay가 또 얹혀 게이지가 앞으로 점프한다(이중 계산).
  // 이후 일시정지·재개는 animationPlayState 토글만으로 브라우저가 위치를 보존한다.
  const isPaused = item.expiresAt === null;
  const elapsedAtMountRef = useRef<number | null>(null);
  if (elapsedAtMountRef.current === null) {
    const remainingMs = item.expiresAt !== null ? Math.min(Math.max(item.expiresAt - Date.now(), 0), item.remaining) : item.remaining;
    elapsedAtMountRef.current = duration - remainingMs;
  }
  const elapsedMs = elapsedAtMountRef.current;

  return (
    // shrink-0: 펼침 목록(flex + max-h)에서 높이 제약 시 카드가 찌그러지지 않고 스크롤로 넘기게
    <div className="relative shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
      <span className={`absolute left-0 top-0 h-full w-1 ${meta.barColor}`} />

      <div className="flex items-start gap-3 py-4 pl-5 pr-3">
        {/* 아이콘 둘레 원형 링이 남은 시간 — hover 중에는 멈춘다(전체 타이머 일시정지) */}
        <span className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center">
          {duration > 0 && (
            // -scale-x-100: 기본 진행 방향(반시계)을 시계 방향 감김으로 뒤집는다
            <svg viewBox="0 0 32 32" className="absolute inset-0 size-full -scale-x-100">
              <circle cx="16" cy="16" r={RING_RADIUS} fill="none" stroke={RING_TRACK_COLOR} strokeWidth="3" />
              <circle
                cx="16"
                cy="16"
                r={RING_RADIUS}
                fill="none"
                stroke={meta.ringColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                transform="rotate(-90 16 16)"
                style={{
                  animation: `bt-toast-ring-deplete ${duration}ms linear forwards`,
                  animationDelay: `-${elapsedMs}ms`,
                  animationPlayState: isPaused ? 'paused' : 'running',
                }}
              />
            </svg>
          )}
          <meta.Icon className={`relative size-5 ${meta.iconColor}`} />
        </span>
        <div className="min-w-0 flex-1 select-text whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{item.content}</div>
        <button type="button" onClick={() => onDismiss(item.id)} aria-label="이 알림 닫기" className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <X className="size-4" />
        </button>
      </div>

      {footer}
    </div>
  );
};

interface ToastProviderProps {
  /**
   * 화면 상단에 상주하는 헤더의 총 높이(px). 펼침 목록 최대 높이 계산에서 제외된다.
   * 헤더 접힘(chromeCollapsed)·chromeless 상태는 내부에서 자동 반영(0 처리)되므로
   * "헤더가 보일 때의 높이"를 전달하면 된다. 헤더 없는 앱(standalone 등)은 생략.
   */
  headerHeight?: number;
}

/**
 * 자체 토스트 렌더러 — 앱 루트에 1회 마운트. 알림은 `toast`(@/shared-util)로 발행한다.
 * 좌하단 고정 스택: 접힘(최신 1장 + 위아래 네비) / 펼치기(전체 세로 목록) 두 모드.
 */
export default function ToastProvider({ headerHeight = 0 }: ToastProviderProps) {
  const items = useToastStore((state) => state.items);
  const activeIndex = useToastStore((state) => state.activeIndex);
  const expanded = useToastStore((state) => state.expanded);
  const older = useToastStore((state) => state.older);
  const newer = useToastStore((state) => state.newer);
  const dismiss = useToastStore((state) => state.dismiss);
  const clear = useToastStore((state) => state.clear);
  const setExpanded = useToastStore((state) => state.setExpanded);
  const pauseAll = useToastStore((state) => state.pauseAll);
  const resumeAll = useToastStore((state) => state.resumeAll);
  // 헤더 표시 여부 — 접힘(chromeCollapsed)·chromeless면 헤더가 없으므로 여백만 남긴다.
  const chromeCollapsed = useLayoutStore((state) => state.chromeCollapsed);
  const chromeless = useLayoutStore((state) => state.chromeless);

  const listRef = useRef<HTMLDivElement>(null);
  /** 사용자가 목록 맨 아래(최신) 근처에 있는지 — 새 알림 도착 시 자동 스크롤 여부. 위로 올려 읽는 중엔 끌어내리지 않는다. */
  const stickToBottomRef = useRef(true);

  const total = items.length;
  const currentIndex = total === 0 ? 0 : Math.min(activeIndex, total - 1);
  const active = items[currentIndex];
  const newestId = items[0]?.id;
  const isExpanded = expanded && total > 1;

  // 펼침 진입 시 최신(맨 아래)으로 점프
  useEffect(() => {
    if (!isExpanded) return;
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current = true;
    el.scrollTop = el.scrollHeight;
  }, [isExpanded]);

  // 새 알림 도착 시 — 맨 아래 근처에 있었을 때만 최신으로 따라간다
  useEffect(() => {
    if (!isExpanded || !stickToBottomRef.current) return;
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [newestId, isExpanded]);

  if (active === undefined) return null;

  const handleListScroll = () => {
    const el = listRef.current;
    if (el) stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const ghostKeys = isExpanded ? [] : GHOST_KEYS.slice(0, Math.min(total - 1, GHOST_KEYS.length));
  // 헤더가 보이면 그 높이만큼 제외, 접힘·chromeless면 여백만
  const headerOffset = chromeCollapsed || chromeless ? 0 : headerHeight;

  // 컨트롤 바 우측(펼치기/접기 + 모두 지우기) — 접힘·펼침 공용
  const controlActions = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-200 hover:text-gray-600"
      >
        {isExpanded ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
        {isExpanded ? '접기' : '펼치기'}
      </button>
      <button type="button" onClick={clear} className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-200 hover:text-gray-600">
        모두 지우기
      </button>
    </div>
  );

  return (
    <div className="fixed bottom-4 left-4 z-[9999] w-[380px] select-none" onMouseEnter={pauseAll} onMouseLeave={resumeAll}>
      {/* 링 감김 keyframes — stroke-dashoffset을 CSS 애니메이션으로 굴려 JS tick 없이 부드럽게 */}
      <style>{`@keyframes bt-toast-ring-deplete { from { stroke-dashoffset: 0; } to { stroke-dashoffset: ${RING_CIRCUMFERENCE}; } }`}</style>

      {/* 뒤에 쌓인 항목 표현 — 장식용 카드 (접힘 모드 전용) */}
      {ghostKeys.map((key, i) => (
        <div
          key={key}
          className="absolute inset-x-0 top-0 h-full rounded-lg border border-gray-200 bg-white shadow"
          style={{
            transform: `translateY(${-(i + 1) * 8}px) scale(${1 - (i + 1) * 0.04})`,
            zIndex: -(i + 1),
            opacity: 1 - (i + 1) * 0.2,
          }}
        />
      ))}

      {isExpanded ? (
        /* 펼침 — 헤더 아래(숨김 상태면 화면 위)부터 하단 여백까지 꽉 채우고, 넘치면 목록만 스크롤.
           상단 여백은 하단(bottom-4)과 동일한 EDGE_GAP. 컨트롤 바는 항상 노출(shrink-0). */
        <div className="flex flex-col" style={{ maxHeight: `calc(100vh - ${headerOffset + EDGE_GAP * 2}px)` }}>
          {/* 쌓인 알림 전부 세로 목록(오래된 것 위, 최신 아래) */}
          <div ref={listRef} onScroll={handleListScroll} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
            {[...items].reverse().map((item) => (
              <ToastCard key={item.id} item={item} onDismiss={dismiss} />
            ))}
          </div>
          <div className="mt-1 flex shrink-0 items-center justify-between rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-4 pr-3 shadow-lg">
            <span className="text-xs tabular-nums text-gray-500">{total}건</span>
            {controlActions}
          </div>
        </div>
      ) : (
        // key=id 필수 — 없으면 활성 항목이 바뀌어도 같은 인스턴스가 재사용돼
        // elapsedAtMountRef와 링 CSS 애니메이션이 이전 카드 것을 그대로 이어간다(링이 첫 카드 타이머를 따라감).
        <ToastCard
          key={active.id}
          item={active}
          onDismiss={dismiss}
          footer={
            total > 1 ? (
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 py-1.5 pl-4 pr-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={newer}
                    disabled={currentIndex === 0}
                    aria-label="최신 알림"
                    className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={older}
                    disabled={currentIndex === total - 1}
                    aria-label="이전 알림"
                    className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                  <span className="ml-1 text-xs tabular-nums text-gray-500">
                    {currentIndex + 1} / {total}
                  </span>
                </div>
                {controlActions}
              </div>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
