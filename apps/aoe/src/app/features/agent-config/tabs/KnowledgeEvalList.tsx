import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import KnowledgeEvalRunDrawer, { type KnowledgeEvalRunDrawerRef } from '../components/KnowledgeEvalRunDrawer';
import KnowledgeEvalStatusBadge from '../components/KnowledgeEvalStatusBadge';
import { knowledgeQueryKeys, useDeleteKnowledgeEval, useGetKnowledgeEvals } from '../hooks/useKnowledgeQueries';
import type { KnowledgeEvalItem, KnowledgeEvalStatus } from '../types';
import { IconPlayCircle, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function KnowledgeEvalList() {
  const { documentId } = useParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<KnowledgeEvalItem>>(null);
  const evalRunDrawerRef = useRef<KnowledgeEvalRunDrawerRef>(null);
  const [searchValue, setSearchValue] = useState('');

  const { data: evals, isFetching } = useGetKnowledgeEvals({ params: { documentId } });

  const { mutate: deleteEval } = useDeleteKnowledgeEval({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가셋이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeEvals({ documentId }).queryKey });
      },
      onError: (error) => Log.warn('deleteKnowledgeEval failed', error),
    },
  });

  const handleOpenRunDrawer = (data: KnowledgeEvalItem) => {
    evalRunDrawerRef.current?.open({ documentId: documentId!, evalId: data.evalId, evalName: data.evalName });
  };

  const handleDeleteEval = (evalId: string) => {
    modal.confirm.delete({
      onOk: () => deleteEval({ documentId: documentId!, evalId }),
    });
  };

  const filteredEvals = (evals ?? []).filter((item) => (searchValue.trim() ? item.evalName.toLowerCase().includes(searchValue.toLowerCase()) : true));

  const columnDefs: ColDef<KnowledgeEvalItem>[] = [
    { field: 'evalId', hide: true },
    {
      headerName: '평가셋 명',
      field: 'evalName',
      flex: 2,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      headerName: '설명',
      field: 'description',
      flex: 3,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => params.value ?? '-',
    },
    {
      headerName: '파일 수',
      field: 'fileCount',
      maxWidth: 110,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      valueFormatter: (params) => params.value ?? 0,
    },
    {
      headerName: '상태',
      field: 'evalStatus',
      maxWidth: 120,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: ICellRendererParams<KnowledgeEvalItem>) => {
        if (!params.value) return '-';
        return <KnowledgeEvalStatusBadge status={params.value as KnowledgeEvalStatus} />;
      },
    },
    {
      headerName: '작업일시',
      field: 'workTime',
      maxWidth: 180,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      valueFormatter: (params) => params.value ?? '-',
    },
    {
      headerName: '',
      maxWidth: 56,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<KnowledgeEvalItem>) => {
        if (!params.data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenRunDrawer(params.data!);
            }}
          >
            <IconPlayCircle className="size-5 text-[#405189] hover:cursor-pointer" />
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
      cellRenderer: (params: ICellRendererParams<KnowledgeEvalItem>) => {
        if (!params.data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEval(params.data!.evalId);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2">
        <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="평가셋 명으로 검색하세요." className="w-full max-w-[300px]" />
        <Button variant="solid" color="primary">
          추가
        </Button>
      </header>

      <div className="w-full h-full">
        <AgGridReact<KnowledgeEvalItem>
          ref={gridRef}
          rowData={filteredEvals}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          getRowId={(params) => params.data.evalId}
          loading={isFetching}
        />
      </div>

      <KnowledgeEvalRunDrawer ref={evalRunDrawerRef} />
    </div>
  );
}
