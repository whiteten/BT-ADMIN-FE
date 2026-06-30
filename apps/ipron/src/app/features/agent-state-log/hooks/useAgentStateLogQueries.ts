/**
 * 상담사 상태 로그(여정) React Query 훅
 */
import { useMutation } from '@tanstack/react-query';
import { agentStateLogApi } from '../api/agentStateLogApi';
import type { AgentStateLogRequest, AgentStateLogResponse } from '../types';

/**
 * 상담사 상태 로그 조회 뮤테이션 훅.
 *
 * IC LTS 소켓 통신 특성상 조회마다 새 TCP 연결을 맺으므로
 * useQuery 대신 useMutation 으로 명시적 트리거 방식 사용.
 */
export function useAgentStateLog(options?: { onSuccess?: (data: AgentStateLogResponse) => void; onError?: (error: unknown) => void }) {
  return useMutation<AgentStateLogResponse, Error, AgentStateLogRequest>({
    mutationFn: async (req) => {
      const res = await agentStateLogApi.fetchLog(req);
      const body = res.data;
      if (!body?.ok) {
        throw new Error(body?.message ?? '조회에 실패했습니다');
      }
      return body.data!;
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
