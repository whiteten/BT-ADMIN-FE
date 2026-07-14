import type { CellStyle, ColDef, ColGroupDef } from 'ag-grid-community';
import type { CampaignResultStatListItem } from '../../features/statistics/types';

export type CampaignResultStatColDef = ColDef<CampaignResultStatListItem> | ColGroupDef<CampaignResultStatListItem>;

const ATTEMPT_SELF_CALL_SUCCESS_TOOLTIP = '발신 시도 차수별 본인통화 성공률';

/** ag-Grid 컬럼 그룹 — 헤더는 1차/2차/3차만 표시, 전체 명칭은 툴팁 */
export function createAttemptSelfCallSuccessRateColumnGroup(numberCellStyle: (params: { node?: { rowPinned?: string | null } }) => CellStyle): CampaignResultStatColDef {
  const childCol = {
    width: 96,
    cellStyle: numberCellStyle,
    cellRenderer: 'percentBarRenderer' as const,
  };

  return {
    headerName: '본인통화 성공률',
    headerClass: 'campaign-stat-self-call-success-group-header',
    headerStyle: {
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    headerTooltip: ATTEMPT_SELF_CALL_SUCCESS_TOOLTIP,
    children: [
      {
        headerName: '1차',
        field: 'firstAttemptSelfCallSuccessRatePct',
        ...childCol,
        headerTooltip: `${ATTEMPT_SELF_CALL_SUCCESS_TOOLTIP} (1차)`,
      },
      {
        headerName: '2차',
        field: 'secondAttemptSelfCallSuccessRatePct',
        ...childCol,
        headerTooltip: `${ATTEMPT_SELF_CALL_SUCCESS_TOOLTIP} (2차)`,
      },
      {
        headerName: '3차',
        field: 'thirdAttemptSelfCallSuccessRatePct',
        ...childCol,
        headerTooltip: `${ATTEMPT_SELF_CALL_SUCCESS_TOOLTIP} (3차)`,
      },
    ],
  };
}
