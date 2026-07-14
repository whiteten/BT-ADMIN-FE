export function toCampaignSelectionValue(tenantId: string | number, campaignId: string): string {
  return `C:${tenantId}:${campaignId}`;
}

/** `C:{tenantId}:{campaignId}` 형식 선택값에서 campaignId만 추출 */
export function parseCampaignIds(selections: string[]): string[] {
  const campaignIds: string[] = [];
  for (const v of selections) {
    if (!v.startsWith('C:')) continue;
    const parts = v.split(':');
    if (parts.length >= 3) campaignIds.push(parts.slice(2).join(':'));
  }
  return campaignIds;
}

/** 캠페인 시나리오 목록 API params — BE는 단일 campaignId만 지원 */
export function toCampaignScenarioListParams(campaignIds: string[]): { campaignId: string } | undefined {
  const campaignId = campaignIds[0];
  return campaignId ? { campaignId } : undefined;
}
