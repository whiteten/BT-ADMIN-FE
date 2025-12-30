import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import EvalStatusBadge from '../components/EvalStatusBadge';
import EvaluationDrawer, { type EvaluationDrawerRef } from '../components/EvaluationDrawer';
import { modelQueryKeys, useDeleteEvaluation, useGetEvaluations } from '../hooks/useModelQueries';
import type { EvalStatus, EvaluationListItem } from '../types/evaluation';
import { IconPlayCircle, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function ModelEvaluation() {
  const { modelId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<EvaluationListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('evalName');
  const [searchValue, setSearchValue] = useState('');
  const drawerRef = useRef<EvaluationDrawerRef>(null);

  const { data: evaluationList, isFetching } = useGetEvaluations({ params: { modelId } });

  const { mutate: deleteEvaluation } = useDeleteEvaluation({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEvaluations({ modelId }).queryKey });
      },
    },
  });

  const handleExecuteEvaluation = (evalId: string) => {
    modal.confirm.execute({
      onOk: () => {
        alert(`Execute Evaluation.\nmodelId: ${modelId}\nevalId: ${evalId}`);
      },
      options: {
        content: '평가를 진행하시겠습니까?',
      },
    });
  };

  const handleDeleteEvaluation = (evalId: string) => {
    modal.confirm.delete({
      onOk: () => deleteEvaluation({ modelId, evalId }),
    });
  };

  const columnDefs: ColDef<EvaluationListItem>[] = [
    { headerName: 'ID', field: 'evalId', hide: true },
    { headerName: '평가셋이름', field: 'evalName' },
    {
      headerName: '상태',
      field: 'evalStatus',
      maxWidth: 120,
      cellRenderer: (params: { value: number }) => <EvalStatusBadge status={params.value as EvalStatus} />,
    },
    { headerName: '질문수', field: 'questionCount', maxWidth: 120 },
    {
      headerName: '작업일시',
      field: 'createDate',
      maxWidth: 180,
      valueFormatter: (params: { value: string }) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<EvaluationListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleExecuteEvaluation(data.evalId);
            }}
          >
            <IconPlayCircle className="size-5 text-[#405189] hover:cursor-pointer" />
          </button>
        );
      },
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<EvaluationListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEvaluation(data.evalId);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!evaluationList) return [];
    if (!searchValue.trim()) return evaluationList;
    const keyword = searchValue.toLowerCase();
    return evaluationList.filter((evaluation) => {
      const value = evaluation[filterColumn as keyof typeof evaluation];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [evaluationList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleClickAddEvaluation = () => {
    drawerRef.current?.open({ modelId });
  };

  const handleRowDoubleClick = (event: RowDoubleClickedEvent<EvaluationListItem>) => {
    if (!event.data) return;
    const { evalId } = event.data;
    navigate(`/bot/bot-config/model/${modelId}/evaluation/${evalId}`);
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="evalName"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[{ label: '평가셋이름', value: 'evalName' }]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid" color="primary" onClick={handleClickAddEvaluation}>
            추가
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<EvaluationListItem> rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isFetching} onRowDoubleClicked={handleRowDoubleClick} />
      </div>
      <EvaluationDrawer ref={drawerRef} />
    </div>
  );
}
