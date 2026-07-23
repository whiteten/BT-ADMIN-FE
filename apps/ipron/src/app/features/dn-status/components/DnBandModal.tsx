/**
 * 번호 대역 등록 모달 (목업 bandModal) — B안 선언 대역.
 *
 * antd Modal + Form(rules) — 시작 DN / 끝 DN / 메모. POST /bands (ipron-dn-status-band-create).
 * 검증(숫자만/start<=end)은 BE 가 최종 판정하나 폼에서 1차 선검증. 성공 후 부모가 bands invalidate.
 */
import { useEffect } from 'react';
import { Form, Input, Modal } from 'antd';
import { toast } from '@/shared-util';
import { useCreateDnBand } from '../hooks/useDnStatusQueries';

interface DnBandModalProps {
  open: boolean;
  nodeId: number;
  nodeName: string;
  onClose: () => void;
  onCreated: () => void;
}

interface BandFormValues {
  startNo: string;
  endNo: string;
  memo?: string;
}

const NUMERIC_RULE = { pattern: /^[0-9]{1,16}$/, message: '숫자만 입력하세요 (최대 16자리)' };

export default function DnBandModal({ open, nodeId, nodeName, onClose, onCreated }: DnBandModalProps) {
  const [form] = Form.useForm<BandFormValues>();
  const { mutate: createBand, isPending } = useCreateDnBand();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        // start <= end 교차 검증 (숫자 비교)
        if (Number(values.startNo) > Number(values.endNo)) {
          form.setFields([{ name: 'endNo', errors: ['끝 DN은 시작 DN보다 크거나 같아야 합니다'] }]);
          return;
        }
        createBand(
          { nodeId, startNo: values.startNo, endNo: values.endNo, memo: values.memo?.trim() || undefined },
          {
            onSuccess: () => {
              toast.success('번호 대역을 등록했습니다.');
              onCreated();
              onClose();
            },
            onError: () => {
              // BE 검증 실패(겹침/범위 초과 등) — GlobalExceptionHandler 메시지가 인터셉터 토스트로 표시됨
            },
          },
        );
      })
      .catch(() => {
        /* 폼 검증 실패 — antd 가 인라인 표시 */
      });
  };

  return (
    <Modal
      title={`번호 대역 등록 (${nodeName})`}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="등록"
      cancelText="취소"
      confirmLoading={isPending}
      destroyOnHidden
      width={400}
    >
      <Form form={form} layout="vertical" requiredMark={false} className="mt-2">
        <Form.Item name="startNo" label="시작 DN" rules={[{ required: true, message: '시작 DN을 입력하세요' }, NUMERIC_RULE]}>
          <Input placeholder="예: 3000" />
        </Form.Item>
        <Form.Item name="endNo" label="끝 DN" rules={[{ required: true, message: '끝 DN을 입력하세요' }, NUMERIC_RULE]}>
          <Input placeholder="예: 3099" />
        </Form.Item>
        <Form.Item name="memo" label="메모 (선택)">
          <Input placeholder="예: 3팀 내선 대역" maxLength={200} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
