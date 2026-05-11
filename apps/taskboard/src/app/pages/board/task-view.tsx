import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { type DroppedWidget, type TableColumn, type TaskboardLayout, parseLayoutWidgets } from '../../features/board/types/taskboard.types';

// ─── 테이블 위젯 렌더 ────────────────────────────────────────────────────────
function ViewTableWidget({ widget }: { widget: DroppedWidget }) {
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

// ─── 단일값 위젯 렌더 ────────────────────────────────────────────────────────
const VIEW_ETC_CLOCK_IDS = new Set(['etc-date', 'etc-time', 'etc-datetime']);

function ViewValueWidget({ widget }: { widget: DroppedWidget }) {
  const isEtcClock = widget.item.category === 'etc' && VIEW_ETC_CLOCK_IDS.has(widget.item.id);
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

// ─── 단일 레이아웃 뷰 ────────────────────────────────────────────────────────
function SingleLayoutView({ layout }: { layout: TaskboardLayout }) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imgRatio, setImgRatio] = useState(16 / 9);

  const widgets = parseLayoutWidgets(layout.layoutJson);

  useEffect(() => {
    if (!layout.fileName) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) setImgRatio(img.naturalWidth / img.naturalHeight);
    };
    img.src = layout.fileName;
  }, [layout.fileName]);

  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-screen bg-black overflow-hidden relative select-none" onMouseMove={resetHideTimer} onTouchStart={resetHideTimer}>
      {/* 이미지 비율과 일치하는 내부 컨테이너 — 위젯 좌표가 편집화면과 1:1로 대응 */}
      <div className="absolute inset-0 flex items-center justify-center">
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
              {widget.item.displayType === 'table' ? <ViewTableWidget widget={widget} /> : <ViewValueWidget widget={widget} />}
            </div>
          ))}
        </div>
      </div>

      <div
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-black/70 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/taskboard/board/task-list')}
              className="text-white/70 hover:text-white text-sm font-semibold px-3 py-1 rounded hover:bg-white/10 transition-colors"
            >
              ← 목록
            </button>
            <span className="text-white font-bold text-sm">{layout.layoutName}</span>
            {layout.pageName && <span className="text-white/50 text-xs">({layout.pageName})</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs">{widgets.length}개 위젯</span>
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

      <style>{`body { cursor: ${showControls ? 'auto' : 'none'} !important; }`}</style>
    </div>
  );
}

// ─── TaskView 진입점 ─────────────────────────────────────────────────────────
export default function TaskView() {
  return <TaskViewLayout />;
}

function TaskViewLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { layout?: TaskboardLayout } | null;
  const layout = state?.layout;

  if (!layout) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <p className="text-lg">전광판 정보가 없습니다.</p>
        <button onClick={() => navigate('/taskboard/board/task-list')} className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82]">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return <SingleLayoutView layout={layout} />;
}
