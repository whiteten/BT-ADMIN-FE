/**
 * 미디어타입 등록/수정 드로어.
 *
 * - 등록: MEDIA_TYPE 콤보 (IC_MEDIA_TYPE 메타에서 미배정만) + 표시 이름
 * - 수정: MEDIA_TYPE 잠금, 표시 이름만 편집
 *
 * SERVICE_TYPE 은 BE 에서 항상 MEDIA_TYPE 과 동일 값으로 저장 (UI 노출 X).
 */
import { useEffect, useMemo } from 'react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { toast } from '@/shared-util';
import { useCreateMediaType, useGetMediaTypeMeta, useUpdateMediaType } from '../hooks/useMediaTypeQueries';
import type { MediaTypeResponse } from '../types';

type Mode = 'create' | 'edit';

export type MediaTypeDrawerState = { open: false } | { open: true; mode: Mode; row?: MediaTypeResponse };

interface Props {
  state: MediaTypeDrawerState;
  onClose: () => void;
}

export default function MediaTypeFormDrawer({ state, onClose }: Props) {
  const [form] = Form.useForm();

  const { data: meta = [] } = useGetMediaTypeMeta();

  const { mutate: createMt, isPending: isCreating } = useCreateMediaType({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어 코드가 등록되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '등록 실패'),
    },
  });

  const { mutate: updateMt, isPending: isUpdating } = useUpdateMediaType({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어 코드가 수정되었습니다');
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
    if (state.row) {
      form.setFieldsValue({
        mediaType: state.row.mediaType,
        mediaAlias: state.row.mediaAlias,
      });
    }
  }, [state, form]);

  // 등록 시: 미배정 메타만 옵션
  const createOptions = useMemo(() => meta.filter((m) => !m.inUse).map((m) => ({ value: m.codeCd, label: `${m.codeCd} — ${m.codeName}` })), [meta]);
  // 수정 시: 전체 메타 (disabled 콤보 표시용)
  const allOptions = useMemo(() => meta.map((m) => ({ value: m.codeCd, label: `${m.codeCd} — ${m.codeName}` })), [meta]);

  if (!state.open) return null;

  const { mode } = state;
  const submitting = isCreating || isUpdating;

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (mode === 'create') {
        createMt({
          mediaType: values.mediaType,
          mediaAlias: values.mediaAlias,
        });
      } else if (state.row) {
        updateMt({
          mediaType: state.row.mediaType,
          body: {
            mediaAlias: values.mediaAlias,
          },
        });
      }
    } catch {
      // form validation error: silent
    }
  };

  return (
    <Drawer
      title={mode === 'create' ? '미디어 코드 등록' : '미디어 코드 수정'}
      closable={{ placement: 'end' }}
      size={520}
      open={state.open}
      onClose={onClose}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={submitting} onClick={onSubmit}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="미디어 코드"
          name="mediaType"
          rules={[{ required: true, message: '미디어 코드는(는) 필수입니다' }]}
          tooltip="등록 시 아직 배정되지 않은 항목만 선택 가능합니다"
        >
          <Select options={mode === 'create' ? createOptions : allOptions} disabled={mode === 'edit'} placeholder="미디어 코드 선택" showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item
          label="표시 이름"
          name="mediaAlias"
          rules={[
            { required: true, message: '표시 이름은(는) 필수입니다' },
            { max: 32, message: '32자 이내여야 합니다' },
          ]}
        >
          <Input maxLength={32} placeholder="예: 화상 상담" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

function extractMessage(err: unknown): string | undefined {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message;
}
