/**
 * DID 번호변환 등록/수정 Drawer (DNIS/ANI 통합)
 * forwardRef + useImperativeHandle 패턴
 *
 * category에 따라 DNIS API 또는 ANI API를 호출
 * 노드 미선택 상태에서 추가 시 노드 드롭다운 표시
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select } from 'antd';
import { List } from 'lucide-react';
import { toast } from '@/shared-util';
import NumPatternDrawer, { type NumPatternDrawerRef } from './NumPatternDrawer';
import { useCreateAniTrans, useCreateDnisTrans, useDeleteAniTrans, useDeleteDnisTrans, useUpdateAniTrans, useUpdateDnisTrans } from '../hooks/useDidTransQueries';
import { type DidTrans, type DidTransCategory, type DidTransCreateRequest, EDIT_OPT_OPTIONS } from '../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface NodeOption {
  nodeId: number;
  nodeName: string;
}

export interface DidTransDrawerRef {
  open: (data?: DidTrans, nodeId?: number, nodeName?: string, category?: DidTransCategory, nodeList?: NodeOption[]) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const DidTransDrawer = forwardRef<DidTransDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const modal = useModal();
  const numPatternDrawerRef = useRef<NumPatternDrawerRef>(null);
  const [visible, setVisible] = useState(false);
  const [patternMode, setPatternMode] = useState(false); // 패턴 Drawer 열림 → 본 Drawer 숨김
  const [editData, setEditData] = useState<DidTrans | null>(null);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [nodeName, setNodeName] = useState<string>('');
  const [category, setCategory] = useState<DidTransCategory>('dnis');
  const [nodeOptions, setNodeOptions] = useState<NodeOption[]>([]);

  const isEditMode = !!editData;
  const isNodeSelectable = !isEditMode && !nodeId && nodeOptions.length > 0;
  const categoryLabel = category === 'dnis' ? 'DNIS' : 'ANI';

  useImperativeHandle(ref, () => ({
    open: (data?: DidTrans, initNodeId?: number, initNodeName?: string, cat?: DidTransCategory, nodeList?: NodeOption[]) => {
      setEditData(data ?? null);
      setNodeId(data?.nodeId ?? initNodeId ?? null);
      setNodeName(data?.nodeName ?? initNodeName ?? '');
      setCategory(cat ?? 'dnis');
      setNodeOptions(nodeList ?? []);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      setNodeId(null);
      setNodeName('');
      setNodeOptions([]);
      form.resetFields();
    },
  }));

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        transName: editData.transName,
        orgPattern: editData.orgPattern,
        editOpt: editData.editOpt,
        delCount: editData.delCount,
        addDigit: editData.addDigit ?? '',
        transPriority: editData.transPriority,
        transDesc: editData.transDesc ?? '',
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // ─── DNIS mutations ──────────────────────────────────────────────────────
  const { mutate: createDnis, isPending: isCreatingDnis } = useCreateDnisTrans({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DNIS 번호변환이 등록되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });
  const { mutate: updateDnis, isPending: isUpdatingDnis } = useUpdateDnisTrans({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DNIS 번호변환이 수정되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });
  const { mutate: deleteDnis, isPending: isDeletingDnis } = useDeleteDnisTrans({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DNIS 번호변환이 삭제되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  // ─── ANI mutations ───────────────────────────────────────────────────────
  const { mutate: createAni, isPending: isCreatingAni } = useCreateAniTrans({
    mutationOptions: {
      onSuccess: () => {
        toast.success('ANI 번호변환이 등록되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });
  const { mutate: updateAni, isPending: isUpdatingAni } = useUpdateAniTrans({
    mutationOptions: {
      onSuccess: () => {
        toast.success('ANI 번호변환이 수정되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });
  const { mutate: deleteAni, isPending: isDeletingAni } = useDeleteAniTrans({
    mutationOptions: {
      onSuccess: () => {
        toast.success('ANI 번호변환이 삭제되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const isPending = isCreatingDnis || isUpdatingDnis || isDeletingDnis || isCreatingAni || isUpdatingAni || isDeletingAni;

  const handleClose = useCallback(() => {
    setVisible(false);
    setEditData(null);
    setNodeId(null);
    setNodeName('');
    setNodeOptions([]);
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      // 노드 선택 모드일 때 form에서 nodeId 가져오기
      const targetNodeId = nodeId ?? values.nodeId;
      if (!targetNodeId) {
        toast.error('노드를 선택하세요.');
        return;
      }

      const payload: DidTransCreateRequest = {
        nodeId: targetNodeId,
        transName: values.transName,
        orgPattern: values.orgPattern,
        editOpt: values.editOpt,
        delCount: values.delCount ?? 0,
        addDigit: values.addDigit || null,
        transPriority: values.transPriority ?? 1,
        transDesc: values.transDesc || null,
      };

      if (isEditMode && editData) {
        if (category === 'dnis') {
          updateDnis({ id: editData.transId, data: payload });
        } else {
          updateAni({ id: editData.transId, data: payload });
        }
      } else {
        if (category === 'dnis') {
          createDnis(payload);
        } else {
          createAni(payload);
        }
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, nodeId, category, createDnis, updateDnis, createAni, updateAni]);

  const handleDelete = useCallback(() => {
    if (!editData) return;
    const deleteFn = category === 'dnis' ? deleteDnis : deleteAni;
    modal.confirm.execute({
      onOk: () => deleteFn({ id: editData.transId }),
      options: {
        title: `${categoryLabel} 번호변환 삭제`,
        content: `"${editData.transName}" 번호변환을 삭제하시겠습니까?`,
      },
    });
  }, [editData, modal, category, categoryLabel, deleteDnis, deleteAni]);

  return (
    <Drawer
      title={isEditMode ? `${categoryLabel} 번호변환 수정` : `${categoryLabel} 번호변환 등록`}
      open={visible}
      onClose={handleClose}
      styles={{ wrapper: { width: 420, display: patternMode ? 'none' : undefined } }}
      mask={!patternMode}
      footer={
        <div className="flex justify-between">
          <div>
            {isEditMode && (
              <Button danger onClick={handleDelete} loading={isDeletingDnis || isDeletingAni}>
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
      <Form form={form} layout="vertical" initialValues={{ editOpt: 1, delCount: 0, transPriority: 1 }}>
        {isNodeSelectable ? (
          <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드를 선택하세요' }]}>
            <Select placeholder="노드를 선택하세요">
              {nodeOptions.map((n) => (
                <Select.Option key={n.nodeId} value={n.nodeId}>
                  {n.nodeName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          <Form.Item label="노드">
            <Input value={nodeName || (nodeId ? `Node ${nodeId}` : '')} disabled />
          </Form.Item>
        )}

        <Form.Item
          name="transName"
          label="변환명"
          required
          rules={[
            { required: true, message: '변환명은 필수입니다' },
            { max: 100, message: '변환명은 100자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="변환명을 입력하세요" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="orgPattern"
          label={
            <div className="flex items-center gap-1">
              <span>원본패턴</span>
              <Button
                type="text"
                size="small"
                icon={<List className="size-3.5" />}
                onClick={() => {
                  setPatternMode(true);
                  numPatternDrawerRef.current?.open();
                }}
                title="번호 패턴 관리"
                className="text-gray-400 hover:text-blue-500"
              />
            </div>
          }
          required
          rules={[
            { required: true, message: '원본패턴은 필수입니다' },
            { max: 256, message: '원본패턴은 256자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="원본패턴을 입력하세요" maxLength={256} />
        </Form.Item>

        <Form.Item name="editOpt" label="편집옵션" rules={[{ required: true, message: '편집옵션은 필수입니다' }]}>
          <Select options={[...EDIT_OPT_OPTIONS]} placeholder="편집옵션을 선택하세요" />
        </Form.Item>

        <Form.Item name="delCount" label="편집 Digit 수" rules={[{ required: true, message: '편집 Digit 수는 필수입니다' }]}>
          <InputNumber min={0} max={99} placeholder="0" className="w-full" />
        </Form.Item>

        <Form.Item name="addDigit" label="추가 Digit" rules={[{ max: 24, message: '추가 Digit은 24자 이내여야 합니다' }]}>
          <Input placeholder="추가 Digit을 입력하세요" maxLength={24} />
        </Form.Item>

        <Form.Item name="transPriority" label="변환 우선순위" rules={[{ required: true, message: '변환 우선순위는 필수입니다' }]}>
          <InputNumber min={0} max={9999} placeholder="1" className="w-full" />
        </Form.Item>

        <Form.Item name="transDesc" label="비고" rules={[{ max: 256, message: '비고는 256자 이내여야 합니다' }]}>
          <Input.TextArea placeholder="비고를 입력하세요" maxLength={256} rows={3} />
        </Form.Item>
      </Form>

      <NumPatternDrawer
        ref={numPatternDrawerRef}
        onSelect={(pattern) => {
          form.setFieldsValue({ orgPattern: pattern.numPattern });
          setPatternMode(false);
        }}
        onClose={() => setPatternMode(false)}
      />
    </Drawer>
  );
});

DidTransDrawer.displayName = 'DidTransDrawer';
export default DidTransDrawer;
