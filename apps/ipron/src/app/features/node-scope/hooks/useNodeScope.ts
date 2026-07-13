/**
 * 노드 스코프 React Query 훅 + 운영자/테넌트 모드 노드 필터
 */
import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';
import type { QueryHookOptions } from '@/shared-util';
import { type NodeTenantItem, nodeScopeApi } from '../api/nodeScopeApi';

export const nodeScopeQueryKeys = createQueryKeys('nodeScope', {
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
 * 운영자 스코프에 맞춘 노드 목록.
 * - 운영자 모드(operatorMode=true)  → 전달받은 nodes 그대로 (전체 노드)
 * - 일반 테넌트 모드(false)         → 로그인 테넌트에 매핑된 노드만
 * - 매핑 로딩 중이면 nodes 그대로 반환(깜빡임 방지)
 */
export function useScopedNodes<T extends { nodeId: number }>(nodes: T[]): T[] {
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const authTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // 운영자 모드면 전체 노드를 보므로 매핑 자체가 불필요 → 호출하지 않음
  const { data: nodeTenants = [], isLoading } = useGetNodeTenants({
    queryOptions: { enabled: !operatorMode },
  });

  if (operatorMode || authTenantId == null || isLoading) return nodes;

  const allowedNodeIds = new Set(nodeTenants.filter((nt) => nt.tenantId === authTenantId).map((nt) => nt.nodeId));
  return nodes.filter((n) => allowedNodeIds.has(n.nodeId));
}
