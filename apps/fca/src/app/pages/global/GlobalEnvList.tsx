import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent, SideBarDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Dropdown, Input, Select, Tooltip } from 'antd';
import { ChevronDown, CloudDownload, Download } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import ExcelImportResultModal, { type ExcelImportResultModalRef } from '../../features/bot-config/components/ExcelImportResultModal';
import type { ExcelImportResult } from '../../features/bot-config/types/intent';
import AggridGlobalEnvDeploySidebar from '../../features/global/components/AggridGlobalEnvDeploySidebar';
import GlobalEnvDrawer, { type GlobalEnvDrawerRef } from '../../features/global/components/GlobalEnvDrawer';
import { globalEnvQueryKeys, useDeleteGlobalEnv, useExportGlobalEnv, useGetGlobalEnvList, useImportGlobalEnv } from '../../features/global/hooks/useGlobalEnvQueries';
import type { GlobalEnvListItem } from '../../features/global/types/globalEnv.types';
import FileImportModal, { type FileImportModalRef } from '@/components/custom/FileImportModal';
import { IconAlertTriangle, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '공용', path: '/fca/global' },
  { title: '공용 환경변수', path: '/fca/global/env' },
];

export default function GlobalEnvList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

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
            id: 'globalEnvDeployInfo',
            labelDefault: '적용이력',
            labelKey: 'globalEnvDeployInfo',
            iconKey: 'eye',
            toolPanel: AggridGlobalEnvDeploySidebar,
            width: 350,
            minWidth: 350,
          },
        ],
      },
    }),
    [gridOptions, sideBar],
  );

  const { data: envList = [] } = useGetGlobalEnvList({});

  const deleteGlobalEnvMutation = useDeleteGlobalEnv({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: globalEnvQueryKeys.getGlobalEnvList._def });
        toast.success('공용 환경변수가 삭제되었습니다.');
      },
      onError: () => {
        toast.error('공용 환경변수 삭제에 실패했습니다.');
      },
    },
  });

  const { mutate: exportGlobalEnv, isPending: isExporting } = useExportGlobalEnv();

  const { mutate: importGlobalEnv, isPending: isImporting } = useImportGlobalEnv({
    mutationOptions: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: globalEnvQueryKeys.getGlobalEnvList._def });
        importModalRef.current?.close();
        importResultModalRef.current?.open(data as ExcelImportResult);
      },
    },
  });

  const [rowData, setRowData] = useState<GlobalEnvListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('category');
  const [searchValue, setSearchValue] = useState('');

  const gridRef = useRef<AgGridReact<GlobalEnvListItem>>(null);
  const envDrawerRef = useRef<GlobalEnvDrawerRef>(null);
  const importModalRef = useRef<FileImportModalRef>(null);
  const importResultModalRef = useRef<ExcelImportResultModalRef>(null);

  const filteredList = useMemo(() => {
    if (!searchValue.trim()) return envList;
    const keyword = searchValue.toLowerCase();
    return envList.filter((env) => {
      const value = env[filterColumn as keyof GlobalEnvListItem];
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleDeleteEnv = (env: GlobalEnvListItem) => {
    modal.confirm.delete({
      onOk: () => {
        deleteGlobalEnvMutation.mutate({
          category: env.category,
          property: env.property,
        });
      },
    });
  };

  const columnDefs: ColDef<GlobalEnvListItem>[] = [
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
                gridRef.current?.api.openToolPanel('globalEnvDeployInfo');
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
      cellRenderer: (params: ICellRendererParams<GlobalEnvListItem>) => {
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

  const handleImportGlobalEnv = async (files: File[]) => {
    const file = files[0];
    importGlobalEnv({ data: file });
  };

  const handleClickExportData = () => {
    exportGlobalEnv({ isTemplate: 0 });
  };

  const handleClickExportTemplate = () => {
    exportGlobalEnv({ isTemplate: 1 });
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

  const handleClickAddEnv = () => {
    envDrawerRef.current?.open();
  };

  const handleRowDoubleClicked = (e: RowDoubleClickedEvent<GlobalEnvListItem>) => {
    if (!e.data) return;
    envDrawerRef.current?.open({ envData: e.data });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
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
            <Input value={searchValue} onChange={handleSearchChange} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="solid" onClick={handleClickImport}>
              Import
            </Button>
            <Dropdown menu={exportMenu} trigger={['click']} placement="bottomRight">
              <Button color="cyan" variant="solid" loading={isExporting} icon={<Download className="size-4" />}>
                Export
                <ChevronDown className="size-4" />
              </Button>
            </Dropdown>
            <Button variant="solid" color="primary" onClick={handleClickAddEnv}>
              추가
            </Button>
          </div>
        </header>
        <div className="w-full h-full">
          <AgGridReact<GlobalEnvListItem> ref={gridRef} rowData={rowData} columnDefs={columnDefs} onRowDoubleClicked={handleRowDoubleClicked} gridOptions={customGridOptions} />
        </div>
      </div>
      <GlobalEnvDrawer ref={envDrawerRef} />
      <FileImportModal ref={importModalRef} title="Import" accept=".xlsx,.xls" onConfirm={handleImportGlobalEnv} confirmLoading={isImporting} />
      <ExcelImportResultModal ref={importResultModalRef} nameColumnTitle="환경변수명" />
    </div>
  );
}
