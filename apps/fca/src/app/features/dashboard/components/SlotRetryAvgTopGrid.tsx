import type { SlotRetryAvgTopItem } from '../types/dashboard.types';

interface SlotRetryAvgTopGridProps {
  data?: SlotRetryAvgTopItem[];
}

export default function SlotRetryAvgTopGrid({ data }: SlotRetryAvgTopGridProps) {
  return <div className="h-full w-full overflow-auto p-4 text-sm text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</div>;
}
