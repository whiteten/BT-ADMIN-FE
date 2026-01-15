/**
 * API Response 타입 정의
 */

/** 리스트 응답 */
export interface ListResponse<T> {
  data: { items: T[] };
}

/** 상세 응답 */
export interface DetailResponse<T> {
  data: T;
}

/** Response 데이터 추출 유틸 */
export const extractList = <T>(response: ListResponse<T>): T[] => response?.data?.items ?? [];
export const extractDetail = <T>(response: DetailResponse<T>): T => response?.data;
