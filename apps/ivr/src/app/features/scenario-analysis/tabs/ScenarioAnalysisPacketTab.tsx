/**
 * 트래킹 패킷전문 관리 (AS-IS IPR20S6076) — 읽기 전용 패킷 마스터/항목 목록.
 * TB_IR_PACKETMASTER(좌측 패킷 목록) + TB_IR_PACKETITEM(우측 선택 패킷의 항목 상세)를 그대로
 * 보여준다(시나리오 업로드 시점 SXML 분석 결과, CUD 없음). AS-IS와 동일하게 패킷을 선택해야
 * 우측 항목 그리드가 채워지는 마스터-디테일 구조. 버전 선택은 이 탭 안에서 독립적으로 구성한다.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, GridApi, ICellRendererParams, SelectionChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Empty, Select } from 'antd';
import { useGetVersions } from '../../scenario/hooks/useScenarioQueries';
import { useGetScenarioAnalysisPacketItems, useGetScenarioAnalysisPackets } from '../hooks/useScenarioAnalysisQueries';
import type { ScenarioAnalysisPacketItemRow, ScenarioAnalysisPacketRow } from '../types';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  serviceId: number | null;
  scenarioName: string | null;
}

export default function ScenarioAnalysisPacketTab({ serviceId, scenarioName }: Props) {
  const { gridOptions } = useAggridOptions();

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);
  const packetGridApiRef = useRef<GridApi<ScenarioAnalysisPacketRow> | null>(null);

  const { data: versions = [] } = useGetVersions({
    params: { serviceId },
    queryOptions: { enabled: !!serviceId },
  });

  // 시나리오가 바뀌면 첫 버전 자동 선택
  useEffect(() => {
    if (versions.length > 0) {
      if (!selectedVersion || !versions.some((v) => v.serviceVer === selectedVersion)) {
        setSelectedVersion(versions[0].serviceVer);
      }
    } else {
      setSelectedVersion(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions]);

  const versionOptions = versions.map((v) => {
    const base = `${v.serviceVer}${v.deployed ? '(+)' : ''}`;
    return { label: v.versionName ? `${base} (${v.versionName})` : base, value: v.serviceVer };
  });

  const { data: packets = [], isLoading: isPacketsLoading } = useGetScenarioAnalysisPackets({
    params: serviceId && selectedVersion ? { serviceId, serviceVer: selectedVersion } : undefined,
    queryOptions: { enabled: !!serviceId && !!selectedVersion },
  });

  // 시나리오/버전이 바뀌면 첫 패킷 자동 선택
  useEffect(() => {
    if (packets.length > 0) {
      if (!selectedPacketId || !packets.some((p) => p.packetId === selectedPacketId)) {
        setSelectedPacketId(packets[0].packetId);
      }
    } else {
      setSelectedPacketId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packets]);

  // 자동 선택(첫 패킷) 포함, selectedPacketId가 바뀔 때마다 그리드 자체 선택 상태(ag-row-selected)를
  // 맞춰줘야 좌측 그리드에 "선택됨"이 시각적으로 보인다 — onRowClicked만으로는 프로그래밍적 선택이 반영 안 됨.
  useEffect(() => {
    if (!selectedPacketId) return;
    packetGridApiRef.current?.getRowNode(selectedPacketId)?.setSelected(true, true);
  }, [selectedPacketId, packets]);

  const { data: packetItems = [], isLoading: isItemsLoading } = useGetScenarioAnalysisPacketItems({
    params: serviceId && selectedVersion && selectedPacketId ? { serviceId, serviceVer: selectedVersion, packetId: selectedPacketId } : undefined,
    queryOptions: { enabled: !!serviceId && !!selectedVersion && !!selectedPacketId },
  });

  const packetColumnDefs: ColDef<ScenarioAnalysisPacketRow>[] = useMemo(
    () => [
      { headerName: '패킷ID', field: 'packetId', flex: 1, minWidth: 90 },
      { headerName: '패킷명', field: 'packetName', flex: 1.5, minWidth: 120 },
    ],
    [],
  );

  const itemColumnDefs: ColDef<ScenarioAnalysisPacketItemRow>[] = useMemo(
    () => [
      { headerName: '송수신', field: 'sendRecv', width: 90 },
      { headerName: '순번', field: 'itemSeq', width: 70 },
      { headerName: '아이템명', field: 'itemName', flex: 1.2, minWidth: 140 },
      {
        headerName: '반복부SEQ',
        field: 'repeatSeq',
        width: 100,
        cellRenderer: (p: ICellRendererParams<ScenarioAnalysisPacketItemRow>) => (p.data?.repeatSeq ? p.data.repeatSeq : ''),
      },
      { headerName: '길이', field: 'length', width: 80 },
      { headerName: 'FILL', field: 'fill', width: 80 },
      { headerName: '정렬', field: 'align', width: 80 },
      { headerName: '기본값', field: 'defaultValue', width: 90 },
      {
        headerName: '암호화',
        colId: 'encryptYn',
        width: 90,
        cellRenderer: (p: ICellRendererParams<ScenarioAnalysisPacketItemRow>) =>
          p.data?.encryptYn === 1 ? (
            <Badge className="text-[13px] leading-[13px] font-medium !h-6 text-emerald-600 bg-emerald-50">Y</Badge>
          ) : (
            <Badge className="text-[13px] leading-[13px] font-medium !h-6 text-gray-500 bg-gray-100">N</Badge>
          ),
      },
      {
        headerName: '응답코드',
        colId: 'responseCode',
        width: 90,
        cellRenderer: (p: ICellRendererParams<ScenarioAnalysisPacketItemRow>) =>
          p.data?.responseCode ? (
            <Badge className="text-[13px] leading-[13px] font-medium !h-6 text-emerald-600 bg-emerald-50">Y</Badge>
          ) : (
            <Badge className="text-[13px] leading-[13px] font-medium !h-6 text-gray-500 bg-gray-100">N</Badge>
          ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">트래킹 패킷전문 관리{scenarioName && <span className="text-[#405189]"> — {scenarioName}</span>}</h3>
        <div className="flex items-center gap-2">
          <Select value={selectedVersion} onChange={setSelectedVersion} options={versionOptions} style={{ width: 160 }} placeholder="버전" disabled={!serviceId} />
          <span className="text-[11px] text-gray-400 whitespace-nowrap">(DNIS 에서 시나리오 되고 있는 버전은 (+) 표시됩니다.)</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex gap-3">
        {!serviceId || !selectedVersion ? (
          <div className="flex items-center justify-center w-full h-full">
            <Empty description="시나리오와 버전을 선택하세요" />
          </div>
        ) : (
          <>
            <div className="flex-shrink-0" style={{ width: '30%' }}>
              {packets.length === 0 && !isPacketsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Empty description="분석된 패킷이 없습니다" />
                </div>
              ) : (
                <AgGridReact<ScenarioAnalysisPacketRow>
                  rowData={packets}
                  columnDefs={packetColumnDefs}
                  gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                  loading={isPacketsLoading}
                  getRowId={(p) => p.data.packetId}
                  rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }}
                  onGridReady={(e) => {
                    packetGridApiRef.current = e.api;
                  }}
                  onSelectionChanged={(e: SelectionChangedEvent<ScenarioAnalysisPacketRow>) => {
                    const [row] = e.api.getSelectedRows();
                    if (row) setSelectedPacketId(row.packetId);
                  }}
                  defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {!selectedPacketId ? (
                <div className="flex items-center justify-center h-full">
                  <Empty description="패킷을 선택하세요" />
                </div>
              ) : packetItems.length === 0 && !isItemsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Empty description="분석된 항목이 없습니다" />
                </div>
              ) : (
                <AgGridReact<ScenarioAnalysisPacketItemRow>
                  rowData={packetItems}
                  columnDefs={itemColumnDefs}
                  gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                  loading={isItemsLoading}
                  getRowId={(p) => `${p.data.packetId}_${p.data.sendRecv}_${p.data.itemSeq}`}
                  defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
