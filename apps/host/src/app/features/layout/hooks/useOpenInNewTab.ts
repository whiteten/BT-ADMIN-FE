import { useNavigate } from 'react-router-dom';
import { useMenuStore, useOpenTabsStore, useRemoteRoutesStore } from '@/shared-store';
import { deriveTabMeta, getAppId, humanizeSegment, splitPath } from '../utils/openTabs';

/**
 * 메뉴 클릭마다 "새 탭"을 열고 그 경로로 이동하는 핸들러를 돌려준다(메뉴/즐겨찾기/검색 결과 공용).
 * 같은 경로여도 항상 새 탭을 만든다(중복 허용) — 탭 정체성이 url이 아니라 발급 id이기 때문.
 *
 * 탭 내 페이지 이동(목록→상세, 폼 제출 후 복귀 등)은 이 훅을 쓰지 않는다 — 그건 그냥 navigate면 되고,
 * useTabSync가 활성 탭의 url만 갱신한다(새 탭 X). 새 탭은 오직 "메뉴를 눌렀을 때"만 연다.
 *
 * fullPath는 `/${appId}/${menuPath}` 형태(쿼리스트링 분기 메뉴면 `?key=value` 포함 가능).
 */
export function useOpenInNewTab() {
  const navigate = useNavigate();
  const openTab = useOpenTabsStore((s) => s.openTab);
  const menuConfigs = useMenuStore((s) => s.menuConfigs);
  const routesMap = useRemoteRoutesStore((s) => s.routes);

  return (fullPath: string) => {
    const { pathname, search } = splitPath(fullPath);
    // 라우트 레지스트리 미로드 등으로 메타 도출이 비면 최소 메타로 폴백(appId만이라도 채워 탭은 생성).
    const meta = deriveTabMeta(menuConfigs, routesMap, pathname, search) ?? {
      appId: getAppId(pathname),
      url: pathname + search,
      label: humanizeSegment(pathname.split('/').filter(Boolean).pop() ?? '') || getAppId(pathname),
      isDynamic: false,
    };
    if (!meta.appId) {
      // 비-remote 경로(있을 리 없지만 안전망) — 탭 없이 이동만.
      navigate(fullPath);
      return;
    }
    openTab(meta);
    navigate(fullPath);
  };
}
