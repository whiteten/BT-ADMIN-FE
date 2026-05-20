/**
 * Sub DN 그룹 등록/수정 Sheet (Antd Drawer).
 * forwardRef + useImperativeHandle 패턴.
 *
 * IPRON 모듈은 모든 등록/수정을 Drawer로 일관 — Sub DN도 Drawer로 통일.
 *
 * AS-IS IPR20S6012_SubDnGroup.jsp 분기:
 *  - DN 그룹이 Direction=Outbound(10) AND outchUsetype=ACS(5) 일 때만 등록 가능 (페이지에서 체크)
 *  - 채널수는 DN 그룹의 잔여 채널을 초과할 수 없음 (수정 시 자기 자신 제외)
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Alert, Button, Col, Drawer, Form, Input, InputNumber, Row, Select } from 'antd';
import { Info } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateSubDnGroup, useGetSubDnQuota, useUpdateSubDnGroup } from '../hooks/useIvrDnGroupQueries';
import { type IrSubDnGroup, type IrSubDnGroupCreateRequest, SUB_DN_KIND_OPTIONS } from '../types';

export interface IvrSubDnGroupSheetRef {
  open: (data?: IrSubDnGroup) => void;
  close: () => void;
}

interface Props {
  dnGroupId: number;
  onSuccess: () => void;
}

const IvrSubDnGroupSheet = forwardRef<IvrSubDnGroupSheetRef, Props>(({ dnGroupId, onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<IrSubDnGroup | null>(null);
  const chnlCnt = Form.useWatch('chnlCnt', form);

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: IrSubDnGroup) => {
      setEditData(data ?? null);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      form.resetFields();
    },
  }));

  // ─── Quota 조회 (수정 시 자기 자신 제외) ─────────────────────────────────
  const quotaParams = useMemo(() => {
    const params: Record<string, unknown> = { id: dnGroupId };
    if (isEditMode && editData) {
      params.excludeSubId = editData.subDnGroupId;
    }
    return params;
  }, [dnGroupId, isEditMode, editData]);

  const { data: quota } = useGetSubDnQuota({
    params: quotaParams,
    queryOptions: { enabled: visible && !!dnGroupId },
  });

  const exceedsAvailable = quota && typeof chnlCnt === 'number' && chnlCnt > quota.availableChannelCount;

  // ─── Edit mode: 초기값 ───────────────────────────────────────────────────
  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        subDnGroupName: editData.subDnGroupName,
        chnlCnt: editData.chnlCnt,
        subDnGroupKind: editData.subDnGroupKind,
        subDnGroupDesc: editData.subDnGroupDesc ?? '',
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: createSubDnGroup, isPending: isCreating } = useCreateSubDnGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Sub DN이 등록되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '등록에 실패했습니다.');
      },
    },
  });

  const { mutate: updateSubDnGroup, isPending: isUpdating } = useUpdateSubDnGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Sub DN이 수정되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '수정에 실패했습니다.');
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const handleSubmit = useCallback(async () => {
    if (exceedsAvailable) {
      toast.error('DN 그룹의 잔여 채널을 초과합니다.');
      return;
    }
    try {
      const values = await form.validateFields();
      const payload: IrSubDnGroupCreateRequest = {
        subDnGroupName: values.subDnGroupName,
        chnlCnt: values.chnlCnt,
        subDnGroupKind: values.subDnGroupKind,
        subDnGroupDesc: values.subDnGroupDesc || undefined,
      };
      if (isEditMode && editData) {
        updateSubDnGroup({ subId: editData.subDnGroupId, data: payload });
      } else {
        createSubDnGroup({ id: dnGroupId, data: payload });
      }
    } catch {
      /* validation failed */
    }
  }, [exceedsAvailable, form, isEditMode, editData, dnGroupId, createSubDnGroup, updateSubDnGroup]);

  const handleClose = () => {
    setVisible(false);
    setEditData(null);
    form.resetFields();
  };

  return (
    <Drawer
      title={isEditMode ? 'Sub DN 수정' : 'Sub DN 등록'}
      open={visible}
      onClose={handleClose}
      styles={{ wrapper: { width: 480 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isPending} disabled={!!exceedsAvailable}>
            {isEditMode ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      {quota && (
        <Alert
          type="info"
          showIcon
          icon={<Info className="size-4" />}
          className="mb-3"
          message={
            <span className="text-[12px]">
              DN 그룹 채널 <b>{quota.dnGroupChannelCount}</b> / 사용 <b>{quota.usedChannelCount}</b> / 잔여 <b>{quota.availableChannelCount}</b>
            </span>
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          chnlCnt: 1,
          subDnGroupKind: '1',
        }}
      >
        <Form.Item
          name="subDnGroupName"
          label="Sub DN 명"
          required
          rules={[
            { required: true, message: 'Sub DN 명은 필수입니다' },
            { max: 64, message: '64자 이내' },
          ]}
        >
          <Input placeholder="예: SUB_DG_ACS_01" maxLength={64} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="subDnGroupKind" label="Sub DN 타입" required>
              <Select options={SUB_DN_KIND_OPTIONS as unknown as { label: string; value: string }[]} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="chnlCnt"
              label="채널 수"
              required
              rules={[{ required: true, type: 'number', min: 1, max: 100000, message: '1 이상' }]}
              validateStatus={exceedsAvailable ? 'error' : undefined}
              help={exceedsAvailable ? `잔여 ${quota?.availableChannelCount} 초과` : undefined}
            >
              <InputNumber min={1} max={100000} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="subDnGroupDesc" label="설명" rules={[{ max: 200, message: '200자 이내' }]}>
          <Input.TextArea placeholder="(선택)" maxLength={200} rows={3} showCount />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

IvrSubDnGroupSheet.displayName = 'IvrSubDnGroupSheet';
export default IvrSubDnGroupSheet;
