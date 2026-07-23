/**
 * 대표번호별 DNIS 등록/수정 Drawer (IPR20S6043).
 * forwardRef + useImperativeHandle 패턴.
 *
 * 등록 모드: tenantId만 disabled (탭 자동 주입), 나머지 입력
 * 수정 모드: tenantId / ainNo / originDnis 모두 disabled (복합 PK 잠금)
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { toast } from '@/shared-util';
import { useCreateAin, useUpdateAin } from '../hooks/useIvrAinDnisQueries';
import { type IrAinMaster, type IrAinMasterCreateRequest, type IrAinMasterUpdateRequest, TELCO_KIND_OPTIONS } from '../types';

export interface IvrAinDnisSheetRef {
  /** data가 있으면 수정, 없으면 등록. tenantId/tenantName은 등록 시 자동 주입. */
  open: (data?: IrAinMaster, context?: { tenantId: number; tenantName: string }) => void;
  close: () => void;
}

interface Props {
  /** 성공 콜백. 신규 등록 시 생성된 대표번호 DNIS를 전달(새 그리드 행 포커싱용), 수정 시 인자 없음. */
  onSuccess: (created?: IrAinMaster) => void;
}

const IvrAinDnisSheet = forwardRef<IvrAinDnisSheetRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<IrAinMaster | null>(null);
  const [tenantContext, setTenantContext] = useState<{ tenantId: number; tenantName: string } | null>(null);

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data, context) => {
      setEditData(data ?? null);
      setTenantContext(context ?? null);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      setTenantContext(null);
      form.resetFields();
    },
  }));

  useEffect(() => {
    if (visible) {
      if (editData) {
        form.setFieldsValue({
          tenantName: editData.tenantName ?? '',
          ainNo: editData.ainNo,
          originDnis: editData.originDnis,
          originDnisName: editData.originDnisName,
          telcoKind: editData.telcoKind,
          dnisDesc: editData.dnisDesc ?? '',
        });
      } else {
        form.resetFields();
        if (tenantContext) {
          form.setFieldsValue({ tenantName: tenantContext.tenantName });
        }
      }
    }
  }, [visible, editData, tenantContext, form]);

  const { mutate: createAin, isPending: isCreating } = useCreateAin({
    mutationOptions: {
      onSuccess: (created) => {
        toast.success('대표번호 DNIS가 등록되었습니다.');
        handleClose();
        onSuccess(created as IrAinMaster | undefined);
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? '등록에 실패했습니다.';
        toast.error(msg);
      },
    },
  });

  const { mutate: updateAin, isPending: isUpdating } = useUpdateAin({
    mutationOptions: {
      onSuccess: () => {
        toast.success('대표번호 DNIS가 수정되었습니다.');
        handleClose();
        onSuccess();
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? '수정에 실패했습니다.';
        toast.error(msg);
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (isEditMode && editData) {
        const update: IrAinMasterUpdateRequest = {
          originDnisName: values.originDnisName,
          telcoKind: values.telcoKind,
          dnisDesc: values.dnisDesc || null,
        };
        updateAin({
          key: {
            tenantId: editData.tenantId,
            ainNo: editData.ainNo,
            originDnis: editData.originDnis,
          },
          data: update,
        });
      } else {
        if (!tenantContext) {
          toast.warning('테넌트를 먼저 선택해주세요.');
          return;
        }
        const create: IrAinMasterCreateRequest = {
          tenantId: tenantContext.tenantId,
          ainNo: values.ainNo,
          originDnis: values.originDnis,
          originDnisName: values.originDnisName,
          telcoKind: values.telcoKind,
          dnisDesc: values.dnisDesc || null,
        };
        createAin(create);
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, tenantContext, createAin, updateAin]);

  const handleClose = () => {
    setVisible(false);
    setEditData(null);
    setTenantContext(null);
    form.resetFields();
  };

  return (
    <Drawer
      title={isEditMode ? '대표번호별 DNIS 수정' : '대표번호별 DNIS 등록'}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={handleClose}
      size={480}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} disabled={isPending}>
            취소
          </Button>
          <Button type="primary" onClick={handleSubmit} loading={isPending}>
            {isEditMode ? '수정' : '저장'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" requiredMark>
        <Form.Item name="tenantName" label="테넌트" required>
          <Input disabled />
        </Form.Item>

        <Form.Item
          name="ainNo"
          label="지능망 대표번호"
          required
          rules={[
            { required: true, message: '지능망 대표번호를 입력하여 주세요' },
            { max: 24, message: '지능망 대표번호는 최대 24자까지 입력 가능합니다' },
            {
              pattern: /^[0-9*#]+$/,
              message: '지능망 대표번호는 숫자, *, # 만 입력 가능합니다',
            },
          ]}
          extra={<span className="text-[11px] text-gray-400">숫자/별표(*)/샵(#)만 입력 가능 · 최대 24자</span>}
        >
          <Input placeholder="예: 0212345678" maxLength={24} disabled={isEditMode} />
        </Form.Item>

        <Form.Item
          name="originDnis"
          label="최초 DNIS"
          required
          rules={[
            { required: true, message: 'DNIS를 입력하여 주세요' },
            { max: 50, message: 'DNIS는 최대 50자까지 입력 가능합니다' },
            { pattern: /^[0-9*#]+$/, message: 'DNIS는 숫자, *, # 만 입력 가능합니다' },
          ]}
          extra={<span className="text-[11px] text-gray-400">최대 50자</span>}
        >
          <Input placeholder="예: 1000" maxLength={50} disabled={isEditMode} />
        </Form.Item>

        <Form.Item
          name="originDnisName"
          label="최초 DNIS명"
          required
          rules={[
            { required: true, message: 'DNIS명을 입력하여 주세요' },
            { max: 50, message: 'DNIS명은 최대 50자까지 입력 가능합니다' },
          ]}
          extra={<span className="text-[11px] text-gray-400">최대 50자</span>}
        >
          <Input placeholder="예: 상담사고객센터" maxLength={50} />
        </Form.Item>

        <Form.Item name="telcoKind" label="통신사구분" required rules={[{ required: true, message: '통신사구분은 필수입니다' }]}>
          <Select placeholder="통신사 선택" options={TELCO_KIND_OPTIONS as unknown as { label: string; value: string }[]} />
        </Form.Item>

        <Form.Item
          name="dnisDesc"
          label="설명"
          rules={[{ max: 256, message: '설명은 최대 256자까지 입력 가능합니다' }]}
          extra={<span className="text-[11px] text-gray-400">최대 256자 (선택)</span>}
        >
          <Input.TextArea rows={4} maxLength={256} showCount placeholder="설명 (선택)" />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

IvrAinDnisSheet.displayName = 'IvrAinDnisSheet';
export default IvrAinDnisSheet;
