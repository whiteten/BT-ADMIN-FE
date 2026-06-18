import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetSizePickerProps {
  /** 최소 폭(칸). 이보다 작은 프리셋은 숨김. */
  minW: number;
  /** 최소 높이(칸). 이보다 작은 프리셋은 숨김. */
  minH: number;
  /** 추천 기본 레이아웃 — ★ 마커로 표시. */
  recommendedW: number;
  recommendedH: number;
  /** 이미 선택된 크기(인라인 사용 시) — 일치하는 프리셋을 선택 상태로 표시. */
  value?: { w: number; h: number };
  /** 프리셋 클릭 시 호출 — 선택한 폭·높이 전달. */
  onPick: (w: number, h: number) => void;
}

interface Preset {
  w: number;
  h: number;
}

/** 규격화된 표준 크기 (12-col 기준, 최대 12×8). */
const STANDARD_PRESETS: Preset[] = [
  { w: 3, h: 3 },
  { w: 6, h: 4 },
  { w: 6, h: 6 },
  { w: 12, h: 4 },
  { w: 12, h: 8 },
];

// 점유율 미리보기 프레임의 기준 칸 수 (한 화면 = 12×8 로 환산).
const REF_COLS = 12;
const REF_ROWS = 8;

/**
 * 위젯 크기 선택기 — "캔버스 한 장"에 선택 영역을 실제 비율로 채워 보여준다.
 * - 상단: 12×8 기준 프레임 + 선택 영역(호버 시 부드럽게 리사이즈) → 화면 점유율이 한눈에.
 * - 하단: 규격 프리셋 칩. 추천은 ★ 마커, 선택/호버 중인 하나만 하이라이트.
 */
export default function WidgetSizePicker({ minW, minH, recommendedW, recommendedH, value, onPick }: WidgetSizePickerProps) {
  const recW = Math.max(recommendedW, minW);
  const recH = Math.max(recommendedH, minH);
  const isRecommended = (p: { w: number; h: number }) => p.w === recW && p.h === recH;

  // 표준(최소 이상) + 추천(누락 시 추가) → 면적순 정렬.
  const base = STANDARD_PRESETS.filter((p) => p.w >= minW && p.h >= minH);
  const options: Preset[] = base.some(isRecommended) ? base : [...base, { w: recW, h: recH }];
  options.sort((a, b) => a.w * a.h - b.w * b.h);

  const selected = value ? { w: Math.max(value.w, minW), h: Math.max(value.h, minH) } : { w: recW, h: recH };
  const [hovered, setHovered] = useState<Preset | null>(null);
  const current = hovered ?? selected;

  const frameRows = Math.max(REF_ROWS, ...options.map((o) => o.h));
  const widthPct = Math.round((current.w / REF_COLS) * 100);

  return (
    <div className="w-[300px] select-none">
      {/* 점유율 미리보기 — 캔버스 한 장에 선택 영역 채우기 */}
      <div className="rounded-md border border-[var(--color-bt-border)] bg-white p-2">
        <div
          className="relative w-full overflow-hidden rounded-sm bg-[var(--color-bt-bg-muted)]/30"
          style={{
            aspectRatio: `${REF_COLS} / ${frameRows}`,
            backgroundImage: 'linear-gradient(to right, var(--color-bt-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-bt-border) 1px, transparent 1px)',
            backgroundSize: `${100 / REF_COLS}% ${100 / frameRows}%`,
          }}
        >
          <div
            className="absolute left-0 top-0 flex items-center justify-center rounded-[2px] border border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)]/20 transition-[width,height] duration-200 ease-out"
            style={{ width: `${(current.w / REF_COLS) * 100}%`, height: `${(current.h / frameRows) * 100}%` }}
          >
            <span className="text-[12px] font-bold text-[var(--color-bt-primary)]">
              {current.w}×{current.h}
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--color-bt-fg-muted)]">
          <span>
            전체 {REF_COLS}×{frameRows} 칸 기준
          </span>
          <span className="font-semibold text-[var(--color-bt-fg)]">가로 {widthPct}% 차지</span>
        </div>
      </div>

      {/* 규격 프리셋 칩 */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {options.map((p) => {
          const active = current.w === p.w && current.h === p.h;
          return (
            <button
              key={`${p.w}x${p.h}`}
              type="button"
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(p)}
              onBlur={() => setHovered(null)}
              onClick={() => onPick(p.w, p.h)}
              title={`${p.w} × ${p.h} 칸`}
              className={cn(
                'mono inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                active
                  ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white'
                  : 'border-[var(--color-bt-border)] text-[var(--color-bt-fg)] hover:border-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)]',
              )}
            >
              {isRecommended(p) && <Star className={cn('h-3 w-3', active ? 'fill-white text-white' : 'fill-[var(--color-bt-warn)] text-[var(--color-bt-warn)]')} />}
              {p.w}×{p.h}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] leading-snug text-[var(--color-bt-fg-muted)]">
        <Star className="mr-0.5 inline h-2.5 w-2.5 fill-[var(--color-bt-warn)] text-[var(--color-bt-warn)] align-[-1px]" />
        추천 · 선택 후 캔버스에서 드래그로 세밀 조정
      </p>
    </div>
  );
}
