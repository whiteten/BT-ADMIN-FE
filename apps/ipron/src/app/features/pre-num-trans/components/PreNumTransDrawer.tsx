/**
 * 발신 DNIS 사전변환 등록/수정 Drawer
 * forwardRef + useImperativeHandle 패턴
 *
 * transAction에 따라 라우트 선택 활성/비활성 제어
 * NumPatternDrawer 재사용 (did-trans 공유)
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select } from 'antd';
import { List } from 'lucide-react';
import { toast } from '@/shared-util';
import NumPatternDrawer, { type NumPatternDrawerRef } from '../../did-trans/components/NumPatternDrawer';
import { useCreatePreNumTrans, useDeletePreNumTrans, useGetRoutes, useUpdatePreNumTrans } from '../hooks/usePreNumTransQueries';
import { EDIT_OPT_OPTIONS, type PreNumTrans, type PreNumTransCreateRequest, TRANS_ACTION_OPTIONS } from '../types/preNumTrans.types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface NodeOption {
  nodeId: number;
  nodeName: string;
}

export interface PreNumTransDrawerRef {
  open: (data?: PreNumTrans, nodeId?: number, nodeName?: string, nodeList?: NodeOption[]) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const PreNumTransDrawer = forwardRef<PreNumTransDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const modal = useModal();
  const numPatternDrawerRef = useRef<NumPatternDrawerRef>(null);
  const [visible, setVisible] = useState(false);
  const [patternMode, setPatternMode] = useState(false);
  const [editData, setEditData] = useState<PreNumTrans | null>(null);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [nodeName, setNodeName] = useState<string>('');
  const [nodeOptions, setNodeOptions] = useState<NodeOption[]>([]);

  const isEditMode = !!editData;
  const isNodeSelectable = !isEditMode && !nodeId && nodeOptions.length > 0;

  // transAction watch
  const transAction = Form.useWatch('transAction', form);

  // ─── 라우트 목록 조회 ───────────────────────────────────────────────────────
  const currentNodeId = editData?.nodeId ?? nodeId;
  const routeParams = useMemo(() => (currentNodeId ? { nodeId: currentNodeId } : undefined), [currentNodeId]);
  const { data: routes = [] } = useGetRoutes({
    params: routeParams,
    queryOptions: { enabled: visible && !!currentNodeId },
  });

  const routeOptions = useMemo(() => routes.map((r) => ({ label: r.routeName, value: r.routeId })), [routes]);

  useImperativeHandle(ref, () => ({
    open: (data?: PreNumTrans, initNodeId?: number, initNodeName?: string, nodeList?: NodeOption[]) => {
      setEditData(data ?? null);
      setNodeId(data?.nodeId ?? initNodeId ?? null);
      setNodeName(data?.nodeName ?? initNodeName ?? '');
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
        dnisPattern: editData.dnisPattern,
        editOpt: editData.editOpt,
        delCount: editData.delCount,
        addDigit: editData.addDigit ?? '',
        priority: editData.priority,
        transAction: editData.transAction ?? 1,
        routeId: editData.routeId,
        transDesc: editData.transDesc ?? '',
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // transAction 변경 시 routeId 초기화
  useEffect(() => {
    if (transAction === 1) {
      form.setFieldsValue({ routeId: null });
    }
  }, [transAction, form]);

  // 노드 선택 모드 시 nodeId 변경 감지 → 라우트 리프레시
  const handleNodeChange = useCallback(
    (selectedNodeId: number) => {
      setNodeId(selectedNodeId);
      const selectedNode = nodeOptions.find((n) => n.nodeId === selectedNodeId);
      setNodeName(selectedNode?.nodeName ?? '');
      form.setFieldsValue({ routeId: null });
    },
    [nodeOptions, form],
  );

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createPreNumTrans, isPending: isCreating } = useCreatePreNumTrans({
    mutationOptions: {
      onSuccess: () => {
        toast.success('발신 DNIS 사전변환이 등록되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });
  const { mutate: updatePreNumTrans, isPending: isUpdating } = useUpdatePreNumTrans({
    mutationOptions: {
      onSuccess: () => {
        toast.success('발신 DNIS 사전변환이 수정되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });
  const { mutate: deletePreNumTrans, isPending: isDeleting } = useDeletePreNumTrans({
    mutationOptions: {
      onSuccess: () => {
        toast.success('발신 DNIS 사전변환이 삭제되었습니다.');
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
    setNodeOptions([]);
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      const targetNodeId = nodeId ?? values.nodeId;
      if (!targetNodeId) {
        toast.error('노드를 선택하세요.');
        return;
      }

      const payload: PreNumTransCreateRequest = {
        nodeId: targetNodeId,
        dnisPattern: values.dnisPattern,
        editOpt: values.editOpt,
        delCount: values.delCount ?? 0,
        addDigit: values.addDigit || null,
        priority: values.priority ?? 1,
        transAction: values.transAction ?? 1,
        routeId: values.transAction === 2 ? values.routeId : null,
        transDesc: values.transDesc || null,
      };

      if (isEditMode && editData) {
        updatePreNumTrans({ id: editData.preTransId, data: payload });
      } else {
        createPreNumTrans(payload);
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, nodeId, createPreNumTrans, updatePreNumTrans]);

  const handleDelete = useCallback(() => {
    if (!editData) return;
    modal.confirm.execute({
      onOk: () => deletePreNumTrans({ id: editData.preTransId }),
      options: {
        title: '발신 DNIS 사전변환 삭제',
        content: `DNIS 패턴 "${editData.dnisPattern}" 사전변환을 삭제하시겠습니까?`,
      },
    });
  }, [editData, modal, deletePreNumTrans]);

  return (
    <Drawer
      title={isEditMode ? '발신 DNIS 사전변환 수정' : '발신 DNIS 사전변환 등록'}
      open={visible}
      onClose={handleClose}
      styles={{ wrapper: { width: 420, display: patternMode ? 'none' : undefined } }}
      mask={!patternMode}
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
      <Form form={form} layout="vertical" initialValues={{ editOpt: 1, delCount: 0, priority: 1, transAction: 1 }}>
        {isNodeSelectable ? (
          <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드를 선택하세요' }]}>
            <Select placeholder="노드를 선택하세요" onChange={handleNodeChange}>
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
          name="dnisPattern"
          label={
            <div className="flex items-center gap-1">
              <span>DNIS 패턴</span>
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
            { required: true, message: 'DNIS 패턴은 필수입니다' },
            { max: 256, message: 'DNIS 패턴은 256자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="DNIS 패턴을 입력하세요" maxLength={256} />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="editOpt" label="편집옵션" rules={[{ required: true, message: '편집옵션은 필수입니다' }]}>
              <Select options={[...EDIT_OPT_OPTIONS]} placeholder="선택" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="delCount" label="편집 Digit 수" rules={[{ required: true, message: '필수' }]}>
              <InputNumber min={-1} max={99} placeholder="0" className="w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="addDigit" label="추가 Digit" rules={[{ max: 24, message: '24자 이내' }]}>
              <Input placeholder="추가 Digit" maxLength={24} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="priority" label="우선순위" rules={[{ required: true, message: '필수' }]}>
              <InputNumber min={1} max={999} placeholder="1" className="w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={10}>
            <Form.Item name="transAction" label="변환 동작" rules={[{ required: true, message: '필수' }]}>
              <Select options={[...TRANS_ACTION_OPTIONS]} placeholder="선택" />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item
              name="routeId"
              label="변환 후 라우트"
              rules={[
                {
                  required: transAction === 2,
                  message: '변환 후 라우트는 필수입니다',
                },
              ]}
            >
              <Select options={routeOptions} placeholder="라우트를 선택하세요" allowClear disabled={transAction !== 2} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="transDesc" label="비고" rules={[{ max: 256, message: '비고는 256자 이내여야 합니다' }]}>
          <Input.TextArea placeholder="비고를 입력하세요" maxLength={256} rows={2} />
        </Form.Item>
      </Form>

      <NumPatternDrawer
        ref={numPatternDrawerRef}
        onSelect={(pattern) => {
          form.setFieldsValue({ dnisPattern: pattern.numPattern });
          setPatternMode(false);
        }}
        onClose={() => setPatternMode(false)}
      />
    </Drawer>
  );
});

PreNumTransDrawer.displayName = 'PreNumTransDrawer';
export default PreNumTransDrawer;
