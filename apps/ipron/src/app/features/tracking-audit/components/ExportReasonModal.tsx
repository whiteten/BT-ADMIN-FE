/**
 * 트래킹 검색 결과 엑셀 다운로드 — 사유 입력 모달.
 *
 * 다운로드 사유 필수 (5~500자). 다운로드 완료 시 BE 가 audit 자동 기록.
 */
import { useState } from 'react';
import { Form, Input, Modal } from 'antd';
import { toast } from '@/shared-util';
import { downloadBlob, trackingAuditApi } from '../api/trackingAuditApi';

interface Props {
  open: boolean;
  /** 현재 검색 조건 — BE TrackingExportRequest.criteria 와 동일 구조 (snake/camel JSON 그대로 전달). */
  criteria: Record<string, unknown> | null;
  /** 화면에 보여줄 결과 건수 (참고용). */
  resultCount: number;
  onClose: () => void;
}

const { TextArea } = Input;

export default function ExportReasonModal({ open, criteria, resultCount, onClose }: Props) {
  const [form] = Form.useForm<{ reason: string }>();
  const [busy, setBusy] = useState(false);

  const handleOk = async () => {
    if (!criteria) {
      toast.warning('먼저 검색을 수행하세요');
      return;
    }
    try {
      const { reason } = await form.validateFields();
      setBusy(true);
      const { blob, filename } = await trackingAuditApi.exportXlsx({ criteria, reason: reason.trim() });
      downloadBlob(blob, filename);
      toast.success('다운로드 완료 — 사유와 함께 조회이력에 기록되었습니다');
      form.resetFields();
      onClose();
    } catch (e) {
      if (e instanceof Error) toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="검색 결과 엑셀 다운로드"
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={handleOk}
      okText="다운로드"
      cancelText="취소"
      confirmLoading={busy}
      destroyOnHidden
    >
      <div className="text-[13px] text-gray-600 mb-3">
        현재 검색 조건의 결과를 엑셀(.xlsx)로 다운로드합니다.
        <br />
        대상 건수: <b>{resultCount.toLocaleString()}</b>건 (최대 10,000건까지)
      </div>
      <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
        ⚠ 다운로드 사유는 조회이력에 영구 보관되며, 관리자가 감사 목적으로 열람할 수 있습니다.
      </div>
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="reason"
          label="다운로드 사유"
          rules={[
            { required: true, message: '사유를 입력하세요' },
            { min: 5, message: '5자 이상 입력하세요' },
            { max: 500, message: '500자 이내로 입력하세요' },
          ]}
        >
          <TextArea autoFocus rows={4} placeholder="예: 2026-06-15 VOC 분석을 위한 콜 추출" maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
