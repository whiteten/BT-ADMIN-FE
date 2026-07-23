/**
 * IPT 사용자 등록/수정 Drawer (forwardRef 명령형 제어 — add-drawer 스킬).
 *
 * SWAT IPR20S2055_Update.jsp 검증 규칙 이관:
 *  - 사용자ID: 영문/숫자, 테넌트 내 중복검사(blur), 수정 시 변경 불가
 *  - 비밀번호: 등록 필수, 수정 공란=미변경 / PIN: 숫자 1~4자 (수정 공란=미변경)
 *  - 핸드폰 국내번호 정규식, 이메일 패턴, 발신번호 숫자만
 *  - 섹션: 기본정보 / 소속 / 부가정보
 */
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Drawer, Form, Input, Radio, Select, TreeSelect } from 'antd';
import { toast } from '@/shared-util';
import { useGetIptOrgTree } from '../../ipt-org/hooks/useIptOrgQueries';
import type { IptOrgTreeNode } from '../../ipt-org/types';
import { iptUserApi } from '../api/iptUserApi';
import { useCreateIptUser, useGetIptCommonCodes, useGetIptLevelDuties, useUpdateIptUser } from '../hooks/useIptUserQueries';
import type { IptUserResponse } from '../types';

const MOBILE_PATTERN = /^(01[016789]|070|02|0[3-9][0-9])[0-9]{3,4}[0-9]{4}$/;

export interface IptUserFormDrawerRef {
  openCreate: (tenantId: number, initialDnGroupId?: number | null) => void;
  openEdit: (user: IptUserResponse) => void;
  close: () => void;
}

interface Props {
  onSuccess?: () => void;
}

interface FormValues {
  userId: string;
  userPw?: string;
  userName: string;
  pinNo?: string;
  activateYn: number;
  clidName?: string;
  dnGroupId: number;
  userLevel?: number | null;
  duties?: number | null;
  localLang?: string | null;
  timeZone?: string | null;
  emailAddr?: string;
  mobileNo?: string;
  userAniNum?: string;
  internalAni?: string;
  uniqCode?: string;
}

/** IptOrgTreeNode[] → antd TreeSelect treeData */
function toTreeData(nodes: IptOrgTreeNode[]): { value: number; title: string; children?: ReturnType<typeof toTreeData> }[] {
  return nodes.map((n) => ({
    value: n.dnGroupId,
    title: n.dnGrpName,
    children: n.children?.length ? toTreeData(n.children) : undefined,
  }));
}

const IptUserFormDrawer = forwardRef<IptUserFormDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm<FormValues>();
  const [open, setOpen] = useState(false);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<IptUserResponse | null>(null);
  const isEdit = editTarget !== null;

  // 대상 테넌트로 서버 스코프 — 관리자 계정이 일반 콘솔에서 전 테넌트 트리를 받는 것 방지 (클라 필터는 이중 안전망)
  const { data: orgTree = [] } = useGetIptOrgTree({ params: { tenantId: tenantId ?? undefined }, queryOptions: { enabled: open } });
  const { data: codes } = useGetIptCommonCodes({ queryOptions: { enabled: open } });
  const { data: levelDuties = [] } = useGetIptLevelDuties(undefined, { queryOptions: { enabled: open } });

  const treeData = useMemo(() => toTreeData(orgTree.filter((n) => tenantId == null || n.tenantId === tenantId)), [orgTree, tenantId]);
  const levelOptions = useMemo(
    () => [{ value: 0, label: '미지정' }, ...levelDuties.filter((d) => d.type === 1).map((d) => ({ value: d.levelDutyId, label: d.name }))],
    [levelDuties],
  );
  const dutyOptions = useMemo(
    () => [{ value: 0, label: '미지정' }, ...levelDuties.filter((d) => d.type === 2).map((d) => ({ value: d.levelDutyId, label: d.name }))],
    [levelDuties],
  );

  useImperativeHandle(ref, () => ({
    openCreate: (tid, initialDnGroupId) => {
      form.resetFields();
      form.setFieldsValue({ activateYn: 1, userLevel: 0, duties: 0, dnGroupId: initialDnGroupId ?? undefined });
      setEditTarget(null);
      setTenantId(tid);
      setOpen(true);
    },
    openEdit: (user) => {
      form.resetFields();
      form.setFieldsValue({
        userId: user.userId,
        userName: user.userName,
        activateYn: user.activateYn,
        clidName: user.clidName ?? undefined,
        dnGroupId: user.dnGroupId,
        userLevel: user.userLevel ?? 0,
        duties: user.duties ?? 0,
        localLang: user.localLang ?? undefined,
        timeZone: user.timeZone ?? undefined,
        emailAddr: user.emailAddr ?? undefined,
        mobileNo: user.mobileNo ?? undefined,
        userAniNum: user.userAniNum ?? undefined,
        internalAni: user.internalAni ?? undefined,
        uniqCode: user.uniqCode ?? undefined,
      });
      setEditTarget(user);
      setTenantId(user.tenantId);
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const { mutate: createUser, isPending: isCreating } = useCreateIptUser({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사용자가 등록되었습니다.');
        setOpen(false);
        onSuccess?.();
      },
    },
  });
  const { mutate: updateUser, isPending: isUpdating } = useUpdateIptUser({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사용자가 수정되었습니다.');
        setOpen(false);
        onSuccess?.();
      },
    },
  });

  const handleClose = () => {
    form.resetFields();
    setOpen(false);
  };

  /** 사용자ID blur 중복검사 (등록만) */
  const handleUserIdBlur = async () => {
    if (isEdit || !tenantId) return;
    const userId = form.getFieldValue('userId') as string | undefined;
    if (!userId || !/^[A-Za-z0-9]+$/.test(userId)) return;
    const available = await iptUserApi.checkId({ tenantId, userId });
    if (!available) {
      form.setFields([{ name: 'userId', errors: ['이미 사용 중인 사용자ID입니다'] }]);
    }
  };

  /** 빈 문자열 입력은 null 로 저장 (공란 = 미설정) */
  const emptyToNull = (s?: string | null) => (s != null && s !== '' ? s : null);

  const handleFinish = (values: FormValues) => {
    const common = {
      dnGroupId: values.dnGroupId,
      userName: values.userName,
      activateYn: values.activateYn,
      clidName: emptyToNull(values.clidName),
      userLevel: values.userLevel ?? 0,
      duties: values.duties ?? 0,
      localLang: emptyToNull(values.localLang),
      timeZone: emptyToNull(values.timeZone),
      emailAddr: emptyToNull(values.emailAddr),
      mobileNo: emptyToNull(values.mobileNo),
      userAniNum: emptyToNull(values.userAniNum),
      internalAni: emptyToNull(values.internalAni),
      uniqCode: emptyToNull(values.uniqCode),
    };
    if (isEdit) {
      updateUser({
        ieUserId: editTarget.ieUserid,
        // PW/PIN 공란 = 미변경
        body: { ...common, userPw: emptyToNull(values.userPw), pinNo: emptyToNull(values.pinNo) },
      });
    } else {
      if (!tenantId) return;
      createUser({ ...common, tenantId, userId: values.userId, userPw: values.userPw as string, pinNo: values.pinNo as string });
    }
  };

  const handleFinishFailed = ({ errorFields }: { errorFields: { errors: string[] }[] }) => {
    const first = errorFields[0]?.errors[0];
    if (first) toast.error(first);
  };

  return (
    <Drawer
      title={isEdit ? `IPT 사용자 수정 — ${editTarget.userId}` : 'IPT 사용자 추가'}
      open={open}
      onClose={handleClose}
      width={520}
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
        {/* ─── 기본정보 ─── */}
        <div className="mb-2 text-[13px] font-semibold text-gray-700">기본정보</div>
        <Form.Item
          name="userId"
          label="사용자ID"
          rules={[
            { required: true, message: '사용자ID를 입력하세요' },
            { pattern: /^[A-Za-z0-9]+$/, message: '영문/숫자만 입력 가능합니다' },
            { max: 128, message: '최대 128자입니다' },
          ]}
          hasFeedback
        >
          <Input maxLength={128} disabled={isEdit} onBlur={handleUserIdBlur} placeholder="영문/숫자" />
        </Form.Item>
        <Form.Item name="userPw" label={isEdit ? '비밀번호 (공란=미변경)' : '비밀번호'} rules={isEdit ? [] : [{ required: true, message: '비밀번호를 입력하세요' }]} hasFeedback>
          <Input.Password autoComplete="new-password" placeholder={isEdit ? '변경 시에만 입력' : ''} />
        </Form.Item>
        <Form.Item
          name="userName"
          label="이름"
          rules={[
            { required: true, message: '이름을 입력하세요' },
            { min: 1, max: 100, message: '이름은 1~100자입니다' },
          ]}
          hasFeedback
        >
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item
          name="pinNo"
          label={isEdit ? `PIN번호 (공란=미변경${editTarget?.pinRegistered ? ', 등록됨' : ''})` : 'PIN번호'}
          rules={[...(isEdit ? [] : [{ required: true, message: 'PIN번호를 입력하세요' }]), { pattern: /^[0-9]{1,4}$/, message: 'PIN번호는 숫자 1~4자입니다' }]}
          hasFeedback
        >
          <Input.Password maxLength={4} autoComplete="new-password" placeholder={isEdit ? '변경 시에만 입력' : '숫자 1~4자'} />
        </Form.Item>
        <Form.Item name="activateYn" label="활성화여부" extra="해제 시 할당된 DN이 자동 해제됩니다">
          <Radio.Group
            options={[
              { value: 1, label: '설정' },
              { value: 0, label: '해제' },
            ]}
          />
        </Form.Item>

        {/* ─── 소속 ─── */}
        <div className="mb-2 mt-4 text-[13px] font-semibold text-gray-700">소속</div>
        <Form.Item name="dnGroupId" label="조직" rules={[{ required: true, message: '조직을 선택하세요' }]} hasFeedback>
          <TreeSelect treeData={treeData} showSearch treeNodeFilterProp="title" treeDefaultExpandAll placeholder="조직 선택" />
        </Form.Item>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item name="userLevel" label="직급">
            <Select options={levelOptions} />
          </Form.Item>
          <Form.Item name="duties" label="직책">
            <Select options={dutyOptions} />
          </Form.Item>
        </div>

        {/* ─── 부가정보 ─── */}
        <div className="mb-2 mt-4 text-[13px] font-semibold text-gray-700">부가정보</div>
        <Form.Item name="clidName" label="CLID이름" rules={[{ max: 100, message: '최대 100자입니다' }]}>
          <Input maxLength={100} />
        </Form.Item>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item name="localLang" label="사용언어">
            <Select allowClear options={(codes?.localLang ?? []).map((c) => ({ value: c.code, label: c.name }))} />
          </Form.Item>
          <Form.Item name="timeZone" label="TimeZone">
            <Select allowClear showSearch optionFilterProp="label" options={(codes?.timeZone ?? []).map((c) => ({ value: c.code, label: c.name }))} />
          </Form.Item>
        </div>
        <Form.Item
          name="emailAddr"
          label="이메일"
          rules={[
            { type: 'email', message: '이메일 형식이 올바르지 않습니다' },
            { max: 255, message: '최대 255자입니다' },
          ]}
        >
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name="mobileNo" label="핸드폰" rules={[{ pattern: MOBILE_PATTERN, message: '핸드폰 번호 형식이 올바르지 않습니다' }]}>
          <Input maxLength={24} placeholder="숫자만 입력 (예: 01012345678)" />
        </Form.Item>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item
            name="userAniNum"
            label="사용자발신번호"
            rules={[
              { pattern: /^[0-9]*$/, message: '숫자만 입력 가능합니다' },
              { max: 24, message: '최대 24자입니다' },
            ]}
          >
            <Input maxLength={24} />
          </Form.Item>
          <Form.Item
            name="internalAni"
            label="내선간발신번호"
            rules={[
              { pattern: /^[0-9]*$/, message: '숫자만 입력 가능합니다' },
              { max: 64, message: '최대 64자입니다' },
            ]}
          >
            <Input maxLength={64} />
          </Form.Item>
        </div>
        <Form.Item name="uniqCode" label="고유코드" rules={[{ max: 32, message: '최대 32자입니다' }]}>
          <Input maxLength={32} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});
IptUserFormDrawer.displayName = 'IptUserFormDrawer';

export default IptUserFormDrawer;
