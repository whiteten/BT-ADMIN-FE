import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import { taskboardQueryKeys, useDeleteTaskboardLayout, useGetTaskboardLayoutList } from '../../features/board/hooks/useTaskboardQueries';
import type { DroppedWidget, TableColumn, TaskboardLayout } from '../../features/board/types/taskboard.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconEdit, IconTrash } from '@/components/custom/Icons';

// ─── 모달용 위젯 렌더러 ──────────────────────────────────────────────────────
function ModalTableWidget({ widget }: { widget: DroppedWidget }) {
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

function ModalValueWidget({ widget }: { widget: DroppedWidget }) {
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

// ─── 레이아웃 미리보기 팝업 ──────────────────────────────────────────────────
function LayoutViewModal({ layout, onClose }: { layout: TaskboardLayout; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const widgets: DroppedWidget[] = (() => {
    try {
      return layout.layoutJson ? (JSON.parse(layout.layoutJson) as DroppedWidget[]) : [];
    } catch {
      return [];
    }
  })();

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-6" onClick={onClose}>
      <div
        ref={containerRef}
        className={`relative bg-black overflow-hidden ${isFullscreen ? 'w-screen h-screen' : 'w-full max-w-5xl rounded-xl shadow-2xl'}`}
        style={!isFullscreen ? { aspectRatio: '16/9' } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
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
            {widget.item.displayType === 'table' ? <ModalTableWidget widget={widget} /> : <ModalValueWidget widget={widget} />}
          </div>
        ))}

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-black/70 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-white/70 hover:text-white text-xs font-semibold px-2 py-1 rounded hover:bg-white/10 transition-colors">
              ✕ 닫기
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
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const getWidgetCount = (layoutJson?: string): number => {
  if (!layoutJson) return 0;
  try {
    return (JSON.parse(layoutJson) as DroppedWidget[]).length;
  } catch {
    return 0;
  }
};

export default function TaskList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: layoutList = [], isLoading } = useGetTaskboardLayoutList();
  const { mutateAsync: deleteLayout } = useDeleteTaskboardLayout();
  const [deleteTarget, setDeleteTarget] = useState<TaskboardLayout | null>(null);
  const [viewTarget, setViewTarget] = useState<TaskboardLayout | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLayout(deleteTarget.layoutId);
      toast.success('삭제되었습니다.');
      await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getLayoutList().queryKey });
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const goToCreate = (layout: TaskboardLayout) => {
    const bg = { pageId: layout.pageId, pageName: layout.pageName ?? '', fileName: layout.fileName ?? '', tenantId: '', genType: '', useYn: 'Y', regDt: layout.regDt };
    navigate('/taskboard/board/task-create', { state: { bg, layout } });
  };

  const goToView = (layout: TaskboardLayout) => {
    setViewTarget(layout);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen w-full font-sans">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">전광판 목록</h1>
          <p className="text-sm text-slate-500 mt-1">저장된 전광판 레이아웃 목록입니다. 이미지 위 ▷ 버튼으로 실행하세요.</p>
        </div>
        <button
          onClick={() => navigate('/taskboard/board/task-bg')}
          className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm"
        >
          배경 관리
        </button>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center items-center">
          <FallbackSpinner />
        </div>
      ) : layoutList.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-white shadow-sm">
          <div className="w-14 h-14 mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="text-2xl">📋</span>
          </div>
          <span className="text-lg font-medium">완성된 전광판이 없습니다.</span>
          <span className="text-sm mt-2">배경 관리에서 배경 이미지를 등록한 후 레이아웃을 만들면 여기에 표시됩니다.</span>
          <button
            onClick={() => navigate('/taskboard/board/task-bg')}
            className="mt-6 px-5 py-2 bg-[#0f5b9e] text-white text-sm font-semibold rounded-lg hover:bg-[#0c4a82] transition-colors"
          >
            배경 관리로 이동
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {layoutList.map((item) => {
            const widgetCount = getWidgetCount(item.layoutJson);
            return (
              <div key={item.layoutId} className="relative bg-white rounded-xl shadow-md border border-[#0f5b9e]/20 overflow-hidden transition-all hover:shadow-lg">
                {/* 썸네일 영역 */}
                <div className="aspect-video bg-slate-100 relative overflow-hidden group">
                  {/* 편집 / 삭제 버튼 (우상단 hover) */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
                    <button
                      onClick={() => goToCreate(item)}
                      className="bg-white/90 hover:bg-blue-50 text-slate-400 hover:text-[#0f5b9e] p-1.5 rounded-md shadow-sm transition-all"
                      title="레이아웃 편집"
                    >
                      <IconEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-500 p-1.5 rounded-md shadow-sm transition-all"
                      title="삭제"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 배경 이미지 */}
                  <img src={item.fileName} alt={item.layoutName} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

                  {/* 중앙 플레이 버튼 */}
                  <button onClick={() => goToView(item)} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10">
                    <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 hover:scale-110 transition-all shadow-2xl">
                      <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 ml-1">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </button>

                  {/* 위젯 수 뱃지 */}
                  <div
                    className={`absolute bottom-2 left-2 px-2 py-1 text-[10px] rounded backdrop-blur-sm font-bold tracking-wide shadow-sm ${widgetCount > 0 ? 'bg-green-600/90 text-white' : 'bg-black/60 text-slate-300'}`}
                  >
                    {widgetCount > 0 ? `위젯 ${widgetCount}개` : '위젯 없음'}
                  </div>
                </div>

                {/* 하단 정보 */}
                <div className="p-4 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="pr-2 min-w-0">
                      <h3 className="text-[15px] font-bold truncate text-slate-800">{item.layoutName}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.pageName}</p>
                    </div>
                    <span className="flex-shrink-0 text-[10px] px-2 py-1 rounded font-bold border bg-blue-50 text-[#0f5b9e] border-blue-200">사용중</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 pt-3 mt-3 border-t border-slate-100">
                    <span className="font-mono text-[10px] text-slate-400">ID: {item.layoutId}</span>
                    <span className="font-medium tracking-tight">{dayjs(item.regDt).format('YYYY.MM.DD HH:mm')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 레이아웃 미리보기 팝업 */}
      {viewTarget && <LayoutViewModal layout={viewTarget} onClose={() => setViewTarget(null)} />}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[320px] overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
                <IconTrash className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">전광판 삭제</h3>
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">&ldquo;{deleteTarget.layoutName}&rdquo;</span>을 삭제하시겠습니까?
                <br />이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-100"
              >
                취소
              </button>
              <button onClick={handleDeleteConfirm} className="flex-1 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
