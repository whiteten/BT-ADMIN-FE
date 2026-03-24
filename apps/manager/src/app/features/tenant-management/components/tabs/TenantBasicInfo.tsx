import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Radio, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { tenantQueryKeys, useDeleteTenant, useGetTenant, useUpdateTenant } from '../../hooks/useTenantQueries';
import type { TenantUpdateData } from '../../types/tenant.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const PHONE_PATTERN = /^[0-9-]*$/;

export default function TenantBasicInfo() {
  const { tenantId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const modal = useModal();
  const [form] = Form.useForm();

  const { data: tenant, isFetching } = useGetTenant({ params: { id: tenantId } });

  const { mutate: updateTenant, isPending: isUpdating } = useUpdateTenant({
    mutationOptions: {
      onSuccess: () => {
        toast.success('기본 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.getTenant({ id: tenantId }).queryKey });
      },
    },
  });

  const { mutate: deleteTenant, isPending: isDeleting } = useDeleteTenant({
    mutationOptions: {
      onSuccess: () => {
        toast.success('테넌트가 비활성화되었습니다.');
        navigate('../list');
      },
    },
  });

  const onFinish: FormProps<TenantUpdateData>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateTenant({ id: Number(tenantId), data: values });
  };

  const onFinishFailed: FormProps<TenantUpdateData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleClickDeleteBtn = () => {
    modal.confirm.execute({
      options: {
        title: '비활성화 확인',
        content: `"${tenant?.tenantName}" 테넌트를 비활성화하시겠습니까?`,
      },
      onOk: () => deleteTenant({ id: tenantId }),
    });
  };

  useEffect(() => {
    if (!tenant) return;
    form.setFieldsValue({
      tenantName: tenant.tenantName,
      tenantAlias: tenant.tenantAlias,
      managerName: tenant.managerName,
      managerTelNo: tenant.managerTelNo,
      managerMobileNo: tenant.managerMobileNo,
      managerEmail: tenant.managerEmail,
      tntAddr1: tenant.tntAddr1,
      tntAddr2: tenant.tntAddr2,
      activeYn: tenant.activeYn,
    });
  }, [tenant, form]);

  return (
    <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={3}>
              <Form.Item label="테넌트 ID">
                <Input disabled value={tenantId} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="tenantName"
                label="테넌트명"
                required
                hasFeedback
                rules={[
                  { required: true, message: '테넌트명은 필수입니다.' },
                  { max: 30, message: '테넌트명은 30자 이내여야 합니다.' },
                ]}
              >
                <Input placeholder="테넌트명을 입력하세요." maxLength={30} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="tenantAlias"
                label="테넌트 별칭"
                required
                hasFeedback
                rules={[
                  { required: true, message: '테넌트 별칭은 필수입니다.' },
                  { max: 30, message: '테넌트 별칭은 30자 이내여야 합니다.' },
                ]}
              >
                <Input placeholder="별칭을 입력하세요." maxLength={30} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="managerName" label="담당자명" rules={[{ max: 30, message: '담당자명은 30자 이내여야 합니다.' }]}>
                <Input placeholder="담당자명을 입력하세요." maxLength={30} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="managerTelNo"
                label="연락처"
                rules={[
                  { max: 24, message: '연락처는 24자 이내여야 합니다.' },
                  { pattern: PHONE_PATTERN, message: '숫자와 하이픈(-)만 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="02-0000-0000" maxLength={24} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item
                name="managerMobileNo"
                label="핸드폰"
                rules={[
                  { max: 24, message: '핸드폰은 24자 이내여야 합니다.' },
                  { pattern: PHONE_PATTERN, message: '숫자와 하이픈(-)만 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="010-0000-0000" maxLength={24} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="managerEmail"
                label="이메일"
                rules={[
                  { max: 256, message: '이메일은 256자 이내여야 합니다.' },
                  { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
                ]}
              >
                <Input placeholder="user@example.com" maxLength={256} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="tntAddr1" label="주소" rules={[{ max: 256, message: '주소는 256자 이내여야 합니다.' }]}>
                <Input placeholder="주소 1" maxLength={256} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="tntAddr2" rules={[{ max: 256, message: '상세 주소는 256자 이내여야 합니다.' }]}>
                <Input placeholder="주소 2 (상세)" maxLength={256} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="activeYn" label="활성 여부">
                <Radio.Group>
                  <Radio value={1}>활성</Radio>
                  <Radio value={0}>비활성</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
            <Col>
              <Button variant="solid" onClick={() => navigate('../list')}>
                취소
              </Button>
            </Col>
            <Col>
              <Button color="red" variant="solid" loading={isDeleting} onClick={handleClickDeleteBtn}>
                비활성화
              </Button>
            </Col>
            <Col>
              <Button color="primary" variant="solid" htmlType="submit" loading={isUpdating || isDeleting}>
                저장
              </Button>
            </Col>
          </Row>
        </>
      )}
    </Form>
  );
}
