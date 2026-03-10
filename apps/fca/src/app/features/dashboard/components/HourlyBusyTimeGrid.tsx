import type { HourlyBusyTimeItem } from '../types/dashboard.types';

interface HourlyBusyTimeGridProps {
  data?: HourlyBusyTimeItem[];
}

export default function HourlyBusyTimeGrid({ data }: HourlyBusyTimeGridProps) {
  return <div className="h-full w-full overflow-auto p-4 text-sm text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</div>;
}
