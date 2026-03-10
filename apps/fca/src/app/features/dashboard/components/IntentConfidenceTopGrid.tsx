import type { IntentConfidenceTopItem } from '../types/dashboard.types';

interface IntentConfidenceTopGridProps {
  data?: IntentConfidenceTopItem[];
}

export default function IntentConfidenceTopGrid({ data }: IntentConfidenceTopGridProps) {
  return <div className="h-full w-full overflow-auto p-4 text-sm text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</div>;
}
