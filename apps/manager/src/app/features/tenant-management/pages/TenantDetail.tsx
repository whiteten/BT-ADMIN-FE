import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetTenant } from '../hooks/useTenantQueries';
import { IconDocument, IconLayer, IconSlidersHorizontal, IconTalk } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const TenantBasicInfo = React.lazy(() => import('../components/tabs/TenantBasicInfo'));
const TenantOperationInfo = React.lazy(() => import('../components/tabs/TenantOperationInfo'));
const TenantContractInfo = React.lazy(() => import('../components/tabs/TenantContractInfo'));
const TenantCallGroup = React.lazy(() => import('../components/tabs/TenantCallGroup'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: TenantBasicInfo },
  { id: 'tab2', label: '운영설정', icon: IconSlidersHorizontal, component: TenantOperationInfo },
  { id: 'tab3', label: '계약/수량', icon: IconLayer, component: TenantContractInfo },
  { id: 'tab4', label: '통화설정', icon: IconTalk, component: TenantCallGroup },
];

export default function TenantDetail() {
  const { tenantId } = useParams();
  const { data: tenant } = useGetTenant({ params: { id: tenantId } });

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb([{ title: '시스템' }, { title: '자원관리' }, { title: ':tenantName' }], { tenantName: tenant?.tenantName ?? '-' });
    return () => clearBreadcrumb();
  }, [tenant?.tenantName, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
