import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import SnapshotCompareDrawer, { type SnapshotCompareDrawerRef } from '../components/SnapshotCompareDrawer';
import { modelQueryKeys, useCreateSnapshot, useDeleteSnapshot, useGetSnapshots, useRestoreSnapshot } from '../hooks/useModelQueries';
import type { SnapshotListItem } from '../types/snapshot';
import { IconRollback, IconSearch, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function ModelSnapshotList() {
  const { modelId = '' } = useParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const snapshotCompareDrawerRef = useRef<SnapshotCompareDrawerRef>(null);
  const [rowData, setRowData] = useState<SnapshotListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('modelVersionName');
  const [searchValue, setSearchValue] = useState('');
  const [snapshotName, setSnapshotName] = useState('');

  const { data: snapshotList, isFetching } = useGetSnapshots({
    params: { modelId },
    queryOptions: { enabled: !!modelId },
  });

  const { mutate: createSnapshot, isPending: isCreating } = useCreateSnapshot({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스냅샷이 추가되었습니다.');
        setSnapshotName('');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getSnapshots({ modelId }).queryKey });
      },
    },
  });

  const { mutate: deleteSnapshot } = useDeleteSnapshot({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스냅샷이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getSnapshots({ modelId }).queryKey });
      },
    },
  });

  const { mutate: restoreSnapshot } = useRestoreSnapshot({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스냅샷이 복원되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getSnapshots({ modelId }).queryKey });
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntents({ modelId }).queryKey });
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEntities({ modelId }).queryKey });
      },
    },
  });

  const handleCreateSnapshot = () => {
    if (!snapshotName?.trim()) {
      toast.warning('스냅샷 이름을 입력하세요.');
      return;
    }
    const modelVersion = Math.random().toString(36).substring(2, 12);
    createSnapshot({ params: { modelId }, data: { modelVersion, modelVersionName: snapshotName } });
  };

  const handleDeleteSnapshot = (modelVersion: string) => {
    modal.confirm.delete({
      onOk: () => deleteSnapshot({ modelId, modelVersion }),
    });
  };

  const handleRestoreSnapshot = (modelVersion: string, modelVersionName: string) => {
    modal.confirm.execute({
      onOk: () => restoreSnapshot({ modelId, modelVersion }),
      options: {
        content: `스냅샷(${modelVersionName})으로 복원하시겠습니까?`,
      },
    });
  };

  const columnDefs: ColDef<SnapshotListItem>[] = [
    { headerName: 'modelId', field: 'modelId', hide: true },
    { headerName: '모델버전', field: 'modelVersion', hide: true },
    { headerName: '스냅샷 이름', field: 'modelVersionName', flex: 1 },
    { headerName: '작업자', field: 'workUser', hide: true },
    {
      headerName: '작업일시',
      field: 'workTime',
      maxWidth: 180,
      valueFormatter: (params: { value: string }) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '',
      maxWidth: 120,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<SnapshotListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <div className="flex items-center gap-3">
            <Tooltip title="비교">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  snapshotCompareDrawerRef.current?.open({ modelId, data });
                }}
              >
                <IconSearch className="size-5 text-[#888B9A] hover:cursor-pointer" />
              </button>
            </Tooltip>
            <Tooltip title="복원">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestoreSnapshot(data.modelVersion, data.modelVersionName);
                }}
              >
                <IconRollback className="size-5 text-[#888888] hover:cursor-pointer" />
              </button>
            </Tooltip>
            <Tooltip title="삭제">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSnapshot(data.modelVersion);
                }}
              >
                <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
              </button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!snapshotList) return [];
    if (!searchValue.trim()) return snapshotList;
    const keyword = searchValue.toLowerCase();
    return snapshotList.filter((snapshot) => {
      const value = snapshot[filterColumn as keyof typeof snapshot];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [snapshotList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="modelVersionName"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[{ label: '스냅샷 이름', value: 'modelVersionName' }]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Input placeholder="스냅샷 이름을 입력하세요." className="!w-[400px]" value={snapshotName} onChange={(e) => setSnapshotName(e.target.value)} />
          <Button variant="solid" color="primary" onClick={handleCreateSnapshot} loading={isCreating}>
            추가
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<SnapshotListItem> rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isFetching} />
      </div>
      <SnapshotCompareDrawer ref={snapshotCompareDrawerRef} />
    </div>
  );
}
