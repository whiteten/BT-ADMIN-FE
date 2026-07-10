import { type CtiAgentRow, type CtiGroupRow, type CtiQueueRow } from '../api/ctiRedisApi';
import { type CtiWsDataByHashKey, type CtiqRecord } from '../hooks/useCtiqWebSocket';
import { type DroppedWidget, type TableColumn, type TaskboardDisplaySelection } from '../types/taskboard.types';

/**
 * table-queue/table-group/table-agent/chart-*(큐/그룹/상담사 전용 마스터 위젯) 렌더 헬퍼.
 * TaskCreate.tsx의 현재 팔레트는 이 위젯 타입을 더 이상 생성하지 않지만(레디스 트리 드래그로 대체됨),
 * 이전 버전에서 저장된 레이아웃이 여전히 이 위젯 id를 쓸 수 있어 TaskView.tsx/RollingDisplay.tsx 양쪽에
 * 렌더 호환 코드로 남아있다. 두 파일에 거의 그대로 복붙돼 있던 걸 여기 하나로 모았다 — 동작 변경 없음.
 */

/** 여러 hashKey의 id→record 맵을 하나로 합친다 (큐: 미디어타입별, 상담사: 그룹별로 나뉜 hashKey를 평탄화). */
export function mergeByHashKeys(dataByHashKey: CtiWsDataByHashKey, hashKeys: string[]): Record<string, CtiqRecord> {
  const merged: Record<string, CtiqRecord> = {};
  hashKeys.forEach((hk) => Object.assign(merged, dataByHashKey[hk] ?? {}));
  return merged;
}

/** 정렬 기준 컬럼(sortKey)이 있으면 숫자 기준 정렬 후, limit(미지정 시 20)만큼만 잘라서 반환 */
export function applySortAndLimit(
  rows: Record<string, string | number>[],
  sortConfig?: { key?: string; order?: 'asc' | 'desc'; limit?: number },
): Record<string, string | number>[] {
  let result = rows;
  if (sortConfig?.key) {
    const order = sortConfig.order ?? 'desc';
    const key = sortConfig.key;
    result = [...result].sort((a, b) => {
      const av = Number(a[key]) || 0;
      const bv = Number(b[key]) || 0;
      return order === 'asc' ? av - bv : bv - av;
    });
  }
  if (sortConfig?.limit && sortConfig.limit > 0) return result.slice(0, sortConfig.limit);
  return result;
}

/** 레이아웃들의 위젯에서 table-group/queue/agent가 실제 쓰는 컬럼을 모아 WS 구독 columns로 사용(여러 레이아웃 합집합). */
export function collectTableColumns(allWidgets: DroppedWidget[]) {
  const tableGroupWidgets = allWidgets.filter((w) => w.item.id === 'table-group' && Array.isArray(w.item.tableConfig?.columns));
  const configuredRtsCols = tableGroupWidgets.flatMap((w) =>
    (w.item.tableConfig!.columns as TableColumn[]).filter((c) => !['name', 'agents', 'talk'].includes(c.key)).map((c) => c.key.toUpperCase()),
  );
  const groupColumns = configuredRtsCols.length > 0 ? [...new Set(configuredRtsCols)] : undefined;

  const tableQueueWidgets = allWidgets.filter((w) => w.item.id === 'table-queue' && Array.isArray(w.item.tableConfig?.columns));
  const queueChartWidgets = allWidgets.filter((w) => w.item.id === 'chart-bar-queue' || w.item.id === 'chart-line-trend');
  const queueColumns = [
    ...new Set(
      [
        ...tableQueueWidgets.flatMap((w) =>
          (w.item.tableConfig!.columns as TableColumn[]).map((c) =>
            c.key === 'wait' ? 'RTS_WAIT_CNT' : c.key === 'talk' ? 'SUM_CONN_CNT' : c.key === 'name' ? null : c.key.toUpperCase(),
          ),
        ),
        ...(queueChartWidgets.length > 0 ? ['RTS_WAIT_CNT'] : []),
      ].filter((c): c is string => !!c),
    ),
  ];

  const tableAgentWidgets = allWidgets.filter((w) => w.item.id === 'table-agent' && Array.isArray(w.item.tableConfig?.columns));
  const agentColumns = [
    ...new Set(
      tableAgentWidgets.flatMap((w) =>
        (w.item.tableConfig!.columns as TableColumn[]).map((c) =>
          c.key === 'status' ? 'AGENT_STATUS' : c.key === 'count' ? 'SUM_ANSW_CNT' : c.key === 'name' ? null : c.key.toUpperCase(),
        ),
      ),
    ),
  ].filter((c): c is string => !!c);

  // 미디어타입은 디스플레이 선택값이 아니라 위젯 등록 시점에 고정된 값(item.mediaType) — 위젯별로 합집합
  const groupMediaTypes = [...new Set(tableGroupWidgets.map((w) => w.item.mediaType ?? '0'))];
  const queueMediaTypes = [...new Set([...tableQueueWidgets, ...queueChartWidgets].map((w) => w.item.mediaType ?? '0'))];
  const agentMediaTypes = [...new Set(tableAgentWidgets.map((w) => w.item.mediaType ?? '0'))];

  return {
    groupColumns,
    queueColumns,
    agentColumns,
    configuredRtsCols,
    tableGroupWidgets,
    tableQueueWidgets,
    tableAgentWidgets,
    queueChartWidgets,
    groupMediaTypes,
    queueMediaTypes,
    agentMediaTypes,
  };
}

// ── 실시간 테이블 행 생성 헬퍼 ───────────────────────────────────────────────
export function buildLiveTableRows(
  widgetId: string,
  queueRows: CtiQueueRow[],
  agentRows: CtiAgentRow[],
  groupRows: CtiGroupRow[],
  columns: TableColumn[],
  selection: TaskboardDisplaySelection,
  mediaTypes: string[],
  dataByHashKey: CtiWsDataByHashKey,
  agentHashKeys: string[],
  sortConfig?: { key?: string; order?: 'asc' | 'desc'; limit?: number },
  // 상담그룹은 selection 자체에 필드가 없다 — "데이터소스 관리 등록 데이터"(IC:GROUP:{mediaType} 등록 소스)
  // 선택값에서 해석한 그룹ID 목록을 호출부가 별도로 넘긴다(resolveGroupIdsFromSelection 결과).
  selectedGroupIds: string[] = [],
  // 큐도 등록된 데이터소스(IC:CTIQ:{mediaType})가 있으면 그 선택값을 SoT로 쓴다(resolveQueueIdsFromSelection
  // 결과) — 없으면 호출부가 selection.queueIds(레거시/톱니바퀴 직접선택) 그대로 넘긴다.
  selectedQueueIds: string[] = [],
): Record<string, string | number>[] {
  if (widgetId === 'table-queue') {
    const ctiqWsData = mergeByHashKeys(
      dataByHashKey,
      mediaTypes.map((mt) => `IC:CTIQ:${mt}`),
    );
    const filtered = selectedQueueIds.length > 0 ? queueRows.filter((q) => selectedQueueIds.includes(q.ctiqId)) : queueRows;
    const result = filtered.map((q) => {
      const ws = ctiqWsData[q.ctiqId];
      const row: Record<string, string | number> = {};
      columns.forEach((col) => {
        switch (col.key) {
          case 'name':
            row[col.key] = q.ctiqName;
            break;
          case 'wait':
            row[col.key] = Number(ws?.RTS_WAIT_CNT ?? q.rtsWaitCnt ?? 0);
            break;
          case 'talk':
            row[col.key] = Number(ws?.SUM_CONN_CNT ?? q.totalIn ?? 0);
            break;
          default:
            row[col.key] = ws?.[col.key.toUpperCase()] != null ? String(ws[col.key.toUpperCase()]) : q[col.key] != null ? String(q[col.key]) : '';
        }
      });
      return row;
    });
    return applySortAndLimit(result, sortConfig);
  }
  if (widgetId === 'table-agent') {
    const selectedAgentIds = selection.agentIds ?? [];
    const agentWsData = mergeByHashKeys(dataByHashKey, agentHashKeys);
    const filtered = selectedAgentIds.length > 0 ? agentRows.filter((a) => selectedAgentIds.includes(a.agentId)) : agentRows;
    const result = filtered.map((agent) => {
      const ws = agentWsData[agent.agentId];
      const row: Record<string, string | number> = {};
      columns.forEach((col) => {
        switch (col.key) {
          case 'name':
            row[col.key] = agent.agentName;
            break;
          case 'status':
            row[col.key] = String(ws?.AGENT_STATUS ?? agent.statusName ?? '');
            break;
          case 'count':
            row[col.key] = Number(ws?.SUM_ANSW_CNT ?? agent.talkCount ?? 0);
            break;
          default:
            row[col.key] = ws?.[col.key.toUpperCase()] != null ? String(ws[col.key.toUpperCase()]) : agent[col.key] != null ? String(agent[col.key]) : '';
        }
      });
      return row;
    });
    return applySortAndLimit(result, sortConfig);
  }
  if (widgetId === 'table-group') {
    const filtered = selectedGroupIds.length > 0 ? groupRows.filter((g) => selectedGroupIds.includes(g.groupId)) : groupRows;
    const result = filtered.map((group) => {
      const row: Record<string, string | number> = {};
      columns.forEach((col) => {
        switch (col.key) {
          case 'name':
            row[col.key] = group.groupName;
            break;
          case 'agents':
            row[col.key] = group.agentCount;
            break;
          case 'talk':
            row[col.key] = group.talkCount;
            break;
          default: {
            // IC:GROUP:{mediaType} 해시에서 compositeKey별 값을 조회하여 합산
            row[col.key] = (group.compositeKeys ?? []).reduce((sum, ck) => {
              return sum + mediaTypes.reduce((mSum, mt) => mSum + Number(dataByHashKey[`IC:GROUP:${mt}`]?.[ck]?.[col.key.toUpperCase()] ?? 0), 0);
            }, 0);
            break;
          }
        }
      });
      return row;
    });
    return applySortAndLimit(result, sortConfig);
  }
  return [];
}

// ── 실시간 차트 데이터 생성 헬퍼 ─────────────────────────────────────────────
export function buildLiveChartData(
  widgetId: string,
  queueRows: CtiQueueRow[],
  agentRows: CtiAgentRow[],
  groupRows: CtiGroupRow[],
  ctiqWsData: Record<string, CtiqRecord>,
  selectedQueueIds: string[],
): Array<{ name: string; value: number }> {
  if (widgetId === 'chart-bar-queue' || widgetId === 'chart-line-trend') {
    const hasWs = Object.keys(ctiqWsData).length > 0;
    if (hasWs) {
      const qIds = selectedQueueIds.length > 0 ? selectedQueueIds : Object.keys(ctiqWsData);
      return qIds.slice(0, 8).map((qId) => {
        const q = ctiqWsData[qId] ?? {};
        const name = queueRows.find((r) => r.ctiqId === qId)?.ctiqName ?? qId;
        const value = Number(q.RTS_WAIT_CNT ?? 0);
        return { name, value };
      });
    }
    const filtered = selectedQueueIds.length > 0 ? queueRows.filter((q) => selectedQueueIds.includes(q.ctiqId)) : queueRows;
    return filtered.slice(0, 8).map((q) => ({ name: q.ctiqName, value: q.rtsWaitCnt ?? 0 }));
  }
  if (widgetId === 'chart-pie-agent') {
    const statusMap: Record<string, number> = {};
    agentRows.forEach((agent) => {
      const s = agent.statusName || '알수없음';
      statusMap[s] = (statusMap[s] ?? 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }
  if (widgetId === 'chart-donut-group') {
    return groupRows.slice(0, 6).map((g) => ({ name: g.groupName, value: g.talkCount }));
  }
  return [];
}
