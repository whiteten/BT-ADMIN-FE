import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import ToolDrawer, { type ToolDrawerRef } from '../components/ToolDrawer';
import { toolQueryKeys, useDeleteTool, useGetTools } from '../hooks/useToolQueries';
import type { ToolItem } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-600 bg-green-50 border-green-200',
  POST: 'text-blue-600 bg-blue-50 border-blue-200',
  PUT: 'text-orange-600 bg-orange-50 border-orange-200',
  DELETE: 'text-red-600 bg-red-50 border-red-200',
  PATCH: 'text-purple-600 bg-purple-50 border-purple-200',
};

export default function ToolGroupToolList() {
  const { groupId } = useParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const toolDrawerRef = useRef<ToolDrawerRef>(null);
  const { gridOptions } = useAggridOptions();
  const [searchValue, setSearchValue] = useState('');

  const { data: tools = [], isFetching } = useGetTools({
    params: groupId ? { groupId } : undefined,
  });

  const { mutate: deleteTool } = useDeleteTool({
    mutationOptions: {
      onSuccess: () => {
        toast.success('도구가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: toolQueryKeys.getTools({ groupId }).queryKey });
      },
      onError: () => toast.error('도구 삭제에 실패했습니다.'),
    },
  });

  const handleDelete = (tool: ToolItem) => {
    modal.confirm.delete({ onOk: () => deleteTool({ toolId: tool.toolId }) });
  };

  const filteredTools = searchValue.trim()
    ? tools.filter((t) => t.toolName.toLowerCase().includes(searchValue.toLowerCase()) || (t.description ?? '').toLowerCase().includes(searchValue.toLowerCase()))
    : tools;

  const columnDefs: ColDef<ToolItem>[] = [
    {
      headerName: '도구명',
      field: 'toolName',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      headerName: 'Method',
      field: 'method',
      maxWidth: 110,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: ICellRendererParams<ToolItem>) => {
        const method = params.value as string;
        const colorClass = METHOD_COLORS[method] ?? 'text-gray-600 bg-gray-50 border-gray-200';
        return <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${colorClass}`}>{method}</span>;
      },
    },
    {
      headerName: 'URL',
      field: 'toolUrl',
      flex: 2,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: ICellRendererParams<ToolItem>) => <span className="text-xs text-gray-500 font-mono truncate">{params.value}</span>,
    },
    {
      headerName: '설명',
      field: 'description',
      flex: 2,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => params.value ?? '-',
    },
    {
      headerName: '작업일시',
      field: 'workTime',
      maxWidth: 200,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      resizable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<ToolItem>) => {
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

  return (
    <>
      <div className="flex flex-col gap-4 w-full h-full">
        <header className="flex items-center justify-between w-full gap-2">
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="도구명으로 검색" className="w-full max-w-[300px]" allowClear />
          <Button type="primary" onClick={() => toolDrawerRef.current?.open({ groupId: groupId ?? '' })}>
            추가
          </Button>
        </header>

        <div className="w-full h-full">
          <AgGridReact<ToolItem>
            rowData={filteredTools}
            columnDefs={columnDefs}
            gridOptions={gridOptions}
            getRowId={(params) => params.data.toolId}
            loading={isFetching}
            onRowDoubleClicked={(e) => toolDrawerRef.current?.open({ groupId: groupId ?? '', tool: e.data })}
          />
        </div>
      </div>

      <ToolDrawer ref={toolDrawerRef} />
    </>
  );
}
