import React, { useState } from 'react';
import { Empty, Spin, Tag } from 'antd';
import { Info } from 'lucide-react';
import TrackingDialogView from '../../tracking/components/TrackingDialogView';
import type { TrackingFlowItem } from '../../tracking/types/tracking.types';
import { useGetNluAnalysis } from '../hooks/useHistoryQueries';
import { cn } from '@/lib/utils';

interface ChatBubblePanelProps {
  items: TrackingFlowItem[];
  isLoading?: boolean;
  ucid?: string;
  nextHop?: number;
  cdrPkey?: number;
}

const ChatBubblePanel: React.FC<ChatBubblePanelProps> = ({ items, isLoading, ucid, nextHop, cdrPkey }) => {
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);

  const selectedRowId = ucid ? `${ucid}_${nextHop}_${cdrPkey}` : null;

  const { data: nluData, isLoading: isNluLoading } = useGetNluAnalysis({
    params: { ucid, nextHop, cdrPkey, seq: selectedSeq },
    queryOptions: { enabled: !!selectedRowId && selectedSeq !== null },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin tip="대화 내용을 불러오는 중..." />
      </div>
    );
  }

  if (!ucid) {
    return <div className="flex items-center justify-center h-full text-gray-400 italic">목록에서 대화를 선택해 주세요.</div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Empty description="대화 내용이 없습니다." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] border-l">
      <div className="p-3 bg-white border-b font-medium text-sm flex items-center justify-between">
        <span>대화 상세 내역</span>
        <span className="text-xs text-gray-400 font-normal">{ucid}</span>
      </div>

      {/* 대화 버블 (TrackingDialogView 공용 컴포넌트) */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <TrackingDialogView items={items} onItemClick={(item) => setSelectedSeq(item.seq)} selectedSeq={selectedSeq} />
      </div>

      {/* NLU 분석 상세 영역 */}
      <div className={cn('bg-white border-t transition-all duration-300 overflow-hidden shrink-0', selectedSeq != null ? 'h-[200px]' : 'h-0')}>
        {isNluLoading ? (
          <div className="h-full flex items-center justify-center">
            <Spin size="small" />
          </div>
        ) : nluData ? (
          <div className="p-3 h-full flex flex-col gap-2">
            <div className="flex items-center gap-2 border-b pb-1">
              <Info className="size-4 text-blue-500" />
              <span className="text-xs font-bold">NLU 분석 결과 (Seq: {selectedSeq})</span>
              <button className="ml-auto text-xs text-gray-400 hover:text-gray-600" onClick={() => setSelectedSeq(null)}>
                닫기
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              <div className="flex items-center gap-2">
                <Tag color="blue" className="m-0 text-[10px]">
                  INTENT
                </Tag>
                <span className="text-xs font-medium">{nluData.intent?.name}</span>
                <span className="text-[10px] text-gray-400">({Math.round(nluData.intent?.confidence * 100)}%)</span>
              </div>

              <div className="space-y-1">
                <Tag color="green" className="m-0 text-[10px]">
                  ENTITIES
                </Tag>
                <div className="flex flex-wrap gap-1">
                  {nluData.entities?.length > 0 ? (
                    nluData.entities.map((ent: any, i: number) => (
                      <Tag key={i} className="m-0 text-[10px] bg-gray-50">
                        {ent.name}: <span className="text-blue-600">{ent.text}</span> ({ent.value})
                      </Tag>
                    ))
                  ) : (
                    <span className="text-[10px] text-gray-400">추출된 개체명 없음</span>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-1.5 rounded text-[10px] font-mono text-gray-500 break-all">{nluData.rawResult}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ChatBubblePanel;
