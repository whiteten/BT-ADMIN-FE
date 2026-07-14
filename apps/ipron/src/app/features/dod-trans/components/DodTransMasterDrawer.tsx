/**
 * DOD DNIS 변환 마스터 등록/수정 Drawer
 * forwardRef + useImperativeHandle 패턴
 *
 * 등록 시 노드/테넌트 모두 Select로 선택 가능
 * - 노드 선택 → 해당 노드의 테넌트만 노출
 * - 초기값(initNodeId/initTenantId)은 전달된 경우 prefill
 * - 수정 시 노드/테넌트는 disabled (변경 불가)
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import type { NodeTenantItem } from '../api/dodTransApi';
import { useCreateMaster, useDeleteMaster, useUpdateMaster } from '../hooks/useDodTransQueries';
import type { DodTransMaster } from '../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface NodeOption {
  nodeId: number;
  nodeName: string;
}

export interface DodTransMasterDrawerRef {
  open: (data?: DodTransMaster, nodeId?: number, nodeName?: string, tenantId?: number, tenantName?: string) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
  nodes: NodeOption[];
  nodeTenants: NodeTenantItem[];
}

const DodTransMasterDrawer = forwardRef<DodTransMasterDrawerRef, Props>(({ onSuccess, nodes, nodeTenants }, ref) => {
  const [form] = Form.useForm();
  const modal = useModal();
  // 운영자 모드에서만 "테넌트" 선택 노출. 일반 콘솔은 로그인(활성) 테넌트로 고정 → 숨김.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const activeTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t != null ? Number(t) : null;
  });
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<DodTransMaster | null>(null);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [tenantId, setTenantId] = useState<number | null>(null);

  const isEditMode = !!editData;

  // 테넌트 옵션 — 노드-테넌트 매핑 기준 전체 테넌트 (운영자 대행 선택 가능)
  const tenantOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const nt of nodeTenants) {
      if (!map.has(nt.tenantId)) map.set(nt.tenantId, nt.tenantName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ label: name, value: id }));
  }, [nodeTenants]);

  // 노드 옵션 — 테넌트 선택 시 해당 테넌트가 속한 노드만, 미선택 시 전체
  const nodeOptions = useMemo(() => {
    if (!tenantId) return nodes.map((n) => ({ label: n.nodeName, value: n.nodeId }));
    const nodeIds = new Set(nodeTenants.filter((nt) => nt.tenantId === tenantId).map((nt) => nt.nodeId));
    return nodes.filter((n) => nodeIds.has(n.nodeId)).map((n) => ({ label: n.nodeName, value: n.nodeId }));
  }, [nodes, nodeTenants, tenantId]);

  useImperativeHandle(ref, () => ({
    open: (data?: DodTransMaster, initNodeId?: number, _initNodeName?: string, initTenantId?: number, _initTenantName?: string) => {
      setEditData(data ?? null);
      setNodeId(data?.nodeId ?? initNodeId ?? null);
      // 일반 모드: 로그인 테넌트로 고정(부모 전달값 우선, 없으면 활성 테넌트 폴백).
      setTenantId(data?.tenantId ?? initTenantId ?? (operatorMode ? null : activeTenantId));
      setVisible(true);
    },
    close: () => handleClose(),
  }));

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        dodTransName: editData.dodTransName,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // 테넌트 변경 시 선택된 노드가 해당 테넌트에 없으면 초기화
  useEffect(() => {
    if (isEditMode) return;
    if (!tenantId || !nodeId) return;
    const exists = nodeTenants.some((nt) => nt.nodeId === nodeId && nt.tenantId === tenantId);
    if (!exists) setNodeId(null);
  }, [tenantId, nodeId, nodeTenants, isEditMode]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createMaster, isPending: isCreating } = useCreateMaster({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DOD DNIS 변환이 등록되었습니다');
        handleClose();
        onSuccess();
      },
    },
  });

  const { mutate: updateMaster, isPending: isUpdating } = useUpdateMaster({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DOD DNIS 변환이 수정되었습니다');
        handleClose();
        onSuccess();
      },
    },
  });

  const { mutate: deleteMaster, isPending: isDeleting } = useDeleteMaster({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DOD DNIS 변환이 삭제되었습니다');
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
    setTenantId(null);
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (!nodeId) {
        toast.error('노드를 선택하세요');
        return;
      }
      if (!tenantId) {
        toast.error('테넌트를 선택하세요');
        return;
      }

      const payload = {
        nodeId,
        tenantId,
        dodTransName: values.dodTransName,
      };

      if (isEditMode && editData) {
        updateMaster({ id: editData.dodTransId, data: payload });
      } else {
        createMaster(payload);
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, nodeId, tenantId, createMaster, updateMaster]);

  const handleDelete = useCallback(() => {
    if (!editData) return;
    if ((editData.itemCount ?? 0) > 0) {
      toast.error(`등록된 패턴 ${editData.itemCount}건이 있어 삭제할 수 없습니다`);
      return;
    }
    modal.confirm.execute({
      onOk: () => deleteMaster({ id: editData.dodTransId }),
      options: {
        title: 'DOD DNIS 변환 삭제',
        content: `"${editData.dodTransName}" 변환을 삭제하시겠습니까?`,
      },
    });
  }, [editData, modal, deleteMaster]);

  return (
    <Drawer
      title={isEditMode ? 'DOD DNIS 변환 수정' : 'DOD DNIS 변환 등록'}
      open={visible}
      onClose={handleClose}
      closable={{ placement: 'end' }}
      styles={{ wrapper: { width: 420 } }}
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
      <Form form={form} layout="vertical">
        {operatorMode && (
          <Form.Item label="테넌트" required>
            <Select
              placeholder="테넌트를 선택하세요"
              options={tenantOptions}
              value={tenantId ?? undefined}
              onChange={(v) => setTenantId(v)}
              disabled={isEditMode}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        )}

        <Form.Item label="노드" required>
          <Select
            placeholder={tenantId ? '노드를 선택하세요' : '테넌트를 먼저 선택하거나 노드를 선택하세요'}
            options={nodeOptions}
            value={nodeId ?? undefined}
            onChange={(v) => setNodeId(v)}
            disabled={isEditMode}
            notFoundContent={tenantId ? '이 테넌트에 연결된 노드가 없습니다' : null}
          />
        </Form.Item>

        <Form.Item
          name="dodTransName"
          label="DOD DNIS 변환명"
          required
          rules={[
            { required: true, message: 'DOD DNIS 변환명은 필수입니다' },
            { max: 100, message: 'DOD DNIS 변환명은 100자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="DOD DNIS 변환명을 입력하세요" maxLength={100} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

DodTransMasterDrawer.displayName = 'DodTransMasterDrawer';
export default DodTransMasterDrawer;
