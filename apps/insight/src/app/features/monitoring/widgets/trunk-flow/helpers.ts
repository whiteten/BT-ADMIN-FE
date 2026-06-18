/**
 * 트렁크 회선현황(흐름) 위젯 — 정규화 + severity 색 토큰.
 */
import type { TrunkEndpointState, TrunkFlowData, TrunkGroup, TrunkLine, TrunkLineStat, TrunkLineStatus, TrunkNode, TrunkNodeLeg, TrunkSeverity } from './types';

// ─── severity → 색 토큰 (insight 디자인 토큰) ──────────────────────
export const TRUNK_SEV_TEXT: Record<TrunkSeverity, string> = {
  normal: 'text-bt-success',
  warning: 'text-bt-warn',
  saturated: 'text-bt-warn',
  critical: 'text-bt-danger',
};
export const TRUNK_SEV_BG: Record<TrunkSeverity, string> = {
  normal: 'bg-bt-success',
  warning: 'bg-bt-warn',
  saturated: 'bg-bt-warn',
  critical: 'bg-bt-danger',
};
export const TRUNK_SEV_SOFT: Record<TrunkSeverity, string> = {
  normal: 'bg-bt-success-soft',
  warning: 'bg-bt-warn-soft',
  saturated: 'bg-bt-warn-soft',
  critical: 'bg-bt-danger-soft',
};

const SEV_RANK: Record<TrunkSeverity, number> = { normal: 0, warning: 1, saturated: 1, critical: 2 };
export function trunkSevRank(s: TrunkSeverity): number {
  return SEV_RANK[s] ?? 0;
}

// ─── 안전 변환 ────────────────────────────────────────────────────
function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}
function num(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v);
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function sev(v: unknown): TrunkSeverity {
  const s = String(v);
  return s === 'critical' || s === 'warning' || s === 'saturated' || s === 'normal' ? s : 'normal';
}
function nodeLeg(v: unknown): TrunkNodeLeg {
  const r = rec(v);
  return { busy: num(r.busy), reg: num(r.reg), block: num(r.block), lic: num(r.lic), inBusy: num(r.inBusy), outBusy: num(r.outBusy), att: num(r.att) };
}
function endpointState(v: unknown): TrunkEndpointState {
  const s = String(v);
  return s === 'block' || s === 'error' ? s : 'normal';
}
function lineStatus(v: unknown): TrunkLineStatus {
  const s = String(v);
  return s === 'block' || s === 'unregistered' || s === 'error' || s === 'unused' || s === 'normal' ? s : 'normal';
}
function lineStat(v: unknown): TrunkLineStat {
  const r = rec(v);
  return { normal: num(r.normal), unregistered: num(r.unregistered), block: num(r.block), error: num(r.error), unused: num(r.unused) };
}

/** WS DATA 프레임(혹은 Aggregation 래핑)을 안전하게 TrunkFlowData 로 정규화. */
export function toTrunkData(raw: unknown): TrunkFlowData {
  // Aggregation 엔진/래퍼 대응: { value: {...} } / { data: {...} } 한 겹 벗기기
  let root = rec(raw);
  if (root.value && typeof root.value === 'object' && !Array.isArray(root.value)) root = rec(root.value);
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data) && root.serverTs == null && root.node == null) root = rec(root.data);

  const nodes: TrunkNode[] = arr(root.node ?? root.nodes).map((nv) => {
    const n = rec(nv);
    return {
      nodeId: n.nodeId == null ? null : num(n.nodeId),
      nodeName: str(n.nodeName, n.nodeId != null ? `노드 ${num(n.nodeId)}` : '노드'),
      rate: num(n.rate),
      busyLine: num(n.busyLine),
      regLine: num(n.regLine),
      totalLine: num(n.totalLine),
      riskCnt: num(n.riskCnt),
      warnCnt: num(n.warnCnt),
      normalCnt: num(n.normalCnt),
      hasSystem: Boolean(n.hasSystem),
      cps: num(n.cps),
      co: nodeLeg(n.co),
      trk: nodeLeg(n.trk),
      ext: nodeLeg(n.ext),
      licOver: num(n.licOver),
      cumCnt: num(n.cumCnt),
      coPeak: num(n.coPeak),
      useMd: Boolean(n.useMd),
      useDrSync: Boolean(n.useDrSync),
    };
  });
  const nodeNameById = new Map<number, string>();
  for (const n of nodes) if (n.nodeId != null) nodeNameById.set(n.nodeId, n.nodeName);

  const groupsRaw = root.endpoint != null || root.sipTrunk != null ? [...arr(root.endpoint), ...arr(root.sipTrunk)] : arr(root.groups);
  const groups: TrunkGroup[] = groupsRaw.map((gv) => {
    const g = rec(gv);
    const nodeId = g.nodeId == null ? null : num(g.nodeId);
    const lines: TrunkLine[] = arr(g.endpointMember ?? g.trunkLine ?? g.lines).map((lv) => {
      const l = rec(lv);
      return {
        trkId: l.trkId == null ? null : num(l.trkId),
        name: str(l.name, l.trkId != null ? String(num(l.trkId)) : ''),
        status: lineStatus(l.status),
        severity: sev(l.severity),
        line: num(l.line),
        inBusy: num(l.inBusy),
        outBusy: num(l.outBusy),
        rate: num(l.rate),
        ip: l.ip == null ? undefined : String(l.ip),
        mos: num(l.mos),
        inPick: num(l.inPick),
        outPick: num(l.outPick),
      };
    });
    return {
      kind: str(g.kind, 'SIP'),
      groupKey: str(g.groupKey),
      name: str(g.name, str(g.groupKey)),
      nodeId,
      nodeName: nodeId != null ? (nodeNameById.get(nodeId) ?? `노드 ${nodeId}`) : '노드',
      rate: num(g.rate),
      aliveRate: num(g.aliveRate),
      busyLine: num(g.busyLine),
      regLine: num(g.regLine),
      totalLine: num(g.totalLine),
      inBusy: num(g.inBusy),
      outBusy: num(g.outBusy),
      inPick: num(g.inPick),
      outPick: num(g.outPick),
      peakBusy: num(g.peakBusy),
      licOver: num(g.licOver),
      severity: sev(g.severity),
      lineIssue: Boolean(g.lineIssue),
      state: endpointState(g.state),
      lineStat: lineStat(g.endpointMemberStat ?? g.trunkLineStat ?? g.lineStat),
      lines,
    };
  });

  return { nodes, groups };
}

/** 정수면 그대로, 소수면 1자리. null/undefined 면 '—'. */
export function fmtRate(v: number | null | undefined): string {
  if (v == null) return '—';
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
