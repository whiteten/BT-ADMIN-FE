import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { getMockCampaignDetail } from '../../features/management/constants/campaignManagementMockData';
import { IconDocument } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const CampaignBasicInfo = React.lazy(() => import('../../features/management/tabs/CampaignBasicInfo'));

const tabs: PageTab[] = [{ id: 'tab1', label: '기본정보', icon: IconDocument, component: CampaignBasicInfo }];

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const campaign = campaignId ? getMockCampaignDetail(campaignId) : undefined;
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: '관리', path: '/campaign/management' },
      { title: '캠페인', path: '/campaign/management/campaign' },
      { title: ':campaignName', path: `/campaign/management/campaign/${campaignId}` },
    ];
    setBreadcrumb(breadcrumb, { campaignName: campaign?.campaignName ?? '-' });
    return () => clearBreadcrumb();
  }, [campaignId, campaign?.campaignName, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
