import type { ReactNode } from 'react';
import { useBreadcrumbStore } from '@/shared-store';
import { useDroppable } from '@dnd-kit/core';

type DroppableClusterGroupProps = {
  clusterGrpId: number;
  children: ReactNode;
};

export default function DroppableClusterGroup({ clusterGrpId, children }: DroppableClusterGroupProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cluster-${clusterGrpId}`,
    data: { clusterGrpId },
  });

  return (
    <div ref={setNodeRef} className={`rounded-lg p-5 transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-[var(--color-bt-primary)] ring-dashed' : 'bg-white bt-shadow'}`}>
      {children}
    </div>
  );
}
