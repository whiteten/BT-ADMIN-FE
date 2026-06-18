/**
 * 공용 SIP 트렁크 등록/수정 드로어 (2탭: 기본정보 / 부가정보).
 *
 * 노드 단위 고정(테넌트 차원 없음) — tenantId=0 으로 등록.
 * SWAT IPR20S3030 poPopup04 정합:
 *  - 수정 시 SIP트렁크 번호 / 시작DN / 채널수 / 종류 lock
 *  - IP Version 선택에 따라 IPv4 / IPv6 입력 토글
 *  - 시작DN+채널수 → TDN 자동채번 (BE 처리, DN_TYPE=13)
 */
import { useEffect, useMemo } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Radio, Select, Tabs } from 'antd';
import { toast } from '@/shared-util';
import { useCreateCommonTrunk, useGetCommonTrunkDnProfileOptions, useUpdateCommonTrunk } from '../hooks/useCommonTrunkQueries';
import { type CommonTrunkCreateRequest, type CommonTrunkResponse, type CommonTrunkUpdateRequest, TRANSPORT_TYPE_OPTIONS, TRUNK_KIND_OPTIONS } from '../types';

interface CommonTrunkFormDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  detail?: CommonTrunkResponse | null;
  /** 현재 선택된 노드 (등록 시 기본값) */
  nodeId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

// 갭2: IP인증 타입 (trkAuthtype) — SWAT IPR20S3030.jsp:1806~1808 정합 (value:1=고정IP/value:2=동적IP, 0 제거)
const TRK_AUTHTYPE_OPTIONS = [
  { value: 1, label: '고정IP' },
  { value: 2, label: '동적IP' },
];

// 갭5: IP업데이트 (trkIpUpdate) — SWAT 코드테이블 정합
const TRK_IP_UPDATE_OPTIONS = [
  { value: 0, label: '사용안함' },
  { value: 1, label: '사용' },
];

interface FormValues {
  sipTrunkName?: string;
  sipTrunkNo?: string;
  sipTrunkKind?: number;
  startDn?: string;
  chnlCnt?: number;
  ipVersion?: number;
  portNo?: number;
  sipTrunkIpv4?: string;
  sipTrunkIpv6?: string;
  sipTrunkDesc?: string;
  transportType?: number;
  allocDelayTime?: number;
  ctiUse?: number;
  blockYn?: number;
  // 갭5: IP 인증 / IP 업데이트
  trkAuthtype?: number;
  trkIpUpdate?: number;
  // 갭1: 내선프로파일 (SWAT p4DnProfileId 필수 콤보)
  dnProfileId?: number | null;
}

export default function CommonTrunkFormDrawer({ open, mode, detail, nodeId, onClose, onSaved }: CommonTrunkFormDrawerProps) {
  const [form] = Form.useForm<FormValues>();
  const isEdit = mode === 'edit';

  // 갭1: 내선프로파일 콤보 옵션 — 노드 선택 시 dnProfileType=1(TRUNK) 로 로드 (SWAT cbCreate p4DnProfileId 정합)
  const { data: dnProfileOptions = [], isLoading: isDnProfileLoading } = useGetCommonTrunkDnProfileOptions(nodeId);

  const initial: FormValues = useMemo(() => {
    if (isEdit && detail) {
      return {
        sipTrunkName: detail.sipTrunkName,
        sipTrunkNo: detail.sipTrunkNo,
        sipTrunkKind: detail.sipTrunkKind ?? 1,
        startDn: detail.startDn ?? '',
        chnlCnt: detail.chnlCnt ?? 0,
        ipVersion: detail.ipVersion ?? 4,
        portNo: detail.portNo ?? 5865,
        sipTrunkIpv4: detail.sipTrunkIpv4 ?? '',
        sipTrunkIpv6: detail.sipTrunkIpv6 ?? '',
        sipTrunkDesc: detail.sipTrunkDesc ?? '',
        transportType: detail.transportType ?? 1,
        allocDelayTime: detail.allocDelayTime ?? 0,
        ctiUse: detail.ctiUse ?? 0,
        blockYn: detail.blockYn ?? 0,
        // 갭2: trkAuthtype 기본값 1(고정IP) — SWAT 정합 (0 값은 없음)
        trkAuthtype: detail.trkAuthtype && detail.trkAuthtype > 0 ? detail.trkAuthtype : 1,
        trkIpUpdate: detail.trkIpUpdate ?? 0,
        // 갭1: 내선프로파일
        dnProfileId: detail.dnProfileId && detail.dnProfileId > 0 ? detail.dnProfileId : null,
      };
    }
    return {
      sipTrunkKind: 1,
      ipVersion: 4,
      portNo: 5865,
      chnlCnt: 1,
      transportType: 1,
      allocDelayTime: 0,
      ctiUse: 0,
      blockYn: 0,
      // 갭2: 기본값 1(고정IP) — SWAT IPR20S3030.jsp:881 정합
      trkAuthtype: 1,
      trkIpUpdate: 0,
      // 갭1: 신규 등록 시 미선택(null)
      dnProfileId: null,
    };
  }, [isEdit, detail]);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(initial);
    }
  }, [open, form, initial]);

  const ipVersion = Form.useWatch('ipVersion', form);
  const isIpv4 = ipVersion !== 6;

  const { mutate: createTrunk, isPending: isCreating } = useCreateCommonTrunk({
    mutationOptions: {
      onSuccess: () => {
        toast.success('공용 SIP 트렁크가 등록되었습니다');
        onSaved();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '등록 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: updateTrunk, isPending: isUpdating } = useUpdateCommonTrunk({
    mutationOptions: {
      onSuccess: () => {
        toast.success('공용 SIP 트렁크가 수정되었습니다');
        onSaved();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '수정 실패';
        toast.error(msg);
      },
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (!isEdit && nodeId == null) {
        toast.error('노드를 먼저 선택하세요');
        return;
      }

      const common = {
        sipTrunkName: values.sipTrunkName!,
        sipTrunkNo: values.sipTrunkNo!,
        // sipTrunkDesc 는 IDS 측 NOT NULL 컬럼 → 빈값은 null 이 아닌 빈문자열로 전송 (502 방지)
        sipTrunkDesc: values.sipTrunkDesc?.trim() || '',
        sipTrunkKind: values.sipTrunkKind!,
        ipVersion: values.ipVersion!,
        sipTrunkIpv4: isIpv4 ? (values.sipTrunkIpv4 ?? null) : null,
        sipTrunkIpv6: isIpv4 ? null : (values.sipTrunkIpv6 ?? null),
        portNo: values.portNo!,
        transportType: values.transportType!,
        startDn: values.startDn ?? null,
        chnlCnt: values.chnlCnt ?? null,
        allocDelayTime: values.allocDelayTime ?? null,
        ctiUse: values.ctiUse ?? null,
        blockYn: values.blockYn ?? null,
        // 갭1: 내선프로파일 (SWAT 필수 콤보 p4DnProfileId 정합)
        dnProfileId: values.dnProfileId ?? null,
      };

      if (isEdit && detail) {
        // 공용도 SIP 트렁크와 동일한 TB_IE_SIP_TRUNK 사용 → IDS NOT NULL 제약 동일.
        // create 는 IdsSyncHelper 가 null 필드를 스킵하지만, update 는 null 을 그대로 IDS 로 전송 → 502.
        // Drawer 폼에 노출되지 않는 IDS NOT NULL 필드는 detail 원본값으로 채워 전송한다.
        const body: CommonTrunkUpdateRequest = {
          ...common,
          // 부가정보 탭 필드는 @NotNull (BE) → 탭 미방문 시 form 값이 undefined 일 수 있으므로
          // detail 원본값으로 폴백하여 항상 non-null 전송 (SIP SipTrunkDrawer 정합)
          transportType: values.transportType ?? detail.transportType ?? 1,
          allocDelayTime: values.allocDelayTime ?? detail.allocDelayTime ?? 0,
          ctiUse: values.ctiUse ?? detail.ctiUse ?? 0,
          blockYn: values.blockYn ?? detail.blockYn ?? 0,
          // 갭2: trkAuthtype 기본값 1(고정IP) — 0 은 SWAT에 없는 값이므로 폴백
          trkAuthtype: values.trkAuthtype ?? (detail.trkAuthtype && detail.trkAuthtype > 0 ? detail.trkAuthtype : 1),
          trkIpUpdate: values.trkIpUpdate ?? detail.trkIpUpdate ?? 0,
          ssRefreshType: detail.ssRefreshType ?? null,
          registYn: detail.registYn ?? null,
          registSeconds: detail.registSeconds ?? null,
          backUpNodeId: detail.backUpNodeId ?? null,
          globalDnYn: detail.globalDnYn ?? null,
          msGroupId: detail.msGroupId ?? null,
          msDrgroupId: detail.msDrgroupId ?? null,
          natOption: detail.natOption ?? null,
          drnatOption: detail.drnatOption ?? null,
          enatOption: detail.enatOption ?? null,
          // 갭1: 폼 값 우선, 없으면 detail 원본값 유지
          dnProfileId: values.dnProfileId ?? detail.dnProfileId ?? null,
          sipOption: detail.sipOption ?? null,
        };
        updateTrunk({ id: detail.sipTrunkId, body });
      } else {
        const body: CommonTrunkCreateRequest = {
          nodeId: Number(nodeId),
          tenantId: 0,
          ...common,
        };
        createTrunk(body);
      }
    } catch {
      // antd inline validation
    }
  };

  const basicTab = (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0 [&_.ant-form-item]:!mb-3">
      {/* 갭1: 내선프로파일 필수 콤보 — SWAT IPR20S3030.jsp:1755~1758, 1890~1894 정합 */}
      <Form.Item
        label="내선프로파일"
        name="dnProfileId"
        rules={[{ required: true, message: '내선프로파일을 선택하세요' }]}
        className="col-span-2"
        extra={nodeId == null ? '노드를 먼저 선택하세요' : undefined}
      >
        <Select
          placeholder="내선프로파일 선택"
          loading={isDnProfileLoading}
          disabled={nodeId == null}
          allowClear
          showSearch
          optionFilterProp="label"
          options={dnProfileOptions.map((p) => ({ value: p.dnProfileId, label: p.dnProfileName }))}
        />
      </Form.Item>

      <Form.Item label="SIP트렁크 이름" name="sipTrunkName" rules={[{ required: true, max: 100, message: '최대 100자' }]}>
        <Input maxLength={100} placeholder="최대 100자" />
      </Form.Item>
      <Form.Item label="SIP트렁크 종류" name="sipTrunkKind" extra={isEdit ? '수정 불가' : undefined}>
        <Select options={TRUNK_KIND_OPTIONS} disabled={isEdit} />
      </Form.Item>

      <Form.Item
        label="SIP트렁크 번호"
        name="sipTrunkNo"
        rules={[
          { required: true, message: '필수' },
          { max: 10, message: '최대 10자리' },
          {
            validator: (_, v: string) => {
              // 갭6: SWAT 정합 — 트렁크 번호는 0 불가 (숫자 전체가 0이면 거부)
              if (v && /^\d+$/.test(v) && parseInt(v, 10) === 0) {
                return Promise.reject(new Error('트렁크 번호는 0이 될 수 없습니다'));
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input maxLength={10} placeholder="최대 10자리 (0 불가)" disabled={isEdit} />
      </Form.Item>
      <Form.Item label="시작DN" name="startDn" rules={[{ required: true, message: '필수' }]} extra="노드 내 중복 불가 · TDN 자동채번">
        <Input placeholder="예: 6500" disabled={isEdit} />
      </Form.Item>

      <Form.Item label="채널수" name="chnlCnt" extra={isEdit ? '수정 불가' : undefined}>
        <InputNumber style={{ width: '100%' }} min={1} max={2039} placeholder="1~2039" disabled={isEdit} />
      </Form.Item>
      <Form.Item label="IP Version" name="ipVersion" rules={[{ required: true }]}>
        <Radio.Group>
          <Radio value={4}>IPv4</Radio>
          <Radio value={6}>IPv6</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item label="포트번호" name="portNo" rules={[{ required: true }]}>
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>
      {isIpv4 ? (
        <Form.Item label="SIP트렁크 IPv4" name="sipTrunkIpv4" rules={[{ required: true, max: 15, message: '필수' }]}>
          <Input maxLength={15} placeholder="예: 100.100.108.141" />
        </Form.Item>
      ) : (
        <Form.Item label="SIP트렁크 IPv6" name="sipTrunkIpv6" rules={[{ max: 63 }]}>
          <Input maxLength={63} placeholder="::" />
        </Form.Item>
      )}
    </div>
  );

  const extraTab = (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0 [&_.ant-form-item]:!mb-3">
      <Form.Item label="Transport 타입" name="transportType">
        <Select options={TRANSPORT_TYPE_OPTIONS} />
      </Form.Item>
      <Form.Item label="Alloc Delay Time" name="allocDelayTime">
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>
      <Form.Item label="호추적" name="ctiUse">
        <Radio.Group>
          <Radio value={1}>설정</Radio>
          <Radio value={0}>해제</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item label="블록 여부" name="blockYn">
        <Radio.Group>
          <Radio value={1}>설정</Radio>
          <Radio value={0}>해제</Radio>
        </Radio.Group>
      </Form.Item>

      {/* 갭5: IP유형(trkAuthtype) / IP업데이트(trkIpUpdate) — SWAT IPR20S3030 poPopup04 정합 */}
      <Form.Item label="IP유형 (IP인증)" name="trkAuthtype" className="col-span-2">
        <Radio.Group options={TRK_AUTHTYPE_OPTIONS} />
      </Form.Item>
      <Form.Item label="IP업데이트" name="trkIpUpdate" className="col-span-2" extra="등록 후 IP가 변경될 때 자동 갱신 여부">
        <Radio.Group options={TRK_IP_UPDATE_OPTIONS} />
      </Form.Item>

      {/* 기본정보 탭 768px 오버플로 해소: 전폭 설명 필드를 여유 있는 부가정보 탭으로 이관 */}
      <Form.Item label="SIP트렁크 설명" name="sipTrunkDesc" className="col-span-2">
        <Input maxLength={256} />
      </Form.Item>
    </div>
  );

  return (
    <Drawer
      title={isEdit ? `SIP 트렁크 수정 — ${detail?.sipTrunkName ?? ''}` : 'SIP 트렁크 등록'}
      width={560}
      open={open}
      onClose={onClose}
      closable={{ placement: 'end' }}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isCreating || isUpdating}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" initialValues={initial}>
        <Tabs
          items={[
            { key: 'basic', label: '기본정보', forceRender: true, children: basicTab },
            { key: 'extra', label: '부가정보', forceRender: true, children: extraTab },
          ]}
        />
      </Form>
    </Drawer>
  );
}
