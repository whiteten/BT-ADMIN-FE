/**
 * 어댑터 추가/수정 Drawer (AS-IS IPR20S6042_Adaptor.jsp)
 *
 * 탭1 기본정보: Trans ID / 이름 / 종류 / 이중화 동작방식 / IP / Port / 접속방식 / 응답대기 / Alive / 사용유무
 * 탭2 환경파일: 수정 모드에서만 활성 — 기본/확장 2개 파일 슬롯 (AS-IS 업무단위 동등)
 *   - 신규(미등록): 기본+확장 2파일 모두 필수 (AS-IS callConfigFileProcess insert 동등)
 *   - 기존: 슬롯별 파일 교체(선택) / 설명만 수정 / 삭제 → 기존 configId update (재업로드 중복 INSERT 방지)
 */
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, InputNumber, Modal, Radio, Select, Tabs, Upload } from 'antd';
import { Trash2, UploadCloud } from 'lucide-react';
import { toast } from '@/shared-util';
import {
  extAdaptorQueryKeys,
  useCreateAdaptor,
  useDeleteAdaptorConfig,
  useGetAdaptorConfigs,
  useUpdateAdaptor,
  useUpdateAdaptorConfig,
  useUploadAdaptorConfig,
} from '../hooks/useExtAdaptorQueries';
import {
  ADAPTOR_CONN_TYPE_LABELS,
  ADAPTOR_FORM_DEFAULTS,
  ADAPTOR_HA_ROLE_LABELS,
  ADAPTOR_TYPE_LABELS,
  type Adaptor,
  type AdaptorConfig,
  type AdaptorCreateRequest,
} from '../types/extAdaptor';

export interface AdaptorDrawerRef {
  /** adaptor=null → 추가 / adaptor=값 → 수정(환경파일 탭 활성) */
  open: (adaptor: Adaptor | null, systemId: number, systemName: string, nodeId: number) => void;
  close: () => void;
}

interface Props {
  onSuccess?: () => void;
}

const toOptions = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value: Number(value), label }));

const AdaptorDrawer = forwardRef<AdaptorDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [systemId, setSystemId] = useState<number | null>(null);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [systemName, setSystemName] = useState('');
  const [editing, setEditing] = useState<Adaptor | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // 환경파일 (기본/확장) 슬롯 — 신규 선택 파일 + 설명
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [extFile, setExtFile] = useState<File | null>(null);
  const [baseDesc, setBaseDesc] = useState('');
  const [extDesc, setExtDesc] = useState('');

  const createMutation = useCreateAdaptor();
  const updateMutation = useUpdateAdaptor();
  const uploadMutation = useUploadAdaptorConfig();
  const updateConfigMutation = useUpdateAdaptorConfig();
  const deleteConfigMutation = useDeleteAdaptorConfig();

  const isEdit = editing != null;

  // 기존 환경파일 로드 (수정 모드) — 슬롯0=기본, 슬롯1=확장
  const { data: existingConfigs = [] } = useGetAdaptorConfigs({
    params: isEdit && systemId != null && editing ? { systemId, adaptorId: editing.adaptorId } : undefined,
    queryOptions: { enabled: open && isEdit && systemId != null && editing != null },
  });
  const baseConfig: AdaptorConfig | null = existingConfigs[0] ?? null;
  const extConfig: AdaptorConfig | null = existingConfigs[1] ?? null;

  // 기존 설명 prefill
  useEffect(() => {
    setBaseDesc(existingConfigs[0]?.configDesc ?? '');
    setExtDesc(existingConfigs[1]?.configDesc ?? '');
  }, [existingConfigs]);

  const invalidateConfigs = () => queryClient.invalidateQueries({ queryKey: extAdaptorQueryKeys.getAdaptorConfigs._def });

  useImperativeHandle(ref, () => ({
    open: (adaptor, sysId, sysName, ndId) => {
      setSystemId(sysId);
      setNodeId(ndId);
      setSystemName(sysName);
      setEditing(adaptor);
      setActiveTab('basic');
      setBaseFile(null);
      setExtFile(null);
      setBaseDesc('');
      setExtDesc('');
      if (adaptor) {
        form.setFieldsValue({ ...adaptor });
      } else {
        form.resetFields();
        form.setFieldsValue({ ...ADAPTOR_FORM_DEFAULTS });
      }
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  // 어댑터 추가/수정
  const handleSave = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values || systemId == null) return;
    const payload: AdaptorCreateRequest = { ...values, systemId };
    if (isEdit && editing) {
      updateMutation.mutate(
        { adaptorId: editing.adaptorId, data: payload },
        {
          onSuccess: () => {
            toast.success('어댑터가 수정되었습니다');
            setOpen(false);
            onSuccess?.();
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('어댑터가 추가되었습니다');
          setOpen(false);
          onSuccess?.();
        },
      });
    }
  };

  const configSaving = uploadMutation.isPending || updateConfigMutation.isPending;

  // 환경파일 저장 — 슬롯별 create(신규) / update(기존, 파일교체 또는 설명) (AS-IS 업무단위)
  const handleSaveConfigs = async () => {
    if (systemId == null || nodeId == null || editing == null) return;
    // 신규 슬롯은 파일 필수 (AS-IS 기본+확장 2파일 필수)
    if (!baseConfig && !baseFile) {
      toast.warning('기본 환경파일을 선택하세요');
      return;
    }
    if (!extConfig && !extFile) {
      toast.warning('확장 환경파일을 선택하세요');
      return;
    }
    // EMS 경로 systemId 는 레거시와 동일하게 10자리 zero-pad (AS-IS LPAD(SYSTEM_ID,10,'0') 디렉터리 컨벤션).
    // DB/TCP 의 systemId 숫자는 그대로 두고, 업로드 디렉터리명만 패딩.
    const emsFilePath = `adaptor/${nodeId}/${String(systemId).padStart(10, '0')}/`;
    const irFilePath = 'ir/adaptor/';
    try {
      // 기본 슬롯
      if (baseConfig) {
        if (baseFile || baseDesc !== (baseConfig.configDesc ?? '')) {
          await updateConfigMutation.mutateAsync({ irAdaptorConfigId: baseConfig.irAdaptorConfigId, file: baseFile ?? undefined, emsFilePath, irFilePath, configDesc: baseDesc });
        }
      } else if (baseFile) {
        await uploadMutation.mutateAsync({ file: baseFile, systemId, adaptorId: editing.adaptorId, emsFilePath, irFilePath, irAdaptorConfigType: '1', configDesc: baseDesc });
      }
      // 확장 슬롯
      if (extConfig) {
        if (extFile || extDesc !== (extConfig.configDesc ?? '')) {
          await updateConfigMutation.mutateAsync({ irAdaptorConfigId: extConfig.irAdaptorConfigId, file: extFile ?? undefined, emsFilePath, irFilePath, configDesc: extDesc });
        }
      } else if (extFile) {
        await uploadMutation.mutateAsync({ file: extFile, systemId, adaptorId: editing.adaptorId, emsFilePath, irFilePath, irAdaptorConfigType: '1', configDesc: extDesc });
      }
      toast.success('환경파일이 저장되었습니다');
      invalidateConfigs();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error(`환경파일 저장 실패: ${(err as Error).message ?? '알 수 없는 오류'}`);
    }
  };

  const handleDeleteConfig = (config: AdaptorConfig, label: string) => {
    Modal.confirm({
      title: '환경파일 삭제',
      content: `${label} 환경파일 "${config.adaptorConfigName}"을(를) 삭제하시겠습니까?`,
      okText: '삭제',
      cancelText: '취소',
      okButtonProps: { danger: true },
      onOk: () =>
        deleteConfigMutation.mutateAsync({ irAdaptorConfigId: config.irAdaptorConfigId }).then(() => {
          toast.success('환경파일이 삭제되었습니다');
          invalidateConfigs();
        }),
    });
  };

  const uploadProps = (setter: (f: File | null) => void) => ({
    maxCount: 1,
    beforeUpload: (file: File) => {
      setter(file);
      return false as const; // 자동 업로드 막고 직접 전송
    },
    onRemove: () => setter(null),
  });

  // 환경파일 슬롯 렌더 (기본/확장 공통)
  const renderConfigSlot = (label: string, config: AdaptorConfig | null, setFile: (f: File | null) => void, desc: string, setDesc: (v: string) => void) => (
    <div className="border border-gray-200 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-gray-700">
          {label} 환경파일
          {!config && <span className="text-red-500 ml-1">*</span>}
        </div>
        {config && (
          <button type="button" onClick={() => handleDeleteConfig(config, label)} className="text-gray-400 hover:text-red-500" aria-label="삭제">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      {config && (
        <div className="text-xs text-gray-500 mb-2">
          현재 파일: <span className="text-gray-700 font-medium">{config.adaptorConfigName}</span>
        </div>
      )}
      <Upload.Dragger {...uploadProps(setFile)}>
        <p className="ant-upload-drag-icon flex justify-center">
          <UploadCloud className="size-6 text-gray-400" />
        </p>
        <p className="ant-upload-text text-[12px]">{config ? '파일 교체 시에만 선택 (선택)' : `${label} 환경파일을 끌어다 놓거나 클릭`}</p>
      </Upload.Dragger>
      <Input className="mt-2" size="small" placeholder="설명 (선택)" value={desc} maxLength={512} onChange={(e) => setDesc(e.target.value)} />
    </div>
  );

  return (
    <Drawer
      title={`${systemName} — ${isEdit ? '어댑터 수정' : '어댑터 추가'}`}
      open={open}
      onClose={() => setOpen(false)}
      width={520}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>취소</Button>
          {activeTab === 'basic' ? (
            <Button type="primary" loading={createMutation.isPending || updateMutation.isPending} onClick={handleSave}>
              저장
            </Button>
          ) : (
            <Button type="primary" loading={configSaving} onClick={handleSaveConfigs}>
              환경파일 저장
            </Button>
          )}
        </div>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'basic',
            label: '기본정보',
            children: (
              <Form form={form} layout="vertical" requiredMark>
                <Form.Item
                  label="Trans ID"
                  name="transId"
                  tooltip="시나리오 지정용 ID (숫자)"
                  rules={[
                    { required: true, message: 'Trans ID는 필수입니다' },
                    { type: 'number', min: 0, max: 9999999999, message: 'Trans ID는 0~9999999999' },
                  ]}
                >
                  <InputNumber className="!w-full" min={0} max={9999999999} controls={false} placeholder="숫자" />
                </Form.Item>
                <Form.Item label="어댑터 이름" name="adaptorName" rules={[{ required: true, message: '어댑터 이름은 필수입니다' }, { max: 64 }]}>
                  <Input maxLength={64} />
                </Form.Item>
                <Form.Item label="어뎁터 종류" name="adaptorType" rules={[{ required: true }]}>
                  <Select options={toOptions(ADAPTOR_TYPE_LABELS)} disabled={isEdit} />
                </Form.Item>
                <Form.Item label="이중화 동작방식" name="haRole" rules={[{ required: true }]}>
                  <Select options={toOptions(ADAPTOR_HA_ROLE_LABELS)} />
                </Form.Item>
                <Form.Item
                  label="IP"
                  name="connIp"
                  rules={[
                    { required: true, message: 'IP는 필수입니다' },
                    { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'IP 형식이 올바르지 않습니다' },
                  ]}
                >
                  <Input placeholder="0.0.0.0" maxLength={64} />
                </Form.Item>
                <Form.Item
                  label="Port"
                  name="connPort"
                  rules={[
                    { required: true, message: 'Port는 필수입니다' },
                    { type: 'number', min: 1, max: 65534, message: 'Port는 1~65534' },
                  ]}
                >
                  <InputNumber className="!w-full" min={1} max={65534} />
                </Form.Item>
                <Form.Item label="접속방식" name="connType" rules={[{ required: true }]}>
                  <Select options={toOptions(ADAPTOR_CONN_TYPE_LABELS)} />
                </Form.Item>
                <Form.Item label="최대응답대기시간 (초)" name="respTimeout" rules={[{ required: true }, { type: 'number', min: 1, max: 1800, message: '1~1800초' }]}>
                  <InputNumber className="!w-full" min={1} max={1800} />
                </Form.Item>
                <Form.Item label="Alive 감시 주기 (초)" name="aliveInterval" rules={[{ required: true }, { type: 'number', min: 1, max: 180, message: '1~180초' }]}>
                  <InputNumber className="!w-full" min={1} max={180} />
                </Form.Item>
                <Form.Item label="사용유무" name="useYn" rules={[{ required: true }]}>
                  <Radio.Group>
                    <Radio value={1}>사용</Radio>
                    <Radio value={0}>미사용</Radio>
                  </Radio.Group>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'config',
            label: 'Adaptor 환경파일',
            disabled: !isEdit, // 추가 모드에서는 비활성 (어댑터 생성 후 수정 모드에서 등록 — AS-IS 정책)
            children: (
              <div className="flex flex-col gap-4">
                <p className="text-[12px] text-gray-500">
                  ※ 기본/확장 2개 파일이 한 세트입니다. 신규 등록 시 둘 다 필수이며, 등록 후에는 슬롯별 파일 교체·설명 수정·삭제가 가능합니다. (EMS 저장 후 IR 장비로 전송)
                </p>
                {renderConfigSlot('기본', baseConfig, setBaseFile, baseDesc, setBaseDesc)}
                {renderConfigSlot('확장', extConfig, setExtFile, extDesc, setExtDesc)}
              </div>
            ),
          },
        ]}
      />
    </Drawer>
  );
});

AdaptorDrawer.displayName = 'AdaptorDrawer';
export default AdaptorDrawer;
