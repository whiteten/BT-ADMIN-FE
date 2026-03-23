import { forwardRef, useImperativeHandle, useState } from 'react';
import { Descriptions, Drawer, Spin, Tag } from 'antd';
import { Info } from 'lucide-react';
import TrackingDialogView from '../../tracking/components/TrackingDialogView';
import type { TrackingFlowItem } from '../../tracking/types/tracking.types';
import { useGetBubbles, useGetNluAnalysis } from '../hooks/useHistoryQueries';
import type { DialogHistoryListItem } from '../types/history.types';
import { cn } from '@/lib/utils';

export interface DialogHistoryDrawerRef {
  open: (row: DialogHistoryListItem) => void;
  close: () => void;
}

const DialogHistoryDrawer = forwardRef<DialogHistoryDrawerRef>((_, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<DialogHistoryListItem | null>(null);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);

  useImperativeHandle(ref, () => ({
    open: (row: DialogHistoryListItem) => {
      setSelectedRow(row);
      setSelectedSeq(null);
      setIsOpen(true);
    },
    close: () => {
      setIsOpen(false);
      setSelectedRow(null);
      setSelectedSeq(null);
    },
  }));

  const handleClose = () => {
    setIsOpen(false);
    setSelectedRow(null);
    setSelectedSeq(null);
  };

  const { data: bubbleData, isLoading: isBubbleLoading } = useGetBubbles({
    params: {
      ucid: selectedRow?.ucid,
      nextHop: selectedRow?.nextHop,
      cdrPkey: selectedRow?.cdrPkey,
    },
    queryOptions: { enabled: !!selectedRow && isOpen },
  });

  const { data: nluData, isLoading: isNluLoading } = useGetNluAnalysis({
    params: {
      ucid: selectedRow?.ucid,
      nextHop: selectedRow?.nextHop,
      cdrPkey: selectedRow?.cdrPkey,
      seq: selectedSeq,
    },
    queryOptions: { enabled: !!selectedRow && selectedSeq !== null },
  });

  const items: TrackingFlowItem[] = bubbleData ?? [];

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="대화 상세"
      width={640}
      destroyOnHidden
      styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        {/* 세션 정보 */}
        {selectedRow && (
          <div className="flex-shrink-0">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="시나리오명" span={2}>
                {selectedRow.serviceName}
              </Descriptions.Item>
              <Descriptions.Item label="UCID" span={2}>
                <span className="font-mono text-xs">{selectedRow.ucid}</span>
              </Descriptions.Item>
              <Descriptions.Item label="발신번호">{selectedRow.ani}</Descriptions.Item>
              <Descriptions.Item label="서비스시작">{selectedRow.svcStartTime}</Descriptions.Item>
            </Descriptions>
          </div>
        )}

        {/* 대화 흐름 */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {isBubbleLoading ? (
            <div className="flex justify-center py-6">
              <Spin />
            </div>
          ) : (
            <TrackingDialogView items={items} onItemClick={(item) => setSelectedSeq(item.seq)} selectedSeq={selectedSeq} />
          )}
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
    </Drawer>
  );
});

DialogHistoryDrawer.displayName = 'DialogHistoryDrawer';

export default DialogHistoryDrawer;
