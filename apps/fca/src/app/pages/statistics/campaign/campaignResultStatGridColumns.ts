import type { CellStyle, ColDef, ColGroupDef } from 'ag-grid-community';
import { formatCampaignStatRowDate } from './campaignStatFormatUtils';
import type { CampaignResultStatListItem } from '../../../features/statistics/types';

export type CampaignResultStatColDef = ColDef<CampaignResultStatListItem> | ColGroupDef<CampaignResultStatListItem>;

type TextCellStyleFn = (params: { node?: { rowPinned?: string | null } }) => CellStyle;
type NumberCellStyleFn = (params: { node?: { rowPinned?: string | null } }) => CellStyle;

/** 봇 통계와 동일 — flex + minWidth 로 남는 너비 채움 */
export function createCampaignStatMetricColDef<T>(headerName: string, field: string, minWidth: number, cellStyle: NumberCellStyleFn, extra?: Partial<ColDef<T>>): ColDef<T> {
  return {
    headerName,
    field,
    flex: 1,
    minWidth,
    cellStyle,
    ...extra,
  } as ColDef<T>;
}

export function createPsrTimeKeyColumnDef<T extends { psrTimeKey?: string; viewDate?: string }>(
  displayTimeUnit: string,
  textCellStyle: TextCellStyleFn,
  options?: { pinned?: 'left' },
): ColDef<T> {
  return {
    headerName: '날짜',
    colId: 'psrTimeKey',
    flex: 1,
    minWidth: displayTimeUnit === 'YY' ? 88 : displayTimeUnit === 'MM' ? 96 : 112,
    pinned: options?.pinned,
    valueGetter: ({ data, node }) => formatCampaignStatRowDate(data, displayTimeUnit, node?.rowPinned === 'bottom'),
    cellStyle: textCellStyle,
  };
}

export function buildCampaignResultStatRowId(data: CampaignResultStatListItem): string {
  return [data.tenantId ?? '', data.campaignId ?? '', data.campaignListId ?? '', data.psrTimeKey ?? '', data.seq ?? '', data.totalTargetCnt ?? ''].join('_');
}

/** 긴 이름 컬럼 — flex 확장 + 말줄임 + 툴팁 */
export function createFlexibleNameColumnDef<T>(
  headerName: string,
  colId: string,
  getName: (data: T | undefined) => string,
  textCellStyle: TextCellStyleFn,
  options?: { minWidth?: number; pinned?: 'left'; hideOnPinnedBottom?: boolean; flex?: number },
): ColDef<T> {
  const minWidth = options?.minWidth ?? 140;
  return {
    headerName,
    colId,
    flex: options?.flex ?? 2,
    minWidth,
    pinned: options?.pinned,
    valueGetter: ({ data, node }) => {
      if (options?.hideOnPinnedBottom && node?.rowPinned === 'bottom') return '';
      const name = getName(data).trim();
      return name || '-';
    },
    tooltipValueGetter: ({ data }) => getName(data).trim(),
    cellStyle: (params) => ({
      ...textCellStyle(params),
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }),
  };
}

const ATTEMPT_SELF_CALL_SUCCESS_TOOLTIP = '발신 시도 차수별 본인통화 성공률';

/** ag-Grid 컬럼 그룹 — 헤더는 1차/2차/3차만 표시, 전체 명칭은 툴팁 */
export function createAttemptSelfCallSuccessRateColumnGroup(numberCellStyle: NumberCellStyleFn): CampaignResultStatColDef {
  const childCol = {
    flex: 1,
    minWidth: 96,
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

/** 캠페인 통계 공통 숫자/비율 컬럼 */
export function createCampaignResultStatMetricColumns(numberCellStyle: NumberCellStyleFn): CampaignResultStatColDef[] {
  return [
    createCampaignStatMetricColDef('대상건수', 'totalTargetCnt', 100, numberCellStyle),
    createCampaignStatMetricColDef('발신진행건수 (실시간)', 'outboundProgressCnt', 140, numberCellStyle),
    createCampaignStatMetricColDef('총발신시도건수(누적)', 'outboundAttemptCnt', 140, numberCellStyle),
    createCampaignStatMetricColDef('진행율', 'progressRatePct', 90, numberCellStyle, { cellRenderer: 'percentBarRenderer' }),
    createCampaignStatMetricColDef('재시도발신건수', 'retryOutboundCnt', 120, numberCellStyle),
    createCampaignStatMetricColDef('본인통화건수', 'selfCallCnt', 110, numberCellStyle),
    createCampaignStatMetricColDef('본인통화완료율', 'selfCallCompleteRatePct', 120, numberCellStyle, { cellRenderer: 'percentBarRenderer' }),
    createCampaignStatMetricColDef('실패건수', 'failCnt', 100, numberCellStyle),
    createCampaignStatMetricColDef('부재건수', 'absentCnt', 100, numberCellStyle),
    createAttemptSelfCallSuccessRateColumnGroup(numberCellStyle),
    createCampaignStatMetricColDef('검증실패율', 'verifyFailRatePct', 100, numberCellStyle, { cellRenderer: 'percentBarRenderer' }),
  ];
}
