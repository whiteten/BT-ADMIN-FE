/**
 * API Response 타입 정의
 */

/** 리스트 응답 - API 응답의 data 구조 */
export interface ListResponse<T> {
  items: T[];
}

/** 상세 응답 - API 응답의 data 구조 */
export type DetailResponse<T> = T;

/** Response 데이터 추출 유틸 (AxiosResponse를 직접 받음) */
export const extractList = <T>(response: { data: ListResponse<T> }): T[] => response?.data?.items ?? [];
export const extractDetail = <T>(response: { data: DetailResponse<T> }): T => response?.data;
