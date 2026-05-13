/**
 * 마스킹 테스트 도구 모달
 *
 * 카테고리 + 입력값을 받아 실제 적용된 마스킹 결과 + 매칭된 패턴을 표시한다.
 */
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { useBreadcrumbStore } from '@/shared-store';
import { Button, Form, Input, Modal, Select } from 'antd';
import { TestTube } from 'lucide-react';
import { useMaskTest } from '../../features/mask-policy/hooks/useMaskPolicyQueries';
import type { MaskCategoryConfig, MaskTestResponse } from '../../features/mask-policy/types/maskPolicy.types';

export interface MaskTestModalRef {
  open: (presetCategory?: string) => void;
  close: () => void;
}

interface Props {
  categories: MaskCategoryConfig[];
}

interface FormValues {
  category: string;
  value: string;
}

const MaskTestModal = forwardRef<MaskTestModalRef, Props>(({ categories }, ref) => {
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<MaskTestResponse | null>(null);

  useImperativeHandle(ref, () => ({
    open: (presetCategory?: string) => {
      setVisible(true);
      setResult(null);
      if (presetCategory) {
        form.setFieldsValue({ category: presetCategory });
      }
    },
    close: () => {
      setVisible(false);
      setResult(null);
      form.resetFields();
    },
  }));

  const { mutate: runTest, isPending } = useMaskTest({
    mutationOptions: {
      onSuccess: (data) => setResult(data as MaskTestResponse),
    },
  });

  const handleRun = useCallback(async () => {
    try {
      const values = await form.validateFields();
      runTest({ category: values.category, value: values.value });
    } catch {
      /* validation 실패 */
    }
  }, [form, runTest]);

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <TestTube className="size-4" />
          마스킹 테스트 도구
        </span>
      }
      open={visible}
      width={520}
      onCancel={() => {
        setVisible(false);
        setResult(null);
        form.resetFields();
      }}
      footer={[
        <Button
          key="close"
          onClick={() => {
            setVisible(false);
            setResult(null);
            form.resetFields();
          }}
        >
          닫기
        </Button>,
        <Button key="run" type="primary" onClick={handleRun} loading={isPending}>
          테스트 실행
        </Button>,
      ]}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="category" label="카테고리" required rules={[{ required: true, message: '카테고리를 선택하세요' }]}>
          <Select
            placeholder="카테고리 선택"
            options={categories.map((c) => ({
              value: c.category,
              label: `${c.category} — ${c.label}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="value" label="테스트 값" required rules={[{ required: true, message: '값을 입력하세요' }]}>
          <Input placeholder="01012345678" style={{ fontFamily: 'ui-monospace, monospace' }} onPressEnter={handleRun} />
        </Form.Item>
      </Form>

      {/* 결과 영역 */}
      {result && (
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">결과</div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-gray-500">원본</span>
            <span className="text-[13px] font-mono text-gray-500 line-through">{result.original}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">마스킹</span>
            <span className="text-[15px] font-mono font-semibold text-gray-900">{result.masked}</span>
          </div>
          {result.matchedPolicyId != null ? (
            <div className="text-[11px] text-gray-500 mt-2">
              매칭된 패턴: <span className="font-mono text-gray-700">{result.matchedPattern ?? '-'}</span>{' '}
              <span className="text-gray-400">
                (policyId {result.matchedPolicyId} · {result.ruleType})
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-amber-700 mt-2">매칭된 패턴이 없어 마스킹 적용되지 않았습니다.</div>
          )}
        </div>
      )}
    </Modal>
  );
});

MaskTestModal.displayName = 'MaskTestModal';
export default MaskTestModal;
