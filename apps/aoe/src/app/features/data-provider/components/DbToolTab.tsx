import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Switch } from 'antd';
import dayjs from 'dayjs';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import DbToolDrawer, { type DbToolDrawerRef } from './DbToolDrawer';
import { dataProviderQueryKeys, useDeleteDbTool, useGetDbToolList, useUpdateDbTool } from '../hooks/useDataProviderQueries';
import { ACTIVE_YN, type DbTool } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import NoData from '@/components/custom/NoData';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface DbToolTabProps {
  canWrite: boolean;
}

export default function DbToolTab({ canWrite }: DbToolTabProps) {
  const drawerRef = useRef<DbToolDrawerRef>(null);
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [searchValue, setSearchValue] = useState('');

  // DbToolDrawer 의 무효화 키와 일치시키기 위해 동일 params 사용.
  const { data: tools = [], isFetching } = useGetDbToolList({ params: { size: 1000 } });

  const { mutate: deleteTool } = useDeleteDbTool({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DB 질의도구가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: dataProviderQueryKeys.getDbToolList({ size: 1000 }).queryKey });
      },
      onError: (error) => Log.warn('deleteDbTool failed', error),
    },
  });

  const { mutate: updateTool } = useUpdateDbTool({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: dataProviderQueryKeys.getDbToolList({ size: 1000 }).queryKey });
      },
      onError: (error) => {
        Log.warn('updateDbTool failed', error);
        toast.error('활성 여부 변경에 실패했습니다.');
        // 선반영한 캐시 원복
        queryClient.invalidateQueries({ queryKey: dataProviderQueryKeys.getDbToolList({ size: 1000 }).queryKey });
      },
    },
  });

  // BE 수정 API 는 전체 필드 검증이므로 행 데이터로 전체 payload 를 구성한다.
  const handleToggleActive = (tool: DbTool, checked: boolean) => {
    const nextYn = checked ? ACTIVE_YN.ACTIVE : ACTIVE_YN.INACTIVE;
    // 스위치가 서버 응답을 기다리지 않도록 캐시 선반영 (실패 시 onError 에서 원복)
    queryClient.setQueryData<DbTool[]>(dataProviderQueryKeys.getDbToolList({ size: 1000 }).queryKey, (prev) =>
      prev?.map((t) => (t.toolId === tool.toolId ? { ...t, activeYn: nextYn } : t)),
    );
    updateTool({
      params: { toolId: tool.toolId },
      data: {
        toolName: tool.toolName,
        toolDescription: tool.toolDescription,
        dbConnId: tool.dbConnId,
        sqlSentence: tool.sqlSentence,
        parameters: tool.parameters,
        activeYn: nextYn,
      },
    });
  };

  const handleDeleteClick = (tool: DbTool) => {
    modal.confirm.delete({
      onOk: () => deleteTool({ toolId: tool.toolId }),
    });
  };

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
      headerName: '활성',
      field: 'activeYn',
      maxWidth: 90,
      sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<DbTool>) => {
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
      cellRenderer: (params: ICellRendererParams<DbTool>) => {
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
