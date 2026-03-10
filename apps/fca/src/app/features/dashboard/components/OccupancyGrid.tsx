import type { OccupancyItem } from '../types/dashboard.types';

interface OccupancyGridProps {
  data?: OccupancyItem[];
}

export default function OccupancyGrid({ data }: OccupancyGridProps) {
  return <div className="h-full w-full overflow-auto p-4 text-sm text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</div>;
}
