import { useRef, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input } from 'antd';
import dayjs from 'dayjs';
import DbConnectionDrawer, { type DbConnectionDrawerRef } from './DbConnectionDrawer';
import { useGetDbConnectionList } from '../hooks/useDataProviderQueries';
import { ACCESS_TYPE_OPTIONS, DBMS_TYPE_OPTIONS, type DbConnection } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import NoData from '@/components/custom/NoData';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const DBMS_LABEL: Record<number, string> = Object.fromEntries(DBMS_TYPE_OPTIONS.map((o) => [o.value, o.label]));
const ACCESS_LABEL: Record<number, string> = Object.fromEntries(ACCESS_TYPE_OPTIONS.map((o) => [o.value, o.label]));

interface DbConnectionTabProps {
  canWrite: boolean;
}

export default function DbConnectionTab({ canWrite }: DbConnectionTabProps) {
  const drawerRef = useRef<DbConnectionDrawerRef>(null);
  const { gridOptions } = useAggridOptions();
  const [searchValue, setSearchValue] = useState('');

  const { data: connections = [], isFetching } = useGetDbConnectionList();

  const filteredConnections = searchValue.trim()
    ? connections.filter((c) => c.connName.toLowerCase().includes(searchValue.toLowerCase()) || (c.ipaddr1 ?? '').toLowerCase().includes(searchValue.toLowerCase()))
    : connections;

  const columnDefs: ColDef<DbConnection>[] = [
    { headerName: '접속명', field: 'connName', flex: 1, cellStyle: { display: 'flex', alignItems: 'center' } },
    {
      headerName: 'DBMS',
      field: 'dbmsType',
      maxWidth: 120,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => DBMS_LABEL[params.value as number] ?? '-',
    },
    {
      headerName: 'Primary IP',
      field: 'ipaddr1',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: ICellRendererParams<DbConnection>) => <span className="text-xs text-gray-500 font-mono truncate">{params.value ?? '-'}</span>,
    },
    { headerName: '포트', field: 'port', maxWidth: 100, cellStyle: { display: 'flex', alignItems: 'center' } },
    {
      headerName: '접속 방식',
      field: 'accessType',
      maxWidth: 130,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => ACCESS_LABEL[params.value as number] ?? '-',
    },
    { headerName: 'Data Source', field: 'dataSource', flex: 1, cellStyle: { display: 'flex', alignItems: 'center' }, valueFormatter: (params) => params.value ?? '-' },
    { headerName: '접속 계정', field: 'userId', maxWidth: 160, cellStyle: { display: 'flex', alignItems: 'center' }, valueFormatter: (params) => params.value ?? '-' },
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
      cellRenderer: (params: ICellRendererParams<DbConnection>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              drawerRef.current?.open({ connection: data });
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
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="접속명 · IP로 검색" className="w-full max-w-[300px]" allowClear />
          <Button type="primary" disabled={!canWrite} onClick={() => drawerRef.current?.open()}>
            추가
          </Button>
        </header>

        <div className="w-full h-full min-h-[320px]">
          {!isFetching && filteredConnections.length === 0 ? (
            <div className="flex items-center justify-center w-full h-full">
              <NoData message="등록된 DB 접속정보가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
            </div>
          ) : (
            <AgGridReact<DbConnection>
              rowData={filteredConnections}
              columnDefs={columnDefs}
              gridOptions={gridOptions}
              getRowId={(params) => params.data.connId}
              loading={isFetching}
              onRowDoubleClicked={(e) => drawerRef.current?.open({ connection: e.data ?? undefined })}
            />
          )}
        </div>
      </div>

      <DbConnectionDrawer ref={drawerRef} />
    </>
  );
}
