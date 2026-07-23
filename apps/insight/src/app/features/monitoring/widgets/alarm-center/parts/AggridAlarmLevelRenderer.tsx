import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';

/**
 * AG-Grid 장애 등급 배지 셀 렌더러.
 *
 * ERR_LEVEL(0~3) 숫자를 색상 캡슐 배지로 표시. 알람센터 장애 등급 컬럼에서 사용한다.
 * AS-IS 확정 등급(1/2/3)을 BT-ADMIN 표기 1=주의 / 2=경고 / 3=위험 으로 노출(0=정상).
 *
 * 컬럼 valueGetter 가 등급 숫자를 반환하면 `params.value` 로 받는다.
 */
const LEVEL_BADGE: Record<number, { label: string; hex: string }> = {
  0: { label: '정상', hex: '#0a8a4a' },
  1: { label: '주의', hex: '#b7791f' }, // notice·노랑
  2: { label: '경고', hex: '#d9480f' }, // warning·주황
  3: { label: '위험', hex: '#c92a2a' }, // danger·빨강
};

const AggridAlarmLevelRenderer: React.FC<ICellRendererParams> = (params) => {
  const raw = Number(params.value);
  const lv = Number.isFinite(raw) ? Math.max(0, Math.min(3, Math.round(raw))) : 0;
  const m = LEVEL_BADGE[lv];
  // FCA 상태 배지(TrainStatusBadge 등)와 동일한 soft 톤: 컬러 텍스트 + 10%(1A) 배경, rounded-md.
  return (
    <span className="inline-flex h-5 items-center justify-center rounded-md px-1.5 text-[11px] font-medium leading-none" style={{ color: m.hex, background: `${m.hex}1A` }}>
      {m.label}
    </span>
  );
};

export default AggridAlarmLevelRenderer;
