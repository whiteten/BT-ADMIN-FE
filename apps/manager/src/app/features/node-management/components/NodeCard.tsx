import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge, Tag } from 'antd';
import { GripVertical } from 'lucide-react';
import { type ClusterGroup, NAT_OPTION_COLORS, NAT_OPTION_LABELS, type NodeListItem } from '../types/node.types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type NodeCardProps = NodeListItem & {
  clusterGroups?: ClusterGroup[];
  onDetail?: (nodeId: number) => void;
  onSettings?: (nodeId: number) => void;
  onClusterConfig?: (nodeId: number) => void;
  onMoveCluster?: (nodeId: number, clusterGrpId: number | null, clusterGrpName: string) => void;
  onDelete?: (nodeId: number, nodeName: string) => void;
};

export default function NodeCard({
  nodeId,
  nodeName,
  nodeAlias,
  regionNum,
  natOption,
  msGroupId,
  msGroupName,
  clusterGrpId,
  clusterGrpName,
  tenantNames,
  clusterGroups,
  onDetail,
  onSettings,
  onClusterConfig,
  onMoveCluster,
  onDelete,
}: NodeCardProps) {
  const isClustered = clusterGrpId != null;
  const rtpLabel = NAT_OPTION_LABELS[natOption ?? 0] ?? '미사용';
  const rtpColor = NAT_OPTION_COLORS[natOption ?? 0] ?? '#868e96';

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `node-${nodeId}`,
    data: { nodeId, nodeName, clusterGrpId },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const extra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dark" align="end">
        <DropdownMenuItem onClick={() => onDetail?.(nodeId)} className="hover:cursor-pointer">
          테넌트 할당 설정
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSettings?.(nodeId)} className="hover:cursor-pointer">
          노드 설정
        </DropdownMenuItem>
        {isClustered && (
          <DropdownMenuItem onClick={() => onClusterConfig?.(nodeId)} className="hover:cursor-pointer">
            클러스터 설정
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="hover:cursor-pointer">그룹 이동</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {clusterGroups
              ?.filter((g) => g.clusterGrpId !== clusterGrpId)
              .map((group) => (
                <DropdownMenuItem key={group.clusterGrpId} onClick={() => onMoveCluster?.(nodeId, group.clusterGrpId, group.clusterGrpName)} className="hover:cursor-pointer">
                  {group.clusterGrpName}
                </DropdownMenuItem>
              ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const hasTenants = tenantNames && tenantNames.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-4 cursor-pointer transition-colors ${
        isDragging ? 'border-[var(--color-bt-primary)] shadow-lg' : 'border-[#e9ecef] hover:border-[var(--color-bt-primary)]'
      }`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-radix-collection-item]') || target.closest('[role="menu"]') || target.closest('.cursor-grab')) return;
        onDetail?.(nodeId);
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* 드래그 핸들 */}
          <span className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500" {...listeners} {...attributes}>
            <GripVertical className="w-4 h-4" />
          </span>
          <Badge status="success" />
          <span className="font-semibold text-[15px] text-gray-800 cursor-pointer hover:text-[var(--color-bt-primary)]" onClick={() => onDetail?.(nodeId)}>
            {nodeName}
          </span>
        </div>
        {extra}
      </div>
      <div className="space-y-0.5 text-[12px] text-[#868e96] mb-3">
        <div>
          <span className="text-[#adb5bd] mr-1">노드ID</span>
          {nodeId}
        </div>
        <div>
          <span className="text-[#adb5bd] mr-1">약칭</span>
          {nodeAlias}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <Tag color={rtpColor} className="!m-0 !text-xs">
          RTP:{rtpLabel}
        </Tag>
        {msGroupId != null && msGroupName ? (
          <Tag color="default" className="!m-0 !text-xs">
            MS:{msGroupName}
          </Tag>
        ) : (
          <Tag color="red" className="!m-0 !text-xs !font-semibold">
            ⚠ MS 미지정
          </Tag>
        )}
      </div>
      <div className="flex flex-wrap gap-1 pt-2 border-t border-[#f1f3f5]">
        {hasTenants ? (
          tenantNames.map((name) => (
            <Tag key={name} color="blue" className="!m-0 !text-xs cursor-pointer" onClick={() => onDetail?.(nodeId)}>
              {name}
            </Tag>
          ))
        ) : (
          <span className="text-xs text-[#ced4da]">할당된 테넌트 없음</span>
        )}
      </div>
    </div>
  );
}
