import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, DatePicker, Drawer, Form, type FormProps, Radio, Row, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { toast } from '@/shared-util';
import { retryReqApi } from '../api/retryReqApi';
import { retryReqQueryKeys, useCreateRetryReq } from '../hooks/useRetryReqQueries';

export interface RetryReqDrawerRef {
  open: () => void;
  close: () => void;
}

interface RetryReqFormValues {
  retryDate: Dayjs;
  retryType: 1 | 2;
  distributeDate: Dayjs;
  distributeTime: Dayjs;
}

const RetryReqDrawer = forwardRef<RetryReqDrawerRef>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<RetryReqFormValues>();
  const retryType = Form.useWatch('retryType', form);
  const queryClient = useQueryClient();

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  const handleClose = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ retryDate: dayjs(), retryType: 1, distributeDate: dayjs(), distributeTime: dayjs() });
    return () => {
      form.resetFields();
    };
  }, [form, open]);

  const { mutate: createRetryReq, isPending } = useCreateRetryReq({
    mutationOptions: {
      onSuccess: () => {
        toast.success('등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: retryReqQueryKeys.getRetryReqList._def });
        queryClient.invalidateQueries({ queryKey: retryReqQueryKeys.getRetryReqTree.queryKey });
        handleClose();
      },
      onError: () => toast.error('등록에 실패했습니다.'),
    },
  });

  const onFinish: FormProps<RetryReqFormValues>['onFinish'] = async (values) => {
    if (!values.retryDate.isBefore(dayjs(), 'day')) {
      toast.warning('대상 일자는 오늘 이전 날짜로 선택해주세요.');
      return;
    }

    if (values.retryType === 2) {
      const scheduledAt = values.distributeDate.hour(values.distributeTime.hour()).minute(values.distributeTime.minute()).second(0);
      if (!scheduledAt.isAfter(dayjs())) {
        toast.warning('예약 일시는 현재 시간 이후로 설정해주세요.');
        return;
      }
    }

    const retryDateStr = values.retryDate.format('YYYYMMDD');
    const existing = await queryClient.fetchQuery({
      queryKey: retryReqQueryKeys.getRetryReqList({ retryDate: retryDateStr }).queryKey,
      queryFn: () => retryReqApi.getRetryReqList({ retryDate: retryDateStr }),
    });
    if (existing.length > 0) {
      toast.warning('이미 등록된 대상일자가 존재합니다.');
      return;
    }

    const retryTime = `${values.distributeDate.format('YYYYMMDD')}${values.distributeTime.format('HHmm')}`;

    createRetryReq({
      retryDate: retryDateStr,
      retryType: values.retryType,
      retryTime,
    });
  };

  const onFinishFailed: FormProps<RetryReqFormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  const isScheduled = retryType === 2;

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={() => form.submit()} loading={isPending}>
        추가
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="재처리 등록" closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ retryType: 1, retryDate: dayjs(), distributeDate: dayjs(), distributeTime: dayjs() }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
      >
        <Row>
          <Col span={24}>
            <Form.Item name="retryDate" label="대상 일자" required hasFeedback rules={[{ required: true, message: '대상일자를 선택해주세요.' }]}>
              <DatePicker format="YYYY-MM-DD" allowClear={false} inputReadOnly style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row>
          <Col span={24}>
            <Form.Item name="retryType" label="재처리 구분" required rules={[{ required: true }]} style={{ marginBottom: 8 }}>
              <Radio.Group>
                <Radio value={1}>실시간</Radio>
                <Radio value={2}>예약</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col flex={1}>
            <Form.Item name="distributeDate" rules={[{ required: isScheduled, message: '날짜를 선택해주세요.' }]}>
              <DatePicker format="YYYY-MM-DD" disabled={!isScheduled} allowClear={false} inputReadOnly style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col style={{ width: 120 }}>
            <Form.Item name="distributeTime" rules={[{ required: isScheduled, message: '시간을 선택해주세요.' }]}>
              <TimePicker format="HH:mm" disabled={!isScheduled} allowClear={false} inputReadOnly needConfirm={false} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

RetryReqDrawer.displayName = 'RetryReqDrawer';
export default RetryReqDrawer;
