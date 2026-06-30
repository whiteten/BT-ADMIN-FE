/**
 * 상담사 상태 로그(여정) API 클라이언트
 * BFF Flow: ipron-tracking-agent-state-log (POST pass-through)
 * BE endpoint: POST /api/ipron/tracking/agent-state-log
 */
import type { AxiosResponse } from 'axios';
import ApiClient from '@/shared-util';
import type { AgentStateLogRequest, AgentStateLogResponse } from '../types';

/** BE ApiResponse 래퍼 — ok/code/message/data */
interface BeApiResponse<T> {
  ok: boolean;
  code: string;
  message: string;
  data: T | null;
}

/** ApiClient 인스턴스 (serviceURL='/bff' → /api/bff/<flowId>) */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const agentStateLogApi = {
  /**
   * 상담사 상태 로그 조회.
   * IC ICLTS(9358) LogTracer 소켓 → raw 로그 라인 반환.
   * @flow ipron-tracking-agent-state-log
   */
  fetchLog: (req: AgentStateLogRequest): Promise<AxiosResponse<BeApiResponse<AgentStateLogResponse>>> =>
    apiClient.post<BeApiResponse<AgentStateLogResponse>>('/ipron-tracking-agent-state-log', req),
};
