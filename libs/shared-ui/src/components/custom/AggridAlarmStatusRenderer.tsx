import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';

/**
 * AG-Grid 장애 복구상태 배지 셀 렌더러 (string 키: `alarmStatusRenderer`).
 *
 * 복구 여부 = `ERR_REPAIR_TIME` 존재(AS-IS errorStatus 규약). 복구시간이 채워졌으면 복구 완료.
 * 미복구이면서 위험(level≥2)인 행은 좌측 dot 에 `bt-pulse` 관제 모션을 준다.
 *
 * shared-ui 자족형 — `params.data` 에서 repairTime/level 만 느슨하게 읽는다(앱 타입 역참조 금지).
 */
interface AlarmStatusData {
  repairTime?: string | null;
  level?: number | string;
}

/** 복구시간이 유효하게 채워졌는지(0/공백 placeholder 제외). */
function isResolved(t?: string | null): boolean {
  const s = (t ?? '').trim();
  return s.length > 0 && !/^0+$/.test(s);
}

const AggridAlarmStatusRenderer: React.FC<ICellRendererParams> = (params) => {
  const d = (params.data ?? {}) as AlarmStatusData;
  // FCA 상태 배지와 동일한 soft 톤(컬러 텍스트 + 10%(1A) 배경, rounded-md).
  if (isResolved(d.repairTime)) {
    const hex = '#0AB39C';
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium leading-none" style={{ color: hex, background: `${hex}1A` }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        복구
      </span>
    );
  }
  const danger = (Number(d.level) || 0) >= 2;
  const hex = danger ? '#F06548' : '#F7B84B';
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium leading-none" style={{ color: hex, background: `${hex}1A` }}>
      <span className={`h-1.5 w-1.5 rounded-full ${danger ? 'bt-pulse' : ''}`} style={{ background: hex }} />
      미복구
    </span>
  );
};

export default AggridAlarmStatusRenderer;
