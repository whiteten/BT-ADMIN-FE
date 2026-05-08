import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent, SideBarDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { Download, Loader2 } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import AggridDeployServerInfoSidebar from '../components/AggridDeployServerInfoSidebar';
import BotDeployConfigDrawer, { type BotDeployConfigDrawerRef } from '../components/BotDeployConfigDrawer';
import BotVersionDrawer, { type BotVersionDrawerRef } from '../components/BotVersionDrawer';
import BotVersionPublishResultModal, { type BotVersionPublishResultModalRef } from '../components/BotVersionPublishResultModal';
import { botQueryKeys, useCheckDeployable, useDeleteBotVersion, useDownloadScenario, useGetBotVersions, useGetIfeInfo, usePublishBotVersion } from '../hooks/useBotQueries';
import type { BotVersionListItem, IfeInfo, PublishBotVersionResult } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function BotVersionList() {
  const { serviceId = '' } = useParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions, sideBar } = useAggridOptions();
  const customGridOptions = useMemo(
    () => ({
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
    }),
    [gridOptions, sideBar, serviceId],
  );
  const [rowData, setRowData] = useState<BotVersionListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('version');
  const [searchValue, setSearchValue] = useState('');
  const [selectedRow, setSelectedRow] = useState<BotVersionListItem | null>(null);

  const gridRef = useRef<AgGridReact<BotVersionListItem>>(null);
  const versionDrawerRef = useRef<BotVersionDrawerRef>(null);
  const deployConfigDrawerRef = useRef<BotDeployConfigDrawerRef>(null);
  const publishResultModalRef = useRef<BotVersionPublishResultModalRef>(null);

  const isSelectedCopying = selectedRow !== null && selectedRow.flowEditorId === null;

  const { data: versionList, isLoading: isLoadingVersionList } = useGetBotVersions({ params: { serviceId } });

  const { mutate: publishBotVersion, isPending: isPublishing } = usePublishBotVersion({
    mutationOptions: {
      onSuccess: (data) => {
        publishResultModalRef.current?.open(data as PublishBotVersionResult);
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getBotDeployConfig({ serviceId }).queryKey });
      },
    },
  });

  const { refetch: refetchCheckDeployable, isFetching: isCheckingDeployable } = useCheckDeployable({
    params: { serviceId },
    queryOptions: { enabled: false },
  });

  const { mutate: getIfeInfo, isPending: isEditing } = useGetIfeInfo({
    mutationOptions: {
      onSuccess: (data) => {
        const ifeInfo = data as IfeInfo;
        if (!ifeInfo.redirectUrl) {
          toast.warning('편집기 접속 정보가 없습니다.');
          return;
        }
        window.open(ifeInfo.redirectUrl, '_blank');
      },
      onError: () => {
        // 글로벌 핸들러(useApiErrorHandler)가 서버 message로 toast 처리
      },
    },
  });

  const { mutate: downloadScenario } = useDownloadScenario({
    mutationOptions: {
      onError: () => {
        toast.error('시나리오 파일 다운로드에 실패했습니다.');
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
    { headerName: '버전', field: 'serviceVer', maxWidth: 100 },
    {
      headerName: '버전명',
      field: 'versionName',
      cellStyle: { display: 'flex', alignItems: 'center', gap: '4px' },
      cellRenderer: (params: ICellRendererParams<BotVersionListItem>) => {
        const { data } = params;
        if (!data) return null;
        const isCopying = data.flowEditorId === null;
        return (
          <div className="flex items-center gap-2">
            <span>{data.versionName}</span>
            {isCopying && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                복사 중
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      headerName: '시나리오파일',
      field: 'scenarioFile',
      cellStyle: { display: 'flex', alignItems: 'center', gap: '6px' },
      cellRenderer: (params: ICellRendererParams<BotVersionListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <>
            <span className="truncate">{data.scenarioFile}</span>
            {data.scenarioFile && (
              <button
                type="button"
                title="시나리오 파일 다운로드"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadScenario({ serviceId, serviceVer: data.serviceVer });
                }}
              >
                <Download className="size-4 text-blue-500 hover:text-blue-700 hover:cursor-pointer shrink-0" />
              </button>
            )}
          </>
        );
      },
    },
    { headerName: '변경내용', field: 'versionDesc' },
    { headerName: '작업자', field: 'workUserName', maxWidth: 120 },
    { headerName: '작업일시', field: 'workTime', valueFormatter: (params: { value: string }) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-') },
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

  const handleClickPublishVersion = async () => {
    const selectedRows = gridRef.current?.api?.getSelectedRows();
    const serviceVer = selectedRows?.[0]?.serviceVer;
    if (!serviceVer) {
      toast.warning('버전을 선택해주세요.');
      return;
    }
    if (selectedRows?.[0]?.flowEditorId === null) {
      toast.warning('버전 복사가 진행 중입니다. 완료 후 이용하세요.');
      return;
    }
    const scenarioFile = selectedRows?.[0]?.scenarioFile;
    if (!scenarioFile) {
      toast.warning('업로드된 파일이 없습니다.\n대화편집에서 업로드를 진행해주세요.');
      return;
    }
    const { data: checkDeployable } = await refetchCheckDeployable();
    if (!checkDeployable?.deployable) {
      toast.warning('배포 설정된 봇 서버가 없습니다.\n배포설정을 확인해주세요.');
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

  const handleClickEditVersion = () => {
    const selectedRows = gridRef.current?.api?.getSelectedRows();
    const serviceVer = selectedRows?.[0]?.serviceVer;
    if (!serviceVer) {
      toast.warning('버전을 선택해주세요.');
      return;
    }
    if (selectedRows?.[0]?.flowEditorId === null) {
      toast.warning('버전 복사가 진행 중입니다. 완료 후 이용하세요.');
      return;
    }
    modal.confirm.execute({
      options: {
        title: '대화편집 확인',
        content: `선택한 버전(${serviceVer})을 편집하시겠습니까?`,
      },
      onOk: () => getIfeInfo({ params: { serviceId, serviceVer }, data: {} }),
    });
  };

  const handleSelectionChanged = () => {
    const rows = gridRef.current?.api?.getSelectedRows() ?? [];
    setSelectedRow(rows[0] ?? null);
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
          <Button
            variant="solid"
            onClick={handleClickEditVersion}
            loading={isEditing}
            disabled={isSelectedCopying}
            title={isSelectedCopying ? '버전 복사가 진행 중입니다. 완료 후 이용하세요.' : undefined}
          >
            대화편집
          </Button>
          <Button
            variant="solid"
            color="primary"
            onClick={handleClickPublishVersion}
            loading={isPublishing || isCheckingDeployable}
            disabled={isSelectedCopying}
            title={isSelectedCopying ? '버전 복사가 진행 중입니다. 완료 후 이용하세요.' : undefined}
          >
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
          gridOptions={customGridOptions}
          loading={isLoadingVersionList}
          onRowDoubleClicked={handleRowDoubleClicked}
          onSelectionChanged={handleSelectionChanged}
        />
      </div>
      <BotVersionDrawer ref={versionDrawerRef} />
      <BotDeployConfigDrawer ref={deployConfigDrawerRef} />
      <BotVersionPublishResultModal ref={publishResultModalRef} />
    </div>
  );
}
