import { EXECUTION_CALL_FAILURE_COLUMNS, EXECUTION_PROCESS_STATUS_COLUMNS } from '../constants/executionManagementConstants';
import type { CampaignExecutionItem } from '../types';

const formatCount = (value: number) => value.toLocaleString();

type StatusColumnGroupProps = {
  title: string;
  titleClassName: string;
  columns: readonly { label: string; field: keyof CampaignExecutionItem }[];
  item: CampaignExecutionItem;
  flexRatio: number;
  columnMinWidth: number;
};

function StatusColumnGroup({ title, titleClassName, columns, item, flexRatio, columnMinWidth }: StatusColumnGroupProps) {
  return (
    <div className="min-w-0" style={{ flex: flexRatio }}>
      <div className={`px-1 py-1 text-center text-[10px] font-semibold ${titleClassName}`}>{title}</div>
      <div className="grid border-t border-gray-200" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(${columnMinWidth}px, 1fr))` }}>
        {columns.map((column) => (
          <div key={column.field} className="border-r border-gray-200 px-0.5 py-1 text-center last:border-r-0">
            <div className="break-keep text-[9px] leading-[1.15] text-gray-500" title={column.label}>
              {column.label}
            </div>
            <div className="mt-0.5 text-[11px] font-medium tabular-nums text-gray-800">{formatCount(item[column.field] as number)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ExecutionCardStatusGridProps {
  item: CampaignExecutionItem;
}

export default function ExecutionCardStatusGrid({ item }: ExecutionCardStatusGridProps) {
  return (
    <div className="overflow-x-auto rounded border border-gray-200 bg-white [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-[32rem]">
        <StatusColumnGroup title="처리상태" titleClassName="bg-[#405189] text-white" columns={EXECUTION_PROCESS_STATUS_COLUMNS} item={item} flexRatio={5} columnMinWidth={34} />
        <StatusColumnGroup
          title="통화실패"
          titleClassName="border-t-2 border-[#405189] bg-white text-[#405189]"
          columns={EXECUTION_CALL_FAILURE_COLUMNS}
          item={item}
          flexRatio={8}
          columnMinWidth={42}
        />
      </div>
    </div>
  );
}
