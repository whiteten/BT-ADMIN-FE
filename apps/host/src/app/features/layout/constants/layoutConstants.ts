/**
 * 메뉴 패널 레이아웃 폭 상수 — 단일 SoT.
 *
 * strip / sidebar / split 폭이 여러 컴포넌트(PanelAppBadgeStrip·MenuPanel·PanelSidebar·
 * PanelDetailSplit)에 흩어져 매직넘버로 박히면, 한쪽만 바꿔도 패널 전체 폭 계산이 어긋나
 * "잔상"(닫힐 때 삐져나온 영역이 안 가려짐) 같은 버그가 난다. 폭은 전부 여기서 정의하고
 * 각 컴포넌트는 이 값을 import해서 사용한다. strip 폭을 바꾸려면 이 파일의 숫자 하나만 바꾸면
 * 패널 전체 폭(PANEL_WIDTH)이 자동으로 따라간다.
 */

/** 패널 좌측 앱 뱃지 strip 폭(px). 아이콘 + 하단 2줄 이름 라벨을 담는 컬럼. */
export const APP_BADGE_STRIP_WIDTH = 86;

/** 패널 사이드바(메뉴 1-depth 목록) 폭(px). */
export const PANEL_SIDEBAR_WIDTH = 300;

/** 폴더 detail split의 좌측 목록 폭(px). 우측 pane은 flex-1로 잔여 폭을 채운다. */
export const PANEL_DETAIL_LIST_WIDTH = 300;

/** 폴더 detail split 전체 폭(px) = 좌측 목록(300) + 우측 pane(400). */
export const PANEL_DETAIL_SPLIT_WIDTH = 700;

/** 즐겨찾기 view에서 사이드바 대신 노출하는 본문 폭(px). */
export const PANEL_FAVORITE_BODY_WIDTH = 500;

/**
 * 패널 전체 폭(px) — strip 포함. mode/view별 분기값.
 * - default: strip + sidebar
 * - favorite: strip + 즐겨찾기 본문
 * - folderDetail: strip + sidebar + detail split
 */
export const PANEL_WIDTH = {
  default: APP_BADGE_STRIP_WIDTH + PANEL_SIDEBAR_WIDTH,
  favorite: APP_BADGE_STRIP_WIDTH + PANEL_FAVORITE_BODY_WIDTH,
  folderDetail: APP_BADGE_STRIP_WIDTH + PANEL_SIDEBAR_WIDTH + PANEL_DETAIL_SPLIT_WIDTH,
} as const;
