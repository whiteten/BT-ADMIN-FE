/**
 * HA 그룹 멤버 등록/수정 Drawer.
 * forwardRef + useImperativeHandle 패턴.
 *
 * AS-IS IPR20S8080_HaGroupMember.jsp 분기 로직:
 *  - Role 타입=서비스(30): SVC NIC/IP/Netmask 활성 + 필수
 *  - Role 타입=백업(20 등): SVC NIC/IP/Netmask 비활성(서버에서 정리)
 *  - 시스템 선택 시 HA IP(+서비스일 땐 SVC IP)를 해당 시스템 IP로 자동 채움(편집 가능)
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select } from 'antd';
import { toast } from '@/shared-util';
import { useCreateHaGroupMember, useGetAvailableSystems, useUpdateHaGroupMember } from '../hooks/useHaGroupQueries';
import { HA_ROLE_TYPE_KIND, HA_ROLE_TYPE_KIND_LABELS, type HaGroupMember, type HaGroupMemberCreateRequest, type HaGroupMemberUpdateRequest } from '../types';

const ROLE_TYPE_OPTIONS = Object.entries(HA_ROLE_TYPE_KIND_LABELS).map(([value, label]) => ({ label, value: Number(value) }));

export interface HaGroupMemberDrawerRef {
  open: (data?: HaGroupMember) => void;
  close: () => void;
}

interface Props {
  haGroupId: number | null;
  haGroupName: string | null;
  nodeId: number | null;
  onSuccess: () => void;
}

const HaGroupMemberDrawer = forwardRef<HaGroupMemberDrawerRef, Props>(({ haGroupId, haGroupName, nodeId, onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<HaGroupMember | null>(null);
  const isEditMode = !!editData;
  const roleType = Form.useWatch('roleType', form);
  const isService = roleType === HA_ROLE_TYPE_KIND.SERVICE;

  useImperativeHandle(ref, () => ({
    open: (data?: HaGroupMember) => {
      setEditData(data ?? null);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      form.resetFields();
    },
  }));

  const { data: availableSystems = [] } = useGetAvailableSystems({
    params: nodeId ? { nodeId, excludeSystemId: editData?.systemId } : undefined,
    queryOptions: { enabled: !!nodeId && visible },
  });

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        systemId: editData.systemId,
        roleAlias: editData.roleAlias,
        roleType: editData.roleType,
        haIpaddr: editData.haIpaddr,
        svcNic: editData.svcNic ?? '',
        svcIpaddr: editData.svcIpaddr ?? '',
        svcNetmask: editData.svcNetmask ?? 24,
      });
    } else if (visible) {
      form.resetFields();
      form.setFieldsValue({ roleType: HA_ROLE_TYPE_KIND.SERVICE, svcNetmask: 24 });
    }
  }, [visible, editData, form]);

  const handleSystemChange = (systemId: number) => {
    const system = availableSystems.find((s) => s.systemId === systemId);
    const ip = system?.ipv4Address ?? system?.ipv6Address ?? '';
    form.setFieldsValue({ haIpaddr: ip, ...(isService ? { svcIpaddr: ip } : {}) });
  };

  const { mutate: createMember, isPending: isCreating } = useCreateHaGroupMember({
    mutationOptions: {
      onSuccess: () => {
        toast.success('HA 그룹 멤버가 등록되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? '등록에 실패했습니다.'),
    },
  });

  const { mutate: updateMember, isPending: isUpdating } = useUpdateHaGroupMember({
    mutationOptions: {
      onSuccess: () => {
        toast.success('HA 그룹 멤버가 수정되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? '수정에 실패했습니다.'),
    },
  });

  const isPending = isCreating || isUpdating;

  const handleSubmit = useCallback(async () => {
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const roleFields = {
      roleAlias: values.roleAlias as string,
      roleType: values.roleType as number,
      haIpaddr: values.haIpaddr as string,
      svcNic: isService ? (values.svcNic as string) : undefined,
      svcIpaddr: isService ? (values.svcIpaddr as string) : undefined,
      svcNetmask: isService ? (values.svcNetmask as number) : undefined,
    };

    if (isEditMode && editData && haGroupId) {
      // systemId는 (haGroupId, systemId) 복합키라 수정 불가 — body에서 제외.
      const payload: HaGroupMemberUpdateRequest = roleFields;
      updateMember({ haGroupId, systemId: editData.systemId, data: payload });
    } else if (haGroupId) {
      const payload: HaGroupMemberCreateRequest = { systemId: values.systemId as number, ...roleFields };
      createMember({ id: haGroupId, data: payload });
    }
  }, [form, isService, isEditMode, editData, haGroupId, createMember, updateMember]);

  const handleClose = () => {
    setVisible(false);
    setEditData(null);
    form.resetFields();
  };

  const systemOptions =
    isEditMode && editData && !availableSystems.some((s) => s.systemId === editData.systemId)
      ? [{ label: editData.systemName ?? String(editData.systemId), value: editData.systemId }, ...availableSystems.map((s) => ({ label: s.systemName, value: s.systemId }))]
      : availableSystems.map((s) => ({ label: s.systemName, value: s.systemId }));

  return (
    <Drawer
      title={isEditMode ? 'HA 그룹 멤버 수정' : 'HA 그룹 멤버 추가'}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={handleClose}
      styles={{ wrapper: { width: 420 } }}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isPending}>
            {isEditMode ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item label="HA 그룹명">
          <Input value={haGroupName ?? ''} disabled />
        </Form.Item>

        <Form.Item
          name="systemId"
          label="시스템"
          required
          rules={[{ required: true, message: '시스템은 필수입니다' }]}
          extra={isEditMode ? '등록 후에는 시스템을 변경할 수 없습니다' : undefined}
        >
          <Select options={systemOptions} placeholder="시스템 선택" showSearch optionFilterProp="label" onChange={handleSystemChange} disabled={isEditMode} />
        </Form.Item>

        <Form.Item
          name="roleAlias"
          label="Role 별칭"
          required
          rules={[
            { required: true, message: 'Role 별칭은 필수입니다' },
            { max: 100, message: '100자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="예: MAIN-01" maxLength={100} />
        </Form.Item>

        <Form.Item name="roleType" label="Role 타입" required rules={[{ required: true, message: 'Role 타입은 필수입니다' }]}>
          <Select options={ROLE_TYPE_OPTIONS} disabled />
        </Form.Item>

        <Form.Item
          name="haIpaddr"
          label="HA IP Address"
          required
          rules={[
            { required: true, message: 'HA IP Address는 필수입니다' },
            { max: 64, message: '64자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="예: 192.168.0.10" maxLength={64} />
        </Form.Item>

        <Form.Item
          name="svcNic"
          label="SVC NIC"
          extra={!isService ? "Role 타입이 '서비스'일 때만 사용" : undefined}
          rules={
            isService
              ? [
                  { required: true, message: 'Role 타입이 서비스일 때 SVC NIC는 필수입니다' },
                  { max: 64, message: '64자 이내' },
                ]
              : [{ max: 64, message: '64자 이내' }]
          }
        >
          <Input placeholder="예: eth0" maxLength={64} disabled={!isService} />
        </Form.Item>

        <Form.Item
          name="svcIpaddr"
          label="SVC IP Address"
          extra={!isService ? "Role 타입이 '서비스'일 때만 사용" : undefined}
          rules={
            isService
              ? [
                  { required: true, message: 'Role 타입이 서비스일 때 SVC IP Address는 필수입니다' },
                  { max: 64, message: '64자 이내' },
                ]
              : [{ max: 64, message: '64자 이내' }]
          }
        >
          <Input placeholder="예: 192.168.0.100" maxLength={64} disabled={!isService} />
        </Form.Item>

        <Form.Item
          name="svcNetmask"
          label="SVC Netmask"
          extra={isService ? '예) 255.255.255.0 일 경우 24 입력' : "Role 타입이 '서비스'일 때만 사용"}
          rules={[{ type: 'number', min: 0, max: 32, message: '0~32 사이의 값' }]}
        >
          <InputNumber min={0} max={32} className="!w-full" disabled={!isService} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

HaGroupMemberDrawer.displayName = 'HaGroupMemberDrawer';
export default HaGroupMemberDrawer;
