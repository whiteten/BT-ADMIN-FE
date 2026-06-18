/**
 * 대시보드 생성 화면 — 통계 보고서 생성과 동일한 단일 컬럼 구성.
 * 이름 → 카테고리 카드 → 아이콘 그리드 → 설명. 생성 후 편집 화면으로 이동.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DashboardMetaFields from '../../features/monitoring/components/DashboardMetaFields';
import { dashboardKeys, useCreateDashboard } from '../../features/monitoring/hooks/useDashboardQueries';
import type { DashboardIconType, DomainCode } from '../../features/monitoring/types';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '모니터링', path: '/insight/monitoring' },
  { title: '대시보드', path: '/insight/monitoring/dashboards' },
  { title: '등록', path: '/insight/monitoring/dashboards/create' },
];

export default function DashboardCreateWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [showErrors, setShowErrors] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState<DomainCode | null>(null);
  const [icon, setIcon] = useState<DashboardIconType | null>(null);
  const [description, setDescription] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const createDashboardMutation = useCreateDashboard({
    mutationOptions: {
      onSuccess: (dashboard) => {
        queryClient.invalidateQueries({ queryKey: dashboardKeys.list._def });
        toast.success('새 대시보드가 생성되었습니다.');
        navigate(`/insight/monitoring/dashboards/${dashboard.dashboardId}/edit`);
      },
    },
  });

  const handleSubmit = () => {
    if (!name.trim() || !domain || !icon) {
      setShowErrors(true);
      if (!name.trim()) toast.error('대시보드 이름을 입력하세요.');
      else if (!domain) toast.error('카테고리를 선택하세요.');
      else toast.error('아이콘을 선택하세요.');
      return;
    }
    createDashboardMutation.mutate({
      domainCode: domain,
      dashboardName: name.trim(),
      description: description.trim() || undefined,
      iconType: icon,
    });
  };

  const handleCancel = () => navigate('/insight/monitoring/dashboards');

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex w-full flex-1 min-h-0">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DashboardMetaFields
              name={name}
              onNameChange={setName}
              domain={domain}
              onDomainChange={setDomain}
              icon={icon}
              onIconChange={setIcon}
              description={description}
              onDescriptionChange={setDescription}
              showErrors={showErrors}
            />
          </div>

          <div className="border-t border-bt-border bg-bt-bg-muted px-7 py-4">
            <div className="flex items-center justify-between">
              <Button onClick={handleCancel}>취소</Button>
              <Button type="primary" onClick={handleSubmit} loading={createDashboardMutation.isPending}>
                대시보드 구성하기 →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
