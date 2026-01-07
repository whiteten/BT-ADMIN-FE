import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent, SideBarDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import AggridDeployServerInfoSidebar from '../components/AggridDeployServerInfoSidebar';
import BotDeployConfigDrawer, { type BotDeployConfigDrawerRef } from '../components/BotDeployConfigDrawer';
import BotVersionDrawer, { type BotVersionDrawerRef } from '../components/BotVersionDrawer';
import { botQueryKeys, useDeleteBotVersion, useGetBotVersions, usePublishBotVersion } from '../hooks/useBotQueries';
import type { BotVersionListItem } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function BotVersionList() {
  const { serviceId = '' } = useParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions, sideBar } = useAggridOptions();
  const [rowData, setRowData] = useState<BotVersionListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('version');
  const [searchValue, setSearchValue] = useState('');

  const gridRef = useRef<AgGridReact<BotVersionListItem>>(null);
  const versionDrawerRef = useRef<BotVersionDrawerRef>(null);
  const deployConfigDrawerRef = useRef<BotDeployConfigDrawerRef>(null);

  const { data: versionList, isFetching: isFetchingVersionList } = useGetBotVersions({ params: { serviceId } });

  const { mutate: publishBotVersion, isPending: isPublishing } = usePublishBotVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전이 배포되었습니다.');
      },
    },
  });

  const { mutate: deleteBotVersion } = useDeleteBotVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getBotVersions({ serviceId }).queryKey });
      },
    },
  });

  const handleDeleteVersion = (serviceVer: string) => {
    modal.confirm.delete({
      onOk: () => deleteBotVersion({ serviceId, serviceVer }),
    });
  };

  const columnDefs: ColDef<BotVersionListItem>[] = [
    { headerName: 'ID', field: 'serviceId', hide: true },
    { headerName: '버전', field: 'serviceVer' },
    { headerName: '버전명', field: 'versionName' },
    { headerName: '변경내용', field: 'versionDesc' },
    { headerName: '작업자', field: 'workUser' },
    { headerName: '작업일시', field: 'workTime' },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<BotVersionListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteVersion(data.serviceVer);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!versionList) return [];
    if (!searchValue.trim()) return versionList;
    const keyword = searchValue.toLowerCase();
    return versionList.filter((version) => {
      const value = version[filterColumn as keyof typeof version];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [versionList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleClickAddVersion = () => {
    versionDrawerRef.current?.open({ serviceId });
  };

  const handleRowDoubleClicked = (e: RowDoubleClickedEvent<BotVersionListItem>) => {
    Log.debug('handleRowDoubleClicked', e.data);
    versionDrawerRef.current?.open({ serviceId, serviceVer: e.data?.serviceVer });
  };

  const handleClickDeployConfig = () => {
    deployConfigDrawerRef.current?.open({ serviceId });
  };

  const handleClickPublishVersion = () => {
    const selectedRows = gridRef.current?.api?.getSelectedRows();
    const serviceVer = selectedRows?.[0]?.serviceVer;
    if (!serviceVer) {
      toast.warning('버전을 선택해주세요.');
      return;
    }
    modal.confirm.execute({
      options: {
        title: '배포 확인',
        content: `선택한 버전(${serviceVer})을 배포하시겠습니까?`,
      },
      onOk: () => publishBotVersion({ params: { serviceId, serviceVer }, data: {} }),
    });
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="version"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '버전', value: 'version' },
              { label: '버전명', value: 'versionName' },
              { label: '변경내용', value: 'versionDesc' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid" onClick={handleClickAddVersion}>
            버전추가
          </Button>
          <Button variant="solid">대화편집</Button>
          <Button variant="solid" color="primary" onClick={handleClickPublishVersion} loading={isPublishing}>
            배포
          </Button>
          <Button variant="solid" color="cyan" onClick={handleClickDeployConfig}>
            배포설정
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<BotVersionListItem>
          ref={gridRef}
          {...{ rowData, columnDefs }}
          gridOptions={{
            ...gridOptions,
            sideBar: {
              ...(typeof sideBar === 'object' && sideBar !== null ? sideBar : {}),
              toolPanels: [
                ...((sideBar as SideBarDef)?.toolPanels ?? []),
                {
                  id: 'deployServerInfo',
                  labelDefault: '배포현황',
                  labelKey: 'deployServerInfo',
                  iconKey: 'eye',
                  toolPanel: AggridDeployServerInfoSidebar,
                  toolPanelParams: { serviceId },
                },
              ],
            },
          }}
          loading={isFetchingVersionList}
          onRowDoubleClicked={handleRowDoubleClicked}
        />
      </div>
      <BotVersionDrawer ref={versionDrawerRef} />
      <BotDeployConfigDrawer ref={deployConfigDrawerRef} />
    </div>
  );
}
