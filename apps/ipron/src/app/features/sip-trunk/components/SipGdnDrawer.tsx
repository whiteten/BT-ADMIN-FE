/**
 * SIP 트렁크 그룹DN (GDN_TYPE=18) 등록/수정 Drawer.
 *
 * SWAT IPR20S3030 poPopup01 정합:
 *  - 수정 시 그룹DN 번호 disabled (:531)
 *  - DR노드 지정 시 Global DN 사용 강제 + disabled (:302)
 *
 * 등록은 헤더 + 버튼 / 수정은 그리드 행 더블클릭(onRowDoubleClicked) 으로 오픈.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Radio, Select } from 'antd';
import { toast } from '@/shared-util';
import { useCreateSipGdn, useUpdateSipGdn } from '../hooks/useSipTrunkQueries';
import type { SipGdnResponse } from '../types';

export interface SipGdnDrawerRef {
  openCreate: () => void;
  openEdit: (data: SipGdnResponse) => void;
  close: () => void;
}

interface NodeOption {
  nodeId: number;
  nodeName: string;
}

interface Props {
  /** 등록 컨텍스트 (선택된 노드/테넌트) */
  nodeId: number | null;
  tenantId: number | null;
  /** DR노드 후보 (현재 노드 제외) */
  drNodeOptions: NodeOption[];
  onSuccess?: () => void;
}

interface FormValues {
  gdnNo: string;
  gdnName: string;
  backUpNodeId: number;
  globalDnYn: number;
  maxWaitcnt: number;
  maxWaittime: number;
  blockYn: number;
}

const SipGdnDrawer = forwardRef<SipGdnDrawerRef, Props>(({ nodeId, tenantId, drNodeOptions, onSuccess }, ref) => {
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<SipGdnResponse | null>(null);
  const isEdit = !!editData;

  const backUpNodeId = Form.useWatch('backUpNodeId', form);
  const globalForced = backUpNodeId != null && backUpNodeId !== 0;

  const handleClose = useCallback(() => {
    setVisible(false);
    setEditData(null);
    form.resetFields();
  }, [form]);

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      setEditData(null);
      setVisible(true);
    },
    openEdit: (data: SipGdnResponse) => {
      setEditData(data);
      setVisible(true);
    },
    close: handleClose,
  }));

  useEffect(() => {
    if (!visible) return;
    if (editData) {
      form.setFieldsValue({
        gdnNo: editData.gdnNo,
        gdnName: editData.gdnName,
        backUpNodeId: editData.backUpNodeId ?? 0,
        globalDnYn: editData.globalDnYn ?? 0,
        maxWaitcnt: editData.maxWaitcnt ?? 0,
        maxWaittime: editData.maxWaittime ?? 0,
        blockYn: editData.blockYn ?? 0,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ backUpNodeId: 0, globalDnYn: 0, maxWaitcnt: 0, maxWaittime: 0, blockYn: 0 });
    }
  }, [visible, editData, form]);

  // DR노드 지정 시 Global DN 사용 강제
  useEffect(() => {
    if (globalForced) form.setFieldValue('globalDnYn', 1);
  }, [globalForced, form]);

  const { mutate: createGdn, isPending: creating } = useCreateSipGdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹DN이 등록되었습니다.');
        handleClose();
        onSuccess?.();
      },
      onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '등록 실패'),
    },
  });

  const { mutate: updateGdn, isPending: updating } = useUpdateSipGdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹DN이 수정되었습니다.');
        handleClose();
        onSuccess?.();
      },
      onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '수정 실패'),
    },
  });

  const handleSubmit = useCallback(async () => {
    try {
      const v = await form.validateFields();
      const backUp = v.backUpNodeId && v.backUpNodeId !== 0 ? v.backUpNodeId : null;
      if (isEdit && editData) {
        updateGdn({
          gdnId: editData.gdnId,
          body: {
            gdnName: v.gdnName,
            backUpNodeId: backUp,
            globalDnYn: v.globalDnYn,
            maxWaitcnt: v.maxWaitcnt,
            maxWaittime: v.maxWaittime,
            blockYn: v.blockYn,
          },
        });
      } else {
        if (nodeId == null || tenantId == null) {
          toast.warning('노드와 테넌트를 먼저 선택하세요.');
          return;
        }
        createGdn({
          nodeId,
          tenantId,
          gdnNo: v.gdnNo,
          gdnName: v.gdnName,
          backUpNodeId: backUp,
          globalDnYn: v.globalDnYn,
          maxWaitcnt: v.maxWaitcnt,
          maxWaittime: v.maxWaittime,
          blockYn: v.blockYn,
        });
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEdit, editData, nodeId, tenantId, createGdn, updateGdn]);

  return (
    <Drawer
      title={isEdit ? '그룹DN 수정' : '그룹DN 등록'}
      open={visible}
      onClose={handleClose}
      width={520}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={creating || updating}>
            {isEdit ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="gdnNo"
          label="그룹DN 번호"
          rules={[
            { required: true, message: '그룹DN 번호는 필수입니다' },
            { pattern: /^[0-9]{3,8}$/, message: '3~8자리 숫자' },
          ]}
        >
          <Input placeholder="3~8자리 숫자" maxLength={8} disabled={isEdit} />
        </Form.Item>

        <Form.Item
          name="gdnName"
          label="그룹DN 이름"
          rules={[
            { required: true, message: '그룹DN 이름은 필수입니다' },
            { max: 100, message: '100자 이내' },
          ]}
        >
          <Input placeholder="1~100자" maxLength={100} />
        </Form.Item>

        <Form.Item name="backUpNodeId" label="DR노드 (백업 노드)" extra="DR노드 지정 시 Global DN 자동 강제">
          <Select options={[{ value: 0, label: '없음' }, ...drNodeOptions.map((n) => ({ value: n.nodeId, label: n.nodeName }))]} />
        </Form.Item>

        <Form.Item name="globalDnYn" label="Global DN" extra={globalForced ? 'DR노드 지정으로 자동 강제' : undefined}>
          <Radio.Group disabled={globalForced}>
            <Radio value={1}>사용</Radio>
            <Radio value={0}>미사용</Radio>
          </Radio.Group>
        </Form.Item>

        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item name="maxWaitcnt" label="최대수신대기호">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="maxWaittime" label="최대수신대기시간">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>

        <Form.Item name="blockYn" label="블럭 여부">
          <Radio.Group>
            <Radio value={1}>설정</Radio>
            <Radio value={0}>해제</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Drawer>
  );
});

SipGdnDrawer.displayName = 'SipGdnDrawer';
export default SipGdnDrawer;
