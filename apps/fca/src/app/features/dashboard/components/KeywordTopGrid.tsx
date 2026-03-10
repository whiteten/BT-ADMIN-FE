import type { KeywordTopItem } from '../types/dashboard.types';

interface KeywordTopGridProps {
  data?: KeywordTopItem[];
}

export default function KeywordTopGrid({ data }: KeywordTopGridProps) {
  return <div className="h-full w-full overflow-auto p-4 text-sm text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</div>;
}
