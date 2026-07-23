import type { IptOrgTreeNode } from '../types';

/**
 * 운영자 전체(view-all) 모드 트리 표현 — 루트 조직들을 테넌트별 합성 노드로 묶어
 * "테넌트 → 조직" 2단으로 표시한다 (agent-master displayGroupTree 패턴).
 *
 * 합성 노드는 음수 dnGroupId(-1_000_000 - tenantId) + `_scopeKind:'tenant'`.
 */
export function groupTreeByTenant(tree: IptOrgTreeNode[]): IptOrgTreeNode[] {
  const byTenant = new Map<number, IptOrgTreeNode[]>();
  for (const n of tree) {
    const arr = byTenant.get(n.tenantId) ?? [];
    arr.push(n);
    byTenant.set(n.tenantId, arr);
  }
  const nameOf = (tid: number) => tree.find((n) => n.tenantId === tid)?.tenantName ?? `테넌트 ${tid}`;
  return [...byTenant.entries()]
    .sort((a, b) => nameOf(a[0]).localeCompare(nameOf(b[0])))
    .map(([tid, orgs]) => ({
      dnGroupId: -1_000_000 - tid, // 합성 노드 — 실제 조직 ID 와 충돌 안 하도록 음수
      tenantId: tid,
      tenantName: nameOf(tid),
      priorGrpId: null,
      grpDepth: 0,
      dnGrpName: nameOf(tid),
      activateYn: 1,
      sortSeq: null,
      userCount: orgs.reduce((s, g) => s + (g.userCount ?? 0), 0),
      children: orgs,
      _scopeKind: 'tenant' as const,
    }));
}
