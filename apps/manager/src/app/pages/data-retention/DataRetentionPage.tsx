import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, InputNumber, TimePicker, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { Info, Play } from 'lucide-react';
import { toast } from '@/shared-util';
import RetentionTargetsModal, { type RetentionTargetsModalRef } from '../../features/data-retention/components/RetentionTargetsModal';
import {
  dataRetentionQueryKeys,
  useExecuteRetentionNow,
  useGetRetentionLogs,
  useGetRetentionPolicies,
  useUpdateRetentionPolicies,
} from '../../features/data-retention/hooks/useDataRetentionQueries';
import {
  RETENTION_CATEGORY_LABELS,
  RETENTION_PRODUCT_CODE_LABELS,
  type RetentionLogItem,
  type RetentionPolicyListItem,
  type RetentionPolicyUpdateItem,
} from '../../features/data-retention/types/dataRetention.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import PageHeader from '@/components/custom/PageHeader';
import ServerPagination from '@/components/custom/ServerPagination';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const LOG_PAGE_SIZE = 20;

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '시스템', path: '/manager/resource/data-retention' },
  { title: '데이터 보관주기 관리', path: '/manager/resource/data-retention' },
];

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

/** 카테고리 섹션 헤더 */
function CategorySectionHeader({ category }: { category: keyof typeof RETENTION_CATEGORY_LABELS }) {
  return <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600 uppercase tracking-wide">{RETENTION_CATEGORY_LABELS[category]}</div>;
}

export default function DataRetentionPage() {
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const targetsModalRef = useRef<RetentionTargetsModalRef>(null);

  // 변경된 정책 추적 (policyId → 변경값)
  const [changedPolicies, setChangedPolicies] = useState<Map<number, RetentionPolicyUpdateItem>>(new Map());

  // 이력 페이지
  const [logPage, setLogPage] = useState(0);

  // 데이터 조회
  const { data: policiesData, isLoading: isPoliciesLoading } = useGetRetentionPolicies();
  const { data: logsData, isLoading: isLogsLoading, isFetching: isLogsFetching } = useGetRetentionLogs({ page: logPage, size: LOG_PAGE_SIZE });

  // 뮤테이션
  const { mutate: updatePolicies, isPending: isUpdating } = useUpdateRetentionPolicies({
    mutationOptions: {
      onSuccess: () => {
        toast.success('보관주기 설정이 저장되었습니다.');
        setChangedPolicies(new Map());
        queryClient.invalidateQueries({ queryKey: dataRetentionQueryKeys.policies.queryKey });
      },
      onError: () => {
        toast.error('저장 중 오류가 발생했습니다.');
      },
    },
  });

  const { mutate: executeNow, isPending: isExecuting } = useExecuteRetentionNow({
    mutationOptions: {
      onSuccess: () => {
        toast.success('즉시 삭제 실행이 완료되었습니다.');
        queryClient.invalidateQueries({ queryKey: dataRetentionQueryKeys.logs({ page: logPage, size: LOG_PAGE_SIZE }).queryKey });
      },
      onError: () => {
        toast.error('즉시 실행 중 오류가 발생했습니다.');
      },
    },
  });

  // 정책 값 변경 핸들러
  const handleRetentionMonthsChange = useCallback((policy: RetentionPolicyListItem, value: number | null) => {
    if (value == null) return;
    setChangedPolicies((prev) => {
      const next = new Map(prev);
      const existing = next.get(policy.policyId);
      next.set(policy.policyId, {
        policyId: policy.policyId,
        retentionMonths: value,
        executionTime: existing?.executionTime ?? policy.executionTime,
      });
      return next;
    });
  }, []);

  const handleExecutionTimeChange = useCallback((policy: RetentionPolicyListItem, time: dayjs.Dayjs | null) => {
    if (!time) return;
    setChangedPolicies((prev) => {
      const next = new Map(prev);
      const existing = next.get(policy.policyId);
      next.set(policy.policyId, {
        policyId: policy.policyId,
        retentionMonths: existing?.retentionMonths ?? policy.retentionMonths,
        executionTime: time.format('HH:mm'),
      });
      return next;
    });
  }, []);

  // 저장 핸들러 - 변경된 항목만 전송
  const handleSave = useCallback(() => {
    if (changedPolicies.size === 0) {
      toast.warning('변경된 항목이 없습니다.');
      return;
    }
    updatePolicies({ policies: Array.from(changedPolicies.values()) });
  }, [changedPolicies, updatePolicies]);

  // 즉시 실행 핸들러
  const handleExecuteNow = useCallback(() => {
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
  }, [modal, executeNow]);

  // 대상 테이블 팝업
  const handleOpenTargets = useCallback((policy: RetentionPolicyListItem) => {
    targetsModalRef.current?.open(policy.policyId, policy.policyName);
  }, []);

  // 이력 페이지 변경
  const handleLogPageChange = useCallback((page: number) => {
    setLogPage(page);
  }, []);

  // 카테고리별 그룹핑
  const groupedPolicies = (policiesData?.items ?? []).reduce<Record<string, RetentionPolicyListItem[]>>((acc, policy) => {
    if (!acc[policy.category]) acc[policy.category] = [];
    acc[policy.category].push(policy);
    return acc;
  }, {});
  const categoryOrder: Array<keyof typeof RETENTION_CATEGORY_LABELS> = ['DATA', 'HISTORY', 'LOG'];

  // 이력 컬럼 정의
  const logColumnDefs: ColDef<RetentionLogItem>[] = [
    {
      headerName: '정책명',
      field: 'policyName',
      flex: 1,
      minWidth: 150,
    },
    {
      headerName: '실행 시각',
      field: 'executedAt',
      width: 170,
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
      width: 110,
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
      flex: 1,
      minWidth: 150,
      valueFormatter: (p) => p.value ?? '-',
    },
  ];

  if (isPoliciesLoading) {
    return (
      <div className="flex flex-col gap-4 w-full h-full">
        <PageHeader breadcrumb={breadcrumb} />
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full overflow-y-auto">
      <PageHeader breadcrumb={breadcrumb} />

      {/* 정책 목록 영역 */}
      <div className="bg-white bt-shadow flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">보관주기 정책</h2>
          <div className="flex items-center gap-2">
            <Button icon={<Play className="w-4 h-4" />} onClick={handleExecuteNow} loading={isExecuting} danger>
              즉시 실행
            </Button>
            <Button type="primary" onClick={handleSave} loading={isUpdating} disabled={changedPolicies.size === 0}>
              저장 {changedPolicies.size > 0 && `(${changedPolicies.size})`}
            </Button>
          </div>
        </div>

        {/* 테이블 헤더 */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>정책명 / 설명</span>
          <span>제품</span>
          <span>보관기간</span>
          <span>실행시각</span>
          <span>대상 테이블</span>
        </div>

        {/* 카테고리별 그룹 */}
        {categoryOrder.map((category) => {
          const items = groupedPolicies[category];
          if (!items || items.length === 0) return null;
          return (
            <div key={category}>
              <CategorySectionHeader category={category} />
              {items.map((policy) => {
                const changed = changedPolicies.get(policy.policyId);
                const currentMonths = changed?.retentionMonths ?? policy.retentionMonths;
                const currentTime = changed?.executionTime ?? policy.executionTime;
                const isChanged = !!changed;

                return (
                  <div
                    key={policy.policyId}
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center px-4 py-3 border-b border-gray-100 transition-colors hover:bg-gray-50 ${isChanged ? 'bg-blue-50/30' : ''}`}
                  >
                    {/* 정책명 / 설명 */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-gray-900">{policy.policyName}</span>
                      <span className="text-xs text-gray-400">{policy.description}</span>
                    </div>

                    {/* 제품 코드 */}
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                        {RETENTION_PRODUCT_CODE_LABELS[policy.productCode]}
                      </span>
                    </div>

                    {/* 보관기간 */}
                    <div className="flex items-center gap-1.5">
                      <InputNumber value={currentMonths} min={1} onChange={(value) => handleRetentionMonthsChange(policy, value)} style={{ width: 70 }} size="small" />
                      <span className="text-xs text-gray-500">개월</span>
                    </div>

                    {/* 실행시각 */}
                    <div>
                      <TimePicker
                        value={dayjs(currentTime, 'HH:mm')}
                        format="HH:mm"
                        onChange={(time) => handleExecutionTimeChange(policy, time)}
                        style={{ width: 90 }}
                        size="small"
                        allowClear={false}
                        showNow={false}
                        minuteStep={10}
                      />
                    </div>

                    {/* 대상 테이블 */}
                    <div>
                      <Tooltip title="대상 테이블 보기">
                        <Button
                          type="text"
                          size="small"
                          icon={<Info className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenTargets(policy)}
                          className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
                        >
                          {policy.targetCount}개
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 삭제 실행 이력 */}
      <div className="bg-white bt-shadow flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">삭제 실행 이력</h2>
        </div>
        <div className="h-[320px]">
          {isLogsLoading ? (
            <FallbackSpinner />
          ) : (
            <AgGridReact<RetentionLogItem>
              rowData={logsData?.items ?? []}
              columnDefs={logColumnDefs}
              gridOptions={{
                ...gridOptions,
                pagination: false,
                statusBar: undefined,
              }}
              loading={isLogsFetching}
              getRowId={(params) => String(params.data.logId)}
            />
          )}
        </div>
        {(logsData?.total ?? 0) > 0 && <ServerPagination currentPage={logPage} totalItems={logsData?.total ?? 0} pageSize={LOG_PAGE_SIZE} onPageChange={handleLogPageChange} />}
      </div>

      {/* 대상 테이블 모달 */}
      <RetentionTargetsModal ref={targetsModalRef} />
    </div>
  );
}
