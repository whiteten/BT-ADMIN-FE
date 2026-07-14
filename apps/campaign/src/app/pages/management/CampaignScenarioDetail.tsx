import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { getMockCampaignScenarioDetail } from '../../features/management/constants/campaignScenarioMockData';
import { IconDocument } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const CampaignScenarioBasicInfo = React.lazy(() => import('../../features/management/tabs/CampaignScenarioBasicInfo'));

const tabs: PageTab[] = [{ id: 'tab1', label: '기본정보', icon: IconDocument, component: CampaignScenarioBasicInfo }];

export default function CampaignScenarioDetail() {
  const { scenarioId } = useParams();
  const scenario = scenarioId ? getMockCampaignScenarioDetail(scenarioId) : undefined;
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: '관리', path: '/campaign/management' },
      { title: '캠페인 시나리오', path: '/campaign/management/campaign-scenario' },
      { title: ':scenarioName', path: `/campaign/management/campaign-scenario/${scenarioId}` },
    ];
    setBreadcrumb(breadcrumb, { scenarioName: scenario?.scenarioName ?? '-' });
    return () => clearBreadcrumb();
  }, [scenarioId, scenario?.scenarioName, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
