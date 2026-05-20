/**
 * Media Server 등록/수정 Drawer (IPR20S6041).
 *
 * 시스템당 1건 — PK=systemId. 등록/수정을 PUT(UPSERT) 1개 엔드포인트로 통합.
 * AS-IS와 동일하게 ASR 사용 여부(asrUseYn)는 화면에 노출하지 않고 백엔드가 자동 '1'(ON)로 강제.
 *
 * forwardRef + useImperativeHandle 패턴.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Col, Drawer, Form, Input, InputNumber, Row } from 'antd';
import { toast } from '@/shared-util';
import { useDeleteMediaServer, useUpsertMediaServer } from '../hooks/useIvrMediaQueries';
import type { IrMediaServer, IrMediaServerUpsertRequest } from '../types/ivrMedia.types';

export interface MediaServerSheetRef {
  open: (systemId: number, systemName: string, data?: IrMediaServer | null) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const MediaServerSheet = forwardRef<MediaServerSheetRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [systemId, setSystemId] = useState<number | null>(null);
  const [systemName, setSystemName] = useState<string>('');
  const [editData, setEditData] = useState<IrMediaServer | null>(null);

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (sid: number, sname: string, data?: IrMediaServer | null) => {
      setSystemId(sid);
      setSystemName(sname);
      setEditData(data ?? null);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      setSystemId(null);
      setSystemName('');
      form.resetFields();
    },
  }));

  // ─── 초기값 세팅 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    if (editData) {
      form.setFieldsValue({
        speakerCnt: editData.speakerCnt,
        rtpIp: editData.rtpIp,
        rtpCodec: editData.rtpCodec,
        dtmfOption: editData.dtmfOption,
        asrIp: editData.asrIp,
        asrPort: editData.asrPort,
        asrBackupIp: editData.asrBackupIp,
        asrBackupPort: editData.asrBackupPort,
        grammarPath: editData.grammarPath,
      });
    } else {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: upsertMediaServer, isPending: isSaving } = useUpsertMediaServer({
    mutationOptions: {
      onSuccess: () => {
        toast.success(isEditMode ? 'Media Server가 수정되었습니다.' : 'Media Server가 등록되었습니다.');
        handleClose();
        onSuccess();
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '저장에 실패했습니다.');
      },
    },
  });

  const { mutate: deleteMediaServer, isPending: isDeleting } = useDeleteMediaServer({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Media Server가 삭제되었습니다.');
        handleClose();
        onSuccess();
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '삭제에 실패했습니다.');
      },
    },
  });

  const isPending = isSaving || isDeleting;

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (systemId === null) return;
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return; /* validation failed */
    }

    const payload: IrMediaServerUpsertRequest = {
      speakerCnt: values.speakerCnt as number,
      rtpIp: values.rtpIp as string,
      rtpCodec: values.rtpCodec as string,
      dtmfOption: values.dtmfOption as string,
      // asrUseYn 제거 — 백엔드가 항상 '1'(ON)로 자동 세팅 (AS-IS Hidden+강제 1 정책)
      asrIp: values.asrIp as string,
      asrPort: values.asrPort as number,
      asrBackupIp: values.asrBackupIp as string,
      asrBackupPort: values.asrBackupPort as number,
      grammarPath: values.grammarPath as string,
    };

    upsertMediaServer({ id: systemId, data: payload });
  }, [systemId, form, upsertMediaServer]);

  const handleDelete = useCallback(() => {
    if (!isEditMode || systemId === null) return;
    deleteMediaServer({ id: systemId });
  }, [isEditMode, systemId, deleteMediaServer]);

  const handleClose = () => {
    setVisible(false);
    setEditData(null);
    setSystemId(null);
    setSystemName('');
    form.resetFields();
  };

  return (
    <Drawer
      title={isEditMode ? 'Media Server 수정' : 'Media Server 등록'}
      open={visible}
      onClose={handleClose}
      styles={{ wrapper: { width: 480 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          {isEditMode && (
            <Button danger onClick={handleDelete} loading={isDeleting}>
              삭제
            </Button>
          )}
          <Button type="primary" onClick={handleSubmit} loading={isSaving} disabled={isPending}>
            {isEditMode ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          speakerCnt: 1,
          rtpCodec: '0 8',
          dtmfOption: '101',
          asrPort: 5060,
          asrBackupPort: 5060,
        }}
      >
        {/* ── 기본 정보 ── */}
        <Form.Item label="시스템ID" required>
          <Input value={systemName} disabled />
        </Form.Item>

        <Form.Item name="speakerCnt" label="성우 수" required rules={[{ required: true, type: 'number', min: 0, max: 3, message: '성우수는 최대 3 입니다' }]}>
          <InputNumber min={0} max={3} className="!w-full" />
        </Form.Item>

        {/* ── ASR 사용 ── */}
        <div className="text-[12px] font-semibold text-gray-600 border-b border-gray-200 pb-1 mb-2 mt-3">ASR 사용</div>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="asrIp"
              label="IP"
              required
              rules={[
                { required: true, message: 'ASR IP는 필수입니다' },
                { max: 64, message: 'ASR IP는 64자까지 입력가능합니다' },
                { pattern: /^[0-9.]+$/, message: 'ASR IP의 IP 형식이 올바르지 않습니다' },
              ]}
            >
              <Input maxLength={64} />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="asrPort" label="PORT" required rules={[{ required: true, type: 'number', min: 0, max: 65534, message: 'ASR PORT는 최대 65534 입니다' }]}>
              <InputNumber min={0} max={65534} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="asrBackupIp"
              label="BACKUP IP"
              required
              rules={[
                { required: true, message: 'ASR BACKUP IP는 필수입니다' },
                { max: 64, message: 'ASR BACKUP IP는 64자까지 입력가능합니다' },
                { pattern: /^[0-9.]+$/, message: 'ASR BACKUP IP의 IP 형식이 올바르지 않습니다' },
              ]}
            >
              <Input maxLength={64} />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="asrBackupPort" label="BACKUP PORT" required rules={[{ required: true, type: 'number', min: 0, message: 'ASR BACKUP PORT는 0 이상이어야 합니다' }]}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="grammarPath"
          label="Grammar Path"
          required
          rules={[
            { required: true, message: 'Grammar Path는 필수입니다' },
            { max: 128, message: 'Grammar Path는 128자까지 입력가능합니다' },
          ]}
        >
          <Input placeholder="예: /var/grammar" maxLength={128} />
        </Form.Item>

        {/* ── RTP 정보 ── */}
        <div className="text-[12px] font-semibold text-gray-600 border-b border-gray-200 pb-1 mb-2 mt-3">RTP 정보</div>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="rtpIp"
              label="IP"
              required
              rules={[
                { required: true, message: 'RTP IP는 필수입니다' },
                { max: 64, message: 'RTP IP는 64자까지 입력가능합니다' },
                { pattern: /^[0-9.]+$/, message: 'RTP IP의 IP 형식이 올바르지 않습니다' },
              ]}
            >
              <Input placeholder="예: 192.168.0.10" maxLength={64} />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              name="rtpCodec"
              label="CODEC"
              required
              rules={[
                { required: true, message: 'RTP 코덱은 필수입니다' },
                { max: 64, message: 'RTP 코덱은 64자까지 입력가능합니다' },
                { pattern: /^[a-zA-Z0-9 ]+$/, message: 'RTP 코덱은 영문, 숫자, 공백만 입력가능합니다' },
              ]}
            >
              <Input placeholder="예: 0 8" maxLength={64} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="dtmfOption"
          label="DTMF"
          required
          rules={[
            { required: true, message: 'DTMF는 필수입니다' },
            { max: 10, message: 'DTMF PayLoad는 10자까지 입력가능합니다' },
            { pattern: /^[0-9]+$/, message: 'DTMF는 숫자만 입력가능합니다' },
            {
              validator: (_, value) => {
                if (value === undefined || value === null || value === '') return Promise.resolve();
                const num = Number(value);
                if (Number.isNaN(num)) return Promise.resolve(); // pattern 룰이 잡음
                if (num < 96) return Promise.reject(new Error('DTMF는 최소 96 입니다'));
                if (num > 25534) return Promise.reject(new Error('DTMF는 최대 25534 입니다'));
                return Promise.resolve();
              },
            },
          ]}
        >
          {/* AS-IS 화면 maxlength=5 — JS length 10보다 strict한 화면 input 제약 반영 */}
          <Input placeholder="예: 101" maxLength={5} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

MediaServerSheet.displayName = 'MediaServerSheet';
export default MediaServerSheet;
