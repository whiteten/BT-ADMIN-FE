import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Descriptions, Drawer, Spin, Tag, message } from 'antd';
import { Brain, Copy, Info } from 'lucide-react';
import TrackingDialogView from '../../tracking/components/TrackingDialogView';
import type { NluAnalysisItem, TrackingFlowItem } from '../../tracking/types/tracking.types';
import { useGetBubbles } from '../hooks/useHistoryQueries';
import type { CallbotHistoryListItem } from '../types/history.types';
import { cn } from '@/lib/utils';

/** HTTP/HTTPS 환경 모두에서 동작하는 클립보드 복사 */
function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  } finally {
    document.body.removeChild(textarea);
  }
}

/** confidence 값 기반 상태 색상 결정 */
function getConfidenceColor(item: NluAnalysisItem): string {
  if (item.isSuccess === 1) return 'bg-green-500';
  if (item.isCheck === 1) return 'bg-amber-400';
  if (item.isFailed === 1) return 'bg-red-500';
  return 'bg-gray-400';
}

/** confidence 값 기반 텍스트 색상 */
function getConfidenceTextColor(item: NluAnalysisItem): string {
  if (item.isSuccess === 1) return 'text-green-600';
  if (item.isCheck === 1) return 'text-amber-500';
  if (item.isFailed === 1) return 'text-red-500';
  return 'text-gray-500';
}

/** NLU 카드 단일 항목 */
function NluCard({ seq, nluResults, isSelected }: { seq: number; nluResults: NluAnalysisItem[]; isSelected: boolean }) {
  return (
    <div className={cn('rounded-lg border p-3 space-y-2 transition-all', isSelected ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-300' : 'border-gray-200 bg-white')}>
      {nluResults.map((nlu) => (
        <div key={nlu.hop} className="space-y-1.5">
          {nluResults.length > 1 && <div className="text-[10px] text-gray-400 font-medium">HOP {nlu.hop}</div>}

          {/* 발화 원문 */}
          {nlu.questionText && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 break-all">
              <span className="text-[10px] text-gray-400 mr-1">발화:</span>
              {nlu.questionText}
            </div>
          )}

          {/* INTENT + CONFIDENCE */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tag color="blue" className="m-0 text-[10px]">
              INTENT
            </Tag>
            <span className="text-xs font-medium">{nlu.intent ?? '-'}</span>

            {nlu.confidence != null && (
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', getConfidenceColor(nlu))} style={{ width: `${Math.min(nlu.confidence, 100)}%` }} />
                </div>
                <span className={cn('text-[10px] font-medium', getConfidenceTextColor(nlu))}>{nlu.confidence}%</span>
              </div>
            )}
          </div>

          {/* 임계치 */}
          {(nlu.threshold != null || nlu.thresholdFail != null) && (
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              {nlu.threshold != null && (
                <span>
                  성공: <span className="text-green-600 font-medium">{nlu.threshold}</span>
                </span>
              )}
              {nlu.thresholdFail != null && (
                <span>
                  실패: <span className="text-red-500 font-medium">{nlu.thresholdFail}</span>
                </span>
              )}
            </div>
          )}

          {/* 엔티티 */}
          {nlu.isEntity === 1 && (
            <div className="space-y-1">
              <Tag color="green" className="m-0 text-[10px]">
                ENTITIES
              </Tag>
              <div className="flex flex-wrap gap-1 mt-1">
                {nlu.entities.length > 0 ? (
                  nlu.entities.map((ent, i) => (
                    <Tag key={i} className="m-0 text-[10px] bg-gray-50">
                      {ent.entityTag}: <span className="text-blue-600">{ent.entityValue}</span>
                    </Tag>
                  ))
                ) : (
                  <span className="text-[10px] text-gray-400">추출된 개체명 없음</span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export interface CallbotHistoryDrawerRef {
  open: (row: CallbotHistoryListItem) => void;
  close: () => void;
}

const CallbotHistoryDrawer = forwardRef<CallbotHistoryDrawerRef>((_, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CallbotHistoryListItem | null>(null);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const nluRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useImperativeHandle(ref, () => ({
    open: (row: CallbotHistoryListItem) => {
      setSelectedRow(row);
      setSelectedSeq(null);
      nluRefs.current.clear();
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

  const items: TrackingFlowItem[] = bubbleData ?? [];

  // 고객 발화 중 NLU 데이터가 있는 항목 추출
  const nluItems = items.filter((item) => item.dialogRole === 'CUSTOMER' && item.nluResults && item.nluResults.length > 0);
  const hasNluData = nluItems.length > 0;

  const handleBubbleClick = useCallback((item: TrackingFlowItem) => {
    if (item.dialogRole !== 'CUSTOMER') return;
    setSelectedSeq(item.seq);
    // 우측 패널에서 해당 NLU 카드로 스크롤
    setTimeout(() => {
      const el = nluRefs.current.get(item.seq);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, []);

  const setNluRef = useCallback((seq: number, el: HTMLDivElement | null) => {
    if (el) {
      nluRefs.current.set(seq, el);
    }
  }, []);

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="대화 상세"
      closable={{ placement: 'end' }}
      width={hasNluData ? 960 : 640}
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
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs">{selectedRow.ucid}</span>
                  <button
                    type="button"
                    title="UCID 복사"
                    onClick={() =>
                      copyToClipboard(selectedRow.ucid)
                        .then(() => message.success('UCID가 복사되었습니다.'))
                        .catch(() => message.error('복사에 실패했습니다.'))
                    }
                    className="flex items-center text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="발신번호">{selectedRow.ani}</Descriptions.Item>
              <Descriptions.Item label="착신번호">{selectedRow.dnis}</Descriptions.Item>
            </Descriptions>
          </div>
        )}

        {/* 좌우 분할 영역 */}
        <div className={cn('flex-1 min-h-0 flex gap-4', !hasNluData && 'flex-col')}>
          {/* 왼쪽: 대화 흐름 */}
          <div className={cn('min-h-0 overflow-y-auto pr-1', hasNluData ? 'w-3/5' : 'flex-1')}>
            {isBubbleLoading ? (
              <div className="flex justify-center py-6">
                <Spin />
              </div>
            ) : (
              <TrackingDialogView items={items} onItemClick={handleBubbleClick} selectedSeq={selectedSeq} />
            )}
          </div>

          {/* 오른쪽: NLU 분석 결과 */}
          {hasNluData && (
            <div className="w-2/5 min-h-0 overflow-y-auto border-l pl-4">
              <div className="flex items-center gap-2 mb-3 sticky top-0 bg-white pb-2 z-10">
                <Brain className="size-4 text-blue-500" />
                <span className="text-xs font-bold">NLU 분석 결과</span>
                <span className="text-[10px] text-gray-400">({nluItems.length}건)</span>
              </div>

              <div className="space-y-3">
                {nluItems.map((item) => (
                  <div key={item.seq} ref={(el) => setNluRef(item.seq, el)}>
                    <NluCard seq={item.seq} nluResults={item.nluResults!} isSelected={selectedSeq === item.seq} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
});

CallbotHistoryDrawer.displayName = 'CallbotHistoryDrawer';

export default CallbotHistoryDrawer;
