import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Switch } from 'antd';
import dayjs from 'dayjs';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import DbConnectionDrawer, { type DbConnectionDrawerRef } from './DbConnectionDrawer';
import { dataProviderQueryKeys, useDeleteDbConnection, useGetDbConnectionList, useGetDbToolList, useUpdateDbConnection } from '../hooks/useDataProviderQueries';
import { ACCESS_TYPE_OPTIONS, ACTIVE_YN, DBMS_TYPE_OPTIONS, type DbConnection } from '../types';
import { getDbConnectionDeleteConfirmOptions } from '../utils/dbConnectionDeleteConfirm';
import { IconTrash } from '@/components/custom/Icons';
import NoData from '@/components/custom/NoData';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const DBMS_LABEL: Record<number, string> = Object.fromEntries(DBMS_TYPE_OPTIONS.map((o) => [o.value, o.label]));
const ACCESS_LABEL: Record<number, string> = Object.fromEntries(ACCESS_TYPE_OPTIONS.map((o) => [o.value, o.label]));

interface DbConnectionTabProps {
  canWrite: boolean;
}

export default function DbConnectionTab({ canWrite }: DbConnectionTabProps) {
  const drawerRef = useRef<DbConnectionDrawerRef>(null);
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [searchValue, setSearchValue] = useState('');

  const { data: connections = [], isFetching } = useGetDbConnectionList();
  // 삭제 확인 시 접속정보를 참조 중인 질의도구 건수 안내용. DbToolTab 과 동일 params 로 캐시 공유.
  const { data: dbTools = [] } = useGetDbToolList({ params: { size: 1000 } });

  const { mutate: deleteConnection } = useDeleteDbConnection({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DB 접속정보가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: dataProviderQueryKeys.getDbConnectionList().queryKey });
        // BE가 참조 중인 질의도구를 연쇄 삭제하므로 도구 목록도 갱신 (DbToolTab/DbToolDrawer 와 동일 params 키)
        queryClient.invalidateQueries({ queryKey: dataProviderQueryKeys.getDbToolList({ size: 1000 }).queryKey });
      },
      onError: (error) => Log.warn('deleteDbConnection failed', error),
    },
  });

  const { mutate: updateConnection } = useUpdateDbConnection({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: dataProviderQueryKeys.getDbConnectionList().queryKey });
      },
      onError: (error) => {
        Log.warn('updateDbConnection failed', error);
        toast.error('활성 여부 변경에 실패했습니다.');
        // 선반영한 캐시 원복
        queryClient.invalidateQueries({ queryKey: dataProviderQueryKeys.getDbConnectionList().queryKey });
      },
    },
  });

  // BE 수정 API 는 전체 필드 검증이므로 행 데이터로 전체 payload 를 구성한다. 비밀번호 미전송 → 기존 값 유지.
  const handleToggleActive = (connection: DbConnection, checked: boolean) => {
    const nextYn = checked ? ACTIVE_YN.ACTIVE : ACTIVE_YN.INACTIVE;
    // 스위치가 서버 응답을 기다리지 않도록 캐시 선반영 (실패 시 onError 에서 원복)
    queryClient.setQueryData<DbConnection[]>(dataProviderQueryKeys.getDbConnectionList().queryKey, (prev) =>
      prev?.map((c) => (c.connId === connection.connId ? { ...c, activeYn: nextYn } : c)),
    );
    updateConnection({
      params: { connId: connection.connId },
      data: {
        connName: connection.connName,
        dbmsType: connection.dbmsType,
        ipaddr1: connection.ipaddr1,
        ipaddr2: connection.ipaddr2 ?? undefined,
        port: connection.port,
        accessType: connection.accessType,
        dataSource: connection.dataSource,
        userId: connection.userId,
        activeYn: nextYn,
      },
    });
  };

  const handleDeleteClick = (connection: DbConnection) => {
    const usedCount = dbTools.filter((tool) => tool.dbConnId === connection.connId).length;
    modal.confirm.delete({
      options: getDbConnectionDeleteConfirmOptions(usedCount),
      onOk: () => deleteConnection({ connId: connection.connId }),
    });
  };

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
      headerName: '활성',
      field: 'activeYn',
      maxWidth: 90,
      sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<DbConnection>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <Switch
              size="small"
              disabled={!canWrite}
              checked={(data.activeYn ?? ACTIVE_YN.ACTIVE) === ACTIVE_YN.ACTIVE}
              onChange={(checked) => handleToggleActive(data, checked)}
            />
          </div>
        );
      },
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
      cellRenderer: (params: ICellRendererParams<DbConnection>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(data);
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
