import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/shared-util';
import {
  useCreateRollingGroup,
  useDeleteRollingGroup,
  useGetPublicRollingGroup,
  useGetRollingGroupList,
  useGetTaskboardLayoutList,
  useUpdateRollingGroup,
} from '../../features/board/hooks/useTaskboardQueries';
import type { DroppedWidget, RollingGroup, TableColumn, TaskboardLayout } from '../../features/board/types/taskboard.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// ─── 롤링 레이아웃 타입 ──────────────────────────────────────────────────────
interface RollingLayout {
  layoutId: number;
  layoutName: string;
  fileName?: string;
  layoutJson?: string;
}

interface RollingData {
  transitionType: string;
  layouts: RollingLayout[];
}

const parseRollingData = (raw?: string): RollingData => {
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

const parseLayoutIds = (raw?: string): number[] => {
  try {
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
};

// ─── 전환 효과 설정 ───────────────────────────────────────────────────────────
const TRANSITION_OPTIONS = [
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

// ─── 테이블 위젯 렌더러 ──────────────────────────────────────────────────────
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

// ─── 단일값 위젯 렌더러 ──────────────────────────────────────────────────────
function RollingValueWidget({ widget }: { widget: DroppedWidget }) {
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
        {widget.item.sampleValue}
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

// ─── 레이아웃 화면 렌더러 ────────────────────────────────────────────────────
function LayoutScreen({ layout }: { layout: RollingLayout }) {
  const widgets: DroppedWidget[] = (() => {
    try {
      return layout.layoutJson ? (JSON.parse(layout.layoutJson) as DroppedWidget[]) : [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="w-full h-full relative bg-black overflow-hidden">
      {layout.fileName && <img src={layout.fileName} alt={layout.layoutName} className="w-full h-full object-contain absolute inset-0" />}
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
  );
}

// ─── 롤링 플레이어 ───────────────────────────────────────────────────────────
interface RollingPlayerProps {
  layouts: RollingLayout[];
  intervalSec: number;
  transitionType?: string;
  onStop?: () => void;
}

function RollingPlayer({ layouts, intervalSec, transitionType = 'fade', onStop }: RollingPlayerProps) {
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

// ─── 공개 토큰 뷰 (로그인 없이 URL 접근) ────────────────────────────────────
function TokenRollingView({ token }: { token: string }) {
  const { data: group, isLoading, isError } = useGetPublicRollingGroup(token);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <FallbackSpinner />
      </div>
    );
  }
  if (isError || !group) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <p className="text-xl font-bold mb-2">전광판을 불러올 수 없습니다.</p>
          <p className="text-slate-400 text-sm">URL이 유효하지 않거나 서버에 연결할 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const { layouts, transitionType } = parseRollingData(group.rollingData);
  if (layouts.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <p className="text-slate-400">표시할 레이아웃이 없습니다.</p>
      </div>
    );
  }

  return <RollingPlayer layouts={layouts} intervalSec={group.intervalSec ?? 5} transitionType={transitionType} />;
}

// ─── 그룹 편집 뷰 ─────────────────────────────────────────────────────────────
interface GroupEditViewProps {
  group: RollingGroup | null;
  layoutList: TaskboardLayout[];
  onSave: () => void;
  onCancel: () => void;
}

function GroupEditView({ group, layoutList, onSave, onCancel }: GroupEditViewProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>(() => parseLayoutIds(group?.layoutIds));
  const [groupName, setGroupName] = useState(group?.groupName ?? '새 그룹');
  const [intervalSec, setIntervalSec] = useState(group?.intervalSec ?? 5);
  const [transitionType, setTransitionType] = useState(() => parseRollingData(group?.rollingData).transitionType);
  const [isSaving, setIsSaving] = useState(false);

  const createGroup = useCreateRollingGroup();
  const updateGroup = useUpdateRollingGroup();

  const toggleSelect = (id: number) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectedLayouts = selectedIds.map((id) => layoutList.find((l) => l.layoutId === id)).filter(Boolean) as TaskboardLayout[];

  const handleSave = async () => {
    if (selectedLayouts.length === 0) {
      toast.error('레이아웃을 1개 이상 선택해 주세요.');
      return;
    }
    if (!groupName.trim()) {
      toast.error('그룹 이름을 입력해 주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const rollingData = JSON.stringify({
        transitionType,
        layouts: selectedLayouts.map((l) => ({
          layoutId: l.layoutId,
          layoutName: l.layoutName,
          fileName: l.fileName,
          layoutJson: l.layoutJson,
        })),
      });
      const payload = {
        groupName: groupName.trim(),
        layoutIds: JSON.stringify(selectedIds),
        intervalSec,
        rollingData,
      };
      if (group?.groupId) {
        await updateGroup.mutateAsync({ ...payload, groupId: group.groupId });
        toast.success('그룹이 수정되었습니다.');
      } else {
        await createGroup.mutateAsync(payload);
        toast.success('그룹이 저장되었습니다.');
      }
      onSave();
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const publicUrl = group?.publicToken ? `${window.location.origin}${window.location.pathname}?token=${group.publicToken}` : null;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* 왼쪽: 레이아웃 선택 리스트 */}
      <div className="w-1/2 flex flex-col border-r border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 bg-white">
          <h2 className="text-base font-bold text-slate-800">레이아웃 선택</h2>
          <p className="text-xs text-slate-500 mt-0.5">롤링할 레이아웃을 클릭하여 선택하세요. ({selectedIds.length}개 선택됨)</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {layoutList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p>레이아웃이 없습니다.</p>
              <p className="text-xs mt-1">전광판 목록에서 먼저 레이아웃을 만들어 주세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {layoutList.map((item) => {
                const isSelected = selectedIds.includes(item.layoutId);
                const order = selectedIds.indexOf(item.layoutId) + 1;
                return (
                  <div
                    key={item.layoutId}
                    onClick={() => toggleSelect(item.layoutId)}
                    className={`relative bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-[#0f5b9e] ring-2 ring-[#0f5b9e]/20' : 'border-transparent hover:border-slate-200'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-[#0f5b9e] text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                        {order}
                      </div>
                    )}
                    <div className="aspect-video bg-slate-100 relative overflow-hidden">
                      {item.fileName ? (
                        <img src={item.fileName} alt={item.layoutName} className={`w-full h-full object-cover transition-all ${isSelected ? 'scale-105' : ''}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                          <span className="text-slate-500 text-xs">이미지 없음</span>
                        </div>
                      )}
                      {isSelected && <div className="absolute inset-0 bg-[#0f5b9e]/10 pointer-events-none" />}
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.layoutName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽: 그룹 설정 */}
      <div className="w-1/2 flex flex-col bg-white">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">{group ? '그룹 수정' : '새 그룹 만들기'}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* 그룹명 */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">그룹 이름</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f5b9e] focus:ring-1 focus:ring-[#0f5b9e]/20"
              placeholder="그룹 이름을 입력하세요"
            />
          </div>

          {/* 선택된 레이아웃 순서 */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 min-h-[60px]">
            <p className="text-xs font-semibold text-blue-700 mb-1">롤링 순서 ({selectedLayouts.length}개)</p>
            {selectedLayouts.length === 0 ? (
              <p className="text-xs text-blue-400">왼쪽에서 레이아웃을 선택해 주세요.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {selectedLayouts.map((l, i) => (
                  <div key={l.layoutId} className="flex items-center gap-2 text-xs text-blue-800">
                    <span className="w-4 h-4 rounded-full bg-[#0f5b9e] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i + 1}</span>
                    <span className="truncate">{l.layoutName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 롤링 간격 */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">
              롤링 간격 &nbsp;<span className="text-[#0f5b9e] font-bold">{intervalSec}초</span>
            </label>
            <input type="range" min={3} max={60} step={1} value={intervalSec} onChange={(e) => setIntervalSec(Number(e.target.value))} className="w-full accent-[#0f5b9e] mb-1" />
            <div className="flex justify-between text-[10px] text-slate-400 mb-2">
              <span>3초</span>
              <span>60초</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">직접 입력:</span>
              <input
                type="number"
                min={3}
                max={60}
                value={intervalSec}
                onChange={(e) => setIntervalSec(Math.max(3, Math.min(60, Number(e.target.value))))}
                className="w-16 text-sm font-bold text-center border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[#0f5b9e]"
              />
              <span className="text-xs text-slate-500">초</span>
            </div>
          </div>

          {/* 페이지 전환 효과 */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">페이지 전환 효과</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TRANSITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTransitionType(opt.value)}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-semibold border transition-all ${
                    transitionType === opt.value
                      ? 'bg-[#0f5b9e] text-white border-[#0f5b9e] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#0f5b9e] hover:text-[#0f5b9e]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 공개 URL */}
          {publicUrl && (
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">공개 URL (로그인 불필요)</label>
              <p className="text-[10px] text-slate-500 mb-2">이 URL은 영구적으로 유효합니다. 그룹을 다시 저장하면 롤링 데이터가 갱신됩니다.</p>
              <div className="p-2 bg-slate-800 rounded text-[9px] text-slate-300 font-mono break-all leading-relaxed mb-2">{publicUrl}</div>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(publicUrl);
                  toast.success('공개 URL이 복사되었습니다.');
                }}
                className="w-full py-1.5 text-xs font-semibold bg-[#0f5b9e] text-white rounded-md hover:bg-[#0c4a82] transition-colors"
              >
                공개 URL 복사
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 bg-[#0f5b9e] text-white text-sm font-bold rounded-lg hover:bg-[#0c4a82] disabled:opacity-50 transition-colors"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 그룹 카드 썸네일 (최대 3장 겹치기) ──────────────────────────────────────
function GroupThumbnails({ group }: { group: RollingGroup }) {
  const { layouts } = parseRollingData(group.rollingData);
  const thumbs = layouts
    .slice(0, 3)
    .map((l) => l.fileName)
    .filter(Boolean) as string[];
  const totalCount = parseLayoutIds(group.layoutIds).length;

  const rotations = [-3, -1.5, 0];
  const offsets = [
    { x: -10, y: 4 },
    { x: -5, y: 2 },
    { x: 0, y: 0 },
  ];

  return (
    <div className="relative mx-4 mt-3 mb-1 h-[58px]">
      {thumbs.length > 0 ? (
        <>
          {thumbs.map((url, i) => (
            <div
              key={i}
              className="absolute rounded-md overflow-hidden border-2 border-white shadow-md bg-slate-200"
              style={{
                width: '92px',
                height: '52px',
                left: `${i * 12}px`,
                top: `${offsets[i]?.y ?? 0}px`,
                transform: `rotate(${rotations[i] ?? 0}deg)`,
                zIndex: thumbs.length - i,
              }}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          {totalCount > 3 && <div className="absolute bottom-0 left-28 bg-slate-700/90 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold z-20">+{totalCount - 3}</div>}
        </>
      ) : (
        <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200">이미지 없음</div>
      )}
    </div>
  );
}

// ─── 그룹 목록 뷰 ───────────────────────────────────────────────────────────
interface GroupListViewProps {
  groups: RollingGroup[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (g: RollingGroup) => void;
  onRun: (g: RollingGroup) => void;
  onDelete: (g: RollingGroup) => void;
  onCopyUrl: (g: RollingGroup) => void;
}

function GroupListView({ groups, isLoading, onAdd, onEdit, onRun, onDelete, onCopyUrl }: GroupListViewProps) {
  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">전광판 그룹 관리</h1>
          <p className="text-sm text-slate-500 mt-1">레이아웃 그룹을 만들고 롤링을 실행하세요.</p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm flex items-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          새 그룹 만들기
        </button>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <FallbackSpinner />
        </div>
      ) : groups.length === 0 ? (
        <div className="py-24 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-white">
          <p className="text-lg font-medium">저장된 그룹이 없습니다.</p>
          <p className="text-sm mt-1">오른쪽 상단의 &quot;새 그룹 만들기&quot;를 눌러 그룹을 만들어 주세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => {
            const layoutCount = parseLayoutIds(group.layoutIds).length;
            const { transitionType } = parseRollingData(group.rollingData);
            const transitionLabel = TRANSITION_OPTIONS.find((o) => o.value === transitionType)?.label ?? '페이드';
            return (
              <div key={group.groupId} className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow">
                {/* 카드 헤더 */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 truncate">{group.groupName}</h3>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => onEdit(group)} className="p-1.5 text-slate-400 hover:text-[#0f5b9e] hover:bg-blue-50 rounded transition-colors" title="수정">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onCopyUrl(group)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      title="공개 URL 복사"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                    </button>
                    <button onClick={() => onDelete(group)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="삭제">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 썸네일 미리보기 (3장 겹치기) */}
                <GroupThumbnails group={group} />

                {/* 그룹 정보 */}
                <div className="px-4 py-2 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <rect x={3} y={3} width={18} height={18} rx={2} />
                      <path strokeLinecap="round" d="M3 9h18M9 21V9" />
                    </svg>
                    {layoutCount}개
                  </span>
                  <span className="flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <circle cx={12} cy={12} r={10} />
                      <path strokeLinecap="round" d="M12 6v6l4 2" />
                    </svg>
                    {group.intervalSec}초
                  </span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-400 font-semibold">{transitionLabel}</span>
                </div>

                {/* 실행 버튼 */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => onRun(group)}
                    className="w-full py-2.5 bg-[#0f5b9e] text-white text-sm font-bold rounded-lg hover:bg-[#0c4a82] transition-colors flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    롤링 시작
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 일반 모드 메인 ──────────────────────────────────────────────────────────
type ViewMode = 'list' | 'edit' | 'rolling';

function TaskMgmtMain() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingGroup, setEditingGroup] = useState<RollingGroup | null>(null);
  const [rollingLayouts, setRollingLayouts] = useState<RollingLayout[]>([]);
  const [rollingInterval, setRollingInterval] = useState(5);
  const [rollingTransition, setRollingTransition] = useState('fade');

  const { data: groupList = [], isLoading, refetch } = useGetRollingGroupList();
  const { data: layoutList = [] } = useGetTaskboardLayoutList();
  const deleteGroup = useDeleteRollingGroup();

  const handleRun = (group: RollingGroup) => {
    const { layouts, transitionType } = parseRollingData(group.rollingData);
    if (layouts.length === 0) {
      toast.error('저장된 레이아웃 데이터가 없습니다. 그룹을 다시 저장해 주세요.');
      return;
    }
    setRollingLayouts(layouts);
    setRollingInterval(group.intervalSec ?? 5);
    setRollingTransition(transitionType);
    setViewMode('rolling');
  };

  const handleDelete = async (group: RollingGroup) => {
    if (!confirm(`"${group.groupName}" 그룹을 삭제하시겠습니까?`)) return;
    try {
      await deleteGroup.mutateAsync(group.groupId);
      toast.success('그룹이 삭제되었습니다.');
      refetch();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const handleCopyUrl = async (group: RollingGroup) => {
    if (!group.publicToken) {
      toast.error('공개 URL을 생성할 수 없습니다.');
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}?token=${group.publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('공개 URL이 복사되었습니다.');
    } catch {
      toast.error('URL 복사에 실패했습니다.');
    }
  };

  if (viewMode === 'rolling') {
    return <RollingPlayer layouts={rollingLayouts} intervalSec={rollingInterval} transitionType={rollingTransition} onStop={() => setViewMode('list')} />;
  }

  if (viewMode === 'edit') {
    return (
      <GroupEditView
        group={editingGroup}
        layoutList={layoutList}
        onSave={() => {
          setViewMode('list');
          refetch();
        }}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  return (
    <GroupListView
      groups={groupList}
      isLoading={isLoading}
      onAdd={() => {
        setEditingGroup(null);
        setViewMode('edit');
      }}
      onEdit={(g) => {
        setEditingGroup(g);
        setViewMode('edit');
      }}
      onRun={handleRun}
      onDelete={handleDelete}
      onCopyUrl={handleCopyUrl}
    />
  );
}

// ─── 진입점 ─────────────────────────────────────────────────────────────────
export default function TaskMgmt() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  if (token) {
    return <TokenRollingView token={token} />;
  }

  return <TaskMgmtMain />;
}
