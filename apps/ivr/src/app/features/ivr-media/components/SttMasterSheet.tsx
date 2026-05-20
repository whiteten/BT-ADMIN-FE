/**
 * STT Master 등록/수정 Drawer (IPR20S6041).
 *
 * 항목 순서/명칭은 AS-IS {@code IPR20S6041_SttMasterInfo.jsp} 와 동일:
 *  1. 기본 STT 서버 설정 (체크박스 — 0/1)
 *  2. 3rd Party (체크박스 — 0/1)
 *  3. STT 명 (수정 시 disabled)
 *  4. IP:Port
 *  5. IP:Port(BACKUP) — 선택
 *  6. Grammar Path
 *
 * 비즈니스 검증:
 *  - 기본 STT (sttServer=1) 는 글로벌 1건만 — 자기 자신 제외 후 다른 기본 STT 존재 시 차단.
 *  - STT_NAME 중복 차단 — 백엔드 검증 위임.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Col, Drawer, Form, Input, InputNumber, Row } from 'antd';
import { Info } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateStt, useGetSttMasters, useUpdateStt } from '../hooks/useIvrMediaQueries';
import { type IrSttMaster, type IrSttMasterCreateRequest } from '../types/ivrMedia.types';

export interface SttMasterSheetRef {
  open: (data?: IrSttMaster) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const SttMasterSheet = forwardRef<SttMasterSheetRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<IrSttMaster | null>(null);
  const sttServer = Form.useWatch('sttServer', form);

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: IrSttMaster) => {
      setEditData(data ?? null);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      form.resetFields();
    },
  }));

  const { data: sttMasters = [] } = useGetSttMasters({
    queryOptions: { enabled: visible },
  });

  const otherDefault = useMemo(() => {
    return sttMasters.find((s) => s.sttServer === 1 && (!editData || s.sttId !== editData.sttId));
  }, [sttMasters, editData]);

  const wantsDefault = sttServer === 1;
  const defaultConflict = wantsDefault && !!otherDefault;

  useEffect(() => {
    if (!visible) return;
    if (editData) {
      form.setFieldsValue({
        sttName: editData.sttName,
        sttServer: editData.sttServer,
        sttInterface: editData.sttInterface,
        sttIp: editData.sttIp,
        sttPort: editData.sttPort,
        sttBackupIp: editData.sttBackupIp ?? '',
        sttBackupPort: editData.sttBackupPort ?? undefined,
        sttGrammarPath: editData.sttGrammarPath ?? '',
      });
    } else {
      form.resetFields();
    }
  }, [visible, editData, form]);

  const { mutate: createStt, isPending: isCreating } = useCreateStt({
    mutationOptions: {
      onSuccess: () => {
        toast.success('STT Master가 등록되었습니다.');
        handleClose();
        onSuccess();
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '등록에 실패했습니다.');
      },
    },
  });

  const { mutate: updateStt, isPending: isUpdating } = useUpdateStt({
    mutationOptions: {
      onSuccess: () => {
        toast.success('STT Master가 수정되었습니다.');
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
      toast.error(`이미 기본 STT가 존재합니다: ${otherDefault?.sttName}`);
      return;
    }
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload: IrSttMasterCreateRequest = {
      sttName: values.sttName as string,
      sttServer: values.sttServer as number,
      sttInterface: values.sttInterface as number,
      sttIp: values.sttIp as string,
      sttPort: values.sttPort as number,
      sttBackupIp: (values.sttBackupIp as string) || undefined,
      sttBackupPort: values.sttBackupPort === undefined || values.sttBackupPort === null ? undefined : (values.sttBackupPort as number),
      sttGrammarPath: (values.sttGrammarPath as string) || undefined,
    };
    if (isEditMode && editData) {
      updateStt({ id: editData.sttId, data: payload });
    } else {
      createStt(payload);
    }
  }, [defaultConflict, otherDefault, form, isEditMode, editData, createStt, updateStt]);

  const handleClose = () => {
    setVisible(false);
    setEditData(null);
    form.resetFields();
  };

  return (
    <Drawer
      title={isEditMode ? 'STT 설정 (수정)' : 'STT 설정 (등록)'}
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
              이미 기본 STT가 존재합니다: <b>{otherDefault?.sttName}</b>
              <br />
              먼저 기존 기본 STT를 해제하거나, 본 STT의 기본 여부를 해제하세요.
            </span>
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        // AS-IS IPR20S6041_SttMasterInfo.jsp setDefalutValue() 기준:
        //   poSttServer=1, poSttInterface=1, poSttGrammarPath="" — 3개만 기본값 설정
        initialValues={{
          sttServer: 1,
          sttInterface: 1,
          sttGrammarPath: '',
        }}
      >
        {/* 1. 기본 STT 서버 설정 */}
        <Form.Item
          name="sttServer"
          label="기본 STT 서버 설정"
          valuePropName="checked"
          getValueProps={(value) => ({ checked: value === 1 })}
          getValueFromEvent={(e: { target: { checked: boolean } }) => (e.target.checked ? 1 : 0)}
        >
          <Checkbox>사용</Checkbox>
        </Form.Item>

        {/* 2. 3rd Party */}
        <Form.Item
          name="sttInterface"
          label="3rd Party"
          valuePropName="checked"
          getValueProps={(value) => ({ checked: value === 1 })}
          getValueFromEvent={(e: { target: { checked: boolean } }) => (e.target.checked ? 1 : 0)}
        >
          <Checkbox>사용</Checkbox>
        </Form.Item>

        {/* 3. STT 명 */}
        <Form.Item
          name="sttName"
          label="STT 명"
          required
          rules={[
            { required: true, message: 'STT명은 필수입니다' },
            { max: 100, message: 'STT 이름은 100자까지 입력가능합니다' },
            { pattern: /^[a-zA-Z0-9 ]+$/, message: 'STT명은 영문, 숫자, 공백만 입력가능합니다' },
          ]}
        >
          <Input placeholder="예: STT_Main" maxLength={100} disabled={isEditMode} />
        </Form.Item>

        {/* 4. IP:Port */}
        <div className="text-[12px] font-semibold text-gray-600 border-b border-gray-200 pb-1 mb-2 mt-3">IP:Port</div>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="sttIp"
              label="IP"
              required
              rules={[
                { required: true, message: 'STT IP는 필수입니다' },
                { max: 64, message: 'STT IP는 64자까지 입력가능합니다' },
                { pattern: /^[0-9.]+$/, message: 'STT IP의 IP 형식이 올바르지 않습니다' },
              ]}
            >
              <Input placeholder="예: 192.168.0.10" maxLength={64} />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              name="sttPort"
              label="PORT"
              required
              rules={[
                { required: true, type: 'number', message: 'STT PORT는 필수입니다' },
                { type: 'number', min: 0, max: 65534, message: 'PORT는 최대 65534 입니다' },
              ]}
            >
              <InputNumber min={0} max={65534} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        {/* 5. IP:Port(BACKUP) */}
        <div className="text-[12px] font-semibold text-gray-600 border-b border-gray-200 pb-1 mb-2 mt-3">IP:Port (BACKUP)</div>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="sttBackupIp"
              label="IP"
              rules={[
                { max: 64, message: 'STT IP(BACKUP)는 64자까지 입력가능합니다' },
                { pattern: /^[0-9.]*$/, message: 'STT IP(BACKUP)의 IP 형식이 올바르지 않습니다' },
              ]}
            >
              <Input maxLength={64} />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="sttBackupPort" label="PORT" rules={[{ type: 'number', min: 0, max: 65534, message: 'PORT(BACKUP)는 최대 65534 입니다' }]}>
              <InputNumber min={0} max={65534} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        {/* 6. Grammar Path — AS-IS dlg_label_required */}
        <Form.Item
          name="sttGrammarPath"
          label="Grammar Path"
          required
          rules={[
            { required: true, message: 'Grammar Path는 필수입니다' },
            { max: 64, message: 'Grammar Path는 64자까지 입력가능합니다' },
          ]}
        >
          <Input maxLength={64} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

SttMasterSheet.displayName = 'SttMasterSheet';
export default SttMasterSheet;
