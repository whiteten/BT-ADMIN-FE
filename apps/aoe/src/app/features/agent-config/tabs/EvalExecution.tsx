import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Input, InputNumber, Space } from 'antd';
import dayjs from 'dayjs';
import { Search, Trash2 } from 'lucide-react';
import { Log } from '@/log';
import { useNavigationStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { AOE_PERM } from '../../../constants/permissions';
import KnowledgeEvalResultModal, { type KnowledgeEvalResultModalRef } from '../components/KnowledgeEvalResultModal';
import { knowledgeQueryKeys, useDeleteKnowledgeEvalResult, useGetKnowledgeEvalHistory } from '../hooks/useKnowledgeQueries';
import type { KnowledgeEvalExecution } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const formatMetric = (value?: number) => (value !== undefined && value !== null ? `${(value * 100).toFixed(1)}%` : '-');

interface MetricFilter {
  precision: number | null;
  recall: number | null;
  f1: number | null;
  mrr: number | null;
  ndcg: number | null;
  map: number | null;
}

const FILTER_FIELDS: { key: keyof MetricFilter; label: string }[] = [
  { key: 'precision', label: '정밀도' },
  { key: 'recall', label: '재현율' },
  { key: 'f1', label: 'F1' },
  { key: 'mrr', label: 'MRR' },
  { key: 'ndcg', label: 'NDCG' },
  { key: 'map', label: 'mAP' },
];

export default function EvalExecution() {
  const { documentId, evalId } = useParams();
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();
  const canWrite = useNavigationStore((s) => s.permissions.includes(AOE_PERM.EVAL_WRITE));
  const resultModalRef = useRef<KnowledgeEvalResultModalRef>(null);
  const [filters, setFilters] = useState<MetricFilter>({ precision: 0, recall: 0, f1: 0, mrr: 0, ndcg: 0, map: 0 });

  const { data: history = [], isFetching } = useGetKnowledgeEvalHistory({
    params: { documentId, evalId },
    queryOptions: { enabled: !!documentId && !!evalId },
  });

  const { mutate: deleteResult } = useDeleteKnowledgeEvalResult({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가 결과가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeEvalHistory({ documentId, evalId }).queryKey });
      },
      onError: (error) => Log.warn('deleteKnowledgeEvalResult failed', error),
    },
  });

  const handleFilterChange = (key: keyof MetricFilter, value: number | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredHistory = history.filter((item) => {
    const check = (val: number | undefined, min: number | null) => min === null || (val !== undefined && val * 100 >= min);
    return (
      check(item.precision, filters.precision) &&
      check(item.recall, filters.recall) &&
      check(item.f1, filters.f1) &&
      check(item.mrr, filters.mrr) &&
      check(item.ndcg, filters.ndcg) &&
      check(item.map, filters.map)
    );
  });

  const handleDelete = (resultId: string) => {
    modal.confirm.delete({
      onOk: () => deleteResult({ documentId: documentId!, evalId: evalId!, resultId }),
    });
  };

  const columnDefs: ColDef<KnowledgeEvalExecution>[] = [
    {
      headerName: '평가일',
      field: 'workTime',
      flex: 2,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '정밀도',
      field: 'precision',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => formatMetric(params.value),
    },
    {
      headerName: '재현율',
      field: 'recall',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => formatMetric(params.value),
    },
    {
      headerName: 'F1',
      field: 'f1',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => formatMetric(params.value),
    },
    {
      headerName: 'MRR',
      field: 'mrr',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => formatMetric(params.value),
    },
    {
      headerName: 'NDCG',
      field: 'ndcg',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => formatMetric(params.value),
    },
    {
      headerName: 'mAP',
      field: 'map',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => formatMetric(params.value),
    },
    {
      headerName: '',
      maxWidth: 56,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<KnowledgeEvalExecution>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resultModalRef.current?.open({ documentId: documentId ?? '', evalId: evalId ?? '', resultId: data.resultId, evalName: data.evalName });
            }}
          >
            <Search className="size-4 text-[var(--color-bt-primary)] hover:cursor-pointer" />
          </button>
        );
      },
    },
    {
      headerName: '',
      maxWidth: 56,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<KnowledgeEvalExecution>) => {
        const data = params.data;
        if (!data || !canWrite) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data.resultId);
            }}
          >
            <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-4 w-full h-full">
        <div className="flex items-center gap-4 flex-wrap">
          {FILTER_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-sm text-gray-600 whitespace-nowrap">{label} ≥</span>
              {/* antd v6: InputNumber.addonAfter deprecated → Space.Compact 로 % 표시 */}
              <Space.Compact size="small">
                <InputNumber min={0} max={100} value={filters[key]} onChange={(value) => handleFilterChange(key, value)} placeholder="0" style={{ width: 80 }} size="small" />
                <Input value="%" disabled style={{ width: 30, textAlign: 'center' }} size="small" />
              </Space.Compact>
            </div>
          ))}
        </div>

        <div className="w-full h-full">
          <AgGridReact<KnowledgeEvalExecution>
            rowData={filteredHistory}
            columnDefs={columnDefs}
            gridOptions={gridOptions}
            getRowId={(params) => params.data.resultId}
            loading={isFetching}
          />
        </div>
      </div>

      <KnowledgeEvalResultModal ref={resultModalRef} />
    </>
  );
}
