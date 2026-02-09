import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, Radio, Row, Select } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { botQueryKeys, useCreateBotVersion, useDeleteBotVersion, useGetBotVersion, useGetBotVersions, useUpdateBotVersion } from '../hooks/useBotQueries';
import type { BotVersionCreateDatas, BotVersionUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/**
 * BotVersionDrawer ref 타입
 * @property open - 드로어를 여는 함수. serviceVer가 없으면 추가 모드, 있으면 편집 모드
 * @property close - 드로어를 닫는 함수
 */
export interface BotVersionDrawerRef {
  open: (params: { serviceId: string; serviceVer?: string }) => void;
  close: () => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  serviceId: string;
  serviceVer?: string;
}

/**
 * Bot 버전 등록/수정 Drawer
 * - ref.open({ serviceId }) : 추가 모드로 열기
 * - ref.open({ serviceId, serviceVer }) : 편집 모드로 열기
 * - ref.close() : 드로어 닫기
 */
const BotVersionDrawer = forwardRef<BotVersionDrawerRef>((_, ref) => {
  // 드로어 상태 (open 여부, serviceId, serviceVer)
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    serviceId: '',
    serviceVer: undefined,
  });

  const { open, serviceId, serviceVer } = drawerState;

  // 생성 모드 상태 (신규생성/복사생성) - form 외부, UI 컨트롤용
  const [createMode, setCreateMode] = useState<'new' | 'copy'>('new');

  const modal = useModal();

  // 부모 컴포넌트에서 ref를 통해 호출할 수 있는 메서드 정의
  useImperativeHandle(ref, () => ({
    /**
     * 드로어 열기
     * @param params.serviceId - 서비스 ID (필수)
     * @param params.serviceVer - 서비스 버전 (선택, 없으면 추가 모드)
     */
    open: (params) => {
      setDrawerState({
        open: true,
        serviceId: params.serviceId,
        serviceVer: params.serviceVer,
      });
    },
    /**
     * 드로어 닫기
     */
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  // 드로어 닫기 핸들러 (내부용)
  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const title = serviceVer ? '버전 수정' : '버전 추가';
  const [form] = Form.useForm();
  const { TextArea } = Input;
  const queryClient = useQueryClient();

  const { data: botVersion, isLoading } = useGetBotVersion({
    params: { serviceId, serviceVer },
    queryOptions: { enabled: !!serviceId && !!serviceVer && open },
  });

  const { data: versionList, isLoading: isLoadingVersionList } = useGetBotVersions({
    params: { serviceId },
    queryOptions: { enabled: open && !serviceVer && createMode === 'copy' },
  });

  const { mutate: createBotVersion, isPending: isCreating } = useCreateBotVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전이 추가되었습니다.');
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getBotVersions({ serviceId }).queryKey });
        handleClose();
      },
    },
  });

  const { mutate: updateBotVersion, isPending: isUpdating } = useUpdateBotVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전이 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getBotVersions({ serviceId }).queryKey });
        handleClose();
      },
    },
  });

  const { mutate: deleteBotVersion, isPending: isDeleting } = useDeleteBotVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getBotVersions({ serviceId }).queryKey });
        handleClose();
      },
    },
  });

  useEffect(() => {
    if (!open) return;
    setCreateMode('new');
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
    modal.confirm.delete({
      onOk: () => deleteBotVersion({ serviceId, serviceVer }),
    });
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      {serviceVer && (
        <Button variant="solid" color="red" onClick={handleDeleteBtn} loading={isLoading || isUpdating || isDeleting}>
          삭제
        </Button>
      )}
      <Button variant="solid" type="primary" onClick={handleSubmitBtn} loading={isLoading || isCreating || isUpdating || isDeleting}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title={title} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} initialValues={{ serviceVer: '', versionName: '', versionDesc: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        {isLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <FallbackSpinner />
          </div>
        ) : (
          <>
            {/* 생성 모드일 때만 신규/복사 선택 라디오 표시 */}
            {!serviceVer && (
              <Row className="mb-4">
                <Col span={24}>
                  <Radio.Group value={createMode} onChange={(e) => setCreateMode(e.target.value)}>
                    <Radio value="new">신규생성</Radio>
                    <Radio value="copy">복사생성</Radio>
                  </Radio.Group>
                </Col>
              </Row>
            )}
            <Row>
              <Col span={24}>
                {!serviceVer && createMode === 'copy' && (
                  <Form.Item name="sourcever" label="복사할 버전" required rules={[{ required: true, message: '복사할 버전을 선택하세요.' }]}>
                    <Select
                      placeholder="복사할 버전을 선택하세요."
                      options={versionList?.map((v) => ({
                        value: v.serviceVer,
                        label: v.serviceVer,
                      }))}
                      loading={isLoadingVersionList}
                    />
                  </Form.Item>
                )}
              </Col>
            </Row>
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
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('sourcever') !== value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('복사할 버전과 새 버전은 같을 수 없습니다.'));
                      },
                    }),
                  ]}
                >
                  <Input placeholder="버전을 입력하세요." disabled={!!serviceVer} />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <Form.Item name="versionName" label="버전명" required hasFeedback rules={[{ required: true, message: '버전명을 입력하세요.' }]}>
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
          </>
        )}
      </Form>
    </Drawer>
  );
});

export default BotVersionDrawer;
