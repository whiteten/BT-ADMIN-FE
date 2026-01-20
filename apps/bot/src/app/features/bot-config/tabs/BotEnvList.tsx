import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent, SideBarDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import { toast } from '@/shared-util';
import AggridEnvDeploySidebar from '../components/AggridEnvDeploySidebar';
import BotEnvDrawer, { type BotEnvDrawerRef } from '../components/BotEnvDrawer';
import { botQueryKeys, useDeleteEnv, useGetEnvList } from '../hooks/useBotQueries';
import type { EnvListItem } from '../types';
import { IconAlertTriangle, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function BotEnvList() {
  const { serviceId = '' } = useParams();
  const modal = useModal();
  const queryClient = useQueryClient();
  const { gridOptions, sideBar } = useAggridOptions();
  const customGridOptions = useMemo(
    () => ({
      ...gridOptions,
      sideBar: {
        ...(typeof sideBar === 'object' && sideBar !== null ? sideBar : {}),
        toolPanels: [
          ...((sideBar as SideBarDef)?.toolPanels ?? []),
          {
            id: 'envDeployInfo',
            labelDefault: '배포현황',
            labelKey: 'envDeployInfo',
            iconKey: 'eye',
            toolPanel: AggridEnvDeploySidebar,
            width: 350,
            minWidth: 350,
          },
        ],
      },
    }),
    [gridOptions, sideBar],
  );

  // API 훅
  const { data: envList = [] } = useGetEnvList({
    params: { serviceId },
    queryOptions: { enabled: !!serviceId },
  });

  const deleteEnvMutation = useDeleteEnv({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getEnvList._def });
        toast.success('환경변수가 삭제되었습니다.');
      },
      onError: () => {
        toast.error('환경변수 삭제에 실패했습니다.');
      },
    },
  });

  const [rowData, setRowData] = useState<EnvListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('category');
  const [searchValue, setSearchValue] = useState('');

  const gridRef = useRef<AgGridReact<EnvListItem>>(null);
  const envDrawerRef = useRef<BotEnvDrawerRef>(null);

  const filteredList = useMemo(() => {
    if (!searchValue.trim()) return envList;
    const keyword = searchValue.toLowerCase();
    return envList.filter((env) => {
      const value = env[filterColumn as keyof EnvListItem];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [envList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList);
  }, [filteredList]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleDeleteEnv = (env: EnvListItem) => {
    modal.confirm.delete({
      onOk: () => {
        deleteEnvMutation.mutate({
          serviceId,
          configFile: env.configFile,
          category: env.category,
          property: env.property,
        });
      },
    });
  };

  // 그리드 컬럼 정의
  const columnDefs: ColDef<EnvListItem>[] = [
    { headerName: '분류명', field: 'category' },
    { headerName: '변수명', field: 'property' },
    { headerName: '값', field: 'value', flex: 2 },
    {
      headerName: '',
      field: 'reapplyYn',
      maxWidth: 50,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: { value: boolean }) => {
        if (params.value) {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                gridRef.current?.api.openToolPanel('envDeployInfo');
              }}
            >
              <IconAlertTriangle className="size-5 text-yellow-500 hover:cursor-pointer" />
            </button>
          );
        }
        return null;
      },
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<EnvListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEnv(data);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const handleClickAddEnv = () => {
    envDrawerRef.current?.open({ serviceId });
  };

  const handleRowDoubleClicked = (e: RowDoubleClickedEvent<EnvListItem>) => {
    if (!e.data) return;
    envDrawerRef.current?.open({ serviceId, envData: e.data });
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="category"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '분류명', value: 'category' },
              { label: '변수명', value: 'property' },
              { label: '값', value: 'value' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid" color="primary" onClick={handleClickAddEnv}>
            추가
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<EnvListItem> ref={gridRef} rowData={rowData} columnDefs={columnDefs} onRowDoubleClicked={handleRowDoubleClicked} gridOptions={customGridOptions} />
      </div>
      <BotEnvDrawer ref={envDrawerRef} />
    </div>
  );
}
