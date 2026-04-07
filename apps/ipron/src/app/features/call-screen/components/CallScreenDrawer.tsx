/**
 * 수신번호 차단 등록/수정 Drawer
 * forwardRef + useImperativeHandle 패턴
 *
 * 차단번호 패턴 필드에서 NumPatternDrawer 연동
 * NumPatternDrawer 열릴 때 이 Drawer는 display:none 처리
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';
import NumPatternDrawer, { type NumPatternDrawerRef } from '../../did-trans/components/NumPatternDrawer';
import type { NumPattern } from '../../did-trans/types/didTrans.types';
import { useCreateCallScreen, useDeleteCallScreen, useUpdateCallScreen } from '../hooks/useCallScreenQueries';
import type { CallScreen, CallScreenCreateRequest, CallScreenUpdateRequest } from '../types/callScreen.types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export interface CallScreenDrawerRef {
  open: (data?: CallScreen, nodeId?: number, nodeName?: string, tenantId?: number, tenantName?: string) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const CallScreenDrawer = forwardRef<CallScreenDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const modal = useModal();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<CallScreen | null>(null);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [nodeName, setNodeName] = useState('');
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [patternDrawerOpen, setPatternDrawerOpen] = useState(false);

  const numPatternDrawerRef = useRef<NumPatternDrawerRef>(null);

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: CallScreen, initNodeId?: number, initNodeName?: string, initTenantId?: number, initTenantName?: string) => {
      setEditData(data ?? null);
      setNodeId(data?.nodeId ?? initNodeId ?? null);
      setNodeName(data?.nodeName ?? initNodeName ?? '');
      setTenantId(data?.tenantId ?? initTenantId ?? null);
      setTenantName(data?.tenantName ?? initTenantName ?? '');
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      form.resetFields();
    },
  }));

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        numPattern: editData.numPattern,
        screenDesc: editData.screenDesc ?? '',
        dnGroupId: editData.dnGroupId ?? null,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createCallScreen, isPending: isCreating } = useCreateCallScreen({
    mutationOptions: {
      onSuccess: () => {
        toast.success('수신번호 차단이 등록되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const { mutate: updateCallScreen, isPending: isUpdating } = useUpdateCallScreen({
    mutationOptions: {
      onSuccess: () => {
        toast.success('수신번호 차단이 수정되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const { mutate: deleteCallScreen, isPending: isDeleting } = useDeleteCallScreen({
    mutationOptions: {
      onSuccess: () => {
        toast.success('수신번호 차단이 삭제되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const isPending = isCreating || isUpdating || isDeleting;

  const handleClose = useCallback(() => {
    setVisible(false);
    setEditData(null);
    setNodeId(null);
    setNodeName('');
    setTenantId(null);
    setTenantName('');
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (isEditMode && editData) {
        const payload: CallScreenUpdateRequest = {
          numPattern: values.numPattern,
          screenDesc: values.screenDesc || null,
          dnGroupId: values.dnGroupId ?? null,
        };
        updateCallScreen({ id: editData.callscreenId, data: payload });
      } else {
        if (!nodeId || !tenantId) {
          toast.error('노드와 테넌트 정보가 필요합니다.');
          return;
        }
        const payload: CallScreenCreateRequest = {
          nodeId,
          tenantId,
          numPattern: values.numPattern,
          screenDesc: values.screenDesc || null,
          dnGroupId: values.dnGroupId ?? null,
        };
        createCallScreen(payload);
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, nodeId, tenantId, createCallScreen, updateCallScreen]);

  const handleDelete = useCallback(() => {
    if (!editData) return;
    modal.confirm.execute({
      onOk: () => deleteCallScreen({ id: editData.callscreenId }),
      options: {
        title: '수신번호 차단 삭제',
        content: `"${editData.numPattern}" 차단을 삭제하시겠습니까?`,
      },
    });
  }, [editData, modal, deleteCallScreen]);

  const handlePatternSelect = useCallback(
    (pattern: NumPattern) => {
      form.setFieldsValue({ numPattern: pattern.numPattern });
      setPatternDrawerOpen(false);
    },
    [form],
  );

  const handleOpenPatternDrawer = useCallback(() => {
    setPatternDrawerOpen(true);
    numPatternDrawerRef.current?.open();
  }, []);

  const handlePatternDrawerClose = useCallback(() => {
    setPatternDrawerOpen(false);
  }, []);

  return (
    <>
      <Drawer
        title={isEditMode ? '수신번호 차단 수정' : '수신번호 차단 등록'}
        open={visible}
        onClose={handleClose}
        styles={{ wrapper: { width: 420, display: patternDrawerOpen ? 'none' : undefined } }}
        footer={
          <div className="flex justify-between">
            <div>
              {isEditMode && (
                <Button danger onClick={handleDelete} loading={isDeleting}>
                  삭제
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleClose}>취소</Button>
              <Button type="primary" onClick={handleSubmit} loading={isPending}>
                {isEditMode ? '수정' : '등록'}
              </Button>
            </div>
          </div>
        }
      >
        <Form form={form} layout="vertical" initialValues={{ numPattern: '', screenDesc: '', dnGroupId: null }}>
          <Form.Item label="노드">
            <Input value={nodeName} disabled />
          </Form.Item>

          <Form.Item label="테넌트">
            <Input value={tenantName} disabled />
          </Form.Item>

          <Form.Item
            name="numPattern"
            label="차단번호 패턴"
            required
            rules={[
              { required: true, message: '차단번호 패턴은 필수입니다' },
              { max: 256, message: '차단번호 패턴은 256자 이내여야 합니다' },
            ]}
          >
            <Input
              placeholder="차단번호 패턴을 입력하세요"
              maxLength={256}
              style={{ fontFamily: 'monospace' }}
              suffix={<Button type="text" size="small" icon={<Search className="size-3.5 text-gray-400" />} onClick={handleOpenPatternDrawer} className="!p-0 !h-auto" />}
            />
          </Form.Item>

          <Form.Item name="screenDesc" label="차단 설명" rules={[{ max: 64, message: '차단 설명은 64자 이내여야 합니다' }]}>
            <Input.TextArea placeholder="차단 설명을 입력하세요" maxLength={64} rows={3} />
          </Form.Item>

          <Form.Item name="dnGroupId" label="DN 그룹">
            <Select placeholder="사용안함" allowClear>
              {/* TODO: DN그룹 API 연동 */}
            </Select>
          </Form.Item>
        </Form>
      </Drawer>

      <NumPatternDrawer ref={numPatternDrawerRef} onSelect={handlePatternSelect} onClose={handlePatternDrawerClose} />
    </>
  );
});

CallScreenDrawer.displayName = 'CallScreenDrawer';
export default CallScreenDrawer;
