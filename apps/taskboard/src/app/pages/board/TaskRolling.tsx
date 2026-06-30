import { useSearchParams } from 'react-router-dom';
import { useSuppressApiError401 } from '../../features/board/api/publicAuth';
import { type RollingLayout, RollingPlayer, parseSelection } from '../../features/board/components/RollingDisplay';
import { useGetTaskboardDisplayList, useGetTaskboardLayoutList } from '../../features/board/hooks/useTaskboardQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

/**
 * 롤링을 새 브라우저 창에서 실행하는 Chromeless 페이지.
 *
 * URL 파라미터:
 *   l  = 슬롯 목록 (쉼표 구분)
 *         단일 모드:   "layoutId:displayId"
 *         섹션 모드:   "layoutId:s:sectionKey:displayId:sectionKey:displayId[:...]"
 *                     (__ etc는 '_'로 단축)
 *   i  = 전환 간격(초, 기본 5)
 *   t  = 전환 효과(기본 'fade')
 *
 * TaskMgmt.tsx RunOptionsView 의 "새창으로 시작" 버튼이 이 URL을 열어준다.
 */
export default function TaskRolling() {
  useSuppressApiError401();
  const [searchParams] = useSearchParams();
  const l = searchParams.get('l') ?? '';
  const intervalSec = Math.max(1, Number(searchParams.get('i') ?? '5'));
  const transitionType = searchParams.get('t') ?? 'fade';

  const { data: layoutList, isLoading: layoutLoading } = useGetTaskboardLayoutList();
  const { data: displayList, isLoading: displayLoading } = useGetTaskboardDisplayList();

  if (layoutLoading || displayLoading) return <FallbackSpinner useFullScreen />;

  if (!l) {
    return <div className="flex items-center justify-center h-screen bg-black text-white text-sm">URL 파라미터 오류: l 값이 없거나 잘못됐습니다.</div>;
  }

  // 슬롯 파싱: "layoutId:s:sectionKey:displayId:..." (섹션 모드) 또는 "layoutId:displayId" (단일 모드)
  const rollingLayouts: RollingLayout[] = l.split(',').flatMap((slot) => {
    const parts = slot.split(':');
    const layoutId = Number(parts[0]);
    if (!layoutId) return [];
    const layout = layoutList?.find((la) => la.layoutId === layoutId);
    if (!layout) return [];

    if (parts[1] === 's') {
      // 섹션 모드: parts = [layoutId, 's', key1, dId1, key2, dId2, ...]
      const sectionSelections: Record<string, ReturnType<typeof parseSelection>> = {};
      let firstDisplayId = 0;
      for (let i = 2; i < parts.length - 1; i += 2) {
        const sKey = parts[i] === '_' ? '__etc' : parts[i];
        const dId = Number(parts[i + 1]);
        if (!dId) continue;
        const display = displayList?.find((d) => d.displayId === dId);
        if (!display) continue;
        sectionSelections[sKey] = parseSelection(display.selectionJson);
        if (!firstDisplayId) firstDisplayId = dId;
      }
      if (!firstDisplayId) return [];
      const firstDisplay = displayList?.find((d) => d.displayId === firstDisplayId);
      return [
        {
          layoutId: layout.layoutId,
          layoutName: layout.layoutName,
          fileName: layout.fileName,
          layoutJson: layout.layoutJson,
          displayId: firstDisplayId,
          selectionJson: firstDisplay?.selectionJson,
          sectionSelections,
        } satisfies RollingLayout,
      ];
    } else {
      // 단일 모드
      const displayId = Number(parts[1]);
      const display = displayList?.find((d) => d.displayId === displayId);
      if (!display) return [];
      return [
        {
          layoutId: layout.layoutId,
          layoutName: layout.layoutName,
          fileName: layout.fileName,
          layoutJson: layout.layoutJson,
          displayId: display.displayId,
          selectionJson: display.selectionJson,
        } satisfies RollingLayout,
      ];
    }
  });

  if (rollingLayouts.length === 0) {
    return <div className="flex items-center justify-center h-screen bg-black text-white text-sm">전광판 데이터를 불러올 수 없습니다. layoutId/displayId를 확인해 주세요.</div>;
  }

  return <RollingPlayer layouts={rollingLayouts} intervalSec={intervalSec} transitionType={transitionType} onStop={() => window.close()} />;
}
