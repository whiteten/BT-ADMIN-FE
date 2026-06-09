/**
 * SIP 트렁크 등록/수정 Drawer — 2탭 (기본정보 / 부가정보).
 *
 * SWAT IPR20S3030 poPopup04 정합:
 *  - IP Version 라디오 → IPv4/IPv6 입력 enable 토글 (setIpFieldEnable :1377)
 *  - 수정 모드 → 시작DN / 채널수 / SIP트렁크종류 lock (setFieldEnable(false) :1414/963/1426)
 *  - DR노드 지정 시 Global DN 강제 (:302)
 *  - 시작DN + 채널수 → TDN(DN_TYPE=13) 자동채번 미리보기
 *  - Transport: UDP/TCP/TLS 만 (WS/WSS 제외, splice :281)
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Radio, Select, Tabs } from 'antd';
import { Cable } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateSipTrunk, useGetSipTrunkDnProfileOptions, useUpdateSipTrunk } from '../hooks/useSipTrunkQueries';
import { IP_AUTH_TYPE_OPTIONS, SIP_TRUNK_KIND_OPTIONS, type SipTrunkResponse, TRANSPORT_TYPE_OPTIONS } from '../types';

export interface SipTrunkDrawerRef {
  openCreate: () => void;
  openEdit: (data: SipTrunkResponse) => void;
  close: () => void;
}

interface NodeOption {
  nodeId: number;
  nodeName: string;
}

interface Props {
  nodeId: number | null;
  tenantId: number | null;
  tenantName: string | null;
  drNodeOptions: NodeOption[];
  onSuccess?: () => void;
}

interface FormValues {
  sipTrunkName: string;
  sipTrunkNo: string;
  sipTrunkKind: number;
  backUpNodeId: number;
  startDn: string;
  chnlCnt: number;
  ipVersion: number;
  portNo: number;
  sipTrunkIpv4: string;
  sipTrunkIpv6: string;
  globalDnYn: number;
  trkAuthtype: number;
  sipTrunkDesc: string;
  // 기본정보 — 내선프로파일 (SWAT :1755-1758, 필수)
  dnProfileId: number | null;
  // 부가정보
  transportType: number;
  allocDelayTime: number;
  trkIpUpdate: number;
  callTraceYn: number; // 호추적 여부 (SWAT CALL_TRACE_YN)
  blockYn: number;
  // 부가정보 — SWAT :1829-1832 (registSeconds 주석처리지만 ssRefreshType·registSeconds BE INSERT 유효)
  ssRefreshType: number | null;
  registYn: number | null;
  registSeconds: number | null;
}

const DEFAULTS: Partial<FormValues> = {
  sipTrunkKind: 1,
  backUpNodeId: 0,
  ipVersion: 4,
  portNo: 5865,
  globalDnYn: 0,
  trkAuthtype: 1,
  chnlCnt: 1,
  dnProfileId: null,
  transportType: 1,
  allocDelayTime: 0,
  trkIpUpdate: 1,
  callTraceYn: 1,
  blockYn: 0,
  ssRefreshType: 1,
  registYn: null,
  registSeconds: 3600,
};

/** TDN 자동채번 미리보기 (시작DN + 채널수 → 연속 DN, 자릿수 패딩) */
function tdnPreview(startDn: string | undefined, chnlCnt: number | undefined): { list: string[]; last: string; total: number } {
  const start = (startDn ?? '').trim();
  const cnt = chnlCnt ?? 0;
  if (!start || !/^[0-9]+$/.test(start) || cnt <= 0) return { list: [], last: '', total: 0 };
  const base = parseInt(start, 10);
  const len = start.length;
  const max = Math.min(cnt, 20);
  const list: string[] = [];
  for (let i = 0; i < max; i += 1) list.push(String(base + i).padStart(len, '0'));
  const last = String(base + cnt - 1).padStart(len, '0');
  return { list, last, total: cnt };
}

const SipTrunkDrawer = forwardRef<SipTrunkDrawerRef, Props>(({ nodeId, tenantId, tenantName, drNodeOptions, onSuccess }, ref) => {
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<SipTrunkResponse | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const isEdit = !!editData;

  const ipVersion = Form.useWatch('ipVersion', form);
  const backUpNodeId = Form.useWatch('backUpNodeId', form);
  const startDn = Form.useWatch('startDn', form);
  const chnlCnt = Form.useWatch('chnlCnt', form);
  const sipTrunkKind = Form.useWatch('sipTrunkKind', form);
  const globalForced = backUpNodeId != null && backUpNodeId !== 0;
  // SWAT :258-274 (주석처리됐으나 3rd-party PBX 시 startDn/chnlCnt 불필요)
  const is3rdParty = sipTrunkKind === 9;

  const preview = useMemo(() => tdnPreview(startDn, chnlCnt), [startDn, chnlCnt]);

  // 내선프로파일 콤보 옵션 — 노드 선택 시 dnProfileType=1(TRUNK) 로 로드 (SWAT cbCreate p4DnProfileId, common-trunk 동일 패턴)
  const { data: dnProfileOptions = [], isLoading: isDnProfileLoading } = useGetSipTrunkDnProfileOptions(nodeId);

  const handleClose = useCallback(() => {
    setVisible(false);
    setEditData(null);
    setActiveTab('basic');
    form.resetFields();
  }, [form]);

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      setEditData(null);
      setActiveTab('basic');
      setVisible(true);
    },
    openEdit: (data: SipTrunkResponse) => {
      setEditData(data);
      setActiveTab('basic');
      setVisible(true);
    },
    close: handleClose,
  }));

  useEffect(() => {
    if (!visible) return;
    if (editData) {
      form.setFieldsValue({
        sipTrunkName: editData.sipTrunkName,
        sipTrunkNo: editData.sipTrunkNo,
        sipTrunkKind: editData.sipTrunkKind ?? 1,
        backUpNodeId: editData.backUpNodeId ?? 0,
        startDn: editData.startDn ?? '',
        chnlCnt: editData.chnlCnt ?? 1,
        ipVersion: editData.ipVersion ?? 4,
        portNo: editData.portNo ?? 5865,
        sipTrunkIpv4: editData.sipTrunkIpv4 ?? '',
        sipTrunkIpv6: editData.sipTrunkIpv6 ?? '',
        globalDnYn: editData.globalDnYn ?? 0,
        trkAuthtype: editData.trkAuthtype ?? 1,
        sipTrunkDesc: editData.sipTrunkDesc ?? '',
        dnProfileId: editData.dnProfileId ?? null,
        transportType: editData.transportType ?? 1,
        allocDelayTime: editData.allocDelayTime ?? 0,
        trkIpUpdate: editData.trkIpUpdate ?? 1,
        callTraceYn: editData.callTraceYn ?? 1,
        blockYn: editData.blockYn ?? 0,
        ssRefreshType: editData.ssRefreshType ?? 1,
        registYn: editData.registYn ?? null,
        registSeconds: editData.registSeconds ?? 3600,
      });
    } else {
      form.resetFields();
      form.setFieldsValue(DEFAULTS);
    }
  }, [visible, editData, form]);

  // DR노드 지정 시 Global DN 강제
  useEffect(() => {
    if (globalForced) form.setFieldValue('globalDnYn', 1);
  }, [globalForced, form]);

  const { mutate: createTrunk, isPending: creating } = useCreateSipTrunk({
    mutationOptions: {
      onSuccess: () => {
        toast.success('SIP 트렁크가 등록되었습니다.');
        handleClose();
        onSuccess?.();
      },
      onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '등록 실패'),
    },
  });

  const { mutate: updateTrunk, isPending: updating } = useUpdateSipTrunk({
    mutationOptions: {
      onSuccess: () => {
        toast.success('SIP 트렁크가 수정되었습니다.');
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
      const common = {
        sipTrunkName: v.sipTrunkName,
        sipTrunkNo: v.sipTrunkNo,
        // sipTrunkDesc 는 IDS 측 NOT NULL 컬럼 → 빈값은 null 이 아닌 빈문자열로 전송 (502 방지)
        sipTrunkDesc: v.sipTrunkDesc?.trim() || '',
        sipTrunkKind: v.sipTrunkKind,
        ipVersion: v.ipVersion,
        sipTrunkIpv4: v.ipVersion === 4 ? v.sipTrunkIpv4 : null,
        sipTrunkIpv6: v.ipVersion === 6 ? v.sipTrunkIpv6 : null,
        portNo: v.portNo,
        transportType: v.transportType,
        // 3rd-Party PBX 시 startDn/chnlCnt 미전송
        startDn: is3rdParty ? null : v.startDn?.trim() || null,
        chnlCnt: is3rdParty ? null : v.chnlCnt,
        blockYn: v.blockYn,
        trkAuthtype: v.trkAuthtype,
        trkIpUpdate: v.trkIpUpdate,
        callTraceYn: v.callTraceYn,
        allocDelayTime: v.allocDelayTime,
        backUpNodeId: backUp,
        globalDnYn: v.globalDnYn,
        // 내선프로파일 (SWAT :889-894 필수) — FE에서 전송
        dnProfileId: v.dnProfileId ?? null,
        // 부가정보 추가 필드 (SWAT :1829-1832 정합)
        ssRefreshType: v.ssRefreshType ?? null,
        registYn: v.registYn ?? null,
        registSeconds: v.registSeconds ?? null,
      };
      if (isEdit && editData) {
        updateTrunk({
          sipTrunkId: editData.sipTrunkId,
          body: {
            ...common,
            // Drawer 폼에 노출되지 않는 필드는 editData 원본값 유지
            // (IDS NOT NULL 제약 대상: ctiUse 등)
            msGroupId: editData.msGroupId ?? null,
            msDrgroupId: editData.msDrgroupId ?? null,
            natOption: editData.natOption ?? null,
            drnatOption: editData.drnatOption ?? null,
            enatOption: editData.enatOption ?? null,
            ctiUse: editData.ctiUse ?? null,
            sipOption: editData.sipOption ?? null,
          },
        });
      } else {
        if (nodeId == null || tenantId == null) {
          toast.warning('노드와 테넌트를 먼저 선택하세요.');
          return;
        }
        createTrunk({ nodeId, tenantId, ...common });
      }
    } catch {
      setActiveTab('basic');
    }
  }, [form, isEdit, editData, nodeId, tenantId, createTrunk, updateTrunk, is3rdParty]);

  const basicTab = (
    <div className="grid grid-cols-2 gap-x-4">
      <Form.Item label="테넌트명">
        <Input value={tenantName ?? '-'} disabled />
      </Form.Item>
      <Form.Item name="sipTrunkKind" label="SIP트렁크 종류" extra={isEdit ? '수정 불가' : undefined}>
        <Select options={SIP_TRUNK_KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} disabled={isEdit} />
      </Form.Item>

      <Form.Item
        name="sipTrunkName"
        label="SIP트렁크 이름"
        rules={[
          { required: true, message: '이름은 필수입니다' },
          { max: 100, message: '100자 이내' },
        ]}
      >
        <Input placeholder="최대 100자" maxLength={100} />
      </Form.Item>
      <Form.Item
        name="sipTrunkNo"
        label="SIP트렁크 번호"
        rules={[
          { required: true, message: '번호는 필수입니다' },
          { pattern: /^[0-9]{1,10}$/, message: '최대 10자리 숫자' },
        ]}
      >
        <Input placeholder="최대 10자리 숫자" maxLength={10} disabled={isEdit} />
      </Form.Item>

      {/* 내선프로파일 — SWAT :1755-1758, :889-894 필수 (dnProfileId) — common-trunk 동일 콤보 패턴 */}
      <Form.Item
        name="dnProfileId"
        label="내선프로파일"
        className="col-span-2"
        rules={[{ required: true, message: '내선프로파일을 선택하세요' }]}
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

      <Form.Item name="backUpNodeId" label="DR노드 (백업 노드)" extra="DR노드 지정 시 Global DN 자동 강제">
        <Select options={[{ value: 0, label: '없음' }, ...drNodeOptions.map((n) => ({ value: n.nodeId, label: n.nodeName }))]} />
      </Form.Item>
      <Form.Item name="globalDnYn" label="Global DN" extra={globalForced ? 'DR노드 지정으로 자동 강제' : undefined}>
        <Radio.Group disabled={globalForced}>
          <Radio value={1}>사용</Radio>
          <Radio value={0}>미사용</Radio>
        </Radio.Group>
      </Form.Item>

      {/* 시작DN / 채널수 — 3rd-Party PBX 선택 시 disabled (SWAT :258-274) */}
      <Form.Item
        name="startDn"
        label="시작DN"
        extra={isEdit ? '수정 불가' : is3rdParty ? '3rd-Party PBX — 자동채번 불필요' : '3~8자리 / 노드 내 중복 불가'}
        rules={isEdit || is3rdParty ? [] : [{ pattern: /^[0-9]{3,8}$/, message: '3~8자리 숫자' }]}
      >
        <Input placeholder="예: 6500" maxLength={8} disabled={isEdit || is3rdParty} />
      </Form.Item>
      <Form.Item name="chnlCnt" label="채널수" extra={isEdit ? '수정 불가' : is3rdParty ? '3rd-Party PBX — 사용 안 함' : '1~2039'}>
        <InputNumber min={1} max={2039} className="w-full" disabled={isEdit || is3rdParty} />
      </Form.Item>

      {/* TDN 자동채번 미리보기 (등록 시, 3rd-Party PBX 아닐 때만) */}
      {!isEdit && !is3rdParty && preview.total > 0 && (
        <div className="col-span-2 mb-3 rounded-md border border-sky-100 bg-sky-50 px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {preview.list.map((dn) => (
              <span key={dn} className="inline-flex items-center rounded border border-sky-200 bg-sky-50 px-1.5 py-px text-[11px] font-medium text-sky-700">
                {dn}
              </span>
            ))}
            {preview.total > 20 && <span className="text-[11px] text-sky-700">... 외 {preview.total - 20}개</span>}
          </div>
          <div className="mt-1 text-[11px] text-sky-700">
            DN_TYPE=13(TDN) · <b>{(startDn ?? '').trim()}</b>~<b>{preview.last}</b> · 총 <b>{preview.total}</b>개 자동채번
          </div>
        </div>
      )}

      <Form.Item name="ipVersion" label="IP Version" rules={[{ required: true }]}>
        <Radio.Group>
          <Radio value={4}>IPv4</Radio>
          <Radio value={6}>IPv6</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item name="portNo" label="포트번호" rules={[{ required: true, message: '포트번호는 필수입니다' }]}>
        <InputNumber min={0} max={999999999} className="w-full" />
      </Form.Item>

      <Form.Item
        name="sipTrunkIpv4"
        label="SIP트렁크 IPv4"
        rules={
          ipVersion === 4
            ? [
                { required: true, message: 'IPv4 주소는 필수입니다' },
                { max: 15, message: '15자 이내' },
              ]
            : [{ max: 15, message: '15자 이내' }]
        }
      >
        <Input placeholder="100.100.108.141" maxLength={15} disabled={ipVersion === 6} />
      </Form.Item>
      <Form.Item
        name="sipTrunkIpv6"
        label="SIP트렁크 IPv6"
        rules={
          ipVersion === 6
            ? [
                { required: true, message: 'IPv6 주소는 필수입니다' },
                { max: 63, message: '63자 이내' },
              ]
            : [{ max: 63, message: '63자 이내' }]
        }
      >
        <Input placeholder="::" maxLength={63} disabled={ipVersion === 4} />
      </Form.Item>

      <Form.Item name="trkAuthtype" label="IP유형">
        <Radio.Group>
          {IP_AUTH_TYPE_OPTIONS.map((o) => (
            <Radio key={o.value} value={o.value}>
              {o.label}
            </Radio>
          ))}
        </Radio.Group>
      </Form.Item>

      <Form.Item name="sipTrunkDesc" label="SIP트렁크 설명" className="col-span-2" rules={[{ max: 256, message: '256자 이내' }]}>
        <Input placeholder="설명 입력" maxLength={256} />
      </Form.Item>
    </div>
  );

  const extraTab = (
    <div className="grid grid-cols-2 gap-x-4">
      <Form.Item name="transportType" label="Transport 타입" extra="WS/WSS 제외">
        <Select options={TRANSPORT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
      </Form.Item>
      <Form.Item name="allocDelayTime" label="Alloc Delay Time">
        <InputNumber min={0} max={99999} className="w-full" />
      </Form.Item>
      <Form.Item name="trkIpUpdate" label="IP업데이트">
        <Radio.Group>
          <Radio value={1}>설정</Radio>
          <Radio value={0}>해제</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item name="callTraceYn" label="호추적">
        <Radio.Group>
          <Radio value={1}>설정</Radio>
          <Radio value={0}>해제</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item name="blockYn" label="블록 여부">
        <Radio.Group>
          <Radio value={1}>설정</Radio>
          <Radio value={0}>해제</Radio>
        </Radio.Group>
      </Form.Item>
      {/* 부가정보 추가 필드 — SWAT :1829-1832 정합 */}
      <Form.Item name="ssRefreshType" label="SS Refresh Type" extra="세션 갱신 방식 (기본값: 1)">
        <Select
          allowClear
          placeholder="선택"
          options={[
            { value: 1, label: '1 (기본)' },
            { value: 2, label: '2' },
          ]}
        />
      </Form.Item>
      <Form.Item name="registSeconds" label="레지스트 등록시간 (초)" extra="기본 3600">
        <InputNumber min={0} max={99999} className="w-full" />
      </Form.Item>
      <Form.Item name="registYn" label="레지스트 등록 여부">
        <Radio.Group>
          <Radio value={1}>설정</Radio>
          <Radio value={0}>해제</Radio>
        </Radio.Group>
      </Form.Item>
    </div>
  );

  return (
    <Drawer
      title={
        <span className="flex items-center gap-2">
          <Cable className="size-4 text-[#405189]" />
          {isEdit ? 'SIP 트렁크 수정' : 'SIP 트렁크 독립 등록'}
        </span>
      }
      open={visible}
      onClose={handleClose}
      width={580}
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
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'basic', label: '기본정보', forceRender: true, children: basicTab },
            { key: 'extra', label: '부가정보', forceRender: true, children: extraTab },
          ]}
        />
      </Form>
    </Drawer>
  );
});

SipTrunkDrawer.displayName = 'SipTrunkDrawer';
export default SipTrunkDrawer;
