import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, InputNumber, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import { useGetRetentionTargets, useUpdateRetentionPolicies } from '../hooks/useDataRetentionQueries';
import { RETENTION_CATEGORY_LABELS, RETENTION_PRODUCT_CODE_LABELS, type RetentionPolicyListItem } from '../types/dataRetention.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export interface RetentionEditDrawerRef {
  open: (policy: RetentionPolicyListItem) => void;
  close: () => void;
}

interface RetentionEditDrawerProps {
  onSuccess?: () => void;
}

interface DrawerState {
  open: boolean;
  policy: RetentionPolicyListItem | null;
}

interface FormValues {
  retentionMonths: number;
  executionTime: dayjs.Dayjs;
}

const RetentionEditDrawer = forwardRef<RetentionEditDrawerRef, RetentionEditDrawerProps>(({ onSuccess }, ref) => {
  const [state, setState] = useState<DrawerState>({ open: false, policy: null });
  const [form] = Form.useForm<FormValues>();

  useImperativeHandle(ref, () => ({
    open: (policy) => setState({ open: true, policy }),
    close: () => setState((prev) => ({ ...prev, open: false })),
  }));

  const { data: targetsData, isLoading: isTargetsLoading } = useGetRetentionTargets(state.policy?.policyId ?? null);

  const { mutate: updatePolicies, isPending: isUpdating } = useUpdateRetentionPolicies({
    mutationOptions: {
      onSuccess: () => {
        toast.success('보관주기 설정이 저장되었습니다.');
        setState((prev) => ({ ...prev, open: false }));
        onSuccess?.();
      },
      onError: () => {
        toast.error('저장 중 오류가 발생했습니다.');
      },
    },
  });

  useEffect(() => {
    if (!state.open || !state.policy) return;
    form.setFieldsValue({
      retentionMonths: state.policy.retentionMonths,
      executionTime: dayjs(state.policy.executionTime, 'HH:mm'),
    });
    return () => form.resetFields();
  }, [state.open, state.policy, form]);

  const handleClose = () => setState((prev) => ({ ...prev, open: false }));

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!state.policy) return;
      updatePolicies({
        policies: [
          {
            policyId: state.policy.policyId,
            retentionMonths: values.retentionMonths,
            executionTime: values.executionTime.format('HH:mm'),
          },
        ],
      });
    } catch {
      // validation error - antd form handles display
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button onClick={handleClose}>취소</Button>
      <Button type="primary" onClick={handleSave} loading={isUpdating}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={state.open} onClose={handleClose} title={state.policy?.policyName ?? ''} width={480} footer={footer} destroyOnHidden>
      {state.policy && (
        <div className="flex flex-col gap-6">
          {/* 정책 기본 정보 */}
          <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-500">카테고리</span>
              <span className="text-sm font-medium text-gray-800">{RETENTION_CATEGORY_LABELS[state.policy.category]}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-gray-100">
              <span className="text-xs text-gray-500">제품</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                {RETENTION_PRODUCT_CODE_LABELS[state.policy.productCode]}
              </span>
            </div>
            {state.policy.description && (
              <div className="flex items-start justify-between gap-4 py-1 border-t border-gray-100">
                <span className="text-xs text-gray-500 shrink-0">설명</span>
                <span className="text-xs text-gray-700 text-right">{state.policy.description}</span>
              </div>
            )}
          </div>

          {/* 편집 폼 */}
          <Form form={form} layout="horizontal" labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
            <Form.Item
              name="retentionMonths"
              label="보관기간"
              rules={[
                { required: true, message: '보관기간을 입력해주세요.' },
                { type: 'number', min: 1, message: '최소 1개월 이상이어야 합니다.' },
              ]}
            >
              <InputNumber min={1} addonAfter="개월" style={{ width: 130 }} />
            </Form.Item>
            <Form.Item name="executionTime" label="실행시각" rules={[{ required: true, message: '실행시각을 선택해주세요.' }]}>
              <TimePicker format="HH:mm" style={{ width: 180 }} allowClear={false} showNow={false} minuteStep={10} />
            </Form.Item>
          </Form>

          {/* 대상 테이블 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">대상 테이블</h3>
              {targetsData?.dateColumn && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>기준 컬럼</span>
                  <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">{targetsData.dateColumn}</code>
                </div>
              )}
            </div>
            {isTargetsLoading ? (
              <div className="h-24">
                <FallbackSpinner />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {(targetsData?.targets ?? []).map((target) => (
                  <div
                    key={target.targetId}
                    className="flex items-center justify-between px-3 py-2.5 rounded-md bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col gap-0.5">
                      <code className="text-xs font-mono font-medium text-gray-800">{target.tableName}</code>
                      {target.description && <span className="text-xs text-gray-400">{target.description}</span>}
                    </div>
                    <span className="text-xs text-gray-300 font-mono">#{target.sortOrder}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
});

RetentionEditDrawer.displayName = 'RetentionEditDrawer';
export default RetentionEditDrawer;
