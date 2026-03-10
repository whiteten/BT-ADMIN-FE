import type { IntentTopItem } from '../types/dashboard.types';

interface IntentTopGridProps {
  data?: IntentTopItem[];
}

export default function IntentTopGrid({ data }: IntentTopGridProps) {
  return <div className="h-full w-full overflow-auto p-4 text-sm text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</div>;
}
