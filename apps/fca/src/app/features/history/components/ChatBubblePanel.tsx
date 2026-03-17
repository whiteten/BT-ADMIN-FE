import React, { useState } from 'react';
import { Card, Empty, Spin, Tag, Typography } from 'antd';
import { Bot, Info, User } from 'lucide-react';
import { useGetNluAnalysis } from '../hooks/useHistoryQueries';
import type { ChatBubbleDto } from '../types/history.types';
import { cn } from '@/lib/utils';

const { Text } = Typography;

interface ChatBubblePanelProps {
  bubbles: ChatBubbleDto[];
  isLoading?: boolean;
  ucid?: string;
  nextHop?: number;
  cdrPkey?: number;
}

const ChatBubblePanel: React.FC<ChatBubblePanelProps> = ({ bubbles, isLoading, ucid, nextHop, cdrPkey }) => {
  const [selectedBubbleSeq, setSelectedBubbleSeq] = useState<number | null>(null);

  const selectedRowId = ucid ? `${ucid}_${nextHop}_${cdrPkey}` : null;

  const { data: nluData, isLoading: isNluLoading } = useGetNluAnalysis({
    params: { ucid, nextHop, cdrPkey, seq: selectedBubbleSeq },
    queryOptions: { enabled: !!selectedRowId && selectedBubbleSeq !== null },
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

  if (bubbles.length === 0) {
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {bubbles.map((bubble) => {
          const isBot = bubble.speakerType.includes('IVR');
          const isSelected = selectedBubbleSeq === bubble.seq;

          return (
            <div
              key={`${bubble.seq}-${bubble.startDelta}`}
              className={cn('flex w-full gap-2 cursor-pointer transition-all hover:opacity-90', isBot ? 'justify-start' : 'justify-end')}
              onClick={() => setSelectedBubbleSeq(bubble.seq)}
            >
              {isBot && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                  <Bot className="size-5 text-blue-600" />
                </div>
              )}

              <div className={cn('flex flex-col max-w-[75%]', isBot ? 'items-start' : 'items-end')}>
                <span className="text-[10px] text-gray-400 mb-1 px-1">
                  {isBot ? 'IVR BOT' : 'CUSTOMER'} ({bubble.startDelta}s)
                </span>

                <div className="space-y-1">
                  {bubble.items.map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-2 rounded-lg text-sm bt-shadow-sm border',
                        isBot ? 'bg-white border-gray-100 text-gray-800 rounded-tl-none' : 'bg-blue-600 text-white border-blue-500 rounded-tr-none',
                        isSelected && 'ring-2 ring-blue-300 ring-offset-1',
                      )}
                    >
                      <div>{item.text}</div>
                      {(item.subFlowName || item.itemName) && (
                        <div className={cn('mt-1 pt-1 border-t text-[10px]', isBot ? 'border-gray-100 text-gray-400' : 'border-blue-500 text-blue-100')}>
                          {item.subFlowName && <span>[{item.subFlowName}]</span>}
                          {item.itemName && <span className="ml-1">{item.itemName}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {!isBot && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <User className="size-5 text-gray-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* NLU 분석 상세 영역 */}
      <div className={cn('bg-white border-t transition-all duration-300 overflow-hidden shrink-0', selectedBubbleSeq ? 'h-[200px]' : 'h-0')}>
        {isNluLoading ? (
          <div className="h-full flex items-center justify-center">
            <Spin size="small" />
          </div>
        ) : nluData ? (
          <div className="p-3 h-full flex flex-col gap-2">
            <div className="flex items-center gap-2 border-b pb-1">
              <Info className="size-4 text-blue-500" />
              <span className="text-xs font-bold">NLU 분석 결과 (Seq: {selectedBubbleSeq})</span>
              <button className="ml-auto text-xs text-gray-400 hover:text-gray-600" onClick={() => setSelectedBubbleSeq(null)}>
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
