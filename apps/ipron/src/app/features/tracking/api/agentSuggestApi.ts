/**
 * 트래킹 검색용 상담사 자동완성 API.
 *
 * cmdk 의 {@code agent:홍} 토큰 입력 시 BE 호출 → dropdown 후보 표시 →
 * 선택 시 토큰을 {@code agent:107} 로 교체.
 *
 * BFF Flow: ipron-tracking-agent-suggest → GET /api/ipron/tracking/agents/suggest?kw=&limit=
 */
import ApiClient, { type ApiResponse } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface AgentSuggestion {
  agentId: number;
  agentName: string;
  agentLoginId: string;
  tenantId: number;
}

/**
 * 상담사 lookup.
 * @param kw 검색어 (1자 이상). 영문/한글 모두 허용 — BE 가 LIKE 매칭
 * @param limit 최대 결과 수 (기본 10, 최대 50)
 */
export async function suggestAgents(kw: string, limit = 10): Promise<AgentSuggestion[]> {
  const q = kw?.trim();
  if (!q) return [];
  try {
    const r = await apiClient.get<ApiResponse<AgentSuggestion[]>>('/ipron-tracking-agent-suggest', {
      params: { kw: q, limit },
    });
    return r.data?.data ?? [];
  } catch {
    return [];
  }
}
