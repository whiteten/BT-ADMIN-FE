/**
 * 공통 API Response 타입 정의
 */

/** 리스트 응답 (items 배열 포함) */
export interface ListWithItemsResponse<T> {
  data: { list: { data: { items: T[] } } };
}

/** 리스트 응답 (직접 배열) */
export interface ListResponse<T> {
  data: { list: { data: T[] } };
}

/** 상세 응답 */
export interface DetailResponse<T> {
  data: { detail: { data: T } };
}

/** Response 데이터 추출 유틸 */
export const extractListItems = <T>(response: ListWithItemsResponse<T>): T[] => response?.data?.list?.data?.items ?? [];
export const extractList = <T>(response: ListResponse<T>): T[] => response?.data?.list?.data ?? [];
export const extractDetail = <T>(response: DetailResponse<T>): T => response?.data?.detail?.data;
