export interface ChatItem {
  chatId: string;
  chatName: string;
  /** 마지막 활동 시각 — 목록 정렬 기준 (서버 채번) */
  workTime: string;
}

export interface ChatCreateDatas {
  chatName: string;
}

export interface ChatUpdateDatas {
  chatName: string;
}

export interface ChatMessageItem {
  /** 서버 채번 */
  seq: number;
  userQuery: string;
  /** ChatResponseBlock[] 을 직렬화한 JSON 문자열 (max 4000자, BE 가 엔진 응답을 저장) */
  responseJson: string;
  workTime: string;
}

/** 질의 요청 — BE 가 엔진 호출 + 메시지 저장까지 수행, 응답은 저장된 ChatMessageItem */
export interface ChatQueryDatas {
  userQuery: string;
  /** 엔진 세션 식별자(UCID) — 새 채팅마다 FE 가 랜덤 UUID 생성, 같은 채팅의 질의엔 동일 값 (max 64자) */
  serviceId: string;
}

/**
 * responseJson 내부 구조 — v2 포맷 (BT-ADMIN-SERVICE-AOE/src/main/AOE_Response_JSON_포맷_정리.html)
 * 최상위는 블록 배열. 한 응답이 여러 말풍선 블록(차트 + 마무리 멘트 등)으로 구성될 수 있다.
 */
export const CHAT_VIEW_TYPE = {
  PIE: 'pie',
  BAR: 'bar',
  LINE: 'line',
  TABLE: 'table',
  NONE: 'none',
} as const;
export type ChatViewType = (typeof CHAT_VIEW_TYPE)[keyof typeof CHAT_VIEW_TYPE];

/** 그래프 데이터 항목 (pie/bar/line) — ECharts 표준 형태, value 는 숫자 고정 */
export interface ChatResponseDatum {
  name: string;
  value: number;
}

export interface ChatResponseBlock {
  /** 사용자에게 보여줄 답변 문장 (필수) */
  answer: string;
  viewType: ChatViewType;
  viewTitle?: string;
  /** X축 제목 (bar/line) */
  xTitle?: string;
  /** Y축 제목 (bar/line) */
  yTitle?: string;
  /** 그래프 데이터 (pie/bar/line) */
  data?: ChatResponseDatum[];
  /** 표 데이터 (table) — 2차원 배열, 첫 행은 컬럼 헤더 */
  tableData?: (string | number)[][];
}
