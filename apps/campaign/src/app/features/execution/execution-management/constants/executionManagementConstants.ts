import {
  EXECUTION_BATCH_CHANGE_ACTION,
  EXECUTION_DETAIL_SEARCH_CONDITION,
  EXECUTION_MONITORING_MODE,
  EXECUTION_PROCESS_STATUS_FILTER,
  EXECUTION_STATUS,
  EXECUTION_TARGET_STATUS,
  type ExecutionBatchChangeAction,
  type ExecutionDetailSearchCondition,
  type ExecutionMonitoringMode,
  type ExecutionProcessStatusFilter,
  type ExecutionStatus,
  type ExecutionTargetStatus,
} from '../types';

export const EXECUTION_MANAGEMENT_PATH = '/campaign/execution/execution-management';

export const EXECUTION_MONITORING_MODE_OPTIONS: { label: string; value: ExecutionMonitoringMode }[] = [
  { label: '수동', value: EXECUTION_MONITORING_MODE.MANUAL },
  { label: '자동', value: EXECUTION_MONITORING_MODE.AUTO },
];

export const EXECUTION_PROGRESS_ROUND_OPTIONS: { label: string; value: number }[] = [
  { label: '1차', value: 1 },
  { label: '2차', value: 2 },
  { label: '3차', value: 3 },
  { label: '4차', value: 4 },
  { label: '5차', value: 5 },
];

export const EXECUTION_PROCESS_STATUS_FILTER_OPTIONS: { label: string; value: ExecutionProcessStatusFilter }[] = [
  { label: '대기중', value: EXECUTION_PROCESS_STATUS_FILTER.WAITING },
  { label: '진행중', value: EXECUTION_PROCESS_STATUS_FILTER.IN_PROGRESS },
  { label: '중지', value: EXECUTION_PROCESS_STATUS_FILTER.STOPPED },
];

export const EXECUTION_PROCESS_STATUS_FILTER_STATUS_MAP: Record<ExecutionProcessStatusFilter, ExecutionStatus[]> = {
  [EXECUTION_PROCESS_STATUS_FILTER.WAITING]: [EXECUTION_STATUS.WAITING],
  [EXECUTION_PROCESS_STATUS_FILTER.IN_PROGRESS]: [EXECUTION_STATUS.IN_PROGRESS],
  [EXECUTION_PROCESS_STATUS_FILTER.STOPPED]: [EXECUTION_STATUS.STOPPED],
};

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  [EXECUTION_STATUS.WAITING]: '대기중',
  [EXECUTION_STATUS.IN_PROGRESS]: '진행중',
  [EXECUTION_STATUS.STOPPED]: '중지',
  [EXECUTION_STATUS.COMPLETED]: '완료',
};

export const EXECUTION_STATUS_OPTIONS: { label: string; value: ExecutionStatus }[] = [
  { label: EXECUTION_STATUS_LABELS[EXECUTION_STATUS.WAITING], value: EXECUTION_STATUS.WAITING },
  { label: EXECUTION_STATUS_LABELS[EXECUTION_STATUS.IN_PROGRESS], value: EXECUTION_STATUS.IN_PROGRESS },
  { label: EXECUTION_STATUS_LABELS[EXECUTION_STATUS.STOPPED], value: EXECUTION_STATUS.STOPPED },
  { label: EXECUTION_STATUS_LABELS[EXECUTION_STATUS.COMPLETED], value: EXECUTION_STATUS.COMPLETED },
];

export const EXECUTION_STATUS_COLORS: Record<ExecutionStatus, { color: string; bgColor: string; borderColor: string }> = {
  [EXECUTION_STATUS.WAITING]: { color: '#1677ff', bgColor: '#e6f4ff', borderColor: '#91caff' },
  [EXECUTION_STATUS.IN_PROGRESS]: { color: '#52c41a', bgColor: '#f6ffed', borderColor: '#b7eb8f' },
  [EXECUTION_STATUS.STOPPED]: { color: '#ff4d4f', bgColor: '#fff2f0', borderColor: '#ffccc7' },
  [EXECUTION_STATUS.COMPLETED]: { color: '#595959', bgColor: '#fafafa', borderColor: '#d9d9d9' },
};

export const EXECUTION_TARGET_STATUS_LABELS: Record<ExecutionTargetStatus, string> = {
  [EXECUTION_TARGET_STATUS.WAITING]: '대기중',
  [EXECUTION_TARGET_STATUS.CALLING]: '통화시도중',
  [EXECUTION_TARGET_STATUS.ENDED]: '통화종료',
  [EXECUTION_TARGET_STATUS.CALL_FAILED]: '통화실패',
  [EXECUTION_TARGET_STATUS.BUSY]: '통화중(BUSY)',
  [EXECUTION_TARGET_STATUS.NO_ANSWER]: '고객무응답',
  [EXECUTION_TARGET_STATUS.DISCONNECTED]: '결번',
  [EXECUTION_TARGET_STATUS.VOICEMAIL]: '음성사서함',
  [EXECUTION_TARGET_STATUS.FAX_CONNECTED]: '팩스연결',
  [EXECUTION_TARGET_STATUS.CALL_REJECTED]: '통화거절',
  [EXECUTION_TARGET_STATUS.POWER_OFF]: '전원꺼짐',
  [EXECUTION_TARGET_STATUS.ROAMING]: '로밍',
  [EXECUTION_TARGET_STATUS.OTHER]: '기타',
  [EXECUTION_TARGET_STATUS.SERVER_INTEGRATION_FAILED]: '서버연동실패',
  [EXECUTION_TARGET_STATUS.DATA_ERROR]: '데이터오류',
  [EXECUTION_TARGET_STATUS.AI_INTEGRATION_FAILED]: 'AI연동실패',
  [EXECUTION_TARGET_STATUS.TEST_CASE_FAILED]: '테스트케이스실패',
  [EXECUTION_TARGET_STATUS.STT_ERROR]: 'STT오류',
  [EXECUTION_TARGET_STATUS.TTS_ERROR]: 'TTS오류',
  [EXECUTION_TARGET_STATUS.DTMF_ERROR]: 'DTMF오류',
  [EXECUTION_TARGET_STATUS.NEEDS_CONFIRMATION]: '확인필요',
  [EXECUTION_TARGET_STATUS.EXCLUDED]: '제외대상',
  [EXECUTION_TARGET_STATUS.RESERVATION_SET]: '예약설정',
  [EXECUTION_TARGET_STATUS.EXCLUDED_DUPLICATE]: '제외대상(중복)',
  [EXECUTION_TARGET_STATUS.TEST_CASE]: '테스트케이스',
  [EXECUTION_TARGET_STATUS.DNC_STOP]: '수발신중지(DNC)',
  [EXECUTION_TARGET_STATUS.RECRUITMENT_ERROR]: '섭외오류',
  [EXECUTION_TARGET_STATUS.CONSULTATION_TRANSFER]: '상담호전환',
  [EXECUTION_TARGET_STATUS.CALLBACK_SAVED]: '콜백저장',
  [EXECUTION_TARGET_STATUS.CALL_DISTRIBUTION_WAIT_END]: '콜배수대기종료',
};

const EXECUTION_TARGET_STATUS_ORDER: ExecutionTargetStatus[] = [
  EXECUTION_TARGET_STATUS.WAITING,
  EXECUTION_TARGET_STATUS.CALLING,
  EXECUTION_TARGET_STATUS.ENDED,
  EXECUTION_TARGET_STATUS.CALL_FAILED,
  EXECUTION_TARGET_STATUS.BUSY,
  EXECUTION_TARGET_STATUS.NO_ANSWER,
  EXECUTION_TARGET_STATUS.DISCONNECTED,
  EXECUTION_TARGET_STATUS.VOICEMAIL,
  EXECUTION_TARGET_STATUS.FAX_CONNECTED,
  EXECUTION_TARGET_STATUS.CALL_REJECTED,
  EXECUTION_TARGET_STATUS.POWER_OFF,
  EXECUTION_TARGET_STATUS.ROAMING,
  EXECUTION_TARGET_STATUS.OTHER,
  EXECUTION_TARGET_STATUS.SERVER_INTEGRATION_FAILED,
  EXECUTION_TARGET_STATUS.DATA_ERROR,
  EXECUTION_TARGET_STATUS.AI_INTEGRATION_FAILED,
  EXECUTION_TARGET_STATUS.TEST_CASE_FAILED,
  EXECUTION_TARGET_STATUS.STT_ERROR,
  EXECUTION_TARGET_STATUS.TTS_ERROR,
  EXECUTION_TARGET_STATUS.DTMF_ERROR,
  EXECUTION_TARGET_STATUS.NEEDS_CONFIRMATION,
  EXECUTION_TARGET_STATUS.EXCLUDED,
  EXECUTION_TARGET_STATUS.RESERVATION_SET,
  EXECUTION_TARGET_STATUS.EXCLUDED_DUPLICATE,
  EXECUTION_TARGET_STATUS.TEST_CASE,
  EXECUTION_TARGET_STATUS.DNC_STOP,
  EXECUTION_TARGET_STATUS.RECRUITMENT_ERROR,
  EXECUTION_TARGET_STATUS.CONSULTATION_TRANSFER,
  EXECUTION_TARGET_STATUS.CALLBACK_SAVED,
  EXECUTION_TARGET_STATUS.CALL_DISTRIBUTION_WAIT_END,
];

export const EXECUTION_TARGET_STATUS_FILTER_OPTIONS: { label: string; value: ExecutionTargetStatus }[] = EXECUTION_TARGET_STATUS_ORDER.map((value) => ({
  label: EXECUTION_TARGET_STATUS_LABELS[value],
  value,
}));

export const EXECUTION_TARGET_STATUS_OPTIONS = EXECUTION_TARGET_STATUS_FILTER_OPTIONS;

export const EXECUTION_DETAIL_SEARCH_CONDITION_OPTIONS: { label: string; value: ExecutionDetailSearchCondition }[] = [
  { label: '고객명', value: EXECUTION_DETAIL_SEARCH_CONDITION.CUSTOMER_NAME },
  { label: '고객번호', value: EXECUTION_DETAIL_SEARCH_CONDITION.CUSTOMER_NUMBER },
  { label: '전화번호', value: EXECUTION_DETAIL_SEARCH_CONDITION.PHONE_NUMBER },
  { label: '콜ID', value: EXECUTION_DETAIL_SEARCH_CONDITION.CALL_ID },
];

export const EXECUTION_BATCH_CHANGE_OPTIONS: { label: string; value: ExecutionBatchChangeAction }[] = [
  { label: '대기중', value: EXECUTION_BATCH_CHANGE_ACTION.WAITING },
  { label: '제외', value: EXECUTION_BATCH_CHANGE_ACTION.EXCLUDED },
  { label: '재시도', value: EXECUTION_BATCH_CHANGE_ACTION.RETRY },
];

/** 실행 카드 — 처리상태 집계 컬럼 */
export const EXECUTION_PROCESS_STATUS_COLUMNS = [
  { label: '대기', field: 'waitingCount' },
  { label: '진행', field: 'inProgressCount' },
  { label: '종료', field: 'endedCount' },
  { label: '실패', field: 'failedCount' },
  { label: '제외', field: 'excludedCount' },
] as const satisfies readonly { label: string; field: keyof import('../types').CampaignExecutionItem }[];

/** 실행 카드 — 통화실패 집계 컬럼 */
export const EXECUTION_CALL_FAILURE_COLUMNS = [
  { label: '통화중', field: 'busyCount' },
  { label: '무응답', field: 'noAnswerCount' },
  { label: '결번', field: 'disconnectedCount' },
  { label: '팩스연결', field: 'faxConnectedCount' },
  { label: '통화거절', field: 'callRejectedCount' },
  { label: '전원꺼짐', field: 'powerOffCount' },
  { label: '로밍', field: 'roamingCount' },
  { label: '기타', field: 'otherFailureCount' },
] as const satisfies readonly { label: string; field: keyof import('../types').CampaignExecutionItem }[];

/** 실행 카드 1장 너비(620px) + gap(12px) — 좌우 화살표 스크롤 간격 */
export const EXECUTION_CARD_WIDTH = 620;
export const EXECUTION_CARD_SCROLL_STEP = EXECUTION_CARD_WIDTH + 12;
