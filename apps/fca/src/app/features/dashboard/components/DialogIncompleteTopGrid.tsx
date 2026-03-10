import type { DialogIncompleteTopItem } from '../types/dashboard.types';

interface DialogIncompleteTopGridProps {
  data?: DialogIncompleteTopItem[];
}

export default function DialogIncompleteTopGrid({ data }: DialogIncompleteTopGridProps) {
  return <div className="h-full w-full overflow-auto p-4 text-sm text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</div>;
}
