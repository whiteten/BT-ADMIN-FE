import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Slider } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import EvaluationResultDetailDrawer, { type EvaluationResultDetailDrawerRef } from '../components/EvaluationResultDetailDrawer';
import EvaluationResultStatusBadge from '../components/EvaluationResultStatusBadge';
import { modelQueryKeys, useDeleteEvaluationResult, useExecuteEvaluation, useGetEvaluationResults } from '../hooks/useModelQueries';
import type { EvaluationResultListItem, EvaluationResultStatus } from '../types/evaluation';
import { IconSearch, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function EvaluationResultList() {
  const { modelId = '', evalId = '' } = useParams();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const detailDrawerRef = useRef<EvaluationResultDetailDrawerRef>(null);

  // API Hooks
  const { data: resultList, isFetching } = useGetEvaluationResults({
    params: { modelId, evalId },
    queryOptions: { enabled: !!modelId && !!evalId },
  });

  const { mutate: executeEvaluation, isPending: isExecuting } = useExecuteEvaluation({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가가 실행되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEvaluationResults({ modelId, evalId }).queryKey });
      },
    },
  });

  const { mutate: deleteEvaluationResult } = useDeleteEvaluationResult({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가 결과가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEvaluationResults({ modelId, evalId }).queryKey });
      },
    },
  });

  const [filterColumn, setFilterColumn] = useState('evalDate');
  const [searchValue, setSearchValue] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleRowDoubleClick = (event: RowDoubleClickedEvent<EvaluationResultListItem>) => {
    if (!event.data) return;
    const { evalId, evalDate } = event.data;
    detailDrawerRef.current?.open({ modelId, evalId, evalDate });
  };

  const handleViewDetail = (data: EvaluationResultListItem) => {
    detailDrawerRef.current?.open({ modelId, evalId: data.evalId, evalDate: data.evalDate });
  };

  const handleDelete = (data: EvaluationResultListItem) => {
    modal.confirm.delete({
      onOk: () => {
        deleteEvaluationResult({ modelId, evalId, evalDate: data.evalDate });
      },
    });
  };

  const handleExecuteEvaluation = () => {
    modal.confirm.execute({
      onOk: () => {
        executeEvaluation({
          params: { modelId, evalId },
          data: { threshold: confidenceThreshold },
        });
      },
      options: {
        content: `신뢰도 ${confidenceThreshold}% 기준으로 평가를 실행하시겠습니까?`,
      },
    });
  };

  const columnDefs: ColDef<EvaluationResultListItem>[] = [
    { headerName: 'EvalId', field: 'evalId', hide: true },
    {
      headerName: '평가일',
      field: 'evalDate',
      flex: 1,
      minWidth: 180,
      valueFormatter: (params: { value: string }) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '정확도',
      field: 'accuracy',
      maxWidth: 120,
      valueFormatter: (params: { value: number }) => `${params.value}%`,
    },
    {
      headerName: '신뢰도',
      field: 'confidence',
      maxWidth: 120,
      valueFormatter: (params: { value: number }) => `${params.value}%`,
    },
    {
      headerName: '상태',
      field: 'resultStatus',
      maxWidth: 120,
      cellRenderer: (params: { value: EvaluationResultStatus }) => <EvaluationResultStatusBadge status={params.value} />,
    },
    {
      headerName: '',
      colId: 'view',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<EvaluationResultListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetail(data);
            }}
          >
            <IconSearch className="size-5 text-[#888B9A] hover:cursor-pointer" />
          </button>
        );
      },
    },
    {
      headerName: '',
      colId: 'delete',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<EvaluationResultListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!resultList) return [];
    if (!searchValue.trim()) return resultList;
    const keyword = searchValue.toLowerCase();
    return resultList.filter((item) => {
      const value = item[filterColumn as keyof EvaluationResultListItem];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [resultList, filterColumn, searchValue]);

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="evalDate"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '평가일', value: 'evalDate' },
              { label: '상태', value: 'resultStatus' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#495057] whitespace-nowrap">신뢰도(평가용)</span>
            <Slider
              min={0}
              max={100}
              step={1}
              value={confidenceThreshold}
              onChange={setConfidenceThreshold}
              tooltip={{ formatter: (value) => `${value}%` }}
              className="!w-[200px]"
            />
            <span className="text-sm text-[#405189] font-medium min-w-[40px]">{confidenceThreshold}%</span>
          </div>
          <Button variant="solid" color="cyan" onClick={handleExecuteEvaluation} loading={isExecuting}>
            평가실행
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<EvaluationResultListItem>
          rowData={filteredList}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isFetching}
          onRowDoubleClicked={handleRowDoubleClick}
        />
      </div>
      <EvaluationResultDetailDrawer ref={detailDrawerRef} />
    </div>
  );
}
