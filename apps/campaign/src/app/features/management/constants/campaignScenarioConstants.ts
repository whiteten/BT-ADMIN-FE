export const TRANSFER_DN_NONE = 'NONE' as const;

export const DEFAULT_SCENARIO_FILE_LOCATION = '/bridgetec/swatio/upload/campaign' as const;

export const TRANSFER_DN_OPTIONS = [
  { label: '없음', value: TRANSFER_DN_NONE },
  { label: '6001', value: '6001' },
  { label: '6002', value: '6002' },
  { label: '6003', value: '6003' },
] as const;

export const LOADED_CAMPAIGN_STATUS_OPTIONS = [
  { label: '대기중', value: '대기중' },
  { label: '진행중', value: '진행중' },
  { label: '중지', value: '중지' },
  { label: '완료', value: '완료' },
] as const;

export const LOADED_TARGET_STATUS_OPTIONS = [
  { label: '대기중', value: '대기중' },
  { label: '제외대상', value: '제외대상' },
] as const;

export const CALL_MULTIPLIER_OPTIONS = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
] as const;
