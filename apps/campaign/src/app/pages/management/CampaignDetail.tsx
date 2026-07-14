import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { useCampaignMasterDetailParams } from '../../features/management/hooks/useCampaignMasterDetailParams';
import { useGetCampaignMasterDetail } from '../../features/management/hooks/useCampaignQueries';
import { IconDocument } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const CampaignBasicInfo = React.lazy(() => import('../../features/management/tabs/CampaignBasicInfo'));

const tabs: PageTab[] = [{ id: 'tab1', label: '기본정보', icon: IconDocument, component: CampaignBasicInfo }];

export default function CampaignDetail() {
  const { campaignId: routeCampaignId } = useParams();
  const detailParams = useCampaignMasterDetailParams();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const { data: campaignMasterDetail } = useGetCampaignMasterDetail({
    params: detailParams,
    queryOptions: { enabled: Boolean(detailParams?.campaignId) },
  });

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: '관리', path: '/campaign/management' },
      { title: '캠페인 기본정보', path: '/campaign/management/basic-info' },
      { title: ':campaignName', path: `/campaign/management/${routeCampaignId}` },
    ];
    setBreadcrumb(breadcrumb, { campaignName: campaignMasterDetail?.campaignName ?? '-' });
    return () => clearBreadcrumb();
  }, [routeCampaignId, campaignMasterDetail?.campaignName, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
