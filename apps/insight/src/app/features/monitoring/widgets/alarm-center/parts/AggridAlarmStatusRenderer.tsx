import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';

/**
 * AG-Grid 장애 복구상태 배지 셀 렌더러.
 *
 * 복구 여부 = `ERR_REPAIR_TIME` 존재(AS-IS errorStatus 규약). 복구시간이 채워졌으면 복구 완료.
 * 미복구이면서 위험(level≥2)인 행은 좌측 dot 에 `bt-pulse` 관제 모션을 준다.
 *
 * `params.data` 에서 repairTime/level 만 느슨하게 읽는다.
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

/** 등급(0~3) → 색. AggridAlarmLevelRenderer 와 동일 팔레트(헬스보드 정렬)로 통일. */
const LEVEL_HEX: Record<number, string> = {
  0: '#0a8a4a', // 정상·녹
  1: '#b7791f', // 주의·노랑
  2: '#d9480f', // 경고·주황
  3: '#c92a2a', // 위험·빨강
};

const AggridAlarmStatusRenderer: React.FC<ICellRendererParams> = (params) => {
  const d = (params.data ?? {}) as AlarmStatusData;
  // 컬러 텍스트 + 10%(1A) 배경, rounded-md soft 톤. 색은 등급 배지(AlarmLevelRenderer)와 동일 팔레트로 통일.
  if (isResolved(d.repairTime)) {
    const hex = '#0a8a4a'; // 복구 완료 = 정상 녹색(등급 0 색과 동일)
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium leading-none" style={{ color: hex, background: `${hex}1A` }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        복구
      </span>
    );
  }
  // 미복구 — 등급별 4색 그대로(주의/경고/위험). 경고·위험(level≥2) dot 에 관제 모션(bt-pulse).
  const raw = Number(d.level);
  const lv = Number.isFinite(raw) ? Math.max(0, Math.min(3, Math.round(raw))) : 0;
  const hex = LEVEL_HEX[lv];
  const danger = lv >= 2;
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium leading-none" style={{ color: hex, background: `${hex}1A` }}>
      <span className={`h-1.5 w-1.5 rounded-full ${danger ? 'bt-pulse' : ''}`} style={{ background: hex }} />
      미복구
    </span>
  );
};

export default AggridAlarmStatusRenderer;
