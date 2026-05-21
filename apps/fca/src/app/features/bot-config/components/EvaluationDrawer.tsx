import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, Radio, Row, Select } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { modelQueryKeys, useCopyEvaluation, useCreateEvaluation, useGetEvaluations } from '../hooks/useModelQueries';
import type { EvaluationCreateDatas } from '../types/evaluation';

/**
 * EvaluationDrawer ref 타입
 * @property open - 드로어를 여는 함수
 * @property close - 드로어를 닫는 함수
 */
export interface EvaluationDrawerRef {
  open: (params: { modelId: string }) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  modelId: string;
}

interface EvaluationFormValues {
  sourceEvalId?: string;
  evalName?: string;
}

/**
 * Evaluation 등록 Drawer
 * - ref.open({ modelId }) : 추가 모드로 열기
 * - ref.close() : 드로어 닫기
 */
const EvaluationDrawer = forwardRef<EvaluationDrawerRef>((_, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    modelId: '',
  });

  const { open, modelId } = drawerState;
  const [createMode, setCreateMode] = useState<'new' | 'copy'>('new');

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        modelId: params.modelId,
      });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const [form] = Form.useForm<EvaluationFormValues>();
  const queryClient = useQueryClient();

  const { data: evaluationList, isLoading: isLoadingEvaluations } = useGetEvaluations({
    params: { modelId },
    queryOptions: { enabled: open && createMode === 'copy' },
  });

  const { mutate: createEvaluation, isPending: isCreating } = useCreateEvaluation({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가가 추가되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEvaluations({ modelId }).queryKey });
        handleClose();
      },
    },
  });

  const { mutate: copyEvaluation, isPending: isCopying } = useCopyEvaluation({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가가 복사되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEvaluations({ modelId }).queryKey });
        handleClose();
      },
    },
  });

  useEffect(() => {
    if (!open) return;
    setCreateMode('new');
    form.setFieldsValue({ sourceEvalId: undefined, evalName: '' });
    return () => {
      Log.debug('Reset Form Fields');
      form.resetFields();
    };
  }, [form, open]);

  const onFinish: FormProps<EvaluationFormValues>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    if (createMode === 'copy') {
      const { sourceEvalId, evalName } = values;
      if (!sourceEvalId) return;
      const trimmedName = evalName?.trim();
      copyEvaluation({
        params: { modelId, evalId: sourceEvalId },
        data: trimmedName ? { evalName: trimmedName } : {},
      });
    } else {
      createEvaluation({ params: { modelId }, data: { evalName: values.evalName ?? '' } as EvaluationCreateDatas });
    }
  };

  const onFinishFailed: FormProps<EvaluationFormValues>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const isCopyMode = createMode === 'copy';

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={handleSubmitBtn} loading={isCreating || isCopying}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="평가 추가" closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} initialValues={{ evalName: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        <Row className="mb-4">
          <Col span={24}>
            <Radio.Group value={createMode} onChange={(e) => setCreateMode(e.target.value)}>
              <Radio value="new">신규생성</Radio>
              <Radio value="copy">복사생성</Radio>
            </Radio.Group>
          </Col>
        </Row>
        {isCopyMode && (
          <Row>
            <Col span={24}>
              <Form.Item name="sourceEvalId" label="복사할 평가셋" required rules={[{ required: true, message: '복사할 평가셋을 선택하세요.' }]}>
                <Select
                  placeholder="복사할 평가셋을 선택하세요."
                  options={evaluationList?.map((e) => ({
                    value: e.evalId,
                    label: e.evalName,
                  }))}
                  loading={isLoadingEvaluations}
                />
              </Form.Item>
            </Col>
          </Row>
        )}
        <Row>
          <Col span={24}>
            <Form.Item name="evalName" label="평가셋이름" required={!isCopyMode} hasFeedback rules={isCopyMode ? [] : [{ required: true, message: '평가셋이름을 입력하세요.' }]}>
              <Input placeholder={isCopyMode ? '비우면 자동 생성됩니다.' : '평가셋이름을 입력하세요.'} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

EvaluationDrawer.displayName = 'EvaluationDrawer';

export default EvaluationDrawer;
