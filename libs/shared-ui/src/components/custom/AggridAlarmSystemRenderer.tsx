import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';

/**
 * AG-Grid 장애 시스템 셀 렌더러 (string 키: `alarmSystemRenderer`).
 *
 * 시스템 표시명(`SYSTEM_NAME`) + 옅은 `(시스템ID)`. 이름이 없으면 "SYS {id}" 로 폴백한다.
 * 노드(NODE_NAME)는 별도 `노드` 컬럼에서 표시한다.
 * shared-ui 자족형 — `params.data` 에서 systemName/systemId 만 느슨하게 읽는다(앱 타입 역참조 금지).
 */
interface AlarmSystemData {
  systemName?: string;
  systemId?: string;
}

const AggridAlarmSystemRenderer: React.FC<ICellRendererParams> = (params) => {
  const d = (params.data ?? {}) as AlarmSystemData;
  const name = (d.systemName ?? '').trim();
  const id = (d.systemId ?? '').trim();
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="truncate font-semibold" title={name || id}>
        {name || `SYS ${id}`}
      </span>
      {name && id && (
        <span className="shrink-0 tabular-nums text-[10.5px]" style={{ color: '#6a6f78' }}>
          ({id})
        </span>
      )}
    </span>
  );
};

export default AggridAlarmSystemRenderer;
