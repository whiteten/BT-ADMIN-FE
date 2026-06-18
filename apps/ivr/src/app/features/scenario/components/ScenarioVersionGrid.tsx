/**
 * 시나리오 버전 그리드 (FCA BotVersionList 패턴 응용).
 *
 * <p>컬럼: 버전 / 버전명 / 시나리오파일(다운로드 아이콘) / 변경내용 / 배포상태 / 작업자 / 작업일시 / 삭제</p>
 * <p>액션: 버전추가 / 대화편집(IFE) / 배포 / 다운로드</p>
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CellStyle, ColDef, ICellRendererParams, SideBarDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input } from 'antd';
import dayjs from 'dayjs';
import { Activity, Download, Plus, Search, Settings, Trash2, Upload as UploadIcon } from 'lucide-react';
import { toast } from '@/shared-util';
import AggridVersionDetailSidebar from './AggridVersionDetailSidebar';
import ScenarioDeployConfigDrawer, { type ScenarioDeployConfigDrawerRef } from './ScenarioDeployConfigDrawer';
import ScenarioDeployStatusDrawer, { type ScenarioDeployStatusDrawerRef } from './ScenarioDeployStatusDrawer';
import ScenarioVersionSheet, { type ScenarioVersionSheetRef } from './ScenarioVersionSheet';
import {
  scenarioQueryKeys,
  useDeleteVersion,
  useDownloadScenario,
  useDownloadScenarioDocument,
  /* useGetIfeInfo, // [DEACTIVATED] IFE 비활성 */
  useGetVersions,
} from '../hooks/useScenarioQueries';
import type { ScenarioVersion } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';
// import type { IfeTokenInfo } from '../types'; // [DEACTIVATED]

interface ScenarioVersionGridProps {
  serviceId: number;
  serviceName: string;
  /** 선택된 버전 변경 콜백 (배포 사이드바와 연동) */
  onSelectionChange?: (version: ScenarioVersion | null) => void;
  /** 우측 배포 사이드바 열기 콜백 */
  onOpenDeploySidebar?: () => void;
}

export default function ScenarioVersionGrid({ serviceId, serviceName, onSelectionChange, onOpenDeploySidebar }: ScenarioVersionGridProps) {
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
  const [searchText, setSearchText] = useState('');
  const versionSheetRef = useRef<ScenarioVersionSheetRef>(null);
  const deployConfigDrawerRef = useRef<ScenarioDeployConfigDrawerRef>(null);
  const deployStatusDrawerRef = useRef<ScenarioDeployStatusDrawerRef>(null);
  const [selectedVer, setSelectedVer] = useState<string | null>(null);

  const { data: versions = [], isLoading } = useGetVersions({
    params: { serviceId },
    queryOptions: { enabled: !!serviceId },
  });

  const filtered = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return versions;
    return versions.filter((v) => v.serviceVer.toLowerCase().includes(kw) || v.versionName?.toLowerCase().includes(kw) || v.versionDesc?.toLowerCase().includes(kw));
  }, [versions, searchText]);

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

  // [DEACTIVATED] IFE 웹에디터 연동 — AS-IS SWAT 패턴 회귀로 비활성화.
  // 사용자가 PC에서 작성한 SXML 파일을 직접 업로드하는 흐름으로 대체.
  // TODO IFE 재연동 시 아래 useGetIfeInfo / handleEditDialog 복구.
  /* const { mutate: getIfeInfo, isPending: isEditing } = useGetIfeInfo({
    mutationOptions: {
      onSuccess: (data) => {
        const ifeInfo = data as IfeTokenInfo;
        if (!ifeInfo.redirectUrl) {
          toast.warning('편집기 접속 정보가 없습니다.');
          return;
        }
        window.open(ifeInfo.redirectUrl, '_blank');
      },
    },
  }); */

  const handleDelete = (row: ScenarioVersion) => {
    modal.confirm.delete({
      options: {
        title: '버전 삭제',
        content: `버전 "${row.serviceVer}"을(를) 삭제하시겠습니까?`,
      },
      onOk: () => deleteMutate({ serviceId, serviceVer: row.serviceVer }),
    });
  };

  /* [DEACTIVATED] IFE 대화편집 핸들러
  const handleEditDialog = (row: ScenarioVersion) => {
    if (row.flowEditorId == null) {
      toast.warning('버전 복사가 진행 중이거나 IFE에 등록되지 않은 버전입니다.');
      return;
    }
    modal.confirm.execute({
      options: { title: '대화편집 확인', content: `버전 "${row.serviceVer}"을(를) IFE 웹에디터에서 편집하시겠습니까?` },
      onOk: () => getIfeInfo({ params: { serviceId, serviceVer: row.serviceVer }, data: {} }),
    });
  }; */

  const handleSelectionChanged = (event: { api: { getSelectedRows: () => ScenarioVersion[] } }) => {
    const rows = event.api.getSelectedRows();
    const next = rows[0] ?? null;
    setSelectedVer(next?.serviceVer ?? null);
    onSelectionChange?.(next);
  };

  // versions가 refetch 등으로 갱신되면 선택된 row의 객체 reference 도 새 데이터로 바뀌어야 함.
  // ag-Grid는 getRowId 기반으로 선택 상태만 유지할 뿐 onSelectionChanged 를 자동 fire 하지 않으므로,
  // 부모(selectedVersion)가 옛 reference 를 들고 있게 됨. — 여기서 versions/selectedVer 기준 lookup 해서 부모와 동기화.
  // (예: 버전 수정으로 SXML 업로드 후 배포 사이드바가 옛 scenarioFile=null 을 보는 버그 방지)
  useEffect(() => {
    if (!selectedVer) {
      onSelectionChange?.(null);
      return;
    }
    const updated = versions.find((v) => v.serviceVer === selectedVer) ?? null;
    onSelectionChange?.(updated);
    // 해당 버전이 삭제된 경우(updated=null) selectedVer 도 정리
    if (!updated) setSelectedVer(null);
  }, [versions, selectedVer, onSelectionChange]);

  const columnDefs: ColDef<ScenarioVersion>[] = useMemo(
    () => [
      { headerName: 'ID', field: 'serviceId', hide: true },
      { headerName: '버전', field: 'serviceVer', maxWidth: 100 },
      {
        headerName: '버전명',
        field: 'versionName',
        flex: 1,
        cellRenderer: (params: ICellRendererParams<ScenarioVersion>) => {
          const data = params.data;
          if (!data) return null;
          // [DEACTIVATED] IFE 복사 중 배지 — IFE 비활성으로 제거. 향후 IFE 재연동 시 복구.
          return <span>{data.versionName ?? '-'}</span>;
        },
      },
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-slate-700">
            시나리오 버전 — <span className="text-[#405189]">{serviceName}</span>
          </h3>
          <span className="text-[11px] text-slate-400">{versions.length}개</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            allowClear
            prefix={<Search className="size-3.5 text-gray-400" />}
            placeholder="버전 검색"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
          <Button icon={<Plus className="size-3.5" />} onClick={() => versionSheetRef.current?.open()}>
            버전추가
          </Button>
          {/* [DEACTIVATED] IFE 대화편집 버튼 — AS-IS SWAT 패턴 회귀로 비활성화. 사용자는 SXML 파일을 직접 업로드함.
          <Button
            icon={<Edit3 className="size-3.5" />}
            loading={isEditing}
            disabled={!selectedVer}
            onClick={() => {
              const sel = versions.find((v) => v.serviceVer === selectedVer);
              if (sel) handleEditDialog(sel);
            }}
          >
            대화편집
          </Button>
          */}
          <Button variant="solid" color="primary" icon={<UploadIcon className="size-3.5" />} disabled={!selectedVer} onClick={onOpenDeploySidebar}>
            배포
          </Button>
          <Button variant="solid" color="cyan" icon={<Settings className="size-3.5" />} onClick={() => deployConfigDrawerRef.current?.open({ serviceId })}>
            배포 설정
          </Button>
          <Button variant="solid" color="geekblue" icon={<Activity className="size-3.5" />} onClick={() => deployStatusDrawerRef.current?.open({ serviceId, serviceName })}>
            배포 현황
          </Button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1">
        <AgGridReact<ScenarioVersion>
          rowData={filtered}
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
    </div>
  );
}
