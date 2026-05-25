/**
 * CTI 코드 등록/수정 통합 드로어.
 *
 * - REASON_CODE: tenantId/codeType/reasonCode/reasonName/reasonDesc
 * - MEDIA_TYPE: classCd/codeCd/codeName/sortSeq/hideYn/bigo (시스템 잠금 시 read-only)
 */
import { useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Space, Tag, message } from 'antd';
import { toast } from '@/shared-util';
import { useCreateMediaType, useCreateReasonCode, useUpdateMediaType, useUpdateReasonCode } from '../hooks/useCtiCodeQueries';
import type { CtiCodeCategory, MediaTypeResponse, ReasonCodeResponse } from '../types';

type Mode = 'create' | 'edit';

export type CtiCodeDrawerState = { open: false } | { open: true; mode: Mode; category: CtiCodeCategory; reason?: ReasonCodeResponse; media?: MediaTypeResponse };

interface Props {
  state: CtiCodeDrawerState;
  onClose: () => void;
}

export default function CtiCodeFormDrawer({ state, onClose }: Props) {
  const [form] = Form.useForm();

  const { mutate: createReason, isPending: isCreatingReason } = useCreateReasonCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사유 코드가 등록되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '등록 실패'),
    },
  });

  const { mutate: updateReason, isPending: isUpdatingReason } = useUpdateReasonCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사유 코드가 수정되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '수정 실패'),
    },
  });

  const { mutate: createMedia, isPending: isCreatingMedia } = useCreateMediaType({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어타입이 등록되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '등록 실패'),
    },
  });

  const { mutate: updateMedia, isPending: isUpdatingMedia } = useUpdateMediaType({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어타입이 수정되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '수정 실패'),
    },
  });

  useEffect(() => {
    if (!state.open) {
      form.resetFields();
      return;
    }
    if (state.category.domain === 'REASON_CODE' && state.reason) {
      form.setFieldsValue({
        reasonCode: state.reason.reasonCode,
        reasonName: state.reason.reasonName,
        reasonDesc: state.reason.reasonDesc,
      });
    } else if (state.category.domain === 'MEDIA_TYPE' && state.media) {
      form.setFieldsValue({
        classCd: state.media.classCd,
        codeCd: state.media.codeCd,
        codeName: state.media.codeName,
        sortSeq: state.media.sortSeq,
        hideYn: state.media.hideYn ?? 0,
        bigo: state.media.bigo,
      });
    } else {
      // create 기본값
      if (state.category.domain === 'MEDIA_TYPE') {
        form.setFieldsValue({ classCd: state.category.classCd, hideYn: 0 });
      }
    }
  }, [state, form]);

  if (!state.open) return null;

  const { mode, category } = state;
  const isLocked = category.domain === 'MEDIA_TYPE' && state.media?.locked;
  const submitting = isCreatingReason || isUpdatingReason || isCreatingMedia || isUpdatingMedia;

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (category.domain === 'REASON_CODE') {
        if (mode === 'create') {
          if (!category.codeType || !values.tenantIdInput) {
            message.error('테넌트와 코드 타입은 필수입니다');
            return;
          }
          createReason({
            tenantId: values.tenantIdInput,
            codeType: category.codeType,
            reasonCode: values.reasonCode ?? undefined,
            reasonName: values.reasonName,
            reasonDesc: values.reasonDesc,
          });
        } else if (state.reason) {
          updateReason({
            path: {
              tenantId: state.reason.tenantId,
              codeType: state.reason.codeType,
              reasonCode: state.reason.reasonCode,
            },
            body: { reasonName: values.reasonName, reasonDesc: values.reasonDesc },
          });
        }
      } else {
        // MEDIA_TYPE
        if (mode === 'create') {
          createMedia({
            classCd: values.classCd,
            codeCd: values.codeCd,
            codeName: values.codeName,
            sortSeq: values.sortSeq,
            hideYn: values.hideYn ?? 0,
            bigo: values.bigo,
          });
        } else if (state.media) {
          updateMedia({
            path: { classCd: state.media.classCd, codeCd: state.media.codeCd },
            body: {
              classCd: state.media.classCd,
              codeCd: state.media.codeCd,
              codeName: values.codeName,
              sortSeq: values.sortSeq,
              hideYn: values.hideYn,
              bigo: values.bigo,
            },
          });
        }
      }
    } catch {
      // form validation error: silent
    }
  };

  return (
    <Drawer
      title={
        <Space>
          {mode === 'create' ? '등록' : '수정'} — {category.label}
          {isLocked && <Tag color="red">🔒 시스템 코드 (편집 불가)</Tag>}
        </Space>
      }
      width={560}
      open={state.open}
      onClose={onClose}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={submitting} disabled={isLocked} onClick={onSubmit}>
            저장
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" disabled={isLocked}>
        {category.domain === 'REASON_CODE' ? (
          <>
            {mode === 'create' && (
              <Form.Item
                label="테넌트 ID"
                name="tenantIdInput"
                rules={[{ required: true, message: '테넌트 ID는 필수입니다' }]}
                tooltip="현재 컨텍스트 테넌트가 자동 채워지면 그대로 둡니다"
              >
                <InputNumber style={{ width: '100%' }} placeholder="예: 2025001019" />
              </Form.Item>
            )}
            <Form.Item label="사유 번호" name="reasonCode" tooltip="비워두면 서버에서 자동 채번 (max+1)">
              <InputNumber style={{ width: '100%' }} disabled={mode === 'edit'} placeholder="자동 채번" min={0} />
            </Form.Item>
            <Form.Item
              label="사유 이름"
              name="reasonName"
              rules={[
                { required: true, message: '필수' },
                { max: 16, message: '16자 이내' },
              ]}
            >
              <Input maxLength={16} placeholder="예: 식사, 교육" />
            </Form.Item>
            <Form.Item label="설명" name="reasonDesc" rules={[{ max: 256 }]}>
              <Input.TextArea rows={3} maxLength={256} showCount placeholder="용도 설명 (선택)" />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item label="CLASS_CD" name="classCd" rules={[{ required: true }]}>
              <Input disabled />
            </Form.Item>
            <Form.Item label="CODE_CD" name="codeCd" rules={[{ required: true, message: '필수' }, { max: 20 }]}>
              <Input disabled={mode === 'edit'} maxLength={20} placeholder="예: 90" />
            </Form.Item>
            <Form.Item label="코드명" name="codeName" rules={[{ max: 100 }]}>
              <Input maxLength={100} placeholder="예: SMS" />
            </Form.Item>
            <Form.Item label="정렬 순서" name="sortSeq">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item label="숨김 여부" name="hideYn" tooltip="0=표시 / 1=숨김">
              <Select
                options={[
                  { value: 0, label: '0 (표시)' },
                  { value: 1, label: '1 (숨김)' },
                ]}
              />
            </Form.Item>
            <Form.Item label="비고" name="bigo" rules={[{ max: 256 }]}>
              <Input.TextArea rows={3} maxLength={256} showCount />
            </Form.Item>
          </>
        )}
      </Form>
    </Drawer>
  );
}

function extractMessage(err: unknown): string | undefined {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message;
}
