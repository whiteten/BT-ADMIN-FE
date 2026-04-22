import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent, SideBarDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Input, Select, Tooltip } from 'antd';
import { ChevronDown, CloudDownload, Download } from 'lucide-react';
import { toast } from '@/shared-util';
import AggridEnvDeploySidebar from '../components/AggridEnvDeploySidebar';
import BotEnvDrawer, { type BotEnvDrawerRef } from '../components/BotEnvDrawer';
import ExcelImportResultModal, { type ExcelImportResultModalRef } from '../components/ExcelImportResultModal';
import { botQueryKeys, useDeleteEnv, useExportEnv, useGetBotDeployConfig, useGetEnvList, useImportEnv } from '../hooks/useBotQueries';
import type { EnvListItem } from '../types';
import type { ExcelImportResult } from '../types/intent';
import FileImportModal, { type FileImportModalRef } from '@/components/custom/FileImportModal';
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
            labelDefault: '적용이력',
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
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getEnvList({ serviceId }).queryKey });
        toast.success('환경변수가 삭제되었습니다.');
      },
      onError: () => {
        toast.error('환경변수 삭제에 실패했습니다.');
      },
    },
  });

  const { refetch: refetchBotDeployConfig } = useGetBotDeployConfig({
    params: { serviceId },
    queryOptions: { enabled: false },
  });

  const { mutate: exportEnv, isPending: isExporting } = useExportEnv();

  const { mutate: importEnv, isPending: isImporting } = useImportEnv({
    mutationOptions: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getEnvList({ serviceId }).queryKey });
        importModalRef.current?.close();
        importResultModalRef.current?.open(data as ExcelImportResult);
      },
    },
  });

  const [rowData, setRowData] = useState<EnvListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('category');
  const [searchValue, setSearchValue] = useState('');

  const gridRef = useRef<AgGridReact<EnvListItem>>(null);
  const envDrawerRef = useRef<BotEnvDrawerRef>(null);
  const importModalRef = useRef<FileImportModalRef>(null);
  const importResultModalRef = useRef<ExcelImportResultModalRef>(null);

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

  const handleClickImport = () => {
    importModalRef.current?.open();
  };

  const handleImportEnv = async (files: File[]) => {
    const file = files[0];
    importEnv({ params: { serviceId }, data: file });
  };

  const handleClickExportData = () => {
    exportEnv({ serviceId, isTemplate: 0 });
  };

  const handleClickExportTemplate = () => {
    exportEnv({ serviceId, isTemplate: 1 });
  };

  const exportMenu = {
    items: [
      {
        label: (
          <Tooltip
            title={<span style={{ whiteSpace: 'pre-line' }}>{`전체 데이터 파일(엑셀)을 다운로드합니다.\n데이터를 일괄 내보내기 위한 용도입니다.`}</span>}
            placement="left"
            styles={{ root: { maxWidth: '300px' } }}
          >
            <span className="flex items-center gap-2">
              <CloudDownload className="size-4" />
              데이터 다운로드
            </span>
          </Tooltip>
        ),
        key: 'export-data',
        onClick: handleClickExportData,
      },
      {
        label: (
          <Tooltip
            title={<span style={{ whiteSpace: 'pre-line' }}>{`빈 템플릿 파일(엑셀)을 다운로드합니다.\n데이터를 직접 입력하기 위한 용도입니다.`}</span>}
            placement="left"
            styles={{ root: { maxWidth: '300px' } }}
          >
            <span className="flex items-center gap-2">
              <Download className="size-4" />
              템플릿 다운로드
            </span>
          </Tooltip>
        ),
        key: 'export-template',
        onClick: handleClickExportTemplate,
      },
    ],
  };

  const handleClickAddEnv = async () => {
    const { data: deployConfig } = await refetchBotDeployConfig();
    const hasAssignedServer = deployConfig?.some((config) => config.assignYn === 1);
    if (!hasAssignedServer) {
      toast.warning('배포 설정된 봇 서버가 없습니다.\n봇버전/배포 화면에서 배포설정을 확인해주세요.');
      return;
    }
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
          <Button variant="solid" onClick={handleClickImport}>
            Import
          </Button>
          <Dropdown menu={exportMenu} trigger={['click']} placement="bottomRight">
            <Button color="cyan" variant="solid" loading={isExporting} icon={<ChevronDown className="size-4" />} iconPlacement="end">
              Export
            </Button>
          </Dropdown>
          <Button variant="solid" color="primary" onClick={handleClickAddEnv}>
            추가
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<EnvListItem> ref={gridRef} rowData={rowData} columnDefs={columnDefs} onRowDoubleClicked={handleRowDoubleClicked} gridOptions={customGridOptions} />
      </div>
      <BotEnvDrawer ref={envDrawerRef} />
      <FileImportModal ref={importModalRef} title="Import" accept=".xlsx,.xls" onConfirm={handleImportEnv} confirmLoading={isImporting} />
      <ExcelImportResultModal ref={importResultModalRef} nameColumnTitle="환경변수명" />
    </div>
  );
}
