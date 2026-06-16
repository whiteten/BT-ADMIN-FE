/**
 * 단말모델 등록/수정 Drawer — 2탭 (기본정보 / FIRMWARE)
 *
 * SWAT IPR20S2120_Update.jsp 정합 (승인 목업 device-model.html 기준):
 *  - 탭1 기본정보: 단말이름(필수) · 제조사(필수) · 모델명(필수, 글로벌 중복체크, 수정 시 변경불가) · 기능(필수)
 *                  · 사용자정의(User-Agent) · 단말라인(필수 1~30) · 단말버튼(필수 0~30)
 *                  · XML 파일위치(필수) · 무음 Alert-Info
 *                  ※ 비노출 DB필드(ssRefreshType, sipOption, mobilePushSupport, devFuncCode)는 기본값 저장
 *  - 탭2 FIRMWARE: 펌웨어명/버전, 파일 업로드(즉시 메타 기록)/다운로드, IE파일위치,
 *                  펌웨어 파일 IE노드 동기화(IOSVR) — 업로드/다운로드/동기화는 저장된 모델만 가능
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Tabs, Tag, Upload } from 'antd';
import { Download, RefreshCw, Smartphone, Upload as UploadIcon } from 'lucide-react';
import { toast } from '@/shared-util';
import { deviceModelApi } from '../api/deviceModelApi';
import { useCreateDeviceModel, useGetDeviceModel, useUpdateDeviceModel } from '../hooks/useDeviceModelQueries';
import { type DeviceModelCreateRequest, type DeviceModelResponse, FEATURE_OPTIONS, type FirmwareSyncResult, VENDOR_OPTIONS } from '../types';

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface DeviceModelFormDrawerRef {
  openCreate: () => void;
  openEdit: (data: DeviceModelResponse) => void;
  close: () => void;
}

interface Props {
  /** 모델명 글로벌 중복체크용 전체 목록 */
  models: DeviceModelResponse[];
  onSuccess?: () => void;
}

interface FormValues {
  deviceName: string;
  vendorName: string;
  modelName: string;
  feature: string;
  userAgentMsg?: string;
  lineNum: number;
  buttonNum: number;
  xmlApiFilePath: string;
  silentAlertInfo?: string;
  firmName?: string;
  firmVersion?: string;
  firmFilePath?: string;
}

const DEFAULTS: Partial<FormValues> = {
  lineNum: 1,
  buttonNum: 0,
};

const extractErrorMessage = (e: unknown, fallback: string) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

const DeviceModelFormDrawer = forwardRef<DeviceModelFormDrawerRef, Props>(({ models, onSuccess }, ref) => {
  const [form] = Form.useForm<FormValues>();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // 펌웨어 파일 상태
  const [firmFileName, setFirmFileName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<FirmwareSyncResult[] | null>(null);

  // 수정 시 상세 조회 (목록 행에 없는 필드 — userAgentMsg/xmlApiFilePath 등 — 포함)
  const { data: editDetail, isLoading: isDetailLoading } = useGetDeviceModel(editId, {
    queryOptions: { enabled: editId != null },
  });

  // 수정 데이터 로드 완료 시 폼 채우기 (open 의존성: 같은 행 재오픈 시에도 캐시 데이터로 재충전)
  useEffect(() => {
    if (!open || !editDetail || editId == null) return;
    form.setFieldsValue({
      deviceName: editDetail.deviceName ?? '',
      vendorName: editDetail.vendorName ?? undefined,
      modelName: editDetail.modelName ?? '',
      feature: editDetail.feature ?? undefined,
      userAgentMsg: editDetail.userAgentMsg ?? '',
      lineNum: editDetail.lineNum ?? 1,
      buttonNum: editDetail.buttonNum ?? 0,
      xmlApiFilePath: editDetail.xmlApiFilePath ?? '',
      silentAlertInfo: editDetail.silentAlertInfo ?? '',
      firmName: editDetail.firmName ?? '',
      firmVersion: editDetail.firmVersion ?? '',
      firmFilePath: editDetail.firmFilePath ?? '',
    });
    setFirmFileName(editDetail.firmFileName ?? '');
  }, [open, editDetail, editId, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const { mutate: createModel, isPending: isCreating } = useCreateDeviceModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('단말모델이 등록되었습니다');
        setOpen(false);
        onSuccess?.();
      },
      onError: (e: unknown) => toast.error(extractErrorMessage(e, '단말모델 등록에 실패했습니다.')),
    },
  });

  const { mutate: updateModel, isPending: isUpdating } = useUpdateDeviceModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('단말모델이 수정되었습니다');
        setOpen(false);
        onSuccess?.();
      },
      onError: (e: unknown) => toast.error(extractErrorMessage(e, '단말모델 수정에 실패했습니다.')),
    },
  });

  // ─── Ref API ────────────────────────────────────────────────────────────────

  const resetDrawerState = useCallback(() => {
    form.resetFields();
    setFirmFileName('');
    setSyncResults(null);
    setActiveTab('basic');
  }, [form]);

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      resetDrawerState();
      form.setFieldsValue(DEFAULTS);
      setEditId(null);
      setOpen(true);
    },
    openEdit: (data: DeviceModelResponse) => {
      resetDrawerState();
      setEditId(data.deviceType);
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  // ─── 옵션 (수정 데이터에 목록 외 값이 있으면 옵션에 주입) ───────────────────

  const vendorOptions = useMemo(() => {
    const base = [...VENDOR_OPTIONS];
    const v = editDetail?.vendorName;
    if (v && !base.some((o) => o.value === v)) base.push({ value: v, label: v });
    return base;
  }, [editDetail]);

  const featureOptions = useMemo(() => {
    const base = [...FEATURE_OPTIONS];
    const v = editDetail?.feature;
    if (v && !base.some((o) => o.value === v)) base.push({ value: v, label: v });
    return base;
  }, [editDetail]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  /** 공백 → undefined 변환 (요청 페이로드 정리) */
  const emptyToUndefined = (s?: string) => {
    const t = s?.trim();
    return t ? t : undefined;
  };

  const handleSave = useCallback(async () => {
    let values: FormValues;
    try {
      values = (await form.validateFields()) as FormValues;
    } catch {
      setActiveTab('basic'); // 필수 필드는 전부 기본정보 탭
      return;
    }

    const modelName = values.modelName.trim();
    // 모델명 글로벌 중복 체크 (서버 — 등록 시 전체, 수정 시 본인 제외)
    try {
      const dup = await deviceModelApi.checkModel(modelName, editId ?? undefined);
      if (dup) {
        toast.error('이미 등록된 모델명입니다');
        setActiveTab('basic');
        return;
      }
    } catch {
      toast.error('모델명 중복 확인에 실패했습니다');
      return;
    }

    const req: DeviceModelCreateRequest = {
      deviceName: values.deviceName.trim(),
      vendorName: values.vendorName,
      modelName,
      feature: values.feature,
      userAgentMsg: emptyToUndefined(values.userAgentMsg),
      lineNum: values.lineNum,
      buttonNum: values.buttonNum,
      xmlApiFilePath: values.xmlApiFilePath.trim(),
      silentAlertInfo: emptyToUndefined(values.silentAlertInfo),
      firmName: emptyToUndefined(values.firmName),
      firmVersion: emptyToUndefined(values.firmVersion),
      firmFilePath: emptyToUndefined(values.firmFilePath),
    };
    if (editId != null) updateModel({ id: editId, data: req });
    else createModel(req);
  }, [form, editId, createModel, updateModel]);

  /** 펌웨어 파일 업로드 — 저장 서버 반영 + 메타(FIRM_FILE_NAME) 즉시 기록 (저장된 모델만) */
  const handleUpload = useCallback(
    async (file: File) => {
      if (editId == null) {
        toast.warning('모델 저장 후 펌웨어 파일을 업로드할 수 있습니다');
        return;
      }
      setUploading(true);
      try {
        const result = await deviceModelApi.uploadFirmware(editId, file);
        setFirmFileName(result.fileName);
        if (result.filePath) form.setFieldsValue({ firmFilePath: result.filePath });
        toast.success('펌웨어 파일이 업로드되었습니다');
      } catch (e) {
        toast.error(extractErrorMessage(e, '펌웨어 파일 업로드에 실패했습니다.'));
      } finally {
        setUploading(false);
      }
    },
    [editId, form],
  );

  /** 저장된 펌웨어 파일 다운로드 (firmFilePath 기준) */
  const handleDownload = useCallback(async () => {
    if (editId == null) return;
    try {
      await deviceModelApi.downloadFirmware(editId, firmFileName || `firmware-${editId}.bin`);
    } catch (e) {
      toast.error(extractErrorMessage(e, '펌웨어 파일 다운로드에 실패했습니다.'));
    }
  }, [editId, firmFileName]);

  /** 펌웨어 파일 전체 IE노드 동기화 (IOSVR) */
  const handleSync = useCallback(async () => {
    if (editId == null) {
      toast.warning('모델 저장 후 동기화할 수 있습니다');
      return;
    }
    setSyncing(true);
    setSyncResults(null);
    try {
      const results = await deviceModelApi.syncFirmware(editId);
      setSyncResults(results);
      const failCnt = results.filter((r) => !r.success).length;
      if (failCnt > 0) toast.warning(`IE노드 동기화 완료 — 실패 ${failCnt}건이 있습니다.`);
      else toast.success('전체 IE노드 동기화가 완료되었습니다');
    } catch (e) {
      toast.error(extractErrorMessage(e, '펌웨어 IE노드 동기화에 실패했습니다.'));
    } finally {
      setSyncing(false);
    }
  }, [editId]);

  const isPending = isCreating || isUpdating || isDetailLoading;
  const isEdit = editId != null;

  // ─── 탭 컨텐츠 ──────────────────────────────────────────────────────────────

  const sectionTitle = (title: string) => <div className="text-xs font-semibold text-gray-500 mb-3 mt-1 border-b border-dashed border-gray-200 pb-1">{title}</div>;

  const basicTab = (
    <div className="p-2">
      {sectionTitle('모델 기본')}
      <div className="grid grid-cols-2 gap-x-6">
        <Form.Item
          name="deviceName"
          label="단말이름"
          rules={[
            { required: true, message: '단말이름을 입력하세요' },
            { max: 128, message: '128자 이내로 입력하세요' },
          ]}
        >
          <Input maxLength={128} placeholder="화면 표시용 이름 (예: BridgeTec IP-7240)" />
        </Form.Item>

        <Form.Item name="vendorName" label="제조사" rules={[{ required: true, message: '제조사를 선택하세요' }]}>
          <Select options={vendorOptions} placeholder="선택" />
        </Form.Item>

        <Form.Item
          name="modelName"
          label="모델명"
          hasFeedback
          tooltip={isEdit ? '저장된 모델명은 변경할 수 없습니다.' : undefined}
          rules={[
            { required: true, message: '모델명을 입력하세요' },
            { max: 128, message: '128자 이내로 입력하세요' },
            {
              validator: (_, value: string) => {
                const v = (value ?? '').trim().toLowerCase();
                if (!v) return Promise.resolve();
                const dup = models.some((m) => m.deviceType !== editId && (m.modelName ?? '').trim().toLowerCase() === v);
                return dup ? Promise.reject(new Error('이미 등록된 모델명입니다.')) : Promise.resolve();
              },
            },
          ]}
        >
          <Input maxLength={128} placeholder="예: IP-7240" disabled={isEdit} />
        </Form.Item>

        <Form.Item name="feature" label="기능" rules={[{ required: true, message: '기능을 선택하세요' }]}>
          <Select options={featureOptions} placeholder="선택" />
        </Form.Item>

        <Form.Item name="userAgentMsg" label="사용자정의 (User-Agent)" className="col-span-2" rules={[{ max: 256, message: '256자 이내로 입력하세요' }]}>
          <Input maxLength={256} placeholder="단말 User-Agent 매칭 문자열 (선택)" />
        </Form.Item>
      </div>

      {sectionTitle('사양')}
      <div className="grid grid-cols-2 gap-x-6">
        <Form.Item
          name="lineNum"
          label="단말라인"
          extra="1 ~ 30"
          rules={[
            { required: true, message: '단말라인을 입력하세요' },
            { type: 'number', min: 1, max: 30, message: '1 ~ 30 범위로 입력하세요' },
          ]}
        >
          <InputNumber min={1} max={30} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="buttonNum"
          label="단말버튼"
          extra="0 ~ 30"
          rules={[
            { required: true, message: '단말버튼을 입력하세요' },
            { type: 'number', min: 0, max: 30, message: '0 ~ 30 범위로 입력하세요' },
          ]}
        >
          <InputNumber min={0} max={30} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="xmlApiFilePath"
          label="XML 파일위치"
          className="col-span-2"
          rules={[
            { required: true, message: 'XML 파일위치를 입력하세요' },
            { max: 256, message: '256자 이내로 입력하세요' },
          ]}
        >
          <Input maxLength={256} placeholder="예: /provisioning/xml/ip7240.xml" />
        </Form.Item>

        <Form.Item name="silentAlertInfo" label="무음 Alert-Info" className="col-span-2" rules={[{ max: 256, message: '256자 이내로 입력하세요' }]}>
          <Input maxLength={256} placeholder="Silent Alert-Info 헤더값 (선택)" />
        </Form.Item>
      </div>

      <p className="text-[11px] text-gray-400">※ SS Refresh / SIP옵션 / 모바일푸시 / 단말기능코드는 기본값으로 저장됩니다.</p>
    </div>
  );

  const firmwareTab = (
    <div className="p-2">
      {sectionTitle('펌웨어 정보')}
      <div className="grid grid-cols-2 gap-x-6">
        <Form.Item name="firmName" label="펌웨어명" rules={[{ max: 128, message: '128자 이내로 입력하세요' }]}>
          <Input maxLength={128} placeholder="예: ip7240-fw" />
        </Form.Item>
        <Form.Item name="firmVersion" label="버전" rules={[{ max: 64, message: '64자 이내로 입력하세요' }]}>
          <Input maxLength={64} placeholder="예: 1.4.2" />
        </Form.Item>
      </div>

      {sectionTitle('펌웨어 파일')}
      <div className="space-y-4">
        {/* 파일 업로드 / 다운로드 */}
        <div>
          <div className="text-xs font-medium text-gray-600 mb-1">파일 업로드</div>
          <div className="flex items-center gap-2">
            <Upload
              showUploadList={false}
              disabled={uploading || !isEdit}
              beforeUpload={(file) => {
                void handleUpload(file as unknown as File);
                return false;
              }}
            >
              <Button icon={<UploadIcon className="size-3.5" />} loading={uploading} disabled={!isEdit}>
                파일 선택
              </Button>
            </Upload>
            <span className={`text-xs ${firmFileName ? 'text-gray-700' : 'text-gray-400'}`}>{firmFileName || '선택된 파일 없음'}</span>
            <Button className="ml-auto" icon={<Download className="size-3.5" />} onClick={handleDownload} disabled={!isEdit || !firmFileName}>
              다운로드
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            업로드 즉시 저장 서버에 반영되며, 메타(파일명/위치)가 모델에 기록됩니다.{!isEdit && ' 모델 저장 후 업로드할 수 있습니다.'}
          </p>
        </div>

        {/* IE파일위치 */}
        <Form.Item name="firmFilePath" label="IE 파일위치" rules={[{ max: 256, message: '256자 이내로 입력하세요' }]}>
          <Input maxLength={256} placeholder="예: /bridgetec/firmware/ip7240/1.4.2.bin" />
        </Form.Item>

        {/* 펌웨어 IE노드 동기화 */}
        <div className="rounded border border-[#d6dcef] bg-[#f6f8fd] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="size-4 text-[#405189]" />
              <span className="text-xs font-semibold text-[#34406e]">펌웨어 파일 IE노드 동기화</span>
            </div>
            <Button type="primary" icon={<RefreshCw className="size-3.5" />} onClick={handleSync} loading={syncing} disabled={!isEdit}>
              전체 노드 동기화
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-[#34406e]">
            업로드한 펌웨어 바이너리를 각 IE노드로 전송(IOSVR)하여 단말 프로비저닝에 사용합니다.{!isEdit && ' 모델 저장 후 동기화할 수 있습니다.'}
          </p>
          {syncResults && (
            <div className="mt-2 space-y-1">
              {syncResults.length === 0 ? (
                <div className="text-[11px] text-gray-400">동기화 대상 노드가 없습니다.</div>
              ) : (
                syncResults.map((r, idx) => (
                  <div key={`${r.nodeName}-${idx}`} className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-600">{r.nodeName}</span>
                    <Tag color={r.success ? 'green' : 'red'} className="!mr-0">
                      {r.success ? '성공' : `실패${r.message ? ` (${r.message})` : ''}`}
                    </Tag>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <Smartphone className="size-4 text-[#405189]" />
          <span>{isEdit ? '단말모델 수정' : '단말모델 등록'}</span>
          <span className="text-xs text-red-500 font-normal ml-1">* 필수</span>
        </div>
      }
      open={open}
      onClose={() => setOpen(false)}
      width={680}
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
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">단말모델 정보 조회 중...</div>
      ) : (
        <Form form={form} layout="vertical" initialValues={DEFAULTS}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'basic', label: '기본정보', children: basicTab, forceRender: true },
              { key: 'firmware', label: '펌웨어', children: firmwareTab, forceRender: true },
            ]}
          />
        </Form>
      )}
    </Drawer>
  );
});

DeviceModelFormDrawer.displayName = 'DeviceModelFormDrawer';
export default DeviceModelFormDrawer;
