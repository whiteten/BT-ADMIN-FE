/**
 * 시나리오 코드관리 (AS-IS IPR20S6070) — 읽기 전용 코드 목록.
 * TB_IR_SERVICECODEITEM을 그대로 보여준다(시나리오 업로드 시점 SXML 분석 결과, CUD 없음).
 * 버전 선택은 이 탭 안에서 독립적으로 구성한다(다른 탭과 공유하지 않음).
 */
import { useEffect, useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Empty, Select } from 'antd';
import { useGetVersions } from '../../scenario/hooks/useScenarioQueries';
import { useGetScenarioAnalysisCodes } from '../hooks/useScenarioAnalysisQueries';
import type { ScenarioAnalysisCodeRow } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  serviceId: number | null;
  scenarioName: string | null;
}

export default function ScenarioAnalysisCodeTab({ serviceId, scenarioName }: Props) {
  const { gridOptions } = useAggridOptions();

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

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

  const { data: rows = [], isLoading } = useGetScenarioAnalysisCodes({
    params: serviceId && selectedVersion ? { serviceId, serviceVer: selectedVersion } : undefined,
    queryOptions: { enabled: !!serviceId && !!selectedVersion },
  });

  const columnDefs: ColDef<ScenarioAnalysisCodeRow>[] = useMemo(
    () => [
      { headerName: '시나리오 코드', field: 'serviceCode', flex: 1, minWidth: 120 },
      { headerName: '시나리오 코드명', field: 'serviceCodeName', flex: 1.5, minWidth: 150 },
      {
        headerName: '설명',
        field: 'serviceDesc',
        flex: 2,
        minWidth: 200,
        tooltipValueGetter: (p) => p.data?.serviceDesc ?? '',
        cellRenderer: (p: ICellRendererParams<ScenarioAnalysisCodeRow>) => p.data?.serviceDesc || '-',
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">시나리오 코드관리{scenarioName && <span className="text-[#405189]"> — {scenarioName}</span>}</h3>
        <div className="flex items-center gap-2">
          <Select value={selectedVersion} onChange={setSelectedVersion} options={versionOptions} style={{ width: 160 }} placeholder="버전" disabled={!serviceId} />
          <span className="text-[11px] text-gray-400 whitespace-nowrap">(DNIS 에서 시나리오 되고 있는 버전은 (+) 표시됩니다.)</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {!serviceId || !selectedVersion ? (
          <div className="flex items-center justify-center h-full">
            <Empty description="시나리오와 버전을 선택하세요" />
          </div>
        ) : rows.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Empty description="분석된 코드가 없습니다" />
          </div>
        ) : (
          <AgGridReact<ScenarioAnalysisCodeRow>
            rowData={rows}
            columnDefs={columnDefs}
            gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
            loading={isLoading}
            getRowId={(p) => p.data.serviceCode}
            defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
          />
        )}
      </div>
    </div>
  );
}
