import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Col, Drawer, Form, type FormProps, Input, InputNumber, Row, Select, Transfer, type TransferProps } from 'antd';
import { uniq } from 'lodash';
import { MinusCircle, Plus } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGenerateSentence, useGetAoeAgents, useGetModel } from '../hooks/useModelQueries';
import type { GenerateSentenceFormDatas } from '../types/aoe';

/**
 * IntentSentenceAutoGenDrawer ref 타입
 */
export interface IntentSentenceAutoGenDrawerRef {
  open: (params: { modelId: string; intentId?: string }) => void;
  close: () => void;
}

/**
 * IntentSentenceAutoGenDrawer props 타입
 */
export interface IntentSentenceAutoGenDrawerProps<TExtra = Record<string, unknown>> {
  onAdd?: (params: { modelId: string; sentences: string[]; extraData?: TExtra }) => void;
  isAdding?: boolean;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  modelId: string;
  tenantId: number | null;
  intentId: string | null;
}

/**
 * Transfer 아이템 타입
 */
interface TransferItem {
  key: string;
  sentence: string;
}

/**
 * 학습문장 자동생성 Drawer
 * - ref.open({ modelId }) : 드로어 열기
 * - ref.close() : 드로어 닫기
 */
const IntentSentenceAutoGenDrawer = forwardRef<IntentSentenceAutoGenDrawerRef, IntentSentenceAutoGenDrawerProps>(({ onAdd, isAdding }, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    modelId: '',
    tenantId: null,
    intentId: null,
  });

  const { open } = drawerState;

  // Transfer 상태
  const [dataSource, setDataSource] = useState<TransferItem[]>([]);
  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>([]);
  const [selectedKeys, setSelectedKeys] = useState<TransferProps['targetKeys']>([]);

  const [form] = Form.useForm();

  const { data: model, isLoading: isLoadingModel } = useGetModel({ params: { modelId: drawerState.modelId }, queryOptions: { enabled: !!open && !!drawerState.modelId } });
  const tenantId = useMemo(() => model?.tenantId ?? null, [model]);
  const { data: aoeAgents, isFetching: isFetchingAoeAgents } = useGetAoeAgents({ queryOptions: { enabled: !!open } });
  const { mutate: generateSentence, isPending: isGeneratingSentence } = useGenerateSentence({
    mutationOptions: {
      onSuccess: (data) => {
        Log.debug('Generated sentences:', data);
        const distinctSentences = uniq(data as string[]);
        Log.debug('Distinct Sentences:', distinctSentences);
        setDataSource(distinctSentences.map((sentence) => ({ key: sentence, sentence })));
      },
    },
  });
  const aoeAgentOptions = aoeAgents?.map((agent) => ({ label: agent.agentName, value: agent.agentId })) ?? [];

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        modelId: params.modelId,
        tenantId,
        intentId: params.intentId ?? null,
      });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const initTransfer = () => {
    setDataSource([]);
    setTargetKeys([]);
    setSelectedKeys([]);
  };

  // Drawer 열릴 때 초기화
  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ agentId: null, generationCount: 3, exampleSentence: [''] });
    initTransfer();
    return () => {
      Log.debug('Reset Form Fields');
      form.resetFields();
    };
  }, [form, open]);

  const onFinish: FormProps<GenerateSentenceFormDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    initTransfer();
    generateSentence({ params: { modelId: drawerState.modelId, agentId: values.agentId, intentId: drawerState.intentId }, data: { ...values, tenantId } });
  };

  const onFinishFailed: FormProps<GenerateSentenceFormDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  // Transfer 핸들러
  const handleTransferChange: TransferProps['onChange'] = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys);
  };

  const handleTransferSelectChange: TransferProps['onSelectChange'] = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  // 닫기 버튼
  const handleCloseBtn = () => {
    handleClose();
  };

  // Export 버튼 핸들러 (placeholder)
  const handleExport = () => {
    Log.debug('Export 버튼 클릭', targetKeys);
    // TODO: Export 기능 구현
  };

  // 추가 버튼 핸들러
  const handleAdd = () => {
    Log.debug('추가 버튼 클릭', targetKeys);
    if (!targetKeys?.length) {
      toast.warning('추가할 문장이 비어있습니다.\n문장 자동생성 후, 추가할 문장을 우측으로 이동해주세요.');
      return;
    }
    onAdd?.({ modelId: drawerState.modelId, sentences: targetKeys as string[] });
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleCloseBtn}>
        닫기
      </Button>
      <Button variant="solid" onClick={handleExport}>
        Export
      </Button>
      <Button variant="solid" type="primary" onClick={handleAdd} loading={isAdding}>
        추가
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="의도문장 자동생성" closable={{ placement: 'end' }} size={830} footer={footer} destroyOnHidden>
      <div className="flex flex-col gap-6">
        {/* 상단 Form 영역 */}
        <Form form={form} layout="vertical" initialValues={{ agentId: null, generationCount: 3, exampleSentence: [''] }} onFinish={onFinish} onFinishFailed={onFinishFailed}>
          <Row gutter={20}>
            <Col span={16}>
              <Form.Item name="agentId" label="LLM Agent" required hasFeedback rules={[{ required: true, message: 'Agent를 선택하세요.' }]}>
                <Select options={aoeAgentOptions} loading={isFetchingAoeAgents} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="Agent를 선택하세요." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="generationCount" label="생성 문장 수" required hasFeedback rules={[{ required: true, message: '생성 문장 수를 입력하세요.' }]}>
                <InputNumber min={1} className="!w-full" />
              </Form.Item>
            </Col>
          </Row>

          {/* 예시 문장 - Form.List 동적 필드 */}
          <Form.Item label="예시 문장" required>
            <Form.List name="exampleSentence">
              {(fields, { add, remove }) => (
                <div className="flex flex-col gap-2">
                  {fields.map(({ key, ...restField }) => (
                    <div key={key} className="flex gap-2">
                      <Form.Item {...restField} className="!mb-0 flex-1" required hasFeedback rules={[{ required: true, message: '예시 문장을 입력하세요.' }]}>
                        <Input placeholder="예시 문장을 입력하세요." />
                      </Form.Item>
                      {fields.length > 1 && <Button type="text" icon={<MinusCircle className="size-4" />} onClick={() => remove(restField.name)} className="!text-red-500" />}
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add('')} icon={<Plus className="size-4" />} className="!mt-2">
                    예시 문장 추가
                  </Button>
                </div>
              )}
            </Form.List>
          </Form.Item>

          {/* 학습문장 자동생성 버튼 */}
          <div className="flex justify-end">
            <Button variant="solid" color="cyan" htmlType="submit" loading={isLoadingModel || isFetchingAoeAgents || isGeneratingSentence}>
              문장 자동생성
            </Button>
          </div>
        </Form>

        {/* Transfer 영역 */}
        <div className="flex flex-col gap-2">
          <div className="flex">
            <span className="text-base text-[#495057] font-medium !w-[calc(50%+21px)]">생성된 문장</span>
            <span className="text-base text-[#495057] font-medium">추가할 문장</span>
          </div>

          <Transfer
            dataSource={dataSource}
            rowKey={(item) => item.key}
            targetKeys={targetKeys}
            selectedKeys={selectedKeys}
            onChange={handleTransferChange}
            onSelectChange={handleTransferSelectChange}
            render={(item) => item.sentence}
            filterOption={(input, option) => option.sentence?.toLowerCase().includes(input.toLowerCase())}
            classNames={{ section: '!w-full !h-[400px]' }}
            pagination={false}
            showSearch
            showSelectAll={true}
            locale={{
              notFoundContent: isGeneratingSentence ? '생성 중...' : '데이터가 없습니다.',
              searchPlaceholder: '검색어를 입력하세요.',
            }}
            selectAllLabels={[(info) => `전체선택 (총 ${info.totalCount}개)`, (info) => `전체선택 (총 ${info.totalCount}개)`]}
            className="[&_.ant-transfer-list-header_.ant-dropdown-trigger]:!hidden"
          />
        </div>
      </div>
    </Drawer>
  );
});

export default IntentSentenceAutoGenDrawer;
