import dayjs, { type Dayjs } from 'dayjs';
import type { CampaignItem, CampaignListItem, CampaignMaster } from '../types/campaign';

export const YN = {
  YES: 'Y',
  NO: 'N',
} as const;

export function isYnEnabled(yn: string | null | undefined): boolean {
  return yn === YN.YES;
}

/** TB_AR_CAMPAIGNMASTER의 *_YN 컬럼은 NUMBER(1,0) — 1:활성/사용, 0:비활성/미사용 */
export function isCampaignMasterEnabled(yn: number | null | undefined): boolean {
  return yn === 1;
}

/** Dayjs 값을 BE가 기대하는 YYYYMMDD / HHmmss 문자열 쌍으로 분리 */
export function splitCampaignDateTime(value: Dayjs | null | undefined): { date: string | null; time: string | null } {
  if (!value?.isValid()) return { date: null, time: null };
  return { date: value.format('YYYYMMDD'), time: value.format('HHmmss') };
}

export function combineCampaignDateTime(date: string | null | undefined, time: string | null | undefined): string | null {
  if (!date && !time) return null;
  if (date && time) return `${date} ${time}`;
  return date ?? time ?? null;
}

export function formatCampaignDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value;
}

export function formatCampaignMasterDateTime(date: string | null | undefined, time: string | null | undefined): string {
  return formatCampaignDateTime(combineCampaignDateTime(date, time) ?? undefined);
}

export function toCampaignMasterFormDateTime(date: string | null | undefined, time: string | null | undefined): string | null {
  const combined = combineCampaignDateTime(date, time);
  if (!combined) return null;
  const parsed = dayjs(combined);
  return parsed.isValid() ? parsed.toISOString() : combined;
}

export function toCampaignListItem(master: CampaignMaster): CampaignListItem {
  return {
    campaignId: master.campaignId,
    campaignName: master.campaignName,
    startDateTime: combineCampaignDateTime(master.campaignStartdate, master.campaignStarttime) ?? '',
    endDateTime: combineCampaignDateTime(master.campaignEnddate, master.campaignEndtime) ?? '',
    inUse: isCampaignMasterEnabled(master.enableYn),
    priority: master.priority ?? 0,
    workDateTime: master.workTime ?? '',
    serviceType: master.expansion1 ?? '',
  };
}

export function toCampaignItem(master: CampaignMaster): CampaignItem {
  return {
    ...toCampaignListItem(master),
    sortOrder: master.sortSeq ?? 0,
    worker: master.workUserName ?? (master.workUser != null ? String(master.workUser) : ''),
  };
}

export function createEmptyCampaignMaster(partial: Pick<CampaignMaster, 'campaignId' | 'campaignName'> & Partial<CampaignMaster>): CampaignMaster {
  return {
    tenantId: 0,
    campaignType: null,
    campaignState: null,
    campaignAction: null,
    campaignCallingno: null,
    campaignStartdate: null,
    campaignStarttime: null,
    campaignEnddate: null,
    campaignEndtime: null,
    callbackStartdate: null,
    callbackStarttime: null,
    callbackEnddate: null,
    callbackEndtime: null,
    enableYn: null,
    priority: null,
    sortSeq: null,
    retryCount: null,
    retryDelay: null,
    workTime: null,
    workUser: null,
    workUserName: null,
    ageYn: null,
    solYn: null,
    expansion1: null,
    expansion2: null,
    expansion3: null,
    expansion4: null,
    expansion5: null,
    ...partial,
  };
}
