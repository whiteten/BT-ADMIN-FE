import React from 'react';
import { useParams } from 'react-router-dom';
import { type BreadcrumbProps } from 'antd';
import ModelToolbar from '../../features/bot-config/components/ModelToolbar';
import { useGetEntity, useGetModel } from '../../features/bot-config/hooks/useModelQueries';
import { useModelRoute } from '../../features/bot-config/hooks/useModelRoute';
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
  const { isPublic } = useModelRoute();

  const { data: model } = useGetModel({ params: { modelId } });
  const { data: entity } = useGetEntity({ params: { modelId, entityId } });

  const privateBreadcrumb: BreadcrumbProps['items'] = [
    { title: '관리', path: '/fca/bot-config' },
    { title: '모델', path: '/fca/bot-config/model' },
    { title: ':modelName', path: `/fca/bot-config/model/${modelId}` },
    { title: '개체', path: `/fca/bot-config/model/${modelId}?tab=tab3` },
    { title: ':entityName', path: `/fca/bot-config/model/${modelId}/entity/${entityId}` },
  ];

  const publicBreadcrumb: BreadcrumbProps['items'] = [
    { title: '공용', path: '/fca/global' },
    { title: '공용 모델', path: '/fca/global/model' },
    { title: ':modelName', path: `/fca/global/model/${modelId}` },
    { title: '개체', path: `/fca/global/model/${modelId}?tab=tab3` },
    { title: ':entityName', path: `/fca/global/model/${modelId}/entity/${entityId}` },
  ];

  const params: BreadcrumbProps['params'] = { modelName: model?.modelName ?? '-', entityName: entity?.entityName ?? '-' };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={isPublic ? publicBreadcrumb : privateBreadcrumb} params={params} />
      <PageTabs tabs={tabs} extra={<ModelToolbar modelId={modelId} />} />
    </div>
  );
}
