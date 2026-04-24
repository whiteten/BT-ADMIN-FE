import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import { taskboardQueryKeys, useDeleteTaskboardBg, useGetTaskboardBg } from '../../features/board/hooks/useTaskboardQueries';
import type { DroppedWidget } from '../../features/board/types/taskboard.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconEdit, IconTrash } from '@/components/custom/Icons';

export default function TaskList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: bgList = [], isLoading } = useGetTaskboardBg();
  const { mutateAsync: deleteBg } = useDeleteTaskboardBg();
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleDeleteConfirm = async () => {
    if (deleteTargetId === null) return;
    try {
      await deleteBg(deleteTargetId);
      toast.success('삭제되었습니다.');
      await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getBgList().queryKey });
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const getWidgetCount = (layoutJson?: string): number => {
    if (!layoutJson) return 0;
    try {
      return (JSON.parse(layoutJson) as DroppedWidget[]).length;
    } catch {
      return 0;
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen w-full font-sans">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">전광판 목록</h1>
          <p className="text-sm text-slate-500 mt-1">배경 이미지와 레이아웃이 저장된 전광판 목록입니다.</p>
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
      ) : bgList.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-white shadow-sm">
          <div className="w-14 h-14 mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="text-2xl">📋</span>
          </div>
          <span className="text-lg font-medium">등록된 전광판이 없습니다.</span>
          <span className="text-sm mt-2">배경 관리 페이지에서 배경 이미지를 등록하고 레이아웃을 만들어보세요.</span>
          <button
            onClick={() => navigate('/taskboard/board/task-bg')}
            className="mt-6 px-5 py-2 bg-[#0f5b9e] text-white text-sm font-semibold rounded-lg hover:bg-[#0c4a82] transition-colors"
          >
            배경 관리로 이동
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bgList.map((item) => {
            const widgetCount = getWidgetCount(item.layoutJson);
            const hasLayout = widgetCount > 0;

            return (
              <div
                key={item.pageId}
                className={`relative bg-white rounded-xl shadow-md border overflow-hidden transition-all ${
                  item.useYn === 'N' ? 'border-slate-200 opacity-75' : 'border-[#0f5b9e]/20 hover:shadow-lg'
                }`}
              >
                {/* 썸네일 영역 */}
                <div className="aspect-video bg-slate-100 relative overflow-hidden group">
                  {/* 액션 버튼 */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
                    <button
                      onClick={() => navigate('/taskboard/board/task-create', { state: { bg: item } })}
                      className="bg-white/90 hover:bg-blue-50 text-slate-400 hover:text-[#0f5b9e] p-1.5 rounded-md shadow-sm transition-all"
                      title="레이아웃 편집"
                    >
                      <IconEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(item.pageId)}
                      className="bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-500 p-1.5 rounded-md shadow-sm transition-all"
                      title="삭제"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 배경 이미지 */}
                  <img
                    src={item.fileName}
                    alt={item.pageName}
                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${item.useYn === 'N' ? 'grayscale opacity-60' : ''}`}
                  />

                  {/* 레이아웃 저장 여부 뱃지 */}
                  <div
                    className={`absolute bottom-2 left-2 px-2 py-1 text-[10px] rounded backdrop-blur-sm font-bold tracking-wide shadow-sm ${
                      hasLayout ? 'bg-green-600/90 text-white' : 'bg-black/60 text-slate-300'
                    }`}
                  >
                    {hasLayout ? `위젯 ${widgetCount}개` : '레이아웃 없음'}
                  </div>

                  {/* 생성 구분 뱃지 */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-[10px] rounded backdrop-blur-sm uppercase font-bold tracking-wider shadow-sm">
                    {item.genType === 'AI' ? 'AI 생성' : '직접 업로드'}
                  </div>

                  {/* 미사용 오버레이 */}
                  {item.useYn === 'N' && (
                    <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                      <span className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded shadow-lg">미사용</span>
                    </div>
                  )}
                </div>

                {/* 하단 정보 영역 */}
                <div className="p-4 flex flex-col bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <div className="pr-2">
                      <h3 className={`text-[15px] font-bold truncate ${item.useYn === 'N' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.pageName}</h3>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {item.pageId}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 text-[10px] px-2 py-1 rounded font-bold border ${
                        item.useYn === 'Y' ? 'bg-blue-50 text-[#0f5b9e] border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {item.useYn === 'Y' ? '사용중' : '미사용'}
                    </span>
                  </div>

                  {/* 편집 / 보기 버튼 */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => navigate('/taskboard/board/task-create', { state: { bg: item } })}
                      className="flex-1 py-1.5 text-xs font-semibold bg-[#0f5b9e] text-white rounded-md hover:bg-[#0c4a82] transition-colors"
                    >
                      {hasLayout ? '레이아웃 편집' : '레이아웃 만들기'}
                    </button>
                    {hasLayout && (
                      <button
                        onClick={() => navigate('/taskboard/board/task-view', { state: { bg: item } })}
                        className="flex-1 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors"
                      >
                        미리보기
                      </button>
                    )}
                  </div>

                  {/* 메타 데이터 */}
                  <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">👤</span>
                      <span className="font-medium">{item.authorName ?? '시스템'}</span>
                    </div>
                    <span className="font-medium tracking-tight">{dayjs(item.regDt).format('YYYY.MM.DD HH:mm')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[320px] overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
                <IconTrash className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">전광판 삭제</h3>
              <p className="text-sm text-slate-500">
                선택하신 전광판을 삭제하시겠습니까?
                <br />
                저장된 레이아웃도 함께 삭제됩니다.
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => setDeleteTargetId(null)}
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
