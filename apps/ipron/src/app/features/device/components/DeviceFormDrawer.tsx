/**
 * 단말기 등록/수정 Drawer — 2탭 (기본정보 / 라인&버튼)
 *
 * SWAT IPR20S2110_Update.jsp 정합:
 *  - 단말기이름, 단말기유형, MAC주소(필수), IP유형(radio), IP버전, 전송타입, IP주소, 포트번호
 *  - CODEC1~5, BLF사용여부, 펌웨어UPDATE사용여부
 *  - 라인정보: 단말기유형의 lineNum 개만큼 행 생성 (DN 배정/해제)
 *  - 단말버튼: 단말기유형의 buttonNum 개만큼 행 생성 (라벨/기능값)
 *  - MAC 주소 중복 검사 (등록 시 전체, 수정 시 본인 제외)
 *  - 노드 표시만 (변경 불가 — SWAT 동일)
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Radio, Select, Tabs } from 'antd';
import { Monitor } from 'lucide-react';
import { toast } from '@/shared-util';
import { deviceApi } from '../api/deviceApi';
import { useAssignDn, useCreateDevice, useDeallocateDn, useGetDevice, useUpdateDevice } from '../hooks/useDeviceQueries';
import type { DevMasterCreateRequest, DevMasterResponse, DevMasterUpdateRequest, DeviceTypeInfoDto } from '../types';

// ─── 공통코드 상수 (SWAT DB 코드값 기준) ──────────────────────────────────────────

const IP_VERSION_OPTIONS = [
  { value: 4, label: 'IPv4' },
  { value: 6, label: 'IPv6' },
  { value: 10, label: 'IPv4/IPv6' },
];

const TRANSPORT_TYPE_OPTIONS = [
  { value: 1, label: 'UDP' },
  { value: 2, label: 'TCP' },
  { value: 4, label: 'TLS' },
];

const CODEC_OPTIONS = [
  { value: 0, label: '미사용' },
  { value: 1, label: 'G.711 u-law' },
  { value: 2, label: 'G.711 a-law' },
  { value: 3, label: 'G.729' },
  { value: 4, label: 'G.722' },
  { value: 5, label: 'G.723.1' },
  { value: 6, label: 'G.726' },
];

// IP 유형 (EXT_AUTHTYPE): 0=미사용, 1=고정IP, 2=동적IP
const EXT_AUTHTYPE_OPTIONS = [
  { value: 0, label: '미사용' },
  { value: 1, label: '고정IP' },
  { value: 2, label: '동적IP' },
];

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface DeviceFormDrawerRef {
  openCreate: (nodeId: number, nodeName: string) => void;
  openEdit: (data: DevMasterResponse, nodeName: string) => void;
  close: () => void;
}

interface Props {
  deviceTypes: DeviceTypeInfoDto[];
  onSuccess?: () => void;
}

interface LineRow {
  provisionSeq: number;
  dnId: number | null;
  dnNo: string | null;
  labelText: string;
}

interface ButtonRow {
  provisionSeq: number;
  labelText: string;
  buttonFunc: number;
  buttonFuncValue: string;
}

type ExistingLine = { provisionSeq: number; dnId: number | null; dnNo: string | null; labelText: string | null };
type ExistingButton = { provisionSeq: number; labelText: string | null; buttonFunc: number | null; buttonFuncValue: string | null };

interface FormValues {
  devMstName: string;
  deviceType: number;
  macAddr: string;
  extAuthtype: number;
  ipVersion: number | null;
  transportType: number;
  ipAddr: string;
  portNo: number;
  codec1: number | null;
  codec2: number | null;
  codec3: number | null;
  codec4: number | null;
  codec5: number | null;
  blfUseYn: number;
  firmUpdUseYn: number;
  srtpUseYn: number;
}

const DEFAULTS: Partial<FormValues> = {
  extAuthtype: 0,
  ipVersion: 4,
  transportType: 1,
  portNo: 5060,
  blfUseYn: 0,
  firmUpdUseYn: 0,
  srtpUseYn: 0,
  codec1: 0,
  codec2: 0,
  codec3: 0,
  codec4: 0,
  codec5: 0,
};

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

const DeviceFormDrawer = forwardRef<DeviceFormDrawerRef, Props>(({ deviceTypes, onSuccess }, ref) => {
  const [form] = Form.useForm<FormValues>();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [nodeName, setNodeName] = useState<string>('');
  const [activeTab, setActiveTab] = useState('basic');

  // 라인/버튼 행 상태
  const [lines, setLines] = useState<LineRow[]>([]);
  const [buttons, setButtons] = useState<ButtonRow[]>([]);

  // 선택된 단말기유형 정보 (lineNum, buttonNum)
  const selectedDeviceType = useMemo(
    () => deviceTypes.find((d) => d.deviceType === form.getFieldValue('deviceType')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deviceTypes],
  );
  const [currentDeviceType, setCurrentDeviceType] = useState<DeviceTypeInfoDto | null>(null);

  // 수정 시 상세 조회
  const { data: editDetail, isLoading: isDetailLoading } = useGetDevice(editId, {
    queryOptions: { enabled: !!editId },
  });

  // 라인/버튼 초기화 (단말기유형 변경 또는 수정 데이터 로드 시)
  const initLines = useCallback((dt: DeviceTypeInfoDto | null, existingLines: ExistingLine[] | null) => {
    if (!dt || (dt.lineNum ?? 0) <= 0) {
      setLines([]);
      return;
    }
    const lineNum = dt.lineNum ?? 0;
    const newLines: LineRow[] = Array.from({ length: lineNum }, (_, i) => {
      const seq = i + 1;
      const existing = existingLines?.find((l) => l.provisionSeq === seq);
      return {
        provisionSeq: seq,
        dnId: existing?.dnId ?? null,
        dnNo: existing?.dnNo ?? null,
        labelText: existing?.labelText ?? '',
      };
    });
    setLines(newLines);
  }, []);

  const initButtons = useCallback((dt: DeviceTypeInfoDto | null, existingButtons: ExistingButton[] | null) => {
    if (!dt || (dt.buttonNum ?? 0) <= 0) {
      setButtons([]);
      return;
    }
    const btnNum = dt.buttonNum ?? 0;
    const newButtons: ButtonRow[] = Array.from({ length: btnNum }, (_, i) => {
      const seq = i + 1;
      const existing = existingButtons?.find((b) => b.provisionSeq === seq);
      return {
        provisionSeq: seq,
        labelText: existing?.labelText ?? '',
        buttonFunc: existing?.buttonFunc ?? 0,
        buttonFuncValue: existing?.buttonFuncValue ?? '',
      };
    });
    setButtons(newButtons);
  }, []);

  // 수정 데이터 로드 완료 시 폼 채우기
  useEffect(() => {
    if (!editDetail || !editId) return;
    form.setFieldsValue({
      devMstName: editDetail.devMstName,
      deviceType: editDetail.deviceType,
      macAddr: editDetail.macAddr,
      extAuthtype: editDetail.extAuthtype ?? 0,
      ipVersion: editDetail.ipVersion ?? 4,
      transportType: editDetail.transportType ?? 1,
      ipAddr: editDetail.ipAddr ?? '',
      portNo: editDetail.portNo ?? 5060,
      codec1: editDetail.codec1 ?? 0,
      codec2: editDetail.codec2 ?? 0,
      codec3: editDetail.codec3 ?? 0,
      codec4: editDetail.codec4 ?? 0,
      codec5: editDetail.codec5 ?? 0,
      blfUseYn: editDetail.blfUseYn ?? 0,
      firmUpdUseYn: editDetail.firmUpdUseYn ?? 0,
      srtpUseYn: editDetail.srtpUseYn ?? 0,
    });
    const dt = deviceTypes.find((d) => d.deviceType === editDetail.deviceType) ?? null;
    setCurrentDeviceType(dt);
    initLines(dt, editDetail.lines as ExistingLine[] | null);
    initButtons(dt, editDetail.buttons as ExistingButton[] | null);
  }, [editDetail, editId, deviceTypes, form, initLines, initButtons]);

  // ─── Mutations ────────────────────────────────────────────────────────────

  const { mutate: createDevice, isPending: isCreating } = useCreateDevice({
    mutationOptions: {
      onSuccess: () => {
        toast.success('단말기가 등록되었습니다.');
        setOpen(false);
        onSuccess?.();
      },
      onError: (e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } };
        toast.error(err?.response?.data?.message ?? '단말기 등록에 실패했습니다.');
      },
    },
  });

  const { mutate: updateDevice, isPending: isUpdating } = useUpdateDevice({
    mutationOptions: {
      onSuccess: () => {
        toast.success('단말기가 수정되었습니다.');
        setOpen(false);
        onSuccess?.();
      },
      onError: (e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } };
        toast.error(err?.response?.data?.message ?? '단말기 수정에 실패했습니다.');
      },
    },
  });

  const { mutate: assignDn, isPending: isAssigning } = useAssignDn({
    mutationOptions: {
      onSuccess: (data, vars) => {
        if (!data) return;
        const v = vars as { id: number; seq: number; data: { dnId: number } };
        setLines((prev) =>
          prev.map((l) =>
            l.provisionSeq === v.seq
              ? {
                  ...l,
                  dnId: (data as { dnId: number | null }).dnId,
                  dnNo: (data as { dnNo: string | null }).dnNo,
                  labelText: (data as { labelText: string | null }).labelText ?? '',
                }
              : l,
          ),
        );
        toast.success('DN이 배정되었습니다.');
      },
      onError: () => toast.error('DN 배정에 실패했습니다.'),
    },
  });

  const { mutate: deallocateDn, isPending: isDeallocating } = useDeallocateDn({
    mutationOptions: {
      onSuccess: (_, vars) => {
        const v = vars as { id: number; seq: number };
        setLines((prev) => prev.map((l) => (l.provisionSeq === v.seq ? { ...l, dnId: null, dnNo: null } : l)));
        toast.success('DN 배정이 해제되었습니다.');
      },
      onError: () => toast.error('DN 해제에 실패했습니다.'),
    },
  });

  // ─── Ref API ──────────────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    openCreate: (nid: number, nname: string) => {
      form.resetFields();
      form.setFieldsValue(DEFAULTS);
      setEditId(null);
      setNodeId(nid);
      setNodeName(nname);
      setCurrentDeviceType(null);
      setLines([]);
      setButtons([]);
      setActiveTab('basic');
      setOpen(true);
    },
    openEdit: (data: DevMasterResponse, nname: string) => {
      form.resetFields();
      setEditId(data.devMasterId);
      setNodeId(data.nodeId);
      setNodeName(nname);
      setActiveTab('basic');
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleDeviceTypeChange = useCallback(
    (val: number) => {
      const dt = deviceTypes.find((d) => d.deviceType === val) ?? null;
      setCurrentDeviceType(dt);
      initLines(dt, []);
      initButtons(dt, []);
    },
    [deviceTypes, initLines, initButtons],
  );

  const handleSave = useCallback(async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const macUpper = values.macAddr.toUpperCase();

    // MAC 중복 체크
    try {
      const dup = await deviceApi.checkMac(macUpper, editId ?? undefined);
      if (dup) {
        toast.error('이미 사용 중인 MAC 주소입니다.');
        return;
      }
    } catch {
      toast.error('MAC 주소 중복 확인에 실패했습니다.');
      return;
    }

    const lineRequests = lines.map((l) => ({
      provisionSeq: l.provisionSeq,
      dnId: l.dnId ?? undefined,
      labelText: l.labelText || undefined,
    }));
    const buttonRequests = buttons.map((b) => ({
      provisionSeq: b.provisionSeq,
      labelText: b.labelText || undefined,
      buttonFunc: b.buttonFunc || undefined,
      buttonFuncValue: b.buttonFuncValue || undefined,
    }));

    if (editId) {
      const req: DevMasterUpdateRequest = {
        deviceType: values.deviceType,
        devMstName: values.devMstName,
        macAddr: macUpper,
        ipAddr: values.ipAddr || undefined,
        ipVersion: values.ipVersion ?? undefined,
        portNo: values.portNo,
        transportType: values.transportType,
        extAuthtype: values.extAuthtype,
        codec1: values.codec1 ?? undefined,
        codec2: values.codec2 ?? undefined,
        codec3: values.codec3 ?? undefined,
        codec4: values.codec4 ?? undefined,
        codec5: values.codec5 ?? undefined,
        blfUseYn: values.blfUseYn,
        firmUpdUseYn: values.firmUpdUseYn,
        srtpUseYn: values.srtpUseYn,
        lines: lineRequests,
        buttons: buttonRequests,
      };
      updateDevice({ id: editId, data: req });
    } else {
      if (!nodeId) {
        toast.error('노드를 선택해야 합니다.');
        return;
      }
      const req: DevMasterCreateRequest = {
        nodeId,
        deviceType: values.deviceType,
        devMstName: values.devMstName,
        macAddr: macUpper,
        ipAddr: values.ipAddr || undefined,
        ipVersion: values.ipVersion ?? undefined,
        portNo: values.portNo,
        transportType: values.transportType,
        extAuthtype: values.extAuthtype,
        codec1: values.codec1 ?? undefined,
        codec2: values.codec2 ?? undefined,
        codec3: values.codec3 ?? undefined,
        codec4: values.codec4 ?? undefined,
        codec5: values.codec5 ?? undefined,
        blfUseYn: values.blfUseYn,
        firmUpdUseYn: values.firmUpdUseYn,
        srtpUseYn: values.srtpUseYn,
        lines: lineRequests,
        buttons: buttonRequests,
      };
      createDevice(req);
    }
  }, [form, editId, nodeId, lines, buttons, createDevice, updateDevice]);

  const handleAssignDn = useCallback(
    (_seq: number) => {
      if (!editId) {
        toast.warning('단말기 저장 후 DN을 배정할 수 있습니다.');
        return;
      }
      // TODO: DN 검색 팝업 연동
      toast.info('DN 배정은 목록 화면에서 행을 선택 후 처리합니다.');
    },
    [editId],
  );

  const handleDeallocateDn = useCallback(
    (seq: number) => {
      if (!editId) return;
      const line = lines.find((l) => l.provisionSeq === seq);
      if (!line?.dnId) return;
      deallocateDn({ id: editId, seq });
    },
    [editId, lines, deallocateDn],
  );

  const isPending = isCreating || isUpdating || isDetailLoading;
  const isEdit = !!editId;

  // ─── Tabs ────────────────────────────────────────────────────────────────

  const basicTab = (
    <Form form={form} layout="vertical" className="p-2" initialValues={DEFAULTS}>
      {/* 노드 (읽기 전용) */}
      <Form.Item label="노드">
        <Input value={nodeName} disabled />
      </Form.Item>

      <div className="grid grid-cols-2 gap-x-4">
        {/* 단말기이름 */}
        <Form.Item
          name="devMstName"
          label="단말기이름"
          rules={[
            { required: true, message: '단말기이름을 입력하세요' },
            { max: 128, message: '128자 이내로 입력하세요' },
          ]}
        >
          <Input maxLength={128} />
        </Form.Item>

        {/* 단말기유형 */}
        <Form.Item name="deviceType" label="단말기유형" rules={[{ required: true, message: '단말기유형을 선택하세요' }]}>
          <Select
            options={deviceTypes.map((d) => ({ value: d.deviceType, label: d.deviceName }))}
            onChange={handleDeviceTypeChange}
            disabled={isEdit && lines.some((l) => l.dnId != null)}
            placeholder="단말기유형 선택"
          />
        </Form.Item>
      </div>

      {/* IP 정보 구분선 */}
      <div className="text-xs font-semibold text-gray-500 mb-2 mt-1 border-b pb-1">IP 정보</div>

      {/* MAC 주소 */}
      <Form.Item
        name="macAddr"
        label="MAC 주소"
        rules={[
          { required: true, message: 'MAC 주소를 입력하세요' },
          { max: 128, message: '128자 이내로 입력하세요' },
        ]}
      >
        <Input maxLength={128} placeholder="예: 00:11:22:33:44:55" style={{ textTransform: 'uppercase' }} />
      </Form.Item>

      {/* IP 유형 */}
      <Form.Item name="extAuthtype" label="IP 유형">
        <Radio.Group options={EXT_AUTHTYPE_OPTIONS} />
      </Form.Item>

      <div className="grid grid-cols-2 gap-x-4">
        {/* IP 버전 */}
        <Form.Item name="ipVersion" label="IP 버전">
          <Select options={IP_VERSION_OPTIONS} />
        </Form.Item>

        {/* 전송 타입 */}
        <Form.Item name="transportType" label="전송 타입" rules={[{ required: true, message: '전송 타입을 선택하세요' }]}>
          <Select options={TRANSPORT_TYPE_OPTIONS} />
        </Form.Item>

        {/* IP 주소 */}
        <Form.Item name="ipAddr" label="IP 주소" rules={[{ max: 128, message: '128자 이내로 입력하세요' }]}>
          <Input maxLength={128} />
        </Form.Item>

        {/* 포트 번호 */}
        <Form.Item name="portNo" label="포트 번호" rules={[{ required: true, message: '포트 번호를 입력하세요' }]}>
          <InputNumber min={0} max={65535} style={{ width: '100%' }} />
        </Form.Item>
      </div>

      {/* CODEC 구분선 */}
      <div className="text-xs font-semibold text-gray-500 mb-2 mt-1 border-b pb-1">단말기 Codec 설정</div>

      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item name="codec1" label="CODEC1">
          <Select options={CODEC_OPTIONS} />
        </Form.Item>
        <Form.Item name="codec2" label="CODEC2">
          <Select options={CODEC_OPTIONS} />
        </Form.Item>
        <Form.Item name="codec3" label="CODEC3">
          <Select options={CODEC_OPTIONS} />
        </Form.Item>
        <Form.Item name="codec4" label="CODEC4">
          <Select options={CODEC_OPTIONS} />
        </Form.Item>
        <Form.Item name="codec5" label="CODEC5" className="col-span-2">
          <Select options={CODEC_OPTIONS} />
        </Form.Item>
      </div>

      {/* XML & BLF 구분선 */}
      <div className="text-xs font-semibold text-gray-500 mb-2 mt-1 border-b pb-1">XML &amp; BLF 설정</div>

      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item name="blfUseYn" label="BLF 사용여부">
          <Radio.Group>
            <Radio value={1}>사용</Radio>
            <Radio value={0}>사용안함</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="srtpUseYn" label="SRTP 사용여부">
          <Radio.Group>
            <Radio value={1}>사용</Radio>
            <Radio value={0}>사용안함</Radio>
          </Radio.Group>
        </Form.Item>
      </div>

      {/* 펌웨어 구분선 */}
      <div className="text-xs font-semibold text-gray-500 mb-2 mt-1 border-b pb-1">펌웨어 설정</div>

      <Form.Item name="firmUpdUseYn" label="펌웨어 UPDATE 사용여부">
        <Radio.Group>
          <Radio value={1}>사용</Radio>
          <Radio value={0}>사용안함</Radio>
        </Radio.Group>
      </Form.Item>
    </Form>
  );

  const lineButtonTab = (
    <div className="p-2">
      {/* 라인정보 */}
      <div className="text-xs font-semibold text-gray-500 mb-2 border-b pb-1">라인정보 {currentDeviceType ? `(${currentDeviceType.lineNum ?? 0}라인)` : ''}</div>
      {lines.length === 0 ? (
        <div className="text-sm text-gray-400 mb-4">단말기유형을 선택하면 라인정보가 표시됩니다.</div>
      ) : (
        <div className="space-y-2 mb-4">
          {lines.map((line) => (
            <div key={line.provisionSeq} className="flex items-center gap-2 text-sm">
              <span className="w-8 text-gray-500 text-xs">{line.provisionSeq}번</span>
              <Input value={line.dnNo ?? ''} readOnly placeholder="DN 미배정" style={{ width: 120 }} className="bg-gray-50" />
              <Input
                value={line.labelText}
                onChange={(e) => setLines((prev) => prev.map((l) => (l.provisionSeq === line.provisionSeq ? { ...l, labelText: e.target.value } : l)))}
                placeholder="라벨"
                style={{ width: 100 }}
                disabled={!isEdit}
              />
              {isEdit && (
                <>
                  <Button size="small" onClick={() => handleAssignDn(line.provisionSeq)} loading={isAssigning}>
                    배정
                  </Button>
                  <Button size="small" danger onClick={() => handleDeallocateDn(line.provisionSeq)} disabled={!line.dnId} loading={isDeallocating}>
                    해제
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 단말버튼 */}
      <div className="text-xs font-semibold text-gray-500 mb-2 border-b pb-1">단말버튼 {currentDeviceType ? `(${currentDeviceType.buttonNum ?? 0}버튼)` : ''}</div>
      {buttons.length === 0 ? (
        <div className="text-sm text-gray-400">단말기유형을 선택하면 버튼정보가 표시됩니다.</div>
      ) : (
        <div className="space-y-2">
          {buttons.map((btn) => (
            <div key={btn.provisionSeq} className="flex items-center gap-2 text-sm">
              <span className="w-8 text-gray-500 text-xs">{btn.provisionSeq}번</span>
              <Input
                value={btn.labelText}
                onChange={(e) => setButtons((prev) => prev.map((b) => (b.provisionSeq === btn.provisionSeq ? { ...b, labelText: e.target.value } : b)))}
                placeholder="라벨"
                style={{ width: 100 }}
              />
              <Input
                value={btn.buttonFuncValue}
                onChange={(e) => setButtons((prev) => prev.map((b) => (b.provisionSeq === btn.provisionSeq ? { ...b, buttonFuncValue: e.target.value } : b)))}
                placeholder="기능값"
                style={{ width: 120 }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <Monitor className="size-4 text-[#405189]" />
          <span>{isEdit ? '단말기 수정' : '단말기 등록'}</span>
          {nodeName && <span className="text-sm text-gray-400 font-normal ml-1">({nodeName})</span>}
        </div>
      }
      open={open}
      onClose={() => setOpen(false)}
      width={640}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>취소</Button>
          <Button type="primary" onClick={handleSave} loading={isPending}>
            저장
          </Button>
        </div>
      }
    >
      {isDetailLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">단말기 정보 조회 중...</div>
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'basic', label: '기본정보', children: basicTab },
            { key: 'lines', label: `라인&버튼${currentDeviceType ? ` (${currentDeviceType.lineNum ?? 0}/${currentDeviceType.buttonNum ?? 0})` : ''}`, children: lineButtonTab },
          ]}
        />
      )}
    </Drawer>
  );
});

DeviceFormDrawer.displayName = 'DeviceFormDrawer';
export default DeviceFormDrawer;
