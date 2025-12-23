import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Tag } from 'antd';
import dayjs from 'dayjs';
import { confirmModal, toast } from '@/shared-util';
import EntityDrawer, { type EntityDrawerRef } from '../components/EntityDrawer';
import TrainStatusBadge from '../components/TrainStatusBadge';
import { modelQueryKeys, useDeleteEntity, useGetEntities } from '../hooks/useModelQueries';
import type { EntityListItem, TrainStatus } from '../types';
import { IconTag, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

export default function ModelEntityList() {
  const { modelId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<EntityListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('entityName');
  const [searchValue, setSearchValue] = useState('');
  const drawerRef = useRef<EntityDrawerRef>(null);

  const { data: entityList, isFetching } = useGetEntities({ params: { modelId } });

  const { mutate: deleteEntity } = useDeleteEntity({
    mutationOptions: {
      onSuccess: () => {
        toast.success('개체가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEntities({ modelId }).queryKey });
      },
    },
  });

  const handleDeleteEntity = (entityId: string) => {
    confirmModal.delete({
      onOk: () => deleteEntity({ modelId, entityId }),
    });
  };

  const columnDefs: ColDef<EntityListItem>[] = [
    { headerName: 'ID', field: 'entityId', hide: true },
    { headerName: '개체이름', field: 'entityName' },
    {
      headerName: '학습상태',
      field: 'trainStatus',
      maxWidth: 120,
      cellRenderer: (params: { value: number }) => <TrainStatusBadge status={params.value as TrainStatus} />,
    },
    { headerName: 'Value수', field: 'valueCount', maxWidth: 120 },
    {
      headerName: '대표값',
      field: 'entityValues',
      flex: 3,
      sortable: false,
      valueFormatter: (params: { value: string[] }) => params.value?.join(', ') ?? '',
      cellRenderer: (params: { value: string[] }) => {
        return (
          <div className="flex flex-wrap gap-1 pt-[1.5px]">
            {params.value.map((value, index) => (
              <Tag key={index} color="default" variant="outlined" icon={<IconTag />} className="!inline-flex items-center !px-2 !py-1 !m-0 !bg-white">
                {value}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      headerName: '작업일시',
      field: 'workTime',
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
      cellRenderer: (params: ICellRendererParams<EntityListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEntity(data.entityId);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!entityList) return [];
    if (!searchValue.trim()) return entityList;
    const keyword = searchValue.toLowerCase();
    return entityList.filter((entity) => {
      const value = entity[filterColumn as keyof typeof entity];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [entityList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleClickAddEntity = () => {
    drawerRef.current?.open({ modelId });
  };

  const handleRowDoubleClick = (event: RowDoubleClickedEvent<EntityListItem>) => {
    if (!event.data) return;
    const { entityId } = event.data;
    navigate(`/bot/bot-config/model/${modelId}/entity/${entityId}`);
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="entityName"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[{ label: '개체이름', value: 'entityName' }]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid">Import</Button>
          <Button variant="solid">Export</Button>
          <Button variant="solid" color="primary" onClick={handleClickAddEntity}>
            추가
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<EntityListItem> rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isFetching} onRowDoubleClicked={handleRowDoubleClick} />
      </div>
      <EntityDrawer ref={drawerRef} />
    </div>
  );
}
