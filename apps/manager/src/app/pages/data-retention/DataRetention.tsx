import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button } from 'antd';
import dayjs from 'dayjs';
import { Database, History, Play, ScrollText } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import PolicyCardSlider from '../../features/data-retention/components/PolicyCardSlider';
import RetentionEditDrawer, { type RetentionEditDrawerRef } from '../../features/data-retention/components/RetentionEditDrawer';
import { dataRetentionQueryKeys, useExecuteRetentionNow, useGetRetentionLogs, useGetRetentionPolicies } from '../../features/data-retention/hooks/useDataRetentionQueries';
import { RETENTION_CATEGORY_LABELS, type RetentionCategory, type RetentionLogItem, type RetentionPolicyListItem } from '../../features/data-retention/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '시스템', path: '/manager/resource/data-retention' },
  { title: '데이터 보관주기 관리', path: '/manager/resource/data-retention' },
];

const categoryOrder: RetentionCategory[] = ['DATA', 'HISTORY', 'LOG'];

const tabTriggerStyle =
  'w-auto hover:cursor-pointer !shadow-none border-1 border-transparent !rounded-none border-r-[#E9EBEC] text-[#495057] data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]';

const RETENTION_CATEGORY_ICONS: Record<RetentionCategory, React.ElementType> = {
  DATA: Database,
  HISTORY: History,
  LOG: ScrollText,
};

/** 실행 상태 배지 */
function ExecutionStatusBadge({ status }: { status: RetentionLogItem['status'] }) {
  const config: Record<RetentionLogItem['status'], { label: string; className: string }> = {
    SUCCESS: { label: '성공', className: 'bg-green-100 text-green-800' },
    PARTIAL_FAIL: { label: '부분실패', className: 'bg-yellow-100 text-yellow-800' },
    FAIL: { label: '실패', className: 'bg-red-100 text-red-800' },
  };
  const { label, className } = config[status] ?? { label: status, className: 'bg-gray-100 text-gray-800' };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${className}`}>{label}</span>;
}

export default function DataRetention() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const editDrawerRef = useRef<RetentionEditDrawerRef>(null);

  const [selectedPolicy, setSelectedPolicy] = useState<RetentionPolicyListItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<RetentionCategory>('DATA');

  const { data: policiesData, isLoading: isPoliciesLoading } = useGetRetentionPolicies();
  const { data: logsData, isLoading: isLogsLoading } = useGetRetentionLogs(selectedPolicy?.policyId ?? 0, selectedPolicy !== null);

  const { mutate: executeNow, isPending: isExecuting } = useExecuteRetentionNow({
    mutationOptions: {
      onSuccess: () => {
        toast.success('즉시 삭제 실행이 완료되었습니다.');
        if (selectedPolicy) {
          queryClient.invalidateQueries({
            queryKey: dataRetentionQueryKeys.logs(selectedPolicy.policyId).queryKey,
          });
        }
      },
      onError: () => {
        toast.error('즉시 실행 중 오류가 발생했습니다.');
      },
    },
  });

  // 카테고리별 그룹핑
  const groupedPolicies = (policiesData?.items ?? []).reduce<Record<string, RetentionPolicyListItem[]>>((acc, policy) => {
    if (!acc[policy.category]) acc[policy.category] = [];
    acc[policy.category].push(policy);
    return acc;
  }, {});

  const availableCategories = categoryOrder;

  const logs = logsData?.items ?? [];

  const handleSelectPolicy = (policy: RetentionPolicyListItem) => {
    setSelectedPolicy((prev) => (prev?.policyId === policy.policyId ? null : policy));
  };

  const handleEditPolicy = (policy: RetentionPolicyListItem) => {
    editDrawerRef.current?.open(policy);
  };

  const handleExecuteNow = () => {
    modal.confirm.execute({
      options: {
        title: '즉시 삭제 실행',
        content: '보관주기 초과 데이터를 삭제합니다. 계속하시겠습니까?',
        okText: '실행',
        cancelText: '취소',
        okButtonProps: { danger: true },
      },
      onOk: () => executeNow(),
    });
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: dataRetentionQueryKeys.policies.queryKey });
  };

  const handleCategoryChange = (value: string) => {
    setActiveCategory(value as RetentionCategory);
    setSelectedPolicy(null);
  };

  // 이력 컬럼 — 전체 조회 시 정책명 포함, 필터링 시 제외
  const logColumnDefs: ColDef<RetentionLogItem>[] = [
    { headerName: '정책명', field: 'policyName', flex: 1, minWidth: 130 },
    {
      headerName: '실행 시각',
      field: 'executedAt',
      flex: 1,
      minWidth: 160,
      valueFormatter: (p) => (p.value ? dayjs(p.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '삭제 건수',
      field: 'deletedCount',
      width: 110,
      type: 'rightAligned',
      valueFormatter: (p) => (p.value != null ? p.value.toLocaleString() : '-'),
    },
    {
      headerName: '소요시간',
      field: 'executionTimeMs',
      width: 120,
      type: 'rightAligned',
      valueFormatter: (p) => (p.value != null ? `${p.value.toLocaleString()} ms` : '-'),
    },
    {
      headerName: '상태',
      field: 'status',
      width: 100,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: ICellRendererParams<RetentionLogItem>) => (p.value ? <ExecutionStatusBadge status={p.value} /> : '-'),
    },
    {
      headerName: '오류 메시지',
      field: 'errorMessage',
      flex: 2,
      minWidth: 150,
      valueFormatter: (p) => p.value ?? '-',
    },
  ];

  if (isPoliciesLoading) {
    return (
      <div className="flex flex-col gap-4 w-full h-full">
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 정책 카드 영역 */}
      <div className="bg-white bt-shadow flex flex-col">
        <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="flex flex-col">
          <div className="flex items-center justify-between w-full h-[48px] min-h-[48px] border-b border-[#E9EBEC] pr-4">
            <TabsList className="h-full p-0 bg-white">
              {availableCategories.map((category) => (
                <TabsTrigger key={category} value={category} className={tabTriggerStyle}>
                  <div className="flex items-center justify-center gap-1.5 min-w-[110px]">
                    {(() => {
                      const Icon = RETENTION_CATEGORY_ICONS[category];
                      return <Icon className="w-4 h-4" />;
                    })()}
                    {RETENTION_CATEGORY_LABELS[category]}
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            <Button icon={<Play className="w-3.5 h-3.5" />} onClick={handleExecuteNow} loading={isExecuting} danger size="small">
              즉시 실행
            </Button>
          </div>

          {availableCategories.map((category) => (
            <TabsContent key={category} value={category} forceMount className="m-0 data-[state=inactive]:hidden">
              <div className="h-[200px] flex items-center px-2 py-3">
                <PolicyCardSlider
                  policies={groupedPolicies[category] ?? []}
                  selectedId={selectedPolicy?.policyId ?? null}
                  onSelect={handleSelectPolicy}
                  onEdit={handleEditPolicy}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* 삭제 실행 이력 (항상 표시, 남은 공간 채우기) */}
      <div className="flex-1 min-h-0 bg-white bt-shadow flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">삭제 실행 이력</h2>
            {selectedPolicy && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{selectedPolicy.policyName}</span>}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <AgGridReact<RetentionLogItem>
            rowData={logs}
            columnDefs={logColumnDefs}
            gridOptions={{
              ...gridOptions,
              noRowsOverlayComponentParams: { message: '삭제 실행 이력이 없습니다.' },
            }}
            loading={isLogsLoading}
            getRowId={(params) => String(params.data.logId)}
          />
        </div>
      </div>

      {/* 편집 드로어 */}
      <RetentionEditDrawer ref={editDrawerRef} onSuccess={handleEditSuccess} />
    </div>
  );
}
