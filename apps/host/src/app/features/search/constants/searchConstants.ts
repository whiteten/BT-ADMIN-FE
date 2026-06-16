/** 최근 검색어 최대 보관 개수 */
export const RECENT_SEARCH_MAX = 10;

/** 문서 검색 fetch 한도 — 문서 탭 표시용. 카운트는 SearchData.total을 사용 */
export const DOC_FETCH_LIMIT = 50;

/** 전체 탭에서 섹션별로 미리 보여줄 결과 수 (초과 시 "더보기"로 해당 탭 이동) */
export const ALL_TAB_PREVIEW_COUNT = 5;

/** 자동완성 제안 최대 개수 */
export const AUTOCOMPLETE_LIMIT = 8;

/** 메뉴 결과 표시 안전 상한 (메뉴는 FE 데이터라 보통 이보다 적음) */
export const MENU_RESULT_LIMIT = 50;

/** 검색 결과 탭 정의 — SoT. key는 화면 식별/카운트 매핑용 */
export const SEARCH_TABS = [
  { key: 'all', label: '전체' },
  { key: 'menu', label: '메뉴' },
  { key: 'doc', label: '문서' },
] as const;

export type SearchTabKey = (typeof SEARCH_TABS)[number]['key'];

/** 결과 타입 라벨 매핑 */
export const RESULT_TYPE_LABEL: Record<string, string> = {
  MENU: '메뉴',
  DOC: '문서',
};
