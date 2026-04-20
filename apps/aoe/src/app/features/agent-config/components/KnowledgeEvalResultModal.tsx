import { forwardRef, useImperativeHandle, useState } from 'react';
import { Modal, Skeleton } from 'antd';
import { FileText, MessageSquare } from 'lucide-react';
import { useGetKnowledgeEvalResult } from '../hooks/useKnowledgeQueries';

export interface KnowledgeEvalResultModalRef {
  open: (params: { resultId: string; evalName: string }) => void;
  close: () => void;
}

interface ModalState {
  open: boolean;
  resultId: string;
  evalName: string;
}

const getSimilarityColor = (score: number) => {
  if (score >= 0.8) return { badge: 'bg-green-100 text-green-700 border-green-200', bar: 'bg-green-500' };
  if (score >= 0.5) return { badge: 'bg-blue-100 text-blue-700 border-blue-200', bar: 'bg-blue-500' };
  return { badge: 'bg-gray-100 text-gray-500 border-gray-200', bar: 'bg-gray-400' };
};

const KnowledgeEvalResultModal = forwardRef<KnowledgeEvalResultModalRef>((_, ref) => {
  const [modalState, setModalState] = useState<ModalState>({ open: false, resultId: '', evalName: '' });

  const { open, resultId, evalName } = modalState;

  const { data: result, isFetching } = useGetKnowledgeEvalResult({
    params: { resultId },
    queryOptions: { enabled: open && !!resultId },
  });

  useImperativeHandle(ref, () => ({
    open: (params) => setModalState({ open: true, ...params }),
    close: () => setModalState((prev) => ({ ...prev, open: false })),
  }));

  const handleClose = () => setModalState((prev) => ({ ...prev, open: false }));

  return (
    <Modal
      title={`질문별 상세 결과 — ${evalName}`}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={720}
      destroyOnHidden
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 } }}
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
          <p className="text-sm text-gray-400">결과 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {result.items.map((item) => (
            <div key={item.questionIndex} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* 질문 헤더 */}
              <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#405189] text-white text-xs font-bold">{item.questionIndex}</span>
                <p className="text-sm font-medium text-gray-800 leading-relaxed">{item.question}</p>
              </div>

              <div className="px-4 py-3 flex flex-col gap-3">
                {/* 검색된 문서 */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">검색된 문서</span>
                  {item.retrievedDocs.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">검색된 문서 없음</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {item.retrievedDocs.map((doc, docIdx) => {
                        const colors = getSimilarityColor(doc.similarity);
                        return (
                          <div key={docIdx} className="flex items-start gap-2.5 p-2.5 bg-white border border-gray-100 rounded-lg">
                            <FileText className="size-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-700 leading-relaxed flex-1">{doc.content}</p>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors.badge}`}>{(doc.similarity * 100).toFixed(1)}%</span>
                              <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${doc.similarity * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 기대 답변 */}
                {item.expectedAnswer && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">기대 답변</span>
                    <p className="text-xs text-gray-700 leading-relaxed p-2.5 bg-amber-50 border border-amber-100 rounded-lg">{item.expectedAnswer}</p>
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
