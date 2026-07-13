/**
 * 시나리오 버전/배포 탭 (FCA BotVersionList 패턴 응용 — 별도 Grid 컴포넌트로 분리하지 않고 탭 파일에 직접 구현).
 *
 * <p>컬럼: 버전 / 버전명 / 시나리오파일(다운로드 아이콘) / 시나리오문서(다운로드 아이콘) / 변경내용 / 작업자 / 작업일시 / 삭제</p>
 * <p>액션: 버전추가 / 배포 / 배포설정 / 배포현황</p>
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { CellStyle, ColDef, ICellRendererParams, SideBarDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button } from 'antd';
import dayjs from 'dayjs';
import { Activity, Download, Plus, Settings, Trash2, Upload as UploadIcon } from 'lucide-react';
import { toast } from '@/shared-util';
import AggridVersionDetailSidebar from '../components/AggridVersionDetailSidebar';
import ScenarioDeployConfigDrawer, { type ScenarioDeployConfigDrawerRef } from '../components/ScenarioDeployConfigDrawer';
import ScenarioDeploySidebar from '../components/ScenarioDeploySidebar';
import ScenarioDeployStatusDrawer, { type ScenarioDeployStatusDrawerRef } from '../components/ScenarioDeployStatusDrawer';
import ScenarioVersionSheet, { type ScenarioVersionSheetRef } from '../components/ScenarioVersionSheet';
import { scenarioQueryKeys, useDeleteVersion, useDownloadScenario, useDownloadScenarioDocument, useGetScenarioDetail, useGetVersions } from '../hooks/useScenarioQueries';
import type { ScenarioVersion } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function ScenarioVersionTab() {
  const { serviceId } = useParams();
  const numericId = Number(serviceId);

  const { data: scenario } = useGetScenarioDetail({
    params: { serviceId: numericId },
    queryOptions: { enabled: !!serviceId },
  });

  if (!scenario) return null;

  return <ScenarioVersionTabInner key={scenario.serviceId} serviceId={scenario.serviceId} serviceName={scenario.serviceName} />;
}

interface ScenarioVersionTabInnerProps {
  serviceId: number;
  serviceName: string;
}

function ScenarioVersionTabInner({ serviceId, serviceName }: ScenarioVersionTabInnerProps) {
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const customGridOptions = useMemo(
    () => ({
      ...gridOptions,
      statusBar: undefined,
      pagination: false,
      sideBar: {
        toolPanels: [
          {
            id: 'versionDetail',
            labelDefault: '상세정보',
            labelKey: 'versionDetail',
            iconKey: 'eye',
            toolPanel: AggridVersionDetailSidebar,
            toolPanelParams: { serviceId },
          },
        ],
      } as SideBarDef,
    }),
    [gridOptions, serviceId],
  );

  const versionSheetRef = useRef<ScenarioVersionSheetRef>(null);
  const deployConfigDrawerRef = useRef<ScenarioDeployConfigDrawerRef>(null);
  const deployStatusDrawerRef = useRef<ScenarioDeployStatusDrawerRef>(null);
  const [selectedVer, setSelectedVer] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ScenarioVersion | null>(null);
  const [deploySidebarOpen, setDeploySidebarOpen] = useState(false);

  const { data: versions = [], isLoading } = useGetVersions({
    params: { serviceId },
    queryOptions: { enabled: !!serviceId },
  });

  const { mutate: deleteMutate } = useDeleteVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getVersions._def });
      },
    },
  });

  // 다운로드 처리(Blob 추출 + Content-Disposition 파싱 + download trigger)는 hook 의 mutationFn 내부에서 일괄 처리.
  // 이 컴포넌트는 에러 토스트만 담당. (FCA useDownloadScenario 패턴과 동일)
  const { mutate: downloadMutate } = useDownloadScenario({
    mutationOptions: {
      onError: () => toast.error('시나리오 파일 다운로드에 실패했습니다.'),
    },
  });

  const { mutate: downloadDocMutate } = useDownloadScenarioDocument({
    mutationOptions: {
      onError: () => toast.error('시나리오 문서 다운로드에 실패했습니다.'),
    },
  });

  const handleDelete = (row: ScenarioVersion) => {
    modal.confirm.delete({
      options: {
        title: '버전 삭제',
        content: `버전 "${row.serviceVer}"을(를) 삭제하시겠습니까?`,
      },
      onOk: () => deleteMutate({ serviceId, serviceVer: row.serviceVer }),
    });
  };

  const handleSelectionChanged = (event: { api: { getSelectedRows: () => ScenarioVersion[] } }) => {
    const rows = event.api.getSelectedRows();
    const next = rows[0] ?? null;
    setSelectedVer(next?.serviceVer ?? null);
    setSelectedVersion(next);
  };

  // versions가 refetch 등으로 갱신되면 선택된 row의 객체 reference 도 새 데이터로 바뀌어야 함.
  // ag-Grid는 getRowId 기반으로 선택 상태만 유지할 뿐 onSelectionChanged 를 자동 fire 하지 않으므로,
  // selectedVersion 이 옛 reference 를 들고 있게 됨. — 여기서 versions/selectedVer 기준 lookup 해서 동기화.
  // (예: 버전 수정으로 SXML 업로드 후 배포 사이드바가 옛 scenarioFile=null 을 보는 버그 방지)
  useEffect(() => {
    if (!selectedVer) {
      setSelectedVersion(null);
      return;
    }
    const updated = versions.find((v) => v.serviceVer === selectedVer) ?? null;
    setSelectedVersion(updated);
    // 해당 버전이 삭제된 경우(updated=null) selectedVer 도 정리
    if (!updated) setSelectedVer(null);
  }, [versions, selectedVer]);

  const columnDefs: ColDef<ScenarioVersion>[] = useMemo(
    () => [
      { headerName: 'ID', field: 'serviceId', hide: true },
      { headerName: '버전', field: 'serviceVer', maxWidth: 100 },
      { headerName: '버전명', field: 'versionName', flex: 1 },
      {
        headerName: '시나리오파일',
        field: 'scenarioFile',
        flex: 1.2,
        cellStyle: { display: 'flex', alignItems: 'center', gap: '6px' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<ScenarioVersion>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <>
              <span className="truncate">{data.scenarioFile ?? '-'}</span>
              {data.scenarioFile && (
                <button
                  type="button"
                  title="시나리오 파일 다운로드"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadMutate({ serviceId, serviceVer: data.serviceVer });
                  }}
                >
                  <Download className="size-4 text-blue-500 hover:text-blue-700 shrink-0" />
                </button>
              )}
            </>
          );
        },
      },
      {
        headerName: '시나리오문서',
        field: 'scenarioDocument',
        flex: 1,
        cellStyle: { display: 'flex', alignItems: 'center', gap: '6px' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<ScenarioVersion>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <>
              <span className="truncate">{data.scenarioDocument ?? '-'}</span>
              {data.scenarioDocument && (
                <button
                  type="button"
                  title="시나리오 문서 다운로드"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadDocMutate({ serviceId, serviceVer: data.serviceVer });
                  }}
                >
                  <Download className="size-4 text-blue-500 hover:text-blue-700 shrink-0" />
                </button>
              )}
            </>
          );
        },
      },
      { headerName: '변경내용', field: 'versionDesc', flex: 1.5 },
      { headerName: '작업자', field: 'workUserName', maxWidth: 120 },
      {
        headerName: '작업일시',
        field: 'workTime',
        maxWidth: 170,
        valueFormatter: (params: { value: string }) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        headerName: '',
        colId: 'actions',
        maxWidth: 60,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (params: ICellRendererParams<ScenarioVersion>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              title="버전 삭제"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(params.data!);
              }}
            >
              <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serviceId, downloadMutate, downloadDocMutate],
  );

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-end w-full gap-2">
        <Button variant="solid" color="primary" icon={<Plus className="size-3.5" />} onClick={() => versionSheetRef.current?.open()}>
          버전 추가
        </Button>
        <Button variant="solid" color="cyan" icon={<Settings className="size-3.5" />} onClick={() => deployConfigDrawerRef.current?.open({ serviceId })}>
          배포 설정
        </Button>
        <Button variant="solid" color="purple" icon={<UploadIcon className="size-3.5" />} disabled={!selectedVer} onClick={() => setDeploySidebarOpen(true)}>
          배포
        </Button>
        <Button variant="solid" color="geekblue" icon={<Activity className="size-3.5" />} onClick={() => deployStatusDrawerRef.current?.open({ serviceId, serviceName })}>
          배포 현황
        </Button>
      </header>

      <div className="w-full h-full">
        <AgGridReact<ScenarioVersion>
          rowData={versions}
          columnDefs={columnDefs}
          gridOptions={customGridOptions}
          loading={isLoading}
          getRowId={(params) => `${params.data.serviceId}-${params.data.serviceVer}`}
          defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
          rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }}
          onSelectionChanged={handleSelectionChanged}
          onRowDoubleClicked={(e) => e.data && versionSheetRef.current?.openEdit(e.data)}
        />
      </div>

      <ScenarioVersionSheet ref={versionSheetRef} serviceId={serviceId} serviceName={serviceName} />
      <ScenarioDeployConfigDrawer ref={deployConfigDrawerRef} />
      <ScenarioDeployStatusDrawer ref={deployStatusDrawerRef} />
      <ScenarioDeploySidebar open={deploySidebarOpen} serviceId={serviceId} selectedVersion={selectedVersion} onClose={() => setDeploySidebarOpen(false)} />
    </div>
  );
}
