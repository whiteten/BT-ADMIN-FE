/**
 * IPT 조직 등록/수정 Drawer (forwardRef 명령형 제어 — add-drawer 스킬).
 *
 * SWAT IPR20S2056 인라인 다이얼로그(#poDnGroup) 정합:
 *  - 조직명(필수 1~100자), 활성화(radio), 그룹발신 사용(radio) + 발신번호(사용 시 필수, 숫자 max 24)
 *  - 링백멘트/보류멘트 + 국선호 링백/보류멘트 (TB_IE_ANNOUNCEBGM 콤보)
 *  - 조직경로 readonly / 부모 이동 미지원 (레거시 정합)
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, Radio, Select } from 'antd';
import { toast } from '@/shared-util';
import { useCreateIptOrg, useGetIptMentOptions, useUpdateIptOrg } from '../hooks/useIptOrgQueries';
import type { IptOrgResponse, IptOrgTreeNode } from '../types';

export interface IptOrgFormDrawerRef {
  /** parent=null 이면 최상위 조직 추가 */
  openCreate: (tenantId: number, parent: IptOrgTreeNode | null) => void;
  openEdit: (org: IptOrgResponse) => void;
  close: () => void;
}

interface Props {
  onSuccess?: () => void;
}

interface FormValues {
  dnGrpName: string;
  activateYn: number;
  grpAniYn: number;
  grpAniNo?: string;
  rbMentId?: number | null;
  mohMentId?: number | null;
  coRbMentId?: number | null;
  coMohMentId?: number | null;
}

const DEFAULTS: Partial<FormValues> = {
  activateYn: 1,
  grpAniYn: 0,
  rbMentId: 0,
  mohMentId: 0,
  coRbMentId: 0,
  coMohMentId: 0,
};

const IptOrgFormDrawer = forwardRef<IptOrgFormDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm<FormValues>();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IptOrgResponse | null>(null);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [parent, setParent] = useState<IptOrgTreeNode | null>(null);
  const grpAniYn = Form.useWatch('grpAniYn', form);

  const isEdit = editTarget !== null;

  const { data: mentOptions = [] } = useGetIptMentOptions({
    params: tenantId ? { tenantId } : undefined,
    queryOptions: { enabled: open && !!tenantId },
  });

  useImperativeHandle(ref, () => ({
    openCreate: (tid, parentNode) => {
      form.resetFields();
      form.setFieldsValue(DEFAULTS);
      setEditTarget(null);
      setTenantId(tid);
      setParent(parentNode);
      setOpen(true);
    },
    openEdit: (org) => {
      form.resetFields();
      form.setFieldsValue({
        dnGrpName: org.dnGrpName,
        activateYn: org.activateYn,
        grpAniYn: org.grpAniYn,
        grpAniNo: org.grpAniNo ?? undefined,
        rbMentId: org.rbMentId ?? 0,
        mohMentId: org.mohMentId ?? 0,
        coRbMentId: org.coRbMentId ?? 0,
        coMohMentId: org.coMohMentId ?? 0,
      });
      setEditTarget(org);
      setTenantId(org.tenantId);
      setParent(null);
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const { mutate: createOrg, isPending: isCreating } = useCreateIptOrg({
    mutationOptions: {
      onSuccess: () => {
        toast.success('조직이 등록되었습니다.');
        setOpen(false);
        onSuccess?.();
      },
    },
  });
  const { mutate: updateOrg, isPending: isUpdating } = useUpdateIptOrg({
    mutationOptions: {
      onSuccess: () => {
        toast.success('조직이 수정되었습니다.');
        setOpen(false);
        onSuccess?.();
      },
    },
  });

  const handleClose = () => {
    form.resetFields();
    setOpen(false);
  };

  const handleFinish = (values: FormValues) => {
    const body = {
      dnGrpName: values.dnGrpName,
      activateYn: values.activateYn,
      grpAniYn: values.grpAniYn,
      grpAniNo: values.grpAniYn === 1 ? values.grpAniNo : null,
      // 0 = "미지정" sentinel (antd Select 는 value:null 옵션 미허용) → 저장 시 null 변환
      rbMentId: values.rbMentId ? values.rbMentId : null,
      mohMentId: values.mohMentId ? values.mohMentId : null,
      coRbMentId: values.coRbMentId ? values.coRbMentId : null,
      coMohMentId: values.coMohMentId ? values.coMohMentId : null,
    };
    if (isEdit) {
      updateOrg({ dnGroupId: editTarget.dnGroupId, body });
    } else {
      if (!tenantId) return;
      createOrg({ ...body, tenantId, priorGrpId: parent?.dnGroupId ?? null });
    }
  };

  const handleFinishFailed = ({ errorFields }: { errorFields: { errors: string[] }[] }) => {
    const first = errorFields[0]?.errors[0];
    if (first) toast.error(first);
  };

  const mentSelectOptions = [{ value: 0, label: '미지정' }, ...mentOptions.map((m) => ({ value: m.id, label: m.name }))];

  const pathText = isEdit ? editTarget.orgPath : parent ? `${parent.dnGrpName} > (신규)` : '(최상위)';

  return (
    <Drawer
      title={isEdit ? 'IPT 조직 수정' : 'IPT 조직 추가'}
      open={open}
      onClose={handleClose}
      width={480}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" loading={isCreating || isUpdating} onClick={() => form.submit()}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} onFinishFailed={handleFinishFailed}>
        <Form.Item label="조직경로">
          <Input value={pathText} disabled />
        </Form.Item>
        <Form.Item
          name="dnGrpName"
          label="조직명"
          rules={[
            { required: true, message: '조직명을 입력하세요' },
            { min: 1, max: 100, message: '조직명은 1~100자입니다' },
          ]}
          hasFeedback
        >
          <Input maxLength={100} placeholder="조직명" />
        </Form.Item>
        <Form.Item name="activateYn" label="활성화여부">
          <Radio.Group
            options={[
              { value: 1, label: '설정' },
              { value: 0, label: '해제' },
            ]}
          />
        </Form.Item>
        <Form.Item name="grpAniYn" label="그룹발신번호 사용">
          <Radio.Group
            options={[
              { value: 1, label: '사용' },
              { value: 0, label: '미사용' },
            ]}
          />
        </Form.Item>
        {grpAniYn === 1 && (
          <Form.Item
            name="grpAniNo"
            label="그룹발신번호"
            rules={[
              { required: true, message: '그룹발신 사용 시 발신번호는 필수입니다' },
              { pattern: /^[0-9]{1,24}$/, message: '숫자만 입력 가능합니다 (최대 24자)' },
            ]}
            hasFeedback
          >
            <Input maxLength={24} placeholder="숫자만 입력" />
          </Form.Item>
        )}
        <Form.Item name="rbMentId" label="링백멘트">
          <Select options={mentSelectOptions} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item name="mohMentId" label="보류멘트">
          <Select options={mentSelectOptions} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item name="coRbMentId" label="국선호 링백멘트">
          <Select options={mentSelectOptions} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item name="coMohMentId" label="국선호 보류멘트">
          <Select options={mentSelectOptions} showSearch optionFilterProp="label" />
        </Form.Item>
      </Form>
    </Drawer>
  );
});
IptOrgFormDrawer.displayName = 'IptOrgFormDrawer';

export default IptOrgFormDrawer;
