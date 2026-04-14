import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Descriptions, Drawer, Input, Select, Spin, message } from 'antd';
import { Bookmark, Brain, Check, Copy, Pencil, X } from 'lucide-react';
import { toast } from '@/shared-util';
import BubbleDecryptReasonModal, { type BubbleDecryptReason } from './BubbleDecryptReasonModal';
import TrackingDialogView from './TrackingDialogView';
import { useApplyRetrain, useGetIntents, useUpdateRetrain } from '../../bot-config/hooks/useModelQueries';
import { botDialogHistoryApi } from '../api/botDialogHistoryApi';
import { botDialogHistoryQueryKeys, useDecryptBubbles, useGetBubbles, useGetNluAnalysis } from '../hooks/useBotDialogHistoryQueries';
import type { BotDialogHistoryListItem } from '../types/botDialogHistory.types';
import type { NluAnalysisItem, TrackingFlowItem } from '../types/tracking.types';
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

/** confidence 값 기반 텍스트 색상 */
function getConfidenceTextColor(item: NluAnalysisItem): string {
  if (item.isSuccess === 1) return 'text-green-600';
  if (item.isCheck === 1) return 'text-amber-500';
  if (item.isFailed === 1) return 'text-red-500';
  return 'text-gray-500';
}

/** NLU 카드 단일 항목 */
interface NluCardProps {
  seq: number;
  nluResults: NluAnalysisItem[];
  onRetrainSuccess?: () => void | Promise<void>;
}

function NluCard({ seq, nluResults, onRetrainSuccess }: NluCardProps) {
  const [editingHop, setEditingHop] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  const modelId = nluResults[0]?.modelId;
  const { data: intentList } = useGetIntents({
    params: { modelId: modelId ?? '' },
    queryOptions: { enabled: !!modelId && editingHop !== null },
  });
  const intentOptions = (intentList ?? []).map((item) => ({
    value: item.intentName,
    label: item.intentName,
  }));

  const updateMutation = useUpdateRetrain({});
  const applyMutation = useApplyRetrain({});

  const handleEditStart = (nlu: NluAnalysisItem) => {
    if (nlu.retrainStatus === 2) return;
    setEditingHop(nlu.hop);
    setEditQuestion((nlu.modifiedQuestion ?? nlu.questionText ?? '').trim());
    setEditAnswer(nlu.retrainAnswer ?? nlu.intent ?? '');
  };

  const handleEditCancel = () => {
    setEditingHop(null);
    setEditQuestion('');
    setEditAnswer('');
  };

  const handleSave = async (nlu: NluAnalysisItem) => {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      toast.error('발화와 정답의도를 모두 입력해주세요.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        params: {
          modelId: nlu.modelId,
          ucidGkey: nlu.ucidGkey,
          questionSeq: nlu.questionSeq,
          hop: nlu.hop,
        },
        data: { question: editQuestion, answer: editAnswer },
      });
      toast.success('재학습 데이터가 저장되었습니다.');
      await onRetrainSuccess?.();
      setEditingHop(null);
    } catch (e) {
      toast.error('저장에 실패했습니다.');
    }
  };

  const handleApply = async (nlu: NluAnalysisItem) => {
    const question = nlu.modifiedQuestion ?? nlu.questionText;
    const answer = nlu.retrainAnswer ?? nlu.intent;
    if (!question?.trim() || !answer?.trim()) {
      toast.error('발화와 정답의도를 먼저 저장해주세요.');
      return;
    }
    try {
      await applyMutation.mutateAsync({
        params: {
          modelId: nlu.modelId,
          ucidGkey: nlu.ucidGkey,
          questionSeq: nlu.questionSeq,
          hop: nlu.hop,
        },
        data: {},
      });
      toast.success('학습 데이터에 반영되었습니다.');
      await onRetrainSuccess?.();
    } catch (e) {
      toast.error('반영에 실패했습니다.');
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {nluResults.map((nlu, idx) => (
        <div key={nlu.hop} className={cn('p-3 space-y-2.5', idx > 0 && 'border-t border-gray-100')} {...(editingHop === nlu.hop ? { 'data-retrain-edit': true } : {})}>
          {/* HOP 헤더 + 재학습 상태 + 편집 버튼 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {nluResults.length > 1 && <span className="inline-block text-[10px] font-semibold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">HOP {nlu.hop}</span>}
              {nlu.retrainStatus === 1 && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">미반영</span>}
              {nlu.retrainStatus === 2 && <span className="text-[10px] font-medium text-green-600 bg-green-50 rounded px-1.5 py-0.5">반영</span>}
            </div>
            {nlu.retrainStatus !== 2 && editingHop !== nlu.hop && (
              <button
                type="button"
                title="재학습 편집"
                className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditStart(nlu);
                }}
              >
                <Pencil size={12} className="text-gray-400 hover:text-blue-500" />
              </button>
            )}
          </div>

          {/* 의도 */}
          <div className="flex gap-2">
            <span className="w-12 shrink-0 text-[11px] font-semibold text-gray-500 leading-5">의도</span>
            {editingHop === nlu.hop ? (
              <Select
                size="small"
                className="flex-1"
                value={editAnswer}
                onChange={setEditAnswer}
                options={intentOptions}
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                placeholder="정답의도 선택"
              />
            ) : (
              <span className="text-xs font-medium text-gray-800">{nlu.retrainAnswer ?? nlu.intent ?? '-'}</span>
            )}
          </div>

          {/* 신뢰도 / 성공 / 실패 */}
          {(nlu.confidence != null || nlu.threshold != null || nlu.thresholdFail != null) && (
            <div className="flex gap-2">
              <span className="w-12 shrink-0" />
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                {nlu.confidence != null && (
                  <span>
                    신뢰도 <span className={cn('font-medium', getConfidenceTextColor(nlu))}>{nlu.confidence}</span>
                  </span>
                )}
                {nlu.threshold != null && (
                  <span>
                    성공 <span className="text-green-600 font-medium">{nlu.threshold}</span>
                  </span>
                )}
                {nlu.thresholdFail != null && (
                  <span>
                    실패 <span className="text-red-500 font-medium">{nlu.thresholdFail}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 고객발화 */}
          <div className="flex gap-2">
            <span className="w-12 shrink-0 text-[11px] font-semibold text-gray-500 leading-5">고객발화</span>
            {editingHop === nlu.hop ? (
              <Input size="small" className="flex-1" value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} placeholder="사용자 발화 수정" />
            ) : (
              <p className="flex-1 text-xs text-gray-700 leading-5 break-all">{nlu.modifiedQuestion ?? nlu.questionText}</p>
            )}
          </div>

          {/* 키워드 */}
          {nlu.keywords && nlu.keywords.length > 0 && (
            <div className="flex gap-2">
              <span className="w-12 shrink-0 text-[11px] font-semibold text-gray-500 leading-5">키워드</span>
              <div className="flex-1 flex flex-wrap gap-1">
                {nlu.keywords.map((kw, i) => (
                  <span key={i} className="inline-flex items-center text-[11px] bg-violet-50 text-violet-700 rounded px-1.5 py-0.5">
                    {kw.keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 개체 */}
          {nlu.isEntity === 1 && (
            <div className="flex gap-2">
              <span className="w-12 shrink-0 text-[11px] font-semibold text-gray-500 leading-5">개체</span>
              <div className="flex-1 flex flex-wrap gap-1">
                {nlu.entities.length > 0 ? (
                  nlu.entities.map((ent, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 text-[11px] bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5">
                      <span className="font-medium">{ent.entityTag}</span>
                      <span className="text-emerald-400">:</span>
                      <span>{ent.entityValue}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-gray-400">추출된 개체 없음</span>
                )}
              </div>
            </div>
          )}

          {/* 재학습 액션 버튼 */}
          {editingHop === nlu.hop ? (
            <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave(nlu);
                }}
                disabled={updateMutation.isPending}
              >
                <Check size={11} /> 저장
              </button>
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-gray-400 hover:bg-gray-500 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditCancel();
                }}
              >
                <X size={11} /> 취소
              </button>
            </div>
          ) : (
            nlu.retrainStatus === 1 && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-green-500 hover:bg-green-600 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApply(nlu);
                  }}
                  disabled={applyMutation.isPending}
                >
                  <Bookmark size={11} /> 반영
                </button>
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
}

export interface BotDialogHistoryDrawerRef {
  open: (row: BotDialogHistoryListItem) => void;
  close: () => void;
}

const BotDialogHistoryDrawer = forwardRef<BotDialogHistoryDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BotDialogHistoryListItem | null>(null);
  const [highlightedNluSeq, setHighlightedNluSeq] = useState<number | null>(null);
  const nluCardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔒 암호화 버블 복호화 상태
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [targetBubbleKey, setTargetBubbleKey] = useState<string | null>(null);
  const [revealedBubbles, setRevealedBubbles] = useState<Record<string, string>>({});

  useImperativeHandle(ref, () => ({
    open: (row: BotDialogHistoryListItem) => {
      setSelectedRow(row);
      setHighlightedNluSeq(null);
      nluCardRefs.current.clear();
      setRevealedBubbles({});
      setReasonModalOpen(false);
      setTargetBubbleKey(null);
      setIsOpen(true);
    },
    close: () => {
      setIsOpen(false);
      setSelectedRow(null);
      setHighlightedNluSeq(null);
      setRevealedBubbles({});
      setReasonModalOpen(false);
      setTargetBubbleKey(null);
    },
  }));

  const handleClose = () => {
    setIsOpen(false);
    setSelectedRow(null);
    setHighlightedNluSeq(null);
    setRevealedBubbles({});
    setReasonModalOpen(false);
    setTargetBubbleKey(null);
  };

  const setNluCardRef = useCallback((seq: number, el: HTMLDivElement | null) => {
    if (el) nluCardRefs.current.set(seq, el);
  }, []);

  const handleBubbleClick = useCallback((item: TrackingFlowItem) => {
    if (item.dialogRole !== 'CUSTOMER') return;
    setHighlightedNluSeq(item.seq);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedNluSeq(null), 1200);
    setTimeout(() => {
      const el = nluCardRefs.current.get(item.seq);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, []);

  const handleRetrainSuccess = useCallback(async () => {
    if (!selectedRow) return;
    await queryClient.invalidateQueries({
      queryKey: botDialogHistoryQueryKeys.getNluAnalysis({
        ucid: selectedRow.ucid,
      }).queryKey,
    });
  }, [selectedRow, queryClient]);

  // 암호화 버블 복호화 mutation — 캐시하지 않고 결과만 state에 병합
  const decryptMutation = useDecryptBubbles({
    mutationOptions: {
      onSuccess: (decrypted) => {
        if (!decrypted || decrypted.length === 0) return;
        setRevealedBubbles((prev) => {
          const next = { ...prev };
          for (const row of decrypted) {
            next[row.bubbleKey] = row.description;
          }
          return next;
        });
      },
    },
  });

  /** 🔒 아이콘 클릭 → 사유 모달 오픈 */
  const handleEncryptedClick = useCallback((item: TrackingFlowItem) => {
    if (!item.bubbleKey) return;
    setTargetBubbleKey(item.bubbleKey);
    setReasonModalOpen(true);
  }, []);

  /** 사유 확인 → 복호화 API 호출 */
  const handleConfirmReason = useCallback(
    async ({ reasonCode, reasonText }: BubbleDecryptReason) => {
      if (!selectedRow || !targetBubbleKey) return;
      try {
        await decryptMutation.mutateAsync({
          params: { ucid: selectedRow.ucid },
          data: { bubbleKeys: [targetBubbleKey], reasonCode, reasonText },
        });
        setReasonModalOpen(false);
        setTargetBubbleKey(null);
      } catch (e) {
        // 에러 토스트는 글로벌 핸들러에서 처리
      }
    },
    [selectedRow, targetBubbleKey, decryptMutation],
  );

  const handleCancelReason = useCallback(() => {
    if (decryptMutation.isPending) return;
    setReasonModalOpen(false);
    setTargetBubbleKey(null);
  }, [decryptMutation.isPending]);

  const { data: bubbleData, isLoading: isBubbleLoading } = useGetBubbles({
    params: {
      ucid: selectedRow?.ucid,
    },
    queryOptions: { enabled: !!selectedRow && isOpen },
  });

  // NLU 분석 결과 별도 조회 (경량 — 재학습 갱신 시 이 쿼리만 invalidate)
  const { data: nluData } = useGetNluAnalysis({
    params: { ucid: selectedRow?.ucid },
    queryOptions: { enabled: !!selectedRow && isOpen },
  });

  const items: TrackingFlowItem[] = bubbleData ?? [];

  // NLU 데이터를 questionSeq 기준으로 그룹핑하여 고객 발화 버블과 매칭
  const nluBySeq = useMemo(() => {
    const map = new Map<number, NluAnalysisItem[]>();
    if (!nluData) return map;
    for (const nlu of nluData) {
      const list = map.get(nlu.questionSeq) ?? [];
      list.push(nlu);
      map.set(nlu.questionSeq, list);
    }
    return map;
  }, [nluData]);

  // 고객 발화 중 NLU 데이터가 있는 항목 추출 (NLU 별도 쿼리 기준)
  const nluItems = items.filter((item) => item.dialogRole === 'CUSTOMER' && nluBySeq.has(item.seq)).map((item) => ({ ...item, nluResults: nluBySeq.get(item.seq)! }));
  const hasNluData = nluItems.length > 0;

  const handleIfeLink = useCallback(
    async (item: TrackingFlowItem) => {
      if (!selectedRow || !item.subFlowId || !item.nodeName) return;
      try {
        const redirectUrl = await botDialogHistoryApi.getIfeRedirectUrl({
          serviceId: selectedRow.serviceId,
          serviceVer: selectedRow.serviceVer,
          subFlowId: item.subFlowId,
          nodeName: item.nodeName,
        });
        if (redirectUrl) {
          window.open(redirectUrl, '_blank');
        }
      } catch (e) {
        toast.error('IFE 시나리오 열기에 실패했습니다.');
      }
    },
    [selectedRow],
  );

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="대화 상세"
      closable={{ placement: 'end' }}
      width={960}
      destroyOnHidden
      styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        {/* 세션 정보 */}
        {selectedRow && (
          <div className="flex-shrink-0">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="봇" span={2}>
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
          <div className={cn('min-h-0 overflow-y-auto overflow-x-hidden pr-1', hasNluData ? 'w-3/5' : 'flex-1')}>
            {isBubbleLoading ? (
              <div className="flex justify-center py-6">
                <Spin />
              </div>
            ) : (
              <TrackingDialogView
                items={items}
                onItemClick={handleBubbleClick}
                onIfeLink={handleIfeLink}
                revealedBubbles={revealedBubbles}
                onEncryptedClick={handleEncryptedClick}
                decryptingBubbleKey={decryptMutation.isPending ? targetBubbleKey : null}
              />
            )}
          </div>

          {/* 🔒 암호화 버블 열람 사유 모달 */}
          <BubbleDecryptReasonModal open={reasonModalOpen} loading={decryptMutation.isPending} onCancel={handleCancelReason} onConfirm={handleConfirmReason} />

          {/* 오른쪽: NLU 분석 결과 */}
          {hasNluData && (
            <div className="w-2/5 min-h-0 overflow-y-auto border-l pl-4 pr-1">
              <div className="flex items-center gap-2 mb-3 sticky top-0 bg-white pb-2 z-10">
                <Brain className="size-4 text-blue-500" />
                <span className="text-xs font-bold">NLU 분석 결과</span>
                <span className="text-[10px] text-gray-400">({nluItems.length}건)</span>
              </div>

              <div className="space-y-3 pb-4">
                {nluItems.map((item) => (
                  <div
                    key={item.seq}
                    ref={(el) => setNluCardRef(item.seq, el)}
                    className={cn('transition-all duration-300 rounded-lg', highlightedNluSeq === item.seq && 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50/50')}
                  >
                    <NluCard seq={item.seq} nluResults={item.nluResults!} onRetrainSuccess={handleRetrainSuccess} />
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

BotDialogHistoryDrawer.displayName = 'BotDialogHistoryDrawer';

export default BotDialogHistoryDrawer;
