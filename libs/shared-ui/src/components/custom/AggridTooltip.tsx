import type { CustomTooltipProps } from 'ag-grid-react';

export default function AggridTooltip(props: CustomTooltipProps) {
  const { value } = props;
  return (
    <div className="ag-tooltip" style={{ width: '250px', whiteSpace: 'pre-line' }}>
      {value}
    </div>
  );
}
