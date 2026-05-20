/**
 * TTS Master 등록/수정 Drawer (IPR20S6041).
 *
 * 항목 순서/명칭은 AS-IS {@code IPR20S6041_TtsMasterInfo.jsp} 와 동일:
 *  1. 기본 TTS 서버 설정 (체크박스 — 0/1)
 *  2. TTS 명 (수정 시 disabled)
 *  3. IP:Port
 *  4. IP:Port(BACKUP)  — 선택
 *  5. Vendor (Select — IR_TTS_VENDOR 공통코드 Enum)
 *  6. 기본성우ID (숫자)
 *  7. 음성 포맷 (Select — IR_TTS_VOICE_FORMAT)
 *  8. TEXT 포맷 (Select — IR_TTS_TEXT_FORMAT)
 *
 * 비즈니스 검증:
 *  - 기본 TTS (ttsServer=1) 는 글로벌 1건만 — 자기 자신 제외 후 다른 기본 TTS 존재 시 차단 (클라이언트 사전 검증).
 *    백엔드도 동일 검증 수행.
 *  - TTS_NAME 중복 차단 — 백엔드 검증 위임.
 *
 * forwardRef + useImperativeHandle 패턴.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Col, Drawer, Form, Input, InputNumber, Row, Select } from 'antd';
import { Info } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateTts, useGetTtsMasters, useUpdateTts } from '../hooks/useIvrMediaQueries';
import { type IrTtsMaster, type IrTtsMasterCreateRequest, type IrTtsMasterUpdateRequest, TTS_TEXT_FORMAT_OPTIONS, TTS_VENDOR_OPTIONS, TTS_VOICE_FORMAT_OPTIONS } from '../types';

export interface TtsMasterSheetRef {
  open: (data?: IrTtsMaster) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const TtsMasterSheet = forwardRef<TtsMasterSheetRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<IrTtsMaster | null>(null);
  const ttsServer = Form.useWatch('ttsServer', form);

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: IrTtsMaster) => {
      setEditData(data ?? null);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      form.resetFields();
    },
  }));

  // ─── 다른 기본 TTS 존재 여부 (클라이언트 사전 검증) ─────────────────────
  const { data: ttsMasters = [] } = useGetTtsMasters({
    queryOptions: { enabled: visible },
  });

  const otherDefault = useMemo(() => {
    return ttsMasters.find((t) => t.ttsServer === 1 && (!editData || t.ttsId !== editData.ttsId));
  }, [ttsMasters, editData]);

  const wantsDefault = ttsServer === 1;
  const defaultConflict = wantsDefault && !!otherDefault;

  // ─── 초기값 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    if (editData) {
      form.setFieldsValue({
        ttsName: editData.ttsName,
        ttsServer: editData.ttsServer,
        ttsVendor: editData.ttsVendor,
        ttsIp: editData.ttsIp,
        ttsPort: editData.ttsPort,
        ttsBackupIp: editData.ttsBackupIp ?? '',
        ttsBackupPort: editData.ttsBackupPort ?? undefined,
        ttsSpkId: editData.ttsSpkId,
        ttsVoiceFormat: editData.ttsVoiceFormat,
        ttsTextFormat: editData.ttsTextFormat,
      });
    } else {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: createTts, isPending: isCreating } = useCreateTts({
    mutationOptions: {
      onSuccess: () => {
        toast.success('TTS Master가 등록되었습니다.');
        handleClose();
        onSuccess();
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '등록에 실패했습니다.');
      },
    },
  });

  const { mutate: updateTts, isPending: isUpdating } = useUpdateTts({
    mutationOptions: {
      onSuccess: () => {
        toast.success('TTS Master가 수정되었습니다.');
        handleClose();
        onSuccess();
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '수정에 실패했습니다.');
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const handleSubmit = useCallback(async () => {
    if (defaultConflict) {
      toast.error(`이미 기본 TTS가 존재합니다: ${otherDefault?.ttsName}`);
      return;
    }
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    if (isEditMode && editData) {
      // ttsName 은 보내지 않음 — 백엔드 Update DTO 에 필드 없음
      const updatePayload: IrTtsMasterUpdateRequest = {
        ttsServer: values.ttsServer as number,
        ttsVendor: values.ttsVendor as IrTtsMasterCreateRequest['ttsVendor'],
        ttsIp: values.ttsIp as string,
        ttsPort: values.ttsPort as number,
        ttsBackupIp: (values.ttsBackupIp as string) || undefined,
        ttsBackupPort: values.ttsBackupPort === undefined || values.ttsBackupPort === null ? undefined : (values.ttsBackupPort as number),
        ttsSpkId: values.ttsSpkId as string,
        ttsVoiceFormat: values.ttsVoiceFormat as IrTtsMasterCreateRequest['ttsVoiceFormat'],
        ttsTextFormat: values.ttsTextFormat as IrTtsMasterCreateRequest['ttsTextFormat'],
      };
      updateTts({ id: editData.ttsId, data: updatePayload });
    } else {
      const createPayload: IrTtsMasterCreateRequest = {
        ttsName: values.ttsName as string,
        ttsServer: values.ttsServer as number,
        ttsVendor: values.ttsVendor as IrTtsMasterCreateRequest['ttsVendor'],
        ttsIp: values.ttsIp as string,
        ttsPort: values.ttsPort as number,
        ttsBackupIp: (values.ttsBackupIp as string) || undefined,
        ttsBackupPort: values.ttsBackupPort === undefined || values.ttsBackupPort === null ? undefined : (values.ttsBackupPort as number),
        ttsSpkId: values.ttsSpkId as string,
        ttsVoiceFormat: values.ttsVoiceFormat as IrTtsMasterCreateRequest['ttsVoiceFormat'],
        ttsTextFormat: values.ttsTextFormat as IrTtsMasterCreateRequest['ttsTextFormat'],
      };
      createTts(createPayload);
    }
  }, [defaultConflict, otherDefault, form, isEditMode, editData, createTts, updateTts]);

  const handleClose = () => {
    setVisible(false);
    setEditData(null);
    form.resetFields();
  };

  return (
    <Drawer
      title={isEditMode ? 'TTS 설정 (수정)' : 'TTS 설정 (등록)'}
      open={visible}
      onClose={handleClose}
      styles={{ wrapper: { width: 480 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isPending} disabled={defaultConflict}>
            {isEditMode ? '수정' : '저장'}
          </Button>
        </div>
      }
    >
      {defaultConflict && (
        <Alert
          type="warning"
          showIcon
          icon={<Info className="size-4" />}
          className="mb-3"
          message={
            <span className="text-[12px]">
              이미 기본 TTS가 존재합니다: <b>{otherDefault?.ttsName}</b>
              <br />
              먼저 기존 기본 TTS를 해제하거나, 본 TTS의 기본 여부를 해제하세요.
            </span>
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        // AS-IS IPR20S6041_TtsMasterInfo.jsp setDefalutValue() 기준:
        //   poTtsServer=0, poTtsVendor=10, poTtsSpkId=0 — 3개만 기본값 설정
        //   poTtsPort/poTtsBackupPort/poTtsIp/poTtsVoiceFormat/poTtsTextFormat 은
        //   기본값 없음 (사용자가 직접 입력/선택)
        initialValues={{
          ttsServer: 0,
          ttsVendor: '10',
          ttsSpkId: '0',
        }}
      >
        {/* 1. 기본 TTS 서버 설정 — 레거시 JSP: 좌측 라벨 + 우측 빈 체크박스 */}
        <Form.Item
          name="ttsServer"
          label="기본 TTS 서버 설정"
          valuePropName="checked"
          getValueProps={(value) => ({ checked: value === 1 })}
          getValueFromEvent={(e: { target: { checked: boolean } }) => (e.target.checked ? 1 : 0)}
        >
          <Checkbox>사용</Checkbox>
        </Form.Item>

        {/* 2. TTS 명 (수정 시 disabled) */}
        <Form.Item
          name="ttsName"
          label="TTS 명"
          required
          rules={[
            { required: true, message: 'TTS명은 필수입니다' },
            { max: 100, message: 'TTS 이름은 100자까지 입력가능합니다' },
            { pattern: /^[a-zA-Z0-9 ]+$/, message: 'TTS명은 영문, 숫자, 공백만 입력가능합니다' },
          ]}
        >
          <Input placeholder="예: TTS_Main" maxLength={100} disabled={isEditMode} />
        </Form.Item>

        {/* 3. IP:Port */}
        <div className="text-[12px] font-semibold text-gray-600 border-b border-gray-200 pb-1 mb-2 mt-3">IP:Port</div>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="ttsIp"
              label="IP"
              required
              rules={[
                { required: true, message: 'TTS IP는 필수입니다' },
                { max: 64, message: 'TTS IP는 64자까지 입력가능합니다' },
                { pattern: /^[0-9.]+$/, message: 'TTS IP의 IP 형식이 올바르지 않습니다' },
              ]}
            >
              <Input placeholder="예: 192.168.0.10" maxLength={64} />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              name="ttsPort"
              label="PORT"
              required
              rules={[
                { required: true, type: 'number', message: 'TTS PORT는 필수입니다' },
                { type: 'number', min: 0, max: 65534, message: 'PORT는 최대 65534 입니다' },
              ]}
            >
              <InputNumber min={0} max={65534} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        {/* 4. IP:Port(BACKUP) */}
        <div className="text-[12px] font-semibold text-gray-600 border-b border-gray-200 pb-1 mb-2 mt-3">IP:Port (BACKUP)</div>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="ttsBackupIp"
              label="IP"
              rules={[
                { max: 64, message: 'TTS IP(BACKUP)는 64자까지 입력가능합니다' },
                { pattern: /^[0-9.]*$/, message: 'TTS IP(BACKUP)의 IP 형식이 올바르지 않습니다' },
              ]}
            >
              <Input maxLength={64} />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="ttsBackupPort" label="PORT" rules={[{ type: 'number', min: 0, max: 65534, message: 'PORT(BACKUP)는 최대 65534 입니다' }]}>
              <InputNumber min={0} max={65534} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        {/* 5. Vendor */}
        <Form.Item name="ttsVendor" label="Vendor" required rules={[{ required: true, message: 'Vendor는 필수입니다' }]}>
          <Select options={TTS_VENDOR_OPTIONS as unknown as { label: string; value: string }[]} />
        </Form.Item>

        {/* 6. 기본성우ID */}
        <Form.Item
          name="ttsSpkId"
          label="기본성우ID"
          required
          rules={[
            { required: true, message: '기본성우ID는 필수입니다' },
            { max: 32, message: '기본성우ID는 32자까지 입력가능합니다' },
            { pattern: /^[0-9]+$/, message: '기본성우ID는 숫자만 입력가능합니다' },
          ]}
        >
          <Input maxLength={32} />
        </Form.Item>

        {/* 7. 음성 포맷 */}
        <Form.Item name="ttsVoiceFormat" label="음성 포맷" required rules={[{ required: true, message: '음성 포맷은 필수입니다' }]}>
          <Select options={TTS_VOICE_FORMAT_OPTIONS as unknown as { label: string; value: string }[]} />
        </Form.Item>

        {/* 8. TEXT 포맷 */}
        <Form.Item name="ttsTextFormat" label="TEXT 포맷" required rules={[{ required: true, message: 'TEXT 포맷은 필수입니다' }]}>
          <Select options={TTS_TEXT_FORMAT_OPTIONS as unknown as { label: string; value: string }[]} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

TtsMasterSheet.displayName = 'TtsMasterSheet';
export default TtsMasterSheet;
