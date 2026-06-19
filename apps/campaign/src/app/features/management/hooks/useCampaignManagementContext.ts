import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/shared-util';
import { useGetCampaignOptionList, useGetTenantOptionList } from '../../statistics/hooks/useCampaignStatisticsQueries';

type UseCampaignManagementContextOptions = {
  withCampaign?: boolean;
};

export function useCampaignManagementContext({ withCampaign = false }: UseCampaignManagementContextOptions = {}) {
  const isInitialTenantHydrationDone = useRef(false);
  const [tenantIds, setTenantIds] = useState<string[]>([]);
  const [campaignSelections, setCampaignSelections] = useState<string[]>([]);

  const { data: tenantOptionList } = useGetTenantOptionList();
  const tenantSelectOptions = useMemo(
    () => (tenantOptionList ?? []).filter((t) => Boolean(t?.tenantId && t?.tenantName)).map((t) => ({ label: String(t.tenantName), value: String(t.tenantId) })),
    [tenantOptionList],
  );

  const tenantIdNums = useMemo(() => tenantIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n)), [tenantIds]);
  const { data: campaignOptionList } = useGetCampaignOptionList({
    params: { tenantIds: tenantIdNums },
    queryOptions: { enabled: withCampaign && tenantIdNums.length > 0 },
  });
  const campaignSelectOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { label: string; value: string }[] = [];
    for (const c of campaignOptionList ?? []) {
      const tid = String(c.tenantId ?? '');
      const value = `C:${tid}:${c.campaignId}`;
      if (seen.has(value)) continue;
      seen.add(value);
      options.push({ label: c.campaignName, value });
    }
    return options;
  }, [campaignOptionList]);

  useEffect(() => {
    if (!withCampaign) return;
    if (!isInitialTenantHydrationDone.current) {
      isInitialTenantHydrationDone.current = true;
      return;
    }
    setCampaignSelections([]);
  }, [tenantIds, withCampaign]);

  const validateContext = () => {
    if (tenantIds.length === 0) {
      toast.warning('테넌트를 선택해주세요.');
      return false;
    }

    if (withCampaign && campaignSelections.length === 0) {
      toast.warning('캠페인을 선택해주세요.');
      return false;
    }

    return true;
  };

  return {
    tenantIds,
    setTenantIds,
    tenantSelectOptions,
    campaignSelections,
    setCampaignSelections,
    campaignSelectOptions,
    validateContext,
  };
}
