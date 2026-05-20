import type { PanelDetail } from '../../../report/types';

interface PanelKpiCardProps {
  panel: PanelDetail;
  reportId: number;
}

export default function PanelKpiCard({ panel }: PanelKpiCardProps) {
  const valueField = panel.fieldMap.find((f) => f.slotType === 'VALUE');

  return (
    <div className="flex flex-col items-start gap-1 p-2 h-full">
      <div className="text-[11px] text-bt-fg-muted">{panel.title}</div>
      <div className="text-[28px] font-bold font-mono text-bt-fg">—</div>
      <div className="text-[10px] text-bt-fg-muted">{valueField ? `${valueField.fieldName} · ${valueField.aggFunc ?? 'SUM'}` : '지표 미설정'}</div>
    </div>
  );
}
