/**
 * 대시보드 정보 수정 화면 — 등록 화면과 동일한 단일 컬럼 메타 폼.
 * 이름 / 카테고리(읽기전용) / 아이콘 / 설명. 도메인은 생성 후 변경 불가.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DashboardMetaFields from '../../features/monitoring/components/DashboardMetaFields';
import { dashboardKeys, useGetDashboard, useUpdateDashboard } from '../../features/monitoring/hooks/useDashboardQueries';
import type { DashboardIconType, DomainCode } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function DashboardEditInfo() {
  const { dashboardId: param } = useParams<{ dashboardId: string }>();
  const dashboardId = Number(param);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [showErrors, setShowErrors] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState<DomainCode | null>(null);
  const [icon, setIcon] = useState<DashboardIconType | null>(null);
  const [description, setDescription] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const { data: dashboard, isLoading } = useGetDashboard({
    params: { dashboardId },
    queryOptions: { enabled: !!dashboardId, retry: false },
  });

  useEffect(() => {
    if (dashboard && !hydrated) {
      setName(dashboard.dashboardName);
      setDomain(dashboard.domainCode);
      setIcon(dashboard.iconType ?? null);
      setDescription(dashboard.description ?? '');
      setHydrated(true);
    }
  }, [dashboard, hydrated]);

  useEffect(() => {
    const items: BreadcrumbProps['items'] = [
      { title: '모니터링', path: '/insight/monitoring' },
      { title: '대시보드', path: '/insight/monitoring/dashboards' },
      { title: dashboard ? `${dashboard.dashboardName} 정보 수정` : '정보 수정', path: `/insight/monitoring/dashboards/${dashboardId}/edit-info` },
    ];
    setBreadcrumb(items);
    return () => clearBreadcrumb();
  }, [dashboard, dashboardId, setBreadcrumb, clearBreadcrumb]);

  const updateMutation = useUpdateDashboard({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: dashboardKeys.list._def });
        queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId).queryKey });
        toast.success('대시보드 정보가 수정되었습니다.');
        navigate('/insight/monitoring/dashboards');
      },
    },
  });

  const handleSubmit = () => {
    if (!name.trim() || !icon) {
      setShowErrors(true);
      if (!name.trim()) toast.error('대시보드 이름을 입력하세요.');
      else toast.error('아이콘을 선택하세요.');
      return;
    }
    updateMutation.mutate({
      dashboardId,
      data: {
        dashboardName: name.trim(),
        description: description.trim() || undefined,
        iconType: icon,
      },
    });
  };

  const handleCancel = () => navigate('/insight/monitoring/dashboards');

  if (isLoading && !dashboard) return <FallbackSpinner />;
  if (!dashboard) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-[14px] text-[var(--color-bt-fg-muted)]">
          대시보드를 찾을 수 없습니다.{' '}
          <button className="text-[var(--color-bt-primary)] underline" onClick={handleCancel}>
            목록으로
          </button>
        </p>
      </div>
    );
  }

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
              domainLocked
            />
          </div>

          <div className="border-t border-bt-border bg-bt-bg-muted px-7 py-4">
            <div className="flex items-center justify-between">
              <Button onClick={handleCancel}>취소</Button>
              <Button type="primary" onClick={handleSubmit} loading={updateMutation.isPending}>
                저장
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
