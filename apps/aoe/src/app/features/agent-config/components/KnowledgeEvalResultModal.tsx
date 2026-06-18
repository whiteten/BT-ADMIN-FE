import { forwardRef, useImperativeHandle, useState } from 'react';
import { Modal, Skeleton } from 'antd';
import { MessageSquare } from 'lucide-react';
import { useGetKnowledgeEvalResult } from '../hooks/useKnowledgeQueries';

export interface KnowledgeEvalResultModalRef {
  open: (params: { documentId: string; evalId: string; resultId: string; evalName: string }) => void;
  close: () => void;
}

interface ModalState {
  open: boolean;
  documentId: string;
  evalId: string;
  resultId: string;
  evalName: string;
}

const formatPercent = (value?: number) => (value !== undefined && value !== null ? `${(value * 100).toFixed(1)}%` : null);

const METRICS: { key: 'precision' | 'recall' | 'f1' | 'mrr' | 'ndcg' | 'map'; label: string }[] = [
  { key: 'precision', label: '정밀도' },
  { key: 'recall', label: '재현율' },
  { key: 'f1', label: 'F1' },
  { key: 'mrr', label: 'MRR' },
  { key: 'ndcg', label: 'NDCG' },
  { key: 'map', label: 'mAP' },
];

const MAX_CHUNK_LENGTH = 150;

const KnowledgeEvalResultModal = forwardRef<KnowledgeEvalResultModalRef>((_, ref) => {
  const [modalState, setModalState] = useState<ModalState>({ open: false, documentId: '', evalId: '', resultId: '', evalName: '' });
  const [expandedChunks, setExpandedChunks] = useState<Record<string, boolean>>({});

  const { open, documentId, evalId, resultId, evalName } = modalState;

  const { data: result, isFetching } = useGetKnowledgeEvalResult({
    params: { documentId, evalId, resultId },
    queryOptions: { enabled: open && !!documentId && !!evalId && !!resultId },
  });

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setExpandedChunks({});
      setModalState({ open: true, ...params });
    },
    close: () => setModalState((prev) => ({ ...prev, open: false })),
  }));

  const handleClose = () => setModalState((prev) => ({ ...prev, open: false }));

  const toggleChunk = (chunkId: string) => {
    setExpandedChunks((prev) => ({ ...prev, [chunkId]: !prev[chunkId] }));
  };

  return (
    <Modal
      title={`질문별 상세 결과 — ${evalName}`}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={800}
      destroyOnHidden
      styles={{ body: { maxHeight: '72vh', overflowY: 'auto', paddingRight: 4 } }}
    >
      {isFetching ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} active paragraph={{ rows: 4 }} />
          ))}
        </div>
      ) : !result?.items?.length ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <MessageSquare className="size-8 text-gray-300" />
          <p className="text-sm text-gray-400">상세 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {result.items.map((item, index) => (
            <div key={item.resultChunkId} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              {/* 질문 헤더 */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-bt-primary)] text-white text-xs font-bold shrink-0">{index + 1}</span>
                <p className="text-sm font-medium text-gray-800 leading-relaxed">{item.question}</p>
              </div>

              <div className="px-4 py-4 flex flex-col gap-4">
                {/* 질문별 평가 지표 */}
                {METRICS.some((m) => item[m.key] && (item[m.key] ?? 0) > 0) && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">평가 지표</span>
                    <div className="flex flex-wrap gap-4 p-3 bg-white border border-gray-100 rounded-lg">
                      {METRICS.map(({ key, label }) => {
                        const val = formatPercent(item[key]);
                        if (!val || item[key] === 0) return null;
                        return (
                          <div key={key} className="flex flex-col items-center min-w-[56px]">
                            <span className="text-xs text-gray-500 mb-0.5">{label}</span>
                            <span className="text-sm font-semibold text-[var(--color-bt-primary)]">{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 검색된 문서 (rankList) */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">검색된 문서</span>
                  {item.rankList.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">검색된 문서 없음</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {[...item.rankList]
                        .sort((a, b) => a.rank - b.rank)
                        .map((doc) => {
                          const chunk = doc.chunk ?? '';
                          const isCorrect = !!item.correctChunk && chunk === item.correctChunk;
                          const isLong = chunk.length > MAX_CHUNK_LENGTH;
                          const isExpanded = expandedChunks[doc.retrievedChunkId];
                          const displayText = isLong && !isExpanded ? `${chunk.substring(0, MAX_CHUNK_LENGTH)}...` : chunk;

                          return (
                            <div
                              key={doc.retrievedChunkId}
                              className={`flex items-start gap-2.5 p-3 bg-white rounded-lg border-2 ${isCorrect ? 'border-red-400' : 'border-gray-100'}`}
                            >
                              <span
                                className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 ${isCorrect ? 'bg-red-100 text-red-700' : 'bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)]'}`}
                              >
                                {doc.rank}
                              </span>
                              <div className="flex-1 min-w-0">
                                {isCorrect && <span className="inline-block px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded mb-1.5">✔️ 정답 청크</span>}
                                <p className="text-xs text-gray-700 leading-relaxed">{displayText}</p>
                                {isLong && (
                                  <button type="button" className="text-xs text-blue-600 hover:underline mt-1" onClick={() => toggleChunk(doc.retrievedChunkId)}>
                                    {isExpanded ? '접기' : '더보기'}
                                  </button>
                                )}
                                <p className="text-xs text-gray-400 mt-1.5">유사도: {(doc.score * 100).toFixed(2)}%</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* 기대 답변 */}
                {item.answer && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">기대 답변</span>
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
});

KnowledgeEvalResultModal.displayName = 'KnowledgeEvalResultModal';
export default KnowledgeEvalResultModal;
