/**
 * API 경로 (BFF Flow) 관리 페이지
 * - 좌측: Flow 리스트 (검색 + 추가)
 * - 우측: Flow 생성/상세 (탭 구조)
 */

import { useEffect, useRef, useState } from 'react';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import FlowDetailForm from '../../features/bff-flow/components/FlowDetailForm';
import FlowList from '../../features/bff-flow/components/FlowList';
import { useDeleteFlow, useGetFlows, useSaveFlow } from '../../features/bff-flow/hooks/useBffFlowQueries';
import type { BffFlow, FlowSpec } from '../../features/bff-flow/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '시스템', path: '/manager/resource/menu' },
  { title: '플랫폼', path: '/manager/resource/bff-flow' },
  { title: 'API 경로', path: '/manager/resource/bff-flow' },
];

export default function BffFlowManagement() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [selectedFlow, setSelectedFlow] = useState<BffFlow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  // onSave 호출 시점의 isCreating 값을 onSuccess 콜백에서 참조하기 위해 ref 사용
  const isCreatingRef = useRef(false);

  const { data: flows = [], isLoading } = useGetFlows();

  // Flow 저장 (생성 및 수정 공통) — useSaveFlow 내부에서 BFF 리프레시 + 목록 캐시 무효화 처리
  const saveFlowMutation = useSaveFlow({
    mutationOptions: {
      onSuccess: (saved) => {
        toast.success(isCreatingRef.current ? 'Flow가 생성되었습니다' : '저장되었습니다');
        setIsCreating(false);
        if (saved) {
          setSelectedFlow(saved);
        }
      },
    },
  });

  // Flow 삭제 — useDeleteFlow 내부에서 BFF 리프레시 + 목록 캐시 무효화 처리
  const deleteFlowMutation = useDeleteFlow({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Flow가 삭제되었습니다');
        setSelectedFlow(null);
      },
    },
  });

  const handleSave = (flowId: string, spec: FlowSpec) => {
    isCreatingRef.current = isCreating;
    saveFlowMutation.mutate({ flowId, spec });
  };

  const handleDelete = (flowId: string) => {
    deleteFlowMutation.mutate(flowId);
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
        <div className="flex items-center justify-center flex-1">
          <FallbackSpinner />
        </div>
      </div>
    );
  }

  const showForm = selectedFlow !== null || isCreating;
  // flow가 바뀔 때 FlowDetailForm을 리마운트해 탭 상태(활성 탭)를 초기화
  const formKey = selectedFlow?.flowId ?? (isCreating ? '__new__' : '');

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: Flow 리스트 — bg-white bt-shadow 적용 */}
        <div className="w-[300px] shrink-0 bg-white bt-shadow p-4 flex flex-col gap-3">
          <FlowList flows={flows} selectedFlowId={selectedFlow?.flowId ?? null} onSelect={handleSelect} onAdd={handleAdd} />
        </div>

        {/* 우측: 생성/상세 */}
        <div className="flex-1 min-h-0">
          {showForm ? (
            <FlowDetailForm key={formKey} flow={selectedFlow} onSave={handleSave} onSaved={setSelectedFlow} onDelete={handleDelete} saving={saveFlowMutation.isPending} />
          ) : (
            <div className="h-full bg-white bt-shadow flex items-center justify-center">
              <NoData message="좌측 리스트에서 Flow를 선택하거나 추가해주세요" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
