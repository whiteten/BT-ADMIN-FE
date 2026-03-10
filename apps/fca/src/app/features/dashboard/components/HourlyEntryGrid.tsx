import type { HourlyEntryItem } from '../types/dashboard.types';

interface HourlyEntryGridProps {
  data?: HourlyEntryItem[];
}

export default function HourlyEntryGrid({ data }: HourlyEntryGridProps) {
  return <div className="h-full w-full overflow-auto p-4 text-sm text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</div>;
}
