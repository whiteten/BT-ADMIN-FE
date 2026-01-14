import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent, SideBarDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import AggridEnvDeploySidebar from '../components/AggridEnvDeploySidebar';
import BotEnvDrawer, { type BotEnvDrawerRef } from '../components/BotEnvDrawer';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

// 임시 타입 정의
interface EnvNodeItem {
  fileName: string; // 파일명 (시나리오ID_시나리오명 형식)
  systemId: string; // 시스템ID
  status: string; // 상태 (완료/실패)
  workDateTime: string; // 작업일시
  worker: string; // 작업자
}

interface BotEnvItem {
  envId: string;
  categoryName: string;
  varName: string;
  varValue: string;
  nodes: EnvNodeItem[];
}

// 더미 노드 데이터
const dummyNodes: EnvNodeItem[] = [
  { fileName: 'SCN-0001_로그인', systemId: 'ipronv63', status: '완료', workDateTime: '2025-01-13 10:30:00', worker: 'admin' },
  { fileName: 'SCN-0002_회원가입', systemId: 'IPRONv53', status: '완료', workDateTime: '2025-01-13 10:25:00', worker: 'admin' },
  { fileName: 'SCN-0003_결제처리', systemId: 'ipronv53-n2a', status: '실패', workDateTime: '2025-01-13 10:20:00', worker: 'admin' },
  { fileName: 'SCN-0004_주문조회', systemId: 'ipronv53-n2b', status: '완료', workDateTime: '2025-01-13 10:15:00', worker: 'admin' },
  { fileName: 'SCN-0005_배송추적', systemId: 'rnd6-worker1', status: '실패', workDateTime: '2025-01-13 10:10:00', worker: 'admin' },
];

// 임시 더미 데이터
const dummyEnvList: BotEnvItem[] = [
  { envId: 'env-001', categoryName: 'FCS_INFO', varName: 'IPADDR', varValue: '100.100.108.141', nodes: dummyNodes },
  { envId: 'env-002', categoryName: 'FCS_INFO', varName: '챗경험없는고객', varValue: '01040575212', nodes: dummyNodes },
  { envId: 'env-003', categoryName: 'FCS_INFO', varName: 'WCS_PORT', varValue: '65432', nodes: dummyNodes },
  { envId: 'env-004', categoryName: 'NLU', varName: 'MODEL_NAME', varValue: 'ICC_DEMO', nodes: dummyNodes },
  { envId: 'env-005', categoryName: '정책기준', varName: '대기고객수기준', varValue: '1', nodes: dummyNodes },
  { envId: 'env-006', categoryName: '정책기준', varName: '예상대기시간기준', varValue: '10', nodes: dummyNodes },
];

export default function BotEnvList() {
  const { serviceId = '' } = useParams();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<BotEnvItem[]>(dummyEnvList);
  const [filterColumn, setFilterColumn] = useState('categoryName');
  const [searchValue, setSearchValue] = useState('');

  const gridRef = useRef<AgGridReact<BotEnvItem>>(null);
  const envDrawerRef = useRef<BotEnvDrawerRef>(null);

  const filteredList = useMemo(() => {
    if (!searchValue.trim()) return dummyEnvList;
    const keyword = searchValue.toLowerCase();
    return dummyEnvList.filter((env) => {
      const value = env[filterColumn as keyof BotEnvItem];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList);
  }, [filteredList]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleDeleteEnv = (envId: string) => {
    modal.confirm.delete({
      onOk: () => {
        // TODO: API 연동
        console.log('Delete env:', envId);
      },
    });
  };

  // 그리드 컬럼 정의
  const columnDefs: ColDef<BotEnvItem>[] = [
    { headerName: '분류명', field: 'categoryName' },
    { headerName: '변수명', field: 'varName' },
    { headerName: '값', field: 'varValue', flex: 2 },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<BotEnvItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEnv(data.envId);
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

  const handleRowDoubleClicked = (e: RowDoubleClickedEvent<BotEnvItem>) => {
    if (!e.data) return;
    envDrawerRef.current?.open({ serviceId, envId: e.data.envId });
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="categoryName"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '분류명', value: 'categoryName' },
              { label: '변수명', value: 'varName' },
              { label: '값', value: 'varValue' },
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
        <AgGridReact<BotEnvItem>
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          onRowDoubleClicked={handleRowDoubleClicked}
          gridOptions={{
            ...gridOptions,
            sideBar: {
              ...((typeof gridOptions.sideBar === 'object' && gridOptions.sideBar !== null ? gridOptions.sideBar : {}) as SideBarDef),
              toolPanels: [
                ...((gridOptions.sideBar as SideBarDef)?.toolPanels ?? []),
                {
                  id: 'envDeployInfo',
                  labelDefault: '배포현황',
                  labelKey: 'envDeployInfo',
                  iconKey: 'eye',
                  toolPanel: AggridEnvDeploySidebar,
                },
              ],
            },
          }}
        />
      </div>
      <BotEnvDrawer ref={envDrawerRef} />
    </div>
  );
}
