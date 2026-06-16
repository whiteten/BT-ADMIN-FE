/**
 * 마스킹 해지 요청 검토 Drawer
 *
 * 관리자가 PENDING 상태 요청을 열어, 유효 시간 조정 + 코멘트 입력 후
 * 승인 또는 반려한다. forwardRef + useImperativeHandle 패턴.
 *
 * 자기 승인 금지: requesterUserId === currentUserId 일 때 승인 버튼 비활성.
 */
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';

import { Button, Drawer, Form, Input, InputNumber } from 'antd';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';

import { toast } from '@/shared-util';
import { useApproveUnmask, useRejectUnmask } from '../hooks/useMaskUnmaskQueries';
import { type MaskUnmaskRequest, TARGET_TYPE_LABELS } from '../types';

export interface MaskUnmaskReviewDrawerRef {
  open: (request: MaskUnmaskRequest, maxHours?: number) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

interface FormValues {
  grantedHours: number;
  comment: string;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '-';
  const t = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - t) / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.round(h / 24)}일 전`;
}

const MaskUnmaskReviewDrawer = forwardRef<MaskUnmaskReviewDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [request, setRequest] = useState<MaskUnmaskRequest | null>(null);
  const [maxHoursLimit, setMaxHoursLimit] = useState<number>(24);

  // 현재 로그인 사용자 ID — 자기 승인 금지 체크
  const currentUserId = useAuthStore((s) => s.userInfo?.userId);

  useImperativeHandle(ref, () => ({
    open: (req: MaskUnmaskRequest, maxHours?: number) => {
      setRequest(req);
      setMaxHoursLimit(maxHours ?? 24);
      setVisible(true);
      form.setFieldsValue({
        grantedHours: req.requestedHours,
        comment: '',
      });
    },
    close: () => {
      setVisible(false);
      setRequest(null);
      form.resetFields();
    },
  }));

  const closeDrawer = useCallback(() => {
    setVisible(false);
    setRequest(null);
    form.resetFields();
  }, [form]);

  const { mutate: approveUnmask, isPending: isApproving } = useApproveUnmask({
    mutationOptions: {
      onSuccess: () => {
        toast.success('해지 요청이 승인되었습니다.');
        closeDrawer();
        onSuccess();
      },
    },
  });

  const { mutate: rejectUnmask, isPending: isRejecting } = useRejectUnmask({
    mutationOptions: {
      onSuccess: () => {
        toast.success('해지 요청이 반려되었습니다.');
        closeDrawer();
        onSuccess();
      },
    },
  });

  const isPending = isApproving || isRejecting;
  const isOwnRequest = currentUserId != null && request != null && request.requesterUserId === currentUserId;

  const handleApprove = useCallback(async () => {
    if (!request) return;
    if (isOwnRequest) {
      toast.error('본인이 요청한 건은 다른 승인자가 처리해야 합니다.');
      return;
    }
    try {
      const values = await form.validateFields(['grantedHours']);
      const comment = form.getFieldValue('comment') as string | undefined;
      approveUnmask({
        requestId: request.requestId,
        grantedHours: values.grantedHours,
        comment: comment || undefined,
      });
    } catch {
      /* validation 실패 */
    }
  }, [form, request, isOwnRequest, approveUnmask]);

  const handleReject = useCallback(async () => {
    if (!request) return;
    const comment = (form.getFieldValue('comment') as string | undefined)?.trim();
    if (!comment) {
      toast.error('반려 사유를 입력하세요.');
      return;
    }
    rejectUnmask({ requestId: request.requestId, comment });
  }, [form, request, rejectUnmask]);

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <span>해지 요청 검토</span>
          {request && <span className="text-[11px] text-gray-400 font-mono">REQ-#{request.requestId}</span>}
        </div>
      }
      closable={{ placement: 'end' }}
      open={visible}
      onClose={closeDrawer}
      styles={{ wrapper: { width: 480 } }}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={closeDrawer}>취소</Button>
          <Button danger onClick={handleReject} loading={isRejecting} disabled={isPending}>
            반려
          </Button>
          <Button
            type="primary"
            onClick={handleApprove}
            loading={isApproving}
            disabled={isPending || isOwnRequest}
            title={isOwnRequest ? '본인 요청은 승인할 수 없습니다' : undefined}
          >
            승인
          </Button>
        </div>
      }
    >
      {request && (
        <div className="space-y-4">
          {/* 요청 정보 */}
          <section>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">요청 정보</div>
            <div className="space-y-1 text-[12px]">
              <div className="flex justify-between">
                <span className="text-gray-500">요청자</span>
                <span className="text-gray-900 font-medium">
                  {request.requesterName ?? `User#${request.requesterUserId}`}
                  {request.requesterDept && <span className="text-[10px] text-gray-400 ml-1">{request.requesterDept}</span>}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">카테고리</span>
                <span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{request.category}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">대상</span>
                <span className="text-gray-900 font-mono text-[11px]">
                  {TARGET_TYPE_LABELS[request.targetType]} · {request.targetId}
                </span>
              </div>
              {request.fieldName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">필드</span>
                  <span className="text-gray-900 font-mono text-[11px]">{request.fieldName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">요청 시간</span>
                <span className="text-gray-900">{formatRelative(request.requestedAt)}</span>
              </div>
              {request.requesterIp && (
                <div className="flex justify-between">
                  <span className="text-gray-500">요청자 IP</span>
                  <span className="text-gray-900 font-mono text-[11px]">{request.requesterIp}</span>
                </div>
              )}
            </div>
          </section>

          {/* 사유 */}
          <section className="border-t border-gray-100 pt-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">사유 (요청자 입력)</div>
            <div className="text-[12px] text-gray-700 bg-gray-50 border border-gray-200 rounded p-3 leading-relaxed whitespace-pre-wrap">{request.reason}</div>
            <div className="text-[10px] text-gray-500 mt-1">{request.reason.length}자</div>
          </section>

          {/* 폼: 유효시간 + 코멘트 */}
          <Form form={form} layout="vertical" className="border-t border-gray-100 pt-3 space-y-2">
            <Form.Item
              name="grantedHours"
              label="유효 시간 (시간 단위)"
              required
              rules={[
                { required: true, message: '유효 시간은 필수입니다' },
                { type: 'number', min: 0.25, message: '0.25시간 이상이어야 합니다' },
              ]}
              tooltip={`카테고리 max: ${maxHoursLimit}시간 (초과 시 자동 clamp)`}
              className="!mb-2"
            >
              <InputNumber min={0.25} max={maxHoursLimit} step={0.25} className="!w-full" addonAfter="시간" />
            </Form.Item>
            <div className="text-[10px] text-gray-500 -mt-1">요청자 요청 시간: {request.requestedHours}시간</div>

            <Form.Item name="comment" label="처리 코멘트 (반려 시 필수)" rules={[{ max: 500, message: '500자 이내여야 합니다' }]} className="!mt-3">
              <Input.TextArea rows={3} maxLength={500} placeholder="승인/반려 사유를 입력하세요 (반려 시 필수)" showCount />
            </Form.Item>
          </Form>

          {isOwnRequest && (
            <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded p-2 flex items-start gap-1.5">
              <span>⚠</span>
              <span>본인이 요청한 건은 승인할 수 없습니다. 다른 승인자에게 요청하거나, 본인이 직접 취소(회수)하세요.</span>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
});

MaskUnmaskReviewDrawer.displayName = 'MaskUnmaskReviewDrawer';
export default MaskUnmaskReviewDrawer;
