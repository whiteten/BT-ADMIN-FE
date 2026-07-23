/**
 * 노드 스코프 React Query 훅 + 운영자/테넌트 모드 노드 필터
 */
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';
import type { QueryHookOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { type NodeTenantItem, nodeScopeApi } from '../api/nodeScopeApi';

export const nodeScopeQueryKeys = createAppQueryKeys('nodeScope', {
  getNodeTenants: null,
});

/**
 * 노드-테넌트 매핑 조회 (공통)
 */
export const useGetNodeTenants = ({ queryOptions }: QueryHookOptions<NodeTenantItem[]> = {}) => {
  return useQuery({
    queryKey: nodeScopeQueryKeys.getNodeTenants.queryKey,
    queryFn: () => nodeScopeApi.getNodeTenants(),
    ...queryOptions,
  });
};

/**
 * 노드-테넌트 스코프에 맞춘 노드 목록. 모든 IPRON 노드 셀렉트가 공유하는 단일 규칙.
 *
 * - **일반 테넌트 모드**(operatorMode=false): 항상 **로그인 테넌트에 매핑된 노드만**.
 * - **운영자 모드**(operatorMode=true):
 *   - `operatorTenantId` 가 지정되면 → **그 테넌트에 매핑된 노드만** (운영자가 테넌트를 고른 경우).
 *   - `operatorTenantId` 가 null/미지정(전체) → 전달받은 nodes 그대로 (전체 노드).
 * - 매핑 로딩 중이면 nodes 그대로 반환(깜빡임 방지).
 *
 * @param nodes 원본 노드 목록
 * @param operatorTenantId 운영자 모드에서 선택한 테넌트(없으면 전체). 일반 모드에서는 무시됨.
 */
export function useScopedNodes<T extends { nodeId: number }>(nodes: T[], operatorTenantId?: number | null): T[] {
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const authTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // 스코프 기준 테넌트: 일반 모드=로그인 테넌트, 운영자 모드=선택 테넌트(없으면 전체=null)
  const scopeTenantId = operatorMode ? (operatorTenantId ?? null) : authTenantId;

  // 필터할 테넌트가 있을 때만 매핑을 조회(전체 노드면 매핑 불필요)
  const { data: nodeTenants = [], isLoading } = useGetNodeTenants({
    queryOptions: { enabled: scopeTenantId != null },
  });

  if (scopeTenantId == null || isLoading) return nodes;

  const allowedNodeIds = new Set(nodeTenants.filter((nt) => nt.tenantId === scopeTenantId).map((nt) => nt.nodeId));
  return nodes.filter((n) => allowedNodeIds.has(n.nodeId));
}
