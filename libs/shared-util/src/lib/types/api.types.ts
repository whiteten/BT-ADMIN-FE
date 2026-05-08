/**
 * API Response 타입 정의
 */

/** 리스트 응답 - API 응답의 data 구조 */
export interface ListResponse<T> {
  data: {
    items: T[];
  };
}

/** 상세 응답 - API 응답의 data 구조 */
export interface DetailResponse<T> {
  data: T;
}

/** 통계 리스트 응답 - data: { items, summary } 구조 */
export interface StatListResponse<T> {
  data: {
    items: T[];
    summary: T | null;
  };
}

/** Response 데이터 추출 유틸 */
export const extractList = <T>(response: { data: ListResponse<T> }): T[] => response?.data?.data?.items ?? [];
export const extractDetail = <T>(response: { data: DetailResponse<T> }): T => response?.data?.data;

/** 통계 리스트 응답 추출 유틸 - { items, summary } 형태로 반환 */
export const extractStatList = <T>(response: { data: StatListResponse<T> }): { items: T[]; summary: T | null } => ({
  items: response?.data?.data?.items ?? [],
  summary: response?.data?.data?.summary ?? null,
});
