/**
 * 클러스터 그룹 박스 커스텀 노드 (react-flow nodeTypes 'dnCluster').
 *
 * 목업 renderClusterBoxes() 의 점선 rect + 라벨을 react-flow group 노드로 대체(PLAN-FE §7.3).
 * 자식 서버 카드는 parentId 로 이 노드에 종속(buildGraph). 빈 그룹은 buildGraph 가 미생성.
 * 읽기 전용(selectable:false, draggable:false) — 클릭/이동 없음.
 */
import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';

interface DnClusterData {
  label: string;
  [key: string]: unknown;
}

function DnClusterGroupNodeBase({ data }: NodeProps) {
  const d = data as DnClusterData;
  return (
    <div className="pointer-events-none h-full w-full rounded-xl border-[1.5px] border-dashed border-indigo-300 bg-indigo-50/50">
      <span className="absolute left-2.5 top-1 text-[10px] font-semibold text-indigo-400">{d.label}</span>
    </div>
  );
}

export default memo(DnClusterGroupNodeBase);
