import type { SlotIncompleteTopItem } from '../types/dashboard.types';

interface SlotIncompleteTopGridProps {
  data?: SlotIncompleteTopItem[];
}

export default function SlotIncompleteTopGrid({ data }: SlotIncompleteTopGridProps) {
  return <div className="h-full w-full overflow-auto p-4 text-sm text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</div>;
}
