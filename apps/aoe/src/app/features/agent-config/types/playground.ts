export interface AgentTestRequest {
  agentId: string;
  body: {
    firstYn: 'Y' | 'N';
    serviceId: string;
    threadId: string;
    userInput: string;
  };
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
