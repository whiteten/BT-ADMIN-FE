// 적재(Ingestion) 화면 상수

/** 수신 방식 옵션 */
export const SOURCE_TYPE_OPTIONS = [
  { label: '파일(FILE)', value: 'FILE' },
  { label: 'REST 수신', value: 'REST' },
  { label: '외부 DB', value: 'DB' },
] as const;

/** 값 변환 규칙 옵션 */
export const TRANSFORM_TYPE_OPTIONS = [
  { label: '변환없음', value: 'NONE' },
  { label: '공백제거(TRIM)', value: 'TRIM' },
  { label: '하이픈제거', value: 'REMOVE_HYPHEN' },
  { label: '대문자', value: 'UPPER' },
  { label: '소문자', value: 'LOWER' },
  { label: '날짜(yyyyMMdd)', value: 'DATE_YYYYMMDD' },
] as const;

/** 오류 정책 옵션 */
export const ERROR_POLICY_OPTIONS = [
  { label: '오류 시 중단(STOP)', value: 'STOP' },
  { label: '오류 건너뛰고 계속(CONTINUE)', value: 'CONTINUE' },
] as const;

/** 적재 상태 라벨 */
export const INGEST_STATUS_LABELS: Record<string, string> = {
  RUNNING: '진행중',
  SUCCESS: '성공',
  PARTIAL: '부분성공',
  FAILED: '실패중단',
};

/** 적재 상태 색상(Antd Tag color) */
export const INGEST_STATUS_COLORS: Record<string, string> = {
  RUNNING: 'blue',
  SUCCESS: 'green',
  PARTIAL: 'orange',
  FAILED: 'red',
};
