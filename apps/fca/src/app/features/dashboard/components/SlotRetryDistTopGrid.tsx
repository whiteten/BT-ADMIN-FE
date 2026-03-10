import type { SlotRetryDistTopItem } from '../types/dashboard.types';

interface SlotRetryDistTopGridProps {
  data?: SlotRetryDistTopItem[];
}

export default function SlotRetryDistTopGrid({ data }: SlotRetryDistTopGridProps) {
  return <div className="h-full w-full overflow-auto p-4 text-sm text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</div>;
}
