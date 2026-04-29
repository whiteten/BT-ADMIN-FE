import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, Progress, Radio, Row, Select } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { botQueryKeys, useCreateBotVersion, useCreateBotVersionCopy, useDeleteBotVersion, useGetBotVersion, useGetBotVersions, useUpdateBotVersion } from '../hooks/useBotQueries';
import type { BotVersionCreateDatas, BotVersionUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export interface BotVersionDrawerRef {
  open: (params: { serviceId: string; serviceVer?: string }) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  serviceId: string;
  serviceVer?: string;
}

interface BotVersionCopyCompletedEvent {
  serviceId: string;
  serviceVer?: string;
  status: string;
  error?: string;
}

const BotVersionDrawer = forwardRef<BotVersionDrawerRef>((_, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    serviceId: '',
    serviceVer: undefined,
  });

  const { open, serviceId, serviceVer } = drawerState;
  const [createMode, setCreateMode] = useState<'new' | 'copy'>('new');
  const [isCopying, setIsCopying] = useState(false);
  const [copyProgress, setCopyProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const modal = useModal();

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        serviceId: params.serviceId,
        serviceVer: params.serviceVer,
      });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsCopying(false);
    setCopyProgress(0);
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

  const { mutate: createBotVersionCopy } = useCreateBotVersionCopy({
    mutationOptions: {
      onError: () => {
        setIsCopying(false);
        toast.error('버전 복사 요청에 실패했습니다.');
      },
    },
  });

  // 복사 요청 후 WS 이벤트 대기 — isCopying 중에만 리스닝
  useEffect(() => {
    console.log('[DEBUG] BotVersionDrawer WS useEffect 실행 — isCopying:', isCopying, 'serviceId:', serviceId);
    if (!isCopying) return;

    console.log('[DEBUG] BOT_VERSION_COPY_COMPLETED 리스너 등록 — serviceId:', serviceId);

    const handler = (e: Event) => {
      const { serviceId: wsServiceId, status, error } = (e as CustomEvent<BotVersionCopyCompletedEvent>).detail;
      console.log('[DEBUG] BOT_VERSION_COPY_COMPLETED 수신 — wsServiceId:', wsServiceId, 'status:', status, 'drawer serviceId:', serviceId);

      if (String(wsServiceId) !== String(serviceId)) {
        console.log('[DEBUG] serviceId 불일치로 무시');
        return;
      }

      setIsCopying(false);

      if (status === 'success') {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setCopyProgress(100);
        setTimeout(() => {
          toast.success('버전이 복사 생성되었습니다.');
          queryClient.invalidateQueries({ queryKey: botQueryKeys.getBotVersions({ serviceId }).queryKey });
          setIsCopying(false);
          handleClose();
        }, 600);
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        toast.error(error ?? '버전 복사에 실패했습니다.');
        setIsCopying(false);
        setCopyProgress(0);
      }
    };

    window.addEventListener('BOT_VERSION_COPY_COMPLETED', handler);
    return () => window.removeEventListener('BOT_VERSION_COPY_COMPLETED', handler);
  }, [isCopying, serviceId, queryClient]);

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

  const handleStartCopy = (values: BotVersionCreateDatas) => {
    setIsCopying(true);
    setCopyProgress(0);

    const startTime = Date.now();
    const PROGRESS_MAX_MS = 300_000;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setCopyProgress(Math.round(Math.min(95, (elapsed / PROGRESS_MAX_MS) * 100)));
    }, 500);

    createBotVersionCopy({ params: { serviceId }, data: values });
  };

  const onFinish: FormProps<BotVersionCreateDatas | BotVersionUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    if (serviceVer) {
      const { serviceVer: _, ...valuesOmitServiceVer } = values as BotVersionUpdateDatas;
      updateBotVersion({ params: { serviceId, serviceVer }, data: valuesOmitServiceVer as BotVersionUpdateDatas });
    } else if (createMode === 'copy') {
      handleStartCopy(values as BotVersionCreateDatas);
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
    <div className="flex flex-col gap-3">
      {isCopying && (
        <div>
          <p className="text-sm text-gray-500 mb-2">버전 복사 중입니다. 최대 5분 소요될 수 있습니다.</p>
          <Progress percent={copyProgress} status="active" strokeColor="#1677ff" />
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button variant="solid" onClick={handleClose} disabled={isCopying}>
          취소
        </Button>
        {serviceVer && (
          <Button variant="solid" color="red" onClick={handleDeleteBtn} loading={isLoading || isUpdating || isDeleting} disabled={isCopying}>
            삭제
          </Button>
        )}
        <Button variant="solid" type="primary" onClick={handleSubmitBtn} loading={isLoading || isCreating || isUpdating || isDeleting || isCopying}>
          저장
        </Button>
      </div>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title={title}
      closable={{ placement: 'end' }}
      size={480}
      footer={footer}
      destroyOnHidden
      maskClosable={!isCopying}
      keyboard={!isCopying}
    >
      <Form form={form} initialValues={{ serviceVer: '', versionName: '', versionDesc: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        {isLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <FallbackSpinner />
          </div>
        ) : (
          <>
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
