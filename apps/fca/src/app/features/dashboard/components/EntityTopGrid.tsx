import type { EntityTopItem } from '../types/dashboard.types';

interface EntityTopGridProps {
  data?: EntityTopItem[];
}

export default function EntityTopGrid({ data }: EntityTopGridProps) {
  return <div className="h-full w-full overflow-auto p-4 text-sm text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</div>;
}
