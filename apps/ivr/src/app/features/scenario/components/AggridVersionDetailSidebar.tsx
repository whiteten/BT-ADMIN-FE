/**
 * 시나리오 버전 행 상세 sidebar.
 *
 * <p>스타일: 라벨은 위 (작고 옅게), 값은 아래 (진하게) — 항목별 세로 stack</p>
 */
import { useEffect, useState } from 'react';
import type { CustomToolPanelProps } from 'ag-grid-react';
import { Tag } from 'antd';
import dayjs from 'dayjs';
import { OctagonAlert } from 'lucide-react';
import { useGetDeployedSystems } from '../hooks/useScenarioQueries';
import { APPLY_STATUS, type ApplyStatus, type DeployedSystem, type ScenarioVersion } from '../types';

interface VersionDetailToolPanelParams {
  serviceId: number;
}

const APPLY_STATUS_LABELS: Record<number, string> = {
  [APPLY_STATUS.PENDING]: '대기',
  [APPLY_STATUS.SEND_OK]: '전송완료',
  [APPLY_STATUS.SEND_FAIL]: '전송실패',
  [APPLY_STATUS.CMD_OK]: '명령완료',
  [APPLY_STATUS.CMD_FAIL]: '명령실패',
  [APPLY_STATUS.APPLIED]: '적용완료',
  [APPLY_STATUS.APPLY_FAIL]: '적용실패',
};

function AggridVersionDetailSidebar(props: CustomToolPanelProps<ScenarioVersion> & VersionDetailToolPanelParams) {
  const { api, serviceId } = props;
  const [selectedRowData, setSelectedRowData] = useState<ScenarioVersion | null>(null);

  const { data: deployedSystems = [] } = useGetDeployedSystems({
    params: { serviceId, serviceVer: selectedRowData?.serviceVer ?? '' },
    queryOptions: { enabled: !!selectedRowData?.serviceVer },
  });

  useEffect(() => {
    if (!api || api.isDestroyed?.()) return;
    // selectionChanged: 사용자 클릭/해제 시
    // rowDataUpdated: invalidate 후 refetch 등으로 rowData 가 갱신될 때 — 같은 PK 의 row 라도 객체 reference 가 새로 와야
    //                 stale 표시(scenarioFile=null, 옛 applyStatus 등) 방지.
    const syncSelected = () => {
      const selectedRows = api.getSelectedRows();
      const isRowSelected = selectedRows && selectedRows.length > 0;
      setSelectedRowData(isRowSelected ? selectedRows[0] : null);
    };
    api.addEventListener('selectionChanged', syncSelected);
    api.addEventListener('rowDataUpdated', syncSelected);
    return () => {
      if (api && !api.isDestroyed?.()) {
        api.removeEventListener('selectionChanged', syncSelected);
        api.removeEventListener('rowDataUpdated', syncSelected);
      }
    };
  }, [api]);

  const renderRow = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground break-all">{value ?? '-'}</span>
    </div>
  );

  const renderVersionDetail = () => {
    if (!selectedRowData) return null;
    const v = selectedRowData;

    const statusColor = (s?: ApplyStatus | null) =>
      s === APPLY_STATUS.APPLIED
        ? 'green'
        : s === APPLY_STATUS.SEND_FAIL || s === APPLY_STATUS.CMD_FAIL || s === APPLY_STATUS.APPLY_FAIL
          ? 'red'
          : s === APPLY_STATUS.PENDING || s === APPLY_STATUS.SEND_OK || s === APPLY_STATUS.CMD_OK
            ? 'blue'
            : 'default';

    return (
      <div className="flex flex-col gap-3">
        {renderRow('버전', v.serviceVer)}
        {renderRow('버전명', v.versionName)}
        {renderRow('캐릭터셋', <span className="uppercase">{v.charsetType ?? 'euc-kr'}</span>)}
        {renderRow('통계 사용', v.statVisible === 0 ? '사용안함' : '사용')}
        {renderRow('변경 내용', v.versionDesc)}
        {renderRow('시나리오 파일', v.scenarioFile)}
        {renderRow('문서', v.scenarioDocument)}
        {renderRow('작업자', v.workUserName ?? (v.workUser != null ? `user#${v.workUser}` : '-'))}
        {renderRow('작업일시', v.workTime ? dayjs(v.workTime).format('YYYY-MM-DD HH:mm:ss') : '-')}
        {renderRow(
          `적용 서버 (${deployedSystems.length})`,
          deployedSystems.length === 0 ? (
            <span className="text-gray-400">배포된 서버 없음</span>
          ) : (
            <div className="flex flex-col gap-1">
              {deployedSystems.map((server: DeployedSystem) => (
                <div key={server.systemId} className="flex items-center justify-between gap-2">
                  <span className="truncate flex-1">{server.systemName ?? `System ${server.systemId}`}</span>
                  <Tag color={statusColor(server.applyStatus)} className="!m-0 !text-[10px] !leading-4 !px-1">
                    {(server.applyStatus && APPLY_STATUS_LABELS[server.applyStatus]) ?? server.applyStatus ?? '-'}
                  </Tag>
                </div>
              ))}
            </div>
          ),
        )}
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="w-full h-full flex flex-col gap-4 items-center justify-center">
      <OctagonAlert className="size-15 text-gray-500" />
      <p className="text-base text-gray-500">데이터를 선택해 주세요.</p>
    </div>
  );

  return <div className="w-full h-full overflow-y-auto p-3 select-text">{selectedRowData ? renderVersionDetail() : renderEmptyState()}</div>;
}

export default AggridVersionDetailSidebar;
