import { useRef, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input } from 'antd';
import dayjs from 'dayjs';
import DbToolDrawer, { type DbToolDrawerRef } from './DbToolDrawer';
import { useGetDbToolList } from '../hooks/useDataProviderQueries';
import type { DbTool } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import NoData from '@/components/custom/NoData';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface DbToolTabProps {
  canWrite: boolean;
}

export default function DbToolTab({ canWrite }: DbToolTabProps) {
  const drawerRef = useRef<DbToolDrawerRef>(null);
  const { gridOptions } = useAggridOptions();
  const [searchValue, setSearchValue] = useState('');

  // DbToolDrawer 의 무효화 키와 일치시키기 위해 동일 params 사용.
  const { data: tools = [], isFetching } = useGetDbToolList({ params: { size: 1000 } });

  const filteredTools = searchValue.trim()
    ? tools.filter((t) => t.toolName.toLowerCase().includes(searchValue.toLowerCase()) || (t.toolDescription ?? '').toLowerCase().includes(searchValue.toLowerCase()))
    : tools;

  const columnDefs: ColDef<DbTool>[] = [
    { headerName: '도구명', field: 'toolName', flex: 1, cellStyle: { display: 'flex', alignItems: 'center' } },
    { headerName: 'DB 접속정보', field: 'connName', maxWidth: 200, cellStyle: { display: 'flex', alignItems: 'center' }, valueFormatter: (params) => params.value ?? '-' },
    {
      headerName: '설명',
      field: 'toolDescription',
      flex: 2,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => params.value ?? '-',
    },
    {
      headerName: 'SQL',
      field: 'sqlSentence',
      flex: 2,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: ICellRendererParams<DbTool>) => <span className="text-xs text-gray-500 font-mono truncate">{params.value ?? '-'}</span>,
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
      hide: !canWrite,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<DbTool>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              drawerRef.current?.open({ tool: data });
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
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="도구명 · 설명으로 검색" className="w-full max-w-[300px]" allowClear />
          <Button type="primary" disabled={!canWrite} onClick={() => drawerRef.current?.open()}>
            추가
          </Button>
        </header>

        <div className="w-full h-full min-h-[320px]">
          {!isFetching && filteredTools.length === 0 ? (
            <div className="flex items-center justify-center w-full h-full">
              <NoData message="등록된 DB 질의도구가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
            </div>
          ) : (
            <AgGridReact<DbTool>
              rowData={filteredTools}
              columnDefs={columnDefs}
              gridOptions={gridOptions}
              getRowId={(params) => params.data.toolId}
              loading={isFetching}
              onRowDoubleClicked={(e) => drawerRef.current?.open({ tool: e.data ?? undefined })}
            />
          )}
        </div>
      </div>

      <DbToolDrawer ref={drawerRef} />
    </>
  );
}
