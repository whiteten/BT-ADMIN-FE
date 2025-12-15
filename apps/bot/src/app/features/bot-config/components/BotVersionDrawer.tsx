import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { botQueryKeys, useCreateBotVersion, useDeleteBotVersion, useGetBotVersion, useUpdateBotVersion } from '../hooks/useBotQueries';
import type { BotVersionCreateDatas, BotVersionUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
/**
 * Bot 버전 등록/수정 Drawer
 * @param open - 드로어 열림 여부
 * @param onClose - 드로어 닫기 함수
 * @param serviceVer - 선택된 서비스 버전
 */
interface BotVersionDrawerProps {
  open: boolean;
  onClose: () => void;
  serviceId: string;
  serviceVer?: string;
}

export default function BotVersionDrawer({ open, onClose, serviceId, serviceVer }: BotVersionDrawerProps) {
  const title = serviceVer ? '버전 수정' : '버전 추가';
  const [form] = Form.useForm();
  const { TextArea } = Input;
  const queryClient = useQueryClient();

  const { data: botVersion, isFetching } = useGetBotVersion({
    params: { serviceId, serviceVer },
    queryOptions: { enabled: !!serviceId && !!serviceVer && open },
  });

  const { mutate: createBotVersion, isPending: isCreating } = useCreateBotVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전이 추가되었습니다.');
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getBotVersions({ serviceId }).queryKey });
        onClose();
      },
    },
  });

  const { mutate: updateBotVersion, isPending: isUpdating } = useUpdateBotVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전이 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getBotVersions({ serviceId }).queryKey });
        onClose();
      },
    },
  });

  const { mutate: deleteBotVersion, isPending: isDeleting } = useDeleteBotVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getBotVersions({ serviceId }).queryKey });
        onClose();
      },
    },
  });

  useEffect(() => {
    if (!open) return;
    const { serviceVer = '', versionName = '', versionDesc = '' } = botVersion ?? {};
    form.setFieldsValue({ serviceVer, versionName, versionDesc });
    return () => {
      Log.debug('Reset Form Fields');
      form.resetFields();
    };
  }, [botVersion, form, open]);

  const onFinish: FormProps<BotVersionCreateDatas | BotVersionUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    if (serviceVer) {
      const { serviceVer: _, ...valuesOmitServiceVer } = values as BotVersionUpdateDatas;
      updateBotVersion({ params: { serviceId, serviceVer }, data: valuesOmitServiceVer as BotVersionUpdateDatas });
    } else {
      createBotVersion({ params: { serviceId }, data: values as BotVersionCreateDatas });
    }
  };

  const onFinishFailed: FormProps<BotVersionCreateDatas | BotVersionUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const handleDeleteBtn = () => {
    Log.debug('handleDeleteBtn');
    deleteBotVersion({ serviceId, serviceVer });
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={onClose}>
        취소
      </Button>
      {serviceVer && (
        <Button variant="solid" color="red" onClick={handleDeleteBtn} loading={isFetching || isUpdating || isDeleting}>
          삭제
        </Button>
      )}
      <Button variant="solid" type="primary" onClick={handleSubmitBtn} loading={isFetching || isCreating || isUpdating || isDeleting}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} title={title} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <Form form={form} initialValues={{ serviceVer: '', versionName: '', versionDesc: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
          <Row>
            <Col span={24}>
              <Form.Item
                name="serviceVer"
                label="버전"
                required
                hasFeedback
                rules={[
                  { required: true, message: '버전을 입력하세요.' },
                  { pattern: /^\d+\.\d+\.\d+$/, message: '버전 형식은 x.x.x (예: 1.0.0) 입니다.' },
                ]}
              >
                <Input placeholder="버전을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item name="versionName" label="버전명" required hasFeedback rules={[{ required: true, message: '작업자를 입력하세요.' }]}>
                <Input placeholder="버전명을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item name="versionDesc" label="변경내용">
                <TextArea rows={4} placeholder="변경 내용을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      )}
    </Drawer>
  );
}
