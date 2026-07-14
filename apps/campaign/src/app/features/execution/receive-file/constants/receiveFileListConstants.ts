import { RECEIVE_FILE_STATUS, type ReceiveFileStatus } from '../types/receiveFileList';

/** 수신파일 목록 검색 — 수신상태 필터 */
export const RECEIVE_FILE_RECEIVE_STATE_FILTER = {
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  RECEIVED: 'RECEIVED',
} as const;

export type ReceiveFileReceiveStateFilter = (typeof RECEIVE_FILE_RECEIVE_STATE_FILTER)[keyof typeof RECEIVE_FILE_RECEIVE_STATE_FILTER];

export const RECEIVE_FILE_RECEIVE_STATE_FILTER_OPTIONS: { label: string; value: ReceiveFileReceiveStateFilter }[] = [
  { label: '처리중', value: RECEIVE_FILE_RECEIVE_STATE_FILTER.PROCESSING },
  { label: '처리완료', value: RECEIVE_FILE_RECEIVE_STATE_FILTER.PROCESSED },
  { label: '수신완료', value: RECEIVE_FILE_RECEIVE_STATE_FILTER.RECEIVED },
];

/** 목록 검색 필터 → 카드 수신상태 매핑 (목업·클라이언트 필터용) */
export const RECEIVE_FILE_RECEIVE_STATE_FILTER_STATUS_MAP: Record<ReceiveFileReceiveStateFilter, ReceiveFileStatus[]> = {
  [RECEIVE_FILE_RECEIVE_STATE_FILTER.PROCESSING]: [RECEIVE_FILE_STATUS.PROCESSING],
  [RECEIVE_FILE_RECEIVE_STATE_FILTER.PROCESSED]: [RECEIVE_FILE_STATUS.SUCCESS, RECEIVE_FILE_STATUS.FAILED],
  [RECEIVE_FILE_RECEIVE_STATE_FILTER.RECEIVED]: [RECEIVE_FILE_STATUS.SUCCESS, RECEIVE_FILE_STATUS.PARTIAL],
};

export const RECEIVE_FILE_STATUS_LABELS: Record<ReceiveFileStatus, string> = {
  [RECEIVE_FILE_STATUS.SUCCESS]: '정상',
  [RECEIVE_FILE_STATUS.FAILED]: '오류',
  [RECEIVE_FILE_STATUS.PROCESSING]: '처리중',
  [RECEIVE_FILE_STATUS.PARTIAL]: '부분성공',
};

export const RECEIVE_FILE_STATUS_COLORS: Record<ReceiveFileStatus, { color: string; bgColor: string; borderColor: string }> = {
  [RECEIVE_FILE_STATUS.SUCCESS]: { color: '#52c41a', bgColor: '#f6ffed', borderColor: '#b7eb8f' },
  [RECEIVE_FILE_STATUS.FAILED]: { color: '#ff4d4f', bgColor: '#fff2f0', borderColor: '#ffccc7' },
  [RECEIVE_FILE_STATUS.PROCESSING]: { color: '#1677ff', bgColor: '#e6f4ff', borderColor: '#91caff' },
  [RECEIVE_FILE_STATUS.PARTIAL]: { color: '#fa8c16', bgColor: '#fff7e6', borderColor: '#ffd591' },
};

/** 수신대상목록 검색 — 조회조건 */
export const RECEIVE_FILE_DETAIL_SEARCH_CONDITION = {
  CUSTOMER_NAME: 'CUSTOMER_NAME',
  CUSTOMER_NUMBER: 'CUSTOMER_NUMBER',
  MOBILE_PHONE: 'MOBILE_PHONE',
  CUSTOMER_KEY: 'CUSTOMER_KEY',
} as const;

export type ReceiveFileDetailSearchCondition = (typeof RECEIVE_FILE_DETAIL_SEARCH_CONDITION)[keyof typeof RECEIVE_FILE_DETAIL_SEARCH_CONDITION];

export const RECEIVE_FILE_DETAIL_SEARCH_CONDITION_OPTIONS: { label: string; value: ReceiveFileDetailSearchCondition }[] = [
  { label: '고객명', value: RECEIVE_FILE_DETAIL_SEARCH_CONDITION.CUSTOMER_NAME },
  { label: '고객번호', value: RECEIVE_FILE_DETAIL_SEARCH_CONDITION.CUSTOMER_NUMBER },
  { label: '휴대전화', value: RECEIVE_FILE_DETAIL_SEARCH_CONDITION.MOBILE_PHONE },
  { label: '고객키', value: RECEIVE_FILE_DETAIL_SEARCH_CONDITION.CUSTOMER_KEY },
];
