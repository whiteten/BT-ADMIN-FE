import React from 'react';
import { useParams } from 'react-router-dom';
import { type BreadcrumbProps } from 'antd';
import ModelToolbar from '../../features/bot-config/components/ModelToolbar';
import { IconDocument, IconSynonyms } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const EntityBasicInfo = React.lazy(() => import('../../features/bot-config/tabs/EntityBasicInfo'));
const EntityValueList = React.lazy(() => import('../../features/bot-config/tabs/EntityValueList'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: EntityBasicInfo },
  { id: 'tab2', label: '유사어', icon: IconSynonyms, component: EntityValueList },
];

export default function EntityDetail() {
  const { modelId, entityId } = useParams();
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/bot/bot-config' },
    { title: '모델', path: '/bot/bot-config/model' },
    { title: '모델 상세', path: `/bot/bot-config/model/${modelId}` },
    { title: '개체', path: `/bot/bot-config/model/${modelId}?tab=tab3` },
    { title: '개체 상세', path: `/bot/bot-config/model/${modelId}/entity/${entityId}` },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="개체 편집" breadcrumb={breadcrumb} extra={<ModelToolbar modelId={modelId} />} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
