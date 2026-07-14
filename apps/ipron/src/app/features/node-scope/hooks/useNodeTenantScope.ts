/**
 * 테넌트 ↔ 노드 스코프 필터 공통 훅.
 *
 * IPRON 화면에서 "테넌트 셀렉트 + 노드 셀렉트"가 함께 있는 경우의 **단일 규칙**이다.
 * 화면마다 좁히는 방향/리셋 로직을 손으로 짜면 규칙이 갈라지고 한 줄만 빠져도 버그가 되므로
 * 이 훅으로 통일한다.
 *
 * ## 규칙
 * - **기본은 테넌트 → 노드 단방향**: 테넌트를 고르면 그 테넌트에 매핑된 노드만 노드 셀렉트에 남는다.
 *   이때 테넌트 목록은 노드 선택의 영향을 받지 않는다(서로 좁히면 교착).
 * - **↔ 로 뒤집기 가능**(`toggleOrder`): 노드 → 테넌트 단방향이 되어,
 *   노드를 고르면 그 노드에 매핑된 테넌트만 테넌트 셀렉트에 남는다.
 * - 뒤집거나 상위 선택이 바뀌어 하위 선택이 범위 밖이 되면 **하위 선택은 자동 해제**된다.
 *
 * ## 모드
 * - **일반 모드**: 테넌트는 로그인 테넌트로 고정(셀렉트를 노출하지 않는다). 노드는 그 테넌트의 노드만.
 * - **운영자 모드**: 테넌트 셀렉트로 대상 테넌트를 고른다(null=전체 테넌트).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';
import { useGetNodeTenants, useScopedNodes } from './useNodeScope';

export interface NodeTenantScopeOptions {
  /** 초기 선택 노드 (딥링크 등). 미지정 시 전체 */
  initialNodeId?: number | null;
  /** 초기 선택 테넌트 (딥링크 등, 운영자 모드에서만 의미 있음). 미지정 시 전체 */
  initialTenantId?: number | null;
}

export interface TenantOption {
  tenantId: number;
  tenantName: string;
}

export interface NodeTenantScope<N> {
  /** 운영자 모드 여부 */
  operatorMode: boolean;
  /** 스코프 필터 순서. true=테넌트→노드(기본), false=노드→테넌트 */
  tenantFirst: boolean;
  /** ↔ 버튼 핸들러 — 좁히는 방향을 뒤집는다 */
  toggleOrder: () => void;

  /** 노드 셀렉트에 노출할 노드 목록 (규칙에 따라 좁혀짐) */
  nodes: N[];
  /** 테넌트 셀렉트에 노출할 테넌트 목록 (규칙에 따라 좁혀짐) */
  tenants: TenantOption[];

  /** 선택 노드 (null=전체) */
  selectedNodeId: number | null;
  setSelectedNodeId: (nodeId: number | null) => void;

  /** 운영자 모드 테넌트 필터 (null=전체). 일반 모드에서는 사용하지 않는다 */
  tenantFilter: number | null;
  setTenantFilter: (tenantId: number | null) => void;

  /**
   * 데이터 조회/등록에 쓸 실제 테넌트.
   * 일반 모드=로그인 테넌트, 운영자 모드=선택 테넌트(전체면 null).
   */
  selectedTenantId: number | null;
  /** selectedTenantId 의 표시명 ('' = 없음) */
  selectedTenantName: string;
}

/**
 * @param allNodes 전체 노드 목록 (화면의 노드 조회 훅 결과를 그대로 넘긴다)
 */
export function useNodeTenantScope<N extends { nodeId: number }>(allNodes: N[], { initialNodeId = null, initialTenantId = null }: NodeTenantScopeOptions = {}): NodeTenantScope<N> {
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants);

  const [tenantFirst, setTenantFirst] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initialNodeId);
  const [tenantFilter, setTenantFilter] = useState<number | null>(initialTenantId);

  const { data: nodeTenants = [] } = useGetNodeTenants();

  // 실제 스코프 테넌트 — 일반 모드는 로그인 테넌트 고정, 운영자 모드는 선택값
  const selectedTenantId = operatorMode ? tenantFilter : ctxTenantId;

  // 노드 목록: 테넌트→노드 순서일 때만 선택 테넌트로 좁힌다.
  // (노드→테넌트 순서면 노드가 출발점이므로 스코프 전체가 후보)
  const nodes = useScopedNodes(allNodes, tenantFirst ? tenantFilter : null);

  // 테넌트 목록: 노드가 할당된 테넌트만 후보로 한다(노드를 못 고르면 등록 자체가 불가).
  // 노드→테넌트 순서일 때만 선택 노드로 좁힌다.
  const tenants = useMemo(() => {
    const accessible = availableTenants ?? [];
    const rows = !tenantFirst && selectedNodeId != null ? nodeTenants.filter((nt) => nt.nodeId === selectedNodeId) : nodeTenants;
    const withNodes = new Set(rows.map((nt) => nt.tenantId));

    const list: TenantOption[] = accessible.filter((t) => withNodes.has(t.tenantId)).map((t) => ({ tenantId: t.tenantId, tenantName: t.tenantName ?? `테넌트 ${t.tenantId}` }));

    return list.sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [availableTenants, nodeTenants, selectedNodeId, tenantFirst]);

  // 하위 선택이 범위 밖이면 해제 — 상위 선택 변경/순서 뒤집기/모드 전환 모두 여기서 흡수
  useEffect(() => {
    if (selectedNodeId != null && nodes.length > 0 && !nodes.some((n) => n.nodeId === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    if (operatorMode && tenantFilter != null && tenants.length > 0 && !tenants.some((t) => t.tenantId === tenantFilter)) {
      setTenantFilter(null);
    }
  }, [operatorMode, tenantFilter, tenants]);

  const toggleOrder = useCallback(() => setTenantFirst((prev) => !prev), []);

  const selectedTenantName = useMemo(() => {
    if (selectedTenantId == null) return '';
    const hit = (availableTenants ?? []).find((t) => t.tenantId === selectedTenantId);
    return hit?.tenantName ?? '';
  }, [availableTenants, selectedTenantId]);

  return {
    operatorMode,
    tenantFirst,
    toggleOrder,
    nodes,
    tenants,
    selectedNodeId,
    setSelectedNodeId,
    tenantFilter,
    setTenantFilter,
    selectedTenantId,
    selectedTenantName,
  };
}
