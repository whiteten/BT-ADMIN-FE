import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { CampaignMasterDetailParams } from '../types/campaign';

type CampaignDetailLocationState = {
  campaignId?: string;
  tenantId?: number;
};

export function useCampaignMasterDetailParams() {
  const { campaignId: routeCampaignId } = useParams();
  const location = useLocation();
  const listContext = location.state as CampaignDetailLocationState | null;

  return useMemo<CampaignMasterDetailParams | undefined>(() => {
    const campaignId = listContext?.campaignId ?? routeCampaignId;
    if (!campaignId) return undefined;

    return {
      campaignId,
      ...(listContext?.tenantId != null ? { tenantId: listContext.tenantId } : {}),
    };
  }, [listContext?.campaignId, listContext?.tenantId, routeCampaignId]);
}
