import { useCallback, useEffect, useRef, useState } from 'react';
import { type DroppedWidget, type TableColumn, parseLayoutWidgets } from '../types/taskboard.types';

export interface RollingLayout {
  layoutId: number;
  layoutName: string;
  fileName?: string;
  layoutJson?: string;
}

export interface RollingData {
  transitionType: string;
  layouts: RollingLayout[];
}

export const parseRollingData = (raw?: string): RollingData => {
  try {
    if (!raw) return { transitionType: 'fade', layouts: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { transitionType: 'fade', layouts: parsed as RollingLayout[] };
    return {
      transitionType: (parsed as RollingData).transitionType ?? 'fade',
      layouts: (parsed as RollingData).layouts ?? [],
    };
  } catch {
    return { transitionType: 'fade', layouts: [] };
  }
};

export const TRANSITION_OPTIONS = [
  { value: 'fade', label: '페이드' },
  { value: 'slideLeft', label: '← 슬라이드' },
  { value: 'slideRight', label: '→ 슬라이드' },
  { value: 'slideUp', label: '↑ 슬라이드' },
  { value: 'zoomIn', label: '줌 인' },
  { value: 'flip', label: '플립' },
];

const TRANSITION_ANIMATION: Record<string, string> = {
  fade: 'rollingFadeIn 0.7s ease-in-out',
  slideLeft: 'rollingSlideLeft 0.55s ease-out',
  slideRight: 'rollingSlideRight 0.55s ease-out',
  slideUp: 'rollingSlideUp 0.55s ease-out',
  zoomIn: 'rollingZoomIn 0.6s ease-out',
  flip: 'rollingFlip 0.65s ease-out',
};

const TRANSITION_CSS = `
  @keyframes rollingFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rollingSlideLeft { from { opacity: 0; transform: translateX(30%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes rollingSlideRight { from { opacity: 0; transform: translateX(-30%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes rollingSlideUp { from { opacity: 0; transform: translateY(20%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes rollingZoomIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
  @keyframes rollingFlip { from { opacity: 0; transform: perspective(1000px) rotateY(-40deg); } to { opacity: 1; transform: perspective(1000px) rotateY(0); } }
`;

function RollingTableWidget({ widget }: { widget: DroppedWidget }) {
  const cfg = widget.item.tableConfig;
  if (!cfg) return null;
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {showTitle && (
        <div
          className="truncate font-semibold px-1 flex-shrink-0"
          style={{
            fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65))}px`,
            textAlign: widget.style.titleAlign ?? 'left',
            color: widget.style.color,
            fontFamily: widget.style.fontFamily,
          }}
        >
          {displayTitle}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <table
          className="w-full border-collapse"
          style={{ fontSize: `${Math.max(7, Math.round(widget.style.fontSize * 0.6))}px`, color: widget.style.color, fontFamily: widget.style.fontFamily }}
        >
          <thead>
            <tr>
              {(cfg.columns as TableColumn[]).map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, borderBottom: `1px solid ${widget.style.color}40`, padding: '1px 3px', textAlign: 'center', opacity: 0.7, fontWeight: 600 }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cfg.sampleRows.map((row, ri) => (
              <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                {(cfg.columns as TableColumn[]).map((col) => (
                  <td key={col.key} style={{ padding: '1px 3px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ROLLING_ETC_CLOCK_IDS = new Set(['etc-date', 'etc-time', 'etc-datetime']);

function RollingValueWidget({ widget }: { widget: DroppedWidget }) {
  const isEtcClock = widget.item.category === 'etc' && ROLLING_ETC_CLOCK_IDS.has(widget.item.id);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isEtcClock) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isEtcClock]);

  const getLiveValue = (): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = now.getFullYear();
    const mo = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const h = pad(now.getHours());
    const mi = pad(now.getMinutes());
    const s = pad(now.getSeconds());
    if (widget.item.id === 'etc-date') return `${y}${mo}${d}`;
    if (widget.item.id === 'etc-time') return `${h}${mi}${s}`;
    if (widget.item.id === 'etc-datetime') return `${y}${mo}${d} ${h}:${mi}:${s}`;
    return String(widget.item.sampleValue);
  };

  const displayValue = isEtcClock ? getLiveValue() : widget.item.sampleValue;
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;
  return (
    <div className="w-full h-full flex flex-col justify-center px-2 overflow-hidden">
      {showTitle && (
        <div
          className="truncate mb-0.5 opacity-80 leading-tight"
          style={{ fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65))}px`, textAlign: widget.style.titleAlign ?? 'left' }}
        >
          {displayTitle}
        </div>
      )}
      <div className="font-bold leading-tight truncate" style={{ fontSize: widget.style.fontSize }}>
        {displayValue}
        {widget.item.unit && (
          <span className="font-normal ml-0.5 opacity-70" style={{ fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65))}px` }}>
            {widget.item.unit}
          </span>
        )}
      </div>
      <div className="w-full h-0.5 rounded mt-1" style={{ backgroundColor: widget.item.color }} />
    </div>
  );
}

export function LayoutScreen({ layout }: { layout: RollingLayout }) {
  const widgets = parseLayoutWidgets(layout.layoutJson);
  const [imgRatio, setImgRatio] = useState(16 / 9);

  useEffect(() => {
    if (!layout.fileName) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) setImgRatio(img.naturalWidth / img.naturalHeight);
    };
    img.src = layout.fileName;
  }, [layout.fileName]);

  return (
    <div className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center">
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{
          width: `min(100vw, calc(${imgRatio} * 100vh))`,
          height: `min(100vh, calc(100vw / ${imgRatio}))`,
        }}
      >
        {layout.fileName && <img src={layout.fileName} alt={layout.layoutName} className="absolute inset-0 w-full h-full object-fill pointer-events-none" />}
        {widgets.map((widget) => (
          <div
            key={widget.id}
            style={{
              position: 'absolute',
              left: `${widget.x}%`,
              top: `${widget.y}%`,
              width: `${widget.w ?? 13}%`,
              height: `${widget.h ?? 16}%`,
              backgroundColor: widget.style.bgColor,
              color: widget.style.color,
              fontFamily: widget.style.fontFamily,
              fontSize: widget.style.fontSize,
              overflow: 'hidden',
            }}
            className="rounded-lg shadow-xl backdrop-blur-sm border border-white/10"
          >
            {widget.item.displayType === 'table' ? <RollingTableWidget widget={widget} /> : <RollingValueWidget widget={widget} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface RollingPlayerProps {
  layouts: RollingLayout[];
  intervalSec: number;
  transitionType?: string;
  onStop?: () => void;
}

export function RollingPlayer({ layouts, intervalSec, transitionType = 'fade', onStop }: RollingPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  useEffect(() => {
    if (layouts.length <= 1) return;
    setProgress(0);
    let elapsed = 0;
    const totalMs = intervalSec * 1000;
    const progressInterval = setInterval(() => {
      elapsed += 100;
      setProgress(Math.min((elapsed / totalMs) * 100, 100));
    }, 100);
    const slideTimer = setTimeout(() => setCurrentIndex((prev) => (prev + 1) % layouts.length), totalMs);
    return () => {
      clearInterval(progressInterval);
      clearTimeout(slideTimer);
    };
  }, [currentIndex, layouts.length, intervalSec]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await containerRef.current?.requestFullscreen();
    else await document.exitFullscreen();
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const current = layouts[currentIndex];
  if (!current) return null;

  const animation = TRANSITION_ANIMATION[transitionType] ?? TRANSITION_ANIMATION.fade;

  return (
    <div ref={containerRef} className="w-full h-screen bg-black overflow-hidden relative select-none" onMouseMove={resetHideTimer} onTouchStart={resetHideTimer}>
      <div key={currentIndex} className="absolute inset-0" style={{ animation }}>
        <LayoutScreen layout={current} />
      </div>

      <div
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-black/70 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {onStop && (
              <button onClick={onStop} className="text-white/70 hover:text-white text-sm font-semibold px-3 py-1 rounded hover:bg-white/10 transition-colors">
                ← 그룹 목록
              </button>
            )}
            <span className="text-white font-bold text-sm">{current.layoutName}</span>
            <span className="text-white/40 text-xs">
              {currentIndex + 1} / {layouts.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-xs">{intervalSec}초마다 전환</span>
            <button
              onClick={toggleFullscreen}
              className="text-white/70 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors"
              title={isFullscreen ? '전체화면 종료' : '전체화면'}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 z-50 transition-all duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {layouts.length > 1 && (
          <div className="flex justify-center gap-2 pb-3 pt-4 bg-gradient-to-t from-black/60 to-transparent">
            {layouts.map((l, i) => (
              <button
                key={l.layoutId}
                onClick={() => {
                  setCurrentIndex(i);
                  setProgress(0);
                }}
                className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
                title={l.layoutName}
              />
            ))}
          </div>
        )}
        <div className="h-1 bg-white/20">
          <div className="h-full bg-[#0f5b9e] transition-none" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <style>
        {TRANSITION_CSS}
        {`body { cursor: ${showControls ? 'auto' : 'none'} !important; }`}
      </style>
    </div>
  );
}
