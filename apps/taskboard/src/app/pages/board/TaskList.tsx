import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { X } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import TaskboardTenantBar from '../../features/board/components/TaskboardTenantBar';
import TenantBadge from '../../features/board/components/TenantBadge';
import { taskboardQueryKeys, useDeleteTaskboardLayout, useGetTaskboardDisplayList, useGetTaskboardLayoutList } from '../../features/board/hooks/useTaskboardQueries';
import { useTaskboardWriteGuard } from '../../features/board/hooks/useTaskboardWriteGuard';
import { type TaskboardLayout, parseLayoutSections, parseLayoutWidgets } from '../../features/board/types/taskboard.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconEdit, IconTrash } from '@/components/custom/Icons';

const getWidgetCount = (layoutJson?: string): number => parseLayoutWidgets(layoutJson).length;

// 미지정 구역(기타) 전용 키 — 구역이 배정되지 않은 위젯의 fallback 뷰 그룹
const ETC_KEY = '__etc';

const LAST_SECTION_MAP_PREFIX = 'taskboard:lastSectionMap:';

/** 레이아웃별로 가장 최근에 "실행"한 구역별 뷰 그룹 선택을 불러온다 — 없으면 빈 값 */
function loadLastSectionMap(layoutId: number): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${LAST_SECTION_MAP_PREFIX}${layoutId}`);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** 실행(현재 화면/새창/공개 링크) 시점에 그 선택을 저장 — 다음에 이 레이아웃을 열면 그대로 세팅됨 */
function saveLastSectionMap(layoutId: number, map: Record<string, number>) {
  try {
    localStorage.setItem(`${LAST_SECTION_MAP_PREFIX}${layoutId}`, JSON.stringify(map));
  } catch {
    // localStorage 사용 불가 환경(프라이빗 모드 등) — 무시, 매번 새로 선택하면 됨
  }
}

const LAST_SINGLE_DISPLAY_PREFIX = 'taskboard:lastDisplay:';

/** 단일(구역 없음) 모드에서 레이아웃별로 가장 최근에 실행한 뷰 그룹 id를 불러온다 — 없으면 '' */
function loadLastSingleDisplay(layoutId: number): number | '' {
  try {
    const raw = localStorage.getItem(`${LAST_SINGLE_DISPLAY_PREFIX}${layoutId}`);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : '';
  } catch {
    return '';
  }
}

/** 단일 모드 실행 시점에 선택한 뷰 그룹 id를 저장 — 다음에 이 레이아웃을 열면 그대로 세팅됨 */
function saveLastSingleDisplay(layoutId: number, displayId: number) {
  try {
    localStorage.setItem(`${LAST_SINGLE_DISPLAY_PREFIX}${layoutId}`, String(displayId));
  } catch {
    // localStorage 사용 불가 환경 — 무시
  }
}

// ─── 뷰 그룹 선택 팝오버 — 전광판(레이아웃)과 뷰 그룹은 매핑되지 않는 별개 풀이라, 전체 뷰 그룹 중 아무거나 즉시 선택해 실행한다 ───
function DisplayPickerPopover({ layout, onClose }: { layout: TaskboardLayout; onClose: () => void }) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const { data: displays = [], isLoading } = useGetTaskboardDisplayList();
  // 저장된 sections 배열에 남아있어도 실제 위젯이 쓰지 않는 구역은 제외(구역을 뺐는데도 실행 선택에 뜨던 문제 방지).
  const usedSections = new Set(
    parseLayoutWidgets(layout.layoutJson)
      .map((w) => w.sectionKey)
      .filter((k): k is string => !!k),
  );
  const sections = parseLayoutSections(layout.layoutJson).filter((s) => usedSections.has(s));
  const hasSections = sections.length > 0;
  const [sectionDisplayMap, setSectionDisplayMap] = useState<Record<string, number>>(() => loadLastSectionMap(layout.layoutId));
  // 단일(구역 없음) 모드 — 뷰 그룹 하나 선택 (마지막 실행 선택을 localStorage에서 복원)
  const [singleDisplayId, setSingleDisplayId] = useState<number | ''>(() => loadLastSingleDisplay(layout.layoutId));
  const singleViewPath = singleDisplayId ? `/taskboard/board/task-view/${layout.layoutId}/${singleDisplayId}` : null;
  const singlePublicPath = singleDisplayId ? `/taskboard/board/task-view-public/${layout.layoutId}/${singleDisplayId}` : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // 섹션 일부만 배정해도 실행 가능 — 미배정 구역은 __etc(기타) fallback으로 처리
  const buildSectionUrl = (base: string) => {
    if (!hasSections) return null;
    const pairs: string[] = [];
    sections.forEach((s) => {
      if (sectionDisplayMap[s]) pairs.push(`${s}:${sectionDisplayMap[s]}`);
    });
    if (sectionDisplayMap[ETC_KEY]) pairs.push(`${ETC_KEY}:${sectionDisplayMap[ETC_KEY]}`);
    if (pairs.length === 0) return null; // 최소 1개는 배정해야 실행 가능
    return `${base}?s=${pairs.join(',')}`;
  };

  const copyPublicUrlForDisplay = (publicPath: string) => {
    const url = `${window.location.origin}${publicPath}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => toast.success('공개 링크가 복사되었습니다.'));
    } else {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      toast.success('공개 링크가 복사되었습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div ref={ref} className="bg-white rounded-xl shadow-2xl w-[360px] overflow-hidden">
        <div className="relative px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 truncate pr-6">{layout.layoutName}</h3>
          <p className="text-xs text-slate-400 mt-0.5 pr-6">
            {hasSections ? `섹션 ${sections.length}개 — 섹션별 뷰 그룹을 선택하세요.` : '실행할 뷰 그룹(표시값 세트)을 선택하세요.'}
          </p>
          <button onClick={onClose} title="닫기" className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 섹션 모드 — 섹션별 뷰 그룹 선택 */}
        {hasSections ? (
          <div className="p-4 flex flex-col gap-3">
            {isLoading ? (
              <div className="py-4 text-center text-sm text-slate-400">불러오는 중...</div>
            ) : (
              <>
                {sections.map((s) => (
                  <div key={s}>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">구역 {s}</label>
                    <select
                      value={sectionDisplayMap[s] ?? ''}
                      onChange={(e) => setSectionDisplayMap((prev) => ({ ...prev, [s]: Number(e.target.value) }))}
                      className="w-full text-sm border border-slate-200 rounded px-3 py-2 bg-white focus:outline-none focus:border-[#0f5b9e]"
                    >
                      <option value="">뷰 그룹 선택... (미배정 시 기타로 대체)</option>
                      {displays.map((d) => (
                        <option key={d.displayId} value={d.displayId}>
                          {d.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {/* 기본 — 구역 미배정 위젯의 fallback 뷰 그룹 */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">
                    기본 (미지정 구역) <span className="normal-case font-normal text-slate-400">— 구역 미배정 위젯에 적용</span>
                  </label>
                  <select
                    value={sectionDisplayMap[ETC_KEY] ?? ''}
                    onChange={(e) => setSectionDisplayMap((prev) => ({ ...prev, [ETC_KEY]: Number(e.target.value) }))}
                    className="w-full text-sm border border-slate-200 rounded px-3 py-2 bg-white focus:outline-none focus:border-[#0f5b9e]"
                  >
                    <option value="">선택 안 함 (기본 뷰 그룹 사용)</option>
                    {displays.map((d) => (
                      <option key={d.displayId} value={d.displayId}>
                        {d.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="flex flex-col gap-2 mt-1">
              <button
                disabled={!buildSectionUrl(`/taskboard/board/task-view/${layout.layoutId}`)}
                onClick={() => {
                  const url = buildSectionUrl(`/taskboard/board/task-view/${layout.layoutId}`);
                  if (url) {
                    saveLastSectionMap(layout.layoutId, sectionDisplayMap);
                    navigate(url);
                  }
                }}
                className="w-full py-2 text-xs font-bold text-white bg-[#0f5b9e] rounded-lg hover:bg-[#0d4f8a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                현재 화면에서 실행
              </button>
              <div className="flex gap-2">
                <button
                  disabled={!buildSectionUrl(`/taskboard/board/task-view/${layout.layoutId}`)}
                  onClick={() => {
                    const url = buildSectionUrl(`/taskboard/board/task-view/${layout.layoutId}`);
                    if (url) {
                      saveLastSectionMap(layout.layoutId, sectionDisplayMap);
                      window.open(url, `taskview_${layout.layoutId}`, 'noopener,noreferrer');
                    }
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-[#0f5b9e] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  새창으로 실행
                </button>
                <button
                  disabled={!buildSectionUrl(`/taskboard/board/task-view-public/${layout.layoutId}`)}
                  onClick={() => {
                    const url = buildSectionUrl(`/taskboard/board/task-view-public/${layout.layoutId}`);
                    if (url) {
                      saveLastSectionMap(layout.layoutId, sectionDisplayMap);
                      copyPublicUrlForDisplay(url);
                    }
                  }}
                  title="로그인 없이 접근 가능한 공개 링크"
                  className="flex-1 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  공개 링크 복사
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 단일 뷰 그룹 모드 — 구역 모드와 동일한 구조(뷰 그룹 select 1개 + 실행 버튼 3개) */
          <div className="p-4 flex flex-col gap-3">
            {isLoading ? (
              <div className="py-4 text-center text-sm text-slate-400">불러오는 중...</div>
            ) : displays.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-400">등록된 뷰 그룹이 없습니다.</div>
            ) : (
              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">뷰 그룹</label>
                <select
                  value={singleDisplayId}
                  onChange={(e) => setSingleDisplayId(Number(e.target.value))}
                  className="w-full text-sm border border-slate-200 rounded px-3 py-2 bg-white focus:outline-none focus:border-[#0f5b9e]"
                >
                  <option value="">뷰 그룹 선택...</option>
                  {displays.map((d) => (
                    <option key={d.displayId} value={d.displayId}>
                      {d.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-2 mt-1">
              <button
                disabled={!singleViewPath}
                onClick={() => {
                  if (!singleViewPath) return;
                  saveLastSingleDisplay(layout.layoutId, Number(singleDisplayId));
                  navigate(singleViewPath);
                }}
                className="w-full py-2 text-xs font-bold text-white bg-[#0f5b9e] rounded-lg hover:bg-[#0d4f8a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                현재 화면에서 실행
              </button>
              <div className="flex gap-2">
                <button
                  disabled={!singleViewPath}
                  onClick={() => {
                    if (!singleViewPath) return;
                    saveLastSingleDisplay(layout.layoutId, Number(singleDisplayId));
                    window.open(singleViewPath, `taskview_${layout.layoutId}_${singleDisplayId}`, 'noopener,noreferrer');
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-[#0f5b9e] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  새창으로 실행
                </button>
                <button
                  disabled={!singlePublicPath}
                  onClick={() => {
                    if (!singlePublicPath) return;
                    saveLastSingleDisplay(layout.layoutId, Number(singleDisplayId));
                    copyPublicUrlForDisplay(singlePublicPath);
                  }}
                  title="로그인 없이 접근 가능한 공개 링크"
                  className="flex-1 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  공개 링크 복사
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const breadcrumb = [{ title: '전광판 관리' }, { title: '전광판 목록', path: '/taskboard/board/task-list' }];

export default function TaskList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { guardWrite } = useTaskboardWriteGuard();
  const { data: layoutList = [], isLoading } = useGetTaskboardLayoutList();
  const { mutateAsync: deleteLayout } = useDeleteTaskboardLayout();
  const [deleteTarget, setDeleteTarget] = useState<TaskboardLayout | null>(null);
  const [pickerTarget, setPickerTarget] = useState<TaskboardLayout | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLayout(deleteTarget.layoutId);
      toast.success('삭제되었습니다.');
      await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getLayoutList._def });
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const goToCreate = (layout: TaskboardLayout) => {
    if (!guardWrite()) return; // 다중 테넌트 View 중엔 편집(수정) 진입 차단
    const bg = { pageId: layout.pageId, pageName: layout.pageName ?? '', fileName: layout.fileName ?? '', tenantId: '', genType: '', useYn: 'Y', regDt: layout.regDt };
    navigate('/taskboard/board/task-create', { state: { bg, layout } });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen w-full font-sans">
      <TaskboardTenantBar />
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">전광판 목록</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/taskboard/board/task-display')}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-md text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            뷰 그룹 관리
          </button>
          <button
            onClick={() => navigate('/taskboard/board/task-bg')}
            className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm"
          >
            배경 관리
          </button>
        </div>
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

                  {/* 중앙 플레이 버튼 — 뷰 그룹 선택 팝오버 */}
                  <button onClick={() => setPickerTarget(item)} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10">
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
                      <div className="mt-1">
                        <TenantBadge tenantId={item.tenantId} />
                      </div>
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

      {/* 뷰 그룹 선택 팝오버 */}
      {pickerTarget && <DisplayPickerPopover layout={pickerTarget} onClose={() => setPickerTarget(null)} />}

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
