/**
 * API Flow 관리 페이지
 * - 좌측: Flow 리스트 (검색)
 * - 우측: Flow 생성/상세/편집 폼
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BreadcrumbProps } from 'antd';
import { toast } from '@/shared-util';
import FlowDetailForm from '../../features/bff-flow/components/FlowDetailForm';
import FlowList from '../../features/bff-flow/components/FlowList';
import { bffFlowQueryKeys, useDeleteFlow, useGetFlows, useRefreshFlows, useSaveFlow } from '../../features/bff-flow/hooks/useBffFlowQueries';
import type { BffFlow, FlowSpec } from '../../features/bff-flow/types/bffFlow.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '시스템', path: '/manager/resource/menu' },
  { title: '플랫폼', path: '/manager/resource/bff-flow' },
  { title: 'API 경로', path: '/manager/resource/bff-flow' },
];

export default function BffFlowManagement() {
  const queryClient = useQueryClient();
  const [selectedFlow, setSelectedFlow] = useState<BffFlow | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: flows = [], isLoading } = useGetFlows();

  const invalidateFlows = () => {
    queryClient.invalidateQueries({ queryKey: bffFlowQueryKeys.getFlows.queryKey });
  };

  // Flow 저장
  const saveFlowMutation = useSaveFlow({
    mutationOptions: {
      onSuccess: (saved) => {
        toast.success('Flow가 저장되었습니다');
        invalidateFlows();
        setIsCreating(false);
        if (saved) {
          setSelectedFlow(saved);
        }
      },
    },
  });

  // Flow 삭제
  const deleteFlowMutation = useDeleteFlow({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Flow가 삭제되었습니다');
        setSelectedFlow(null);
        invalidateFlows();
      },
    },
  });

  // 캐시 리프레시
  const refreshMutation = useRefreshFlows({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Flow 캐시가 리프레시되었습니다');
      },
    },
  });

  const handleSave = (flowId: string, spec: FlowSpec) => {
    saveFlowMutation.mutate({ flowId, spec });
  };

  const handleDelete = (flowId: string) => {
    deleteFlowMutation.mutate(flowId);
  };

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleAdd = () => {
    setSelectedFlow(null);
    setIsCreating(true);
  };

  const handleSelect = (flow: BffFlow | null) => {
    setSelectedFlow(flow);
    setIsCreating(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 w-full h-full">
        <PageHeader breadcrumb={breadcrumb} />
        <div className="flex items-center justify-center flex-1">
          <FallbackSpinner />
        </div>
      </div>
    );
  }

  const showForm = selectedFlow !== null || isCreating;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* List + Detail Split */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: Flow 리스트 */}
        <div className="w-[300px] shrink-0">
          <FlowList flows={flows} selectedFlowId={selectedFlow?.flowId ?? null} onSelect={handleSelect} onAdd={handleAdd} />
        </div>

        {/* 우측: 생성/상세 폼 */}
        <div className="flex-1 border border-gray-200 rounded-lg p-4 overflow-auto">
          {showForm ? (
            <FlowDetailForm flow={selectedFlow} onSave={handleSave} onDelete={handleDelete} onRefresh={handleRefresh} saving={saveFlowMutation.isPending} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <NoData message="좌측 리스트에서 Flow를 선택하거나 추가해주세요" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
