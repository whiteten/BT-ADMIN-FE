export interface AgentTestRequest {
  agentId: string;
  body: {
    firstYn: 'Y' | 'N';
    serviceId: string;
    threadId: string;
    userInput: string;
  };
  /** 세션 교체 시 진행 중 요청 취소용 (서버 호출은 진행되나 클라이언트는 응답 대기 중단) */
  signal?: AbortSignal;
}

export interface AgentTestResponse {
  result: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: number;
  type: 'request' | 'response';
  content: string | object;
  timestamp: string;
}
