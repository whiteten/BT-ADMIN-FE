/**
 * 2층 노드 카드 가로 슬라이더 (클러스터별 그룹 박스로 묶음).
 *
 * IPRON 표준 카드 슬라이더 패턴(AdnList §박스2 계승): cardScrollRef + 좌우 ChevronLeft/Right 화살표
 *  + 카드 클릭 시 scrollIntoView 중앙 정렬. 단 노드는 클러스터 단위로 묶어 그룹 라벨/박스로 구분.
 *  - 카드 = DnNodeCard(단일 클릭 → 사이드바). 카드 폭 300px(텍스트 잘림 0).
 *  - "전체" 카드 없음(노드 집합 — 1층 KPI 가 전역 집계 역할). 노드 탭/⇅ swap 없음(Type D 변형).
 */
import { useRef } from 'react';
import { Button, Empty } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DnNodeCard from './DnNodeCard';
import type { ClusterBucket } from '../utils/buildModels';

interface DnNodeCardSliderProps {
  buckets: ClusterBucket[];
  selectedNodeId: number | null;
  onSelectNode: (nodeId: number, el: HTMLElement) => void;
  isEmpty: boolean;
}

export default function DnNodeCardSlider({ buckets, selectedNodeId, onSelectNode, isEmpty }: DnNodeCardSliderProps) {
  const cardScrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-white bt-shadow flex flex-shrink-0 flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <Button
          type="text"
          icon={<ChevronLeft className="size-5" />}
          onClick={() => cardScrollRef.current?.scrollBy({ left: -340, behavior: 'smooth' })}
          className="!h-8 !w-8 !flex-shrink-0 !p-0"
        />
        <div ref={cardScrollRef} className="flex flex-1 items-stretch gap-4 overflow-x-auto px-1 py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {isEmpty ? (
            <div className="flex min-h-[150px] flex-1 flex-col items-center justify-center gap-2 text-gray-400">
              <Empty description={false} styles={{ image: { height: 40 } }} />
              <span className="text-sm">표시할 PBX 노드가 없습니다</span>
            </div>
          ) : (
            buckets.map((bucket, bi) => (
              <div
                key={bucket.clusterGrpId ?? `solo-${bi}`}
                className={
                  bucket.clusterGrpId != null
                    ? 'flex flex-shrink-0 flex-col gap-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/60 p-2'
                    : 'flex flex-shrink-0 flex-col gap-1.5'
                }
              >
                {bucket.clusterGrpId != null && (
                  <span className="px-0.5 text-[11px] font-semibold text-gray-500">{bucket.clusterGrpName ?? `클러스터 ${bucket.clusterGrpId}`}</span>
                )}
                <div className="flex items-stretch gap-3">
                  {bucket.cards.map((card) => (
                    <DnNodeCard
                      key={card.nodeId}
                      model={card}
                      selected={selectedNodeId === card.nodeId}
                      onClick={(e) => onSelectNode(card.nodeId, e.currentTarget as HTMLElement)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <Button
          type="text"
          icon={<ChevronRight className="size-5" />}
          onClick={() => cardScrollRef.current?.scrollBy({ left: 340, behavior: 'smooth' })}
          className="!h-8 !w-8 !flex-shrink-0 !p-0"
        />
      </div>
    </div>
  );
}
