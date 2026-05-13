import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Checkbox, Drawer } from 'antd';
import dayjs from 'dayjs';
import { BarChart3, Clock, Play } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import KnowledgeEvalResultModal, { type KnowledgeEvalResultModalRef } from './KnowledgeEvalResultModal';
import { knowledgeQueryKeys, useGetKnowledgeEvalHistory, useRunKnowledgeEval } from '../hooks/useKnowledgeQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export interface KnowledgeEvalRunDrawerRef {
  open: (params: { documentId: string; evalId: string; evalName: string }) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  documentId: string;
  evalId: string;
  evalName: string;
}

type MetricKey = 'precision' | 'recall' | 'f1' | 'mrr' | 'ndcg' | 'map';

const METRIC_OPTIONS: { key: MetricKey; label: string; description: string }[] = [
  { key: 'precision', label: '정밀도 (Precision@K)', description: '검색된 문서 중 관련 문서의 비율' },
  { key: 'recall', label: '재현율 (Recall@K)', description: '관련 문서 중 검색된 문서의 비율' },
  { key: 'f1', label: 'F1 (F1 Score)', description: 'F1 점수(정밀도-재현율 조화 평균)' },
  { key: 'mrr', label: 'MRR (Mean Reciprocal Rank)', description: '첫 번째 관련 문서의 평균 역순위' },
  { key: 'ndcg', label: 'NDCG@K', description: '정규화된 누적 이득' },
  { key: 'map', label: 'mAP (Mean Average Precision)', description: '평균 정밀도' },
];

const formatMetricValue = (value?: number) => (value !== undefined && value !== null ? `${(value * 100).toFixed(1)}%` : null);

const KnowledgeEvalRunDrawer = forwardRef<KnowledgeEvalRunDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const resultModalRef = useRef<KnowledgeEvalResultModalRef>(null);
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: false, documentId: '', evalId: '', evalName: '' });
  const [metrics, setMetrics] = useState<Record<MetricKey, boolean>>({
    precision: true,
    recall: false,
    f1: false,
    mrr: false,
    ndcg: false,
    map: false,
  });

  const { open, documentId, evalId, evalName } = drawerState;

  const { data: history = [], isFetching: isHistoryLoading } = useGetKnowledgeEvalHistory({
    params: { documentId, evalId },
    queryOptions: { enabled: open && !!documentId && !!evalId },
  });

  const { mutate: runEval, isPending: isRunning } = useRunKnowledgeEval({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가가 완료되었습니다.');
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeEvalHistory({ evalId }).queryKey });
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeEvals({ documentId }).queryKey });
      },
      onError: (error) => {
        Log.warn('runKnowledgeEval failed', error);
        toast.error('평가 실행에 실패했습니다.');
      },
    },
  });

  useImperativeHandle(ref, () => ({
    open: (params) => setDrawerState({ open: true, ...params }),
    close: () => setDrawerState((prev) => ({ ...prev, open: false })),
  }));

  const handleClose = () => setDrawerState((prev) => ({ ...prev, open: false }));

  const handleMetricChange = (key: MetricKey, checked: boolean) => {
    setMetrics((prev) => ({ ...prev, [key]: checked }));
  };

  const handleRun = () => {
    const selectedMetrics = (Object.entries(metrics) as [MetricKey, boolean][]).filter(([, v]) => v).map(([k]) => k);
    if (selectedMetrics.length === 0) {
      toast.warning('최소 하나의 메트릭을 선택해주세요.');
      return;
    }
    runEval({ params: { documentId, evalId }, data: { metrics: selectedMetrics } });
  };

  const formatMetrics = (execution: (typeof history)[0]) => {
    const parts: string[] = [];
    const m = execution;
    if (formatMetricValue(m.precision)) parts.push(`정밀도: ${formatMetricValue(m.precision)}`);
    if (formatMetricValue(m.recall)) parts.push(`재현율: ${formatMetricValue(m.recall)}`);
    if (formatMetricValue(m.f1)) parts.push(`F1: ${formatMetricValue(m.f1)}`);
    if (formatMetricValue(m.mrr)) parts.push(`MRR: ${formatMetricValue(m.mrr)}`);
    if (formatMetricValue(m.ndcg)) parts.push(`NDCG: ${formatMetricValue(m.ndcg)}`);
    if (formatMetricValue(m.map)) parts.push(`mAP: ${formatMetricValue(m.map)}`);
    return parts.length > 0 ? parts.join(' · ') : '메트릭 없음';
  };

  return (
    <>
      <Drawer
        title={`평가 실행 — ${evalName}`}
        open={open}
        onClose={handleClose}
        closable={{ placement: 'end' }}
        styles={{ wrapper: { width: 560 } }}
        destroyOnHidden
        footer={
          <Button type="primary" block icon={<Play className="size-3.5" />} loading={isRunning} onClick={handleRun}>
            {isRunning ? '평가 중...' : '검색 평가 시작'}
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          {/* 평가 유형 */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-700">평가 유형</span>
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <input type="radio" readOnly checked className="mt-0.5 accent-blue-600 shrink-0" />
              <div>
                <span className="text-sm font-medium text-blue-700">검색 평가</span>
                <p className="text-xs text-blue-500 mt-0.5">문서 검색 성능만 평가합니다. 검색된 문서의 관련성과 순위를 측정합니다.</p>
              </div>
            </div>
          </div>

          {/* 검색 메트릭 */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-gray-700">검색 성능 메트릭</span>
            <div className="flex flex-col gap-3">
              {METRIC_OPTIONS.map(({ key, label, description }) => (
                <div key={key} className="flex items-start gap-3">
                  <Checkbox checked={metrics[key]} onChange={(e) => handleMetricChange(key, e.target.checked)} className="mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 평가 실행 기록 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">평가 실행 기록</span>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">최근 3건</span>
            </div>
            {isHistoryLoading ? (
              <div className="flex justify-center py-8">
                <FallbackSpinner />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 border border-dashed border-gray-200 rounded-lg">
                <Clock className="size-6 text-gray-300" />
                <p className="text-sm text-gray-400">실행 기록이 없습니다.</p>
                <p className="text-xs text-gray-400">검색 평가를 실행하면 기록이 표시됩니다.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {history.slice(0, 3).map((execution, idx) => (
                  <div key={execution.resultId ?? idx} className="p-3 border border-gray-200 rounded-lg bg-white hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-gray-800">
                        {execution.evalName} #{idx + 1}
                      </span>
                      <span className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">완료</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">{formatMetrics(execution)}</p>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline shrink-0 ml-2"
                        onClick={() => resultModalRef.current?.open({ documentId, evalId, resultId: execution.resultId, evalName: execution.evalName })}
                      >
                        <BarChart3 className="size-3" />
                        결과 보기
                      </button>
                    </div>
                    {execution.workTime && <p className="text-xs text-gray-400 mt-1">{dayjs(execution.workTime).format('YYYY-MM-DD HH:mm')}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Drawer>

      <KnowledgeEvalResultModal ref={resultModalRef} />
    </>
  );
});

KnowledgeEvalRunDrawer.displayName = 'KnowledgeEvalRunDrawer';
export default KnowledgeEvalRunDrawer;
