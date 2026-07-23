import { useMemo, useState } from 'react';
import { toast } from '@/shared-util';
import { useGetCampaignOptionList } from '../../statistics/hooks/useCampaignStatisticsQueries';
import { parseCampaignIds, toCampaignSelectionValue } from '../utils/campaignSelectionUtils';

type UseCampaignManagementContextOptions = {
  withCampaign?: boolean;
};

export function useCampaignManagementContext({ withCampaign = false }: UseCampaignManagementContextOptions = {}) {
  const [campaignSelections, setCampaignSelections] = useState<string[]>([]);

  const { data: campaignOptionList } = useGetCampaignOptionList({
    queryOptions: { enabled: withCampaign },
  });
  const campaignSelectOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { label: string; value: string }[] = [];
    for (const c of campaignOptionList ?? []) {
      const tid = String(c.tenantId ?? '');
      const value = toCampaignSelectionValue(tid, c.campaignId);
      if (seen.has(value)) continue;
      seen.add(value);
      options.push({ label: c.campaignName, value });
    }
    return options;
  }, [campaignOptionList]);

  const campaignIds = useMemo(() => parseCampaignIds(campaignSelections), [campaignSelections]);

  const validateContext = () => {
    if (withCampaign && campaignSelections.length === 0) {
      toast.warning('캠페인을 선택해주세요.');
      return false;
    }

    return true;
  };

  return {
    campaignSelections,
    setCampaignSelections,
    campaignSelectOptions,
    campaignIds,
    validateContext,
  };
}
