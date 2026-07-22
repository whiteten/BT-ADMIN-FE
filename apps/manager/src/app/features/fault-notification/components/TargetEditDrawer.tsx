import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, type FormProps, type FormRule, Input, Switch } from 'antd';
import { toast } from '@/shared-util';
import { faultNotificationQueryKeys, useCreateNotiTarget, useUpdateNotiTarget } from '../hooks/useFaultNotificationQueries';
import type { NotiTarget } from '../types';

export interface TargetEditDrawerRef {
  /** targetData 없이 열면 등록 모드, 있으면 수정 모드 */
  open: (params?: { targetData?: NotiTarget }) => void;
  close: () => void;
}

interface TargetFormValues {
  notiTargetId: string;
  notiTargetName: string;
  phoneNo?: string;
  smsId?: string;
  email?: string;
  stopped?: boolean;
}

interface DrawerState {
  open: boolean;
  targetData?: NotiTarget;
}

/** 통보 대상 ID — 영문 대소문자·숫자·하이픈·언더스코어 */
const TARGET_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const CONTACT_REQUIRED_MSG = '전화번호·이메일·SMS_ID 중 최소 1개는 입력해야 합니다.';

/** 교차 검증 — 전화번호·이메일·SMS_ID 중 최소 1개 필수 (1개만 등록해도 유효, 2026-07-22 확정) */
const contactRequiredRule: FormRule = ({ getFieldValue }) => ({
  validator: () => {
    const filled = ['phoneNo', 'email', 'smsId'].some((field) => {
      const value = getFieldValue(field) as string | undefined;
      return !!value?.trim();
    });
    return filled ? Promise.resolve() : Promise.reject(new Error(CONTACT_REQUIRED_MSG));
  },
});

/**
 * 통보 대상 등록/수정 Drawer — 대상 정보 5필드만.
 * 시스템 페어는 등록 시 백엔드가 시스템마스터 전체를 일괄 INSERT 하므로 Drawer 에 체크리스트가 없다.
 * 미등록 연락 채널은 null 로 저장 (가짜 기본값 저장 금지 — 목록에서 '없음' 뱃지로 표시).
 */
const TargetEditDrawer = forwardRef<TargetEditDrawerRef>((_, ref) => {
  const [state, setState] = useState<DrawerState>({ open: false });
  const isEditMode = !!state.targetData;
  const [form] = Form.useForm<TargetFormValues>();
  const queryClient = useQueryClient();

  const handleClose = () => setState((prev) => ({ ...prev, open: false }));

  useImperativeHandle(ref, () => ({
    open: (params) => setState({ open: true, targetData: params?.targetData }),
    close: handleClose,
  }));

  // 열릴 때 세팅, 닫힐 때 리셋 (add-form Drawer 규약)
  useEffect(() => {
    if (!state.open) return;
    if (state.targetData) {
      form.setFieldsValue({
        notiTargetId: state.targetData.notiTargetId,
        notiTargetName: state.targetData.notiTargetName,
        phoneNo: state.targetData.phoneNo ?? undefined,
        smsId: state.targetData.smsId ?? undefined,
        email: state.targetData.email ?? undefined,
        stopped: state.targetData.stopped,
      });
    }
    return () => form.resetFields();
  }, [state.open, state.targetData, form]);

  const invalidateTargets = () => queryClient.invalidateQueries({ queryKey: faultNotificationQueryKeys.getNotiTargets().queryKey });

  const createMutation = useCreateNotiTarget({
    mutationOptions: {
      onSuccess: () => {
        toast.success('통보 대상을 등록했습니다. 전체 시스템 페어가 활성 상태로 함께 등록되었습니다.');
        invalidateTargets();
        handleClose();
      },
      onError: (err) => toast.error(`등록 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const updateMutation = useUpdateNotiTarget({
    mutationOptions: {
      onSuccess: () => {
        toast.success('통보 대상을 수정했습니다.');
        invalidateTargets();
        handleClose();
      },
      onError: (err) => toast.error(`수정 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onFinish: FormProps<TargetFormValues>['onFinish'] = (values) => {
    // 빈 문자열 채널은 null 로 정규화 — 가짜 기본값 저장 금지
    const normalizeChannel = (value?: string): string | null => {
      const trimmed = value?.trim();
      if (!trimmed) return null; // 빈 문자열도 null 처리 (?? 는 '' 를 통과시키므로 사용 불가)
      return trimmed;
    };
    const payload = {
      notiTargetName: values.notiTargetName.trim(),
      phoneNo: normalizeChannel(values.phoneNo),
      email: normalizeChannel(values.email),
      smsId: normalizeChannel(values.smsId),
      stopped: values.stopped ?? false,
    };
    if (isEditMode && state.targetData) {
      updateMutation.mutate({ targetId: state.targetData.notiTargetId, data: payload });
    } else {
      createMutation.mutate({ notiTargetId: values.notiTargetId.trim(), ...payload });
    }
  };

  const onFinishFailed: FormProps<TargetFormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  return (
    <Drawer
      title={isEditMode ? '통보 대상 수정' : '통보 대상 등록'}
      closable={{ placement: 'end', disabled: isPending }}
      open={state.open}
      onClose={handleClose}
      size={440}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={handleClose} disabled={isPending}>
            취소
          </Button>
          <Button type="primary" onClick={() => form.submit()} loading={isPending}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed} initialValues={{ stopped: false }}>
        <Form.Item
          name="notiTargetId"
          label="통보 대상 ID"
          required
          hasFeedback
          extra="중복 불가 — 사용자 계정과 무관한 통보 전용 식별자 (수정 시 변경 불가)"
          rules={[
            { required: true, message: '통보 대상 ID를 입력하세요.' },
            { pattern: TARGET_ID_PATTERN, message: '영문 대소문자·숫자·하이픈(-)·언더스코어(_)만 사용할 수 있습니다.' },
          ]}
        >
          <Input placeholder="예: NOC-DAY" disabled={isEditMode} />
        </Form.Item>

        <Form.Item
          name="notiTargetName"
          label="대상 이름"
          required
          hasFeedback
          rules={[
            { required: true, message: '대상 이름을 입력하세요.' },
            { max: 100, message: '최대 100자까지 입력 가능합니다.' },
          ]}
        >
          <Input placeholder="예: 주간 NOC 당직" />
        </Form.Item>

        <Form.Item name="phoneNo" label="전화번호" hasFeedback dependencies={['email', 'smsId']} rules={[contactRequiredRule]}>
          <Input placeholder="010-0000-0000" />
        </Form.Item>

        <Form.Item
          name="email"
          label="이메일"
          hasFeedback
          dependencies={['phoneNo', 'smsId']}
          rules={[{ type: 'email', message: '이메일 형식이 올바르지 않습니다.' }, contactRequiredRule]}
        >
          <Input placeholder="user@bridgetec.com" />
        </Form.Item>

        <Form.Item name="smsId" label="SMS_ID" hasFeedback dependencies={['phoneNo', 'email']} rules={[contactRequiredRule]}>
          <Input placeholder="예: BT_NOC01" className="font-mono" />
        </Form.Item>

        <div className="rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2 mb-4 text-xs text-sky-800">
          전화번호·이메일·SMS_ID 중 최소 1개는 입력해야 저장됩니다. 1개만 등록해도 유효하며, 미등록 채널은 목록에 뱃지로 표시됩니다.
        </div>

        <Form.Item name="stopped" label="일시정지" valuePropName="checked" extra="켜면 이 대상의 모든 통보가 중단됩니다 — 미리 등록해 두고 투입 시점에 켜는 용도.">
          <Switch />
        </Form.Item>
      </Form>
    </Drawer>
  );
});
TargetEditDrawer.displayName = 'TargetEditDrawer';
export default TargetEditDrawer;
