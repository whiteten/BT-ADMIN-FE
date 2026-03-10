import type { IntentCheckFailTopItem } from '../types/dashboard.types';

interface IntentCheckFailTopGridProps {
  data?: IntentCheckFailTopItem[];
}

export default function IntentCheckFailTopGrid({ data }: IntentCheckFailTopGridProps) {
  return <div className="h-full w-full overflow-auto p-4 text-sm text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</div>;
}
