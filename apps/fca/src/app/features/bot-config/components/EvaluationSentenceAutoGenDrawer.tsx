import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, Col, Drawer, Form, type FormProps, Input, InputNumber, Modal, Row, Select, Transfer, type TransferProps } from 'antd';
import dayjs from 'dayjs';
import { uniq } from 'lodash';
import { MinusCircle, Plus } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGenerateExcel, useGenerateSentence, useGetAoeAgents, useGetIntentSentences, useGetIntents, useGetModel } from '../hooks/useModelQueries';
import { AgentType, type GenerateSentenceFormDatas } from '../types/aoe';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

/**
 * EvaluationSentenceAutoGenDrawer ref 타입
 */
export interface EvaluationSentenceAutoGenDrawerRef {
  open: (params: { modelId: string }) => void;
  close: () => void;
}

/**
 * EvaluationSentenceAutoGenDrawer props 타입
 */
export interface EvaluationSentenceAutoGenDrawerProps {
  onAdd?: (params: { modelId: string; sentences: string[]; answer: string }) => void;
  isAdding?: boolean;
}

interface EvaluationSentenceAutoGenFormDatas extends GenerateSentenceFormDatas {
  intentId: string;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  modelId: string;
  tenantId: number | null;
}

/**
 * Transfer 아이템 타입
 */
interface TransferItem {
  key: string;
  sentence: string;
}

/**
 * 평가문장 자동생성 Drawer
 * - ref.open({ modelId }) : 드로어 열기
 * - ref.close() : 드로어 닫기
 */
const EvaluationSentenceAutoGenDrawer = forwardRef<EvaluationSentenceAutoGenDrawerRef, EvaluationSentenceAutoGenDrawerProps>(({ onAdd, isAdding }, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    modelId: '',
    tenantId: null,
  });

  const { open } = drawerState;

  // Transfer 상태
  const [dataSource, setDataSource] = useState<TransferItem[]>([]);
  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>([]);
  const [selectedKeys, setSelectedKeys] = useState<TransferProps['targetKeys']>([]);

  // 예시 문장 선택 모달 상태
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [selectedSentences, setSelectedSentences] = useState<string[]>([]);
  const addExampleSentenceRef = useRef<((value: string) => void) | null>(null);

  const [form] = Form.useForm();
  const watchedIntentId = Form.useWatch('intentId', form);

  const { data: model, isLoading: isLoadingModel } = useGetModel({ params: { modelId: drawerState.modelId }, queryOptions: { enabled: !!open && !!drawerState.modelId } });
  const tenantId = useMemo(() => model?.tenantId ?? null, [model]);
  const { data: aoeAgents, isFetching: isFetchingAoeAgents } = useGetAoeAgents({ params: { agentType: AgentType.EVAL_SET }, queryOptions: { enabled: !!open } });
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
  const { data: intentList, isFetching: isFetchingIntentList } = useGetIntents({
    params: { modelId: drawerState.modelId },
    queryOptions: { enabled: !!drawerState.modelId },
  });

  // 선택된 의도의 문장 목록 조회
  const { data: intentSentences, isFetching: isFetchingIntentSentences } = useGetIntentSentences({
    params: { modelId: drawerState.modelId, intentId: watchedIntentId },
    queryOptions: { enabled: isSelectModalOpen && !!drawerState.modelId && !!watchedIntentId },
  });

  const { mutate: generateExcel, isPending: isGeneratingExcel } = useGenerateExcel();

  const aoeAgentOptions = aoeAgents?.map((agent) => ({ label: agent.agentName, value: agent.agentId })) ?? [];
  const intentOptions = intentList?.map((intent) => ({ label: intent.intentName, value: intent.intentId })) ?? [];

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        modelId: params.modelId,
        tenantId,
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

  const onFinish: FormProps<EvaluationSentenceAutoGenFormDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    const { agentId, intentId, ...submitData } = values;
    initTransfer();
    generateSentence({ params: { modelId: drawerState.modelId, agentId, intentId }, data: { ...submitData, tenantId } });
  };

  const onFinishFailed: FormProps<EvaluationSentenceAutoGenFormDatas>['onFinishFailed'] = (errorInfo) => {
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
    if (!watchedIntentId) {
      toast.warning('정답 의도를 선택하세요.');
      return;
    }
    if (!targetKeys?.length) {
      toast.warning('추가할 문장이 비어있습니다.\n문장 자동생성 후, 추가할 문장을 우측으로 이동해주세요.');
      return;
    }
    const intentName = intentList?.find((intent) => intent.intentId === watchedIntentId)?.intentName ?? '';
    const values = targetKeys?.map((key) => [key as string, intentName as string]) ?? [];
    generateExcel({
      params: {},
      data: {
        fileName: `평가문장_자동생성_${dayjs().format('YYYYMMDD')}`,
        sheetName: '평가문장_자동생성',
        keys: ['평가문장', '정답의도'],
        values,
      },
    });
  };

  // 예시 문장 선택 모달 열기
  const handleOpenSelectModal = () => {
    if (!watchedIntentId) {
      toast.warning('먼저 정답 의도를 선택하세요.');
      return;
    }
    setSelectedSentences([]);
    setIsSelectModalOpen(true);
  };

  // 예시 문장 선택 모달 닫기
  const handleCloseSelectModal = () => {
    setIsSelectModalOpen(false);
    setSelectedSentences([]);
  };

  // 선택한 문장 확인 및 추가
  const handleConfirmSelectSentences = () => {
    if (selectedSentences.length === 0) {
      toast.warning('추가할 문장을 선택하세요.');
      return;
    }
    selectedSentences.forEach((sentence) => {
      addExampleSentenceRef.current?.(sentence);
    });
    handleCloseSelectModal();
  };

  // 추가 버튼 핸들러
  const handleAdd = () => {
    Log.debug('추가 버튼 클릭.', targetKeys);
    const { intentId } = form.getFieldsValue();
    if (!intentId) {
      toast.warning('정답 의도를 선택하세요.');
      return;
    }
    if (!targetKeys?.length) {
      toast.warning('추가할 문장이 비어있습니다.\n문장 자동생성 후, 추가할 문장을 우측으로 이동해주세요.');
      return;
    }
    const answer = intentList?.find((intent) => intent.intentId === intentId)?.intentName ?? '';
    onAdd?.({ modelId: drawerState.modelId, sentences: targetKeys as string[], answer });
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleCloseBtn}>
        닫기
      </Button>
      <Button variant="solid" onClick={handleExport} loading={isGeneratingExcel}>
        Export
      </Button>
      <Button variant="solid" type="primary" onClick={handleAdd} loading={isAdding}>
        추가
      </Button>
    </div>
  );

  return (
    <>
      <Drawer open={open} onClose={handleClose} title="평가문장 자동생성" closable={{ placement: 'end' }} size={830} footer={footer} destroyOnHidden>
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
            <Row gutter={20}>
              <Col span={24}>
                <Form.Item name="intentId" label="정답 의도" required hasFeedback rules={[{ required: true, message: '정답 의도를 선택하세요.' }]}>
                  <Select options={intentOptions} loading={isFetchingIntentList} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="정답 의도를 선택하세요." />
                </Form.Item>
              </Col>
            </Row>

            {/* 예시 문장 - Form.List 동적 필드 */}
            <Form.Item label="예시 문장" required>
              <Form.List name="exampleSentence">
                {(fields, { add, remove }) => {
                  // add 함수 참조 저장
                  addExampleSentenceRef.current = add;

                  return (
                    <div className="flex flex-col gap-2">
                      {fields.map(({ key, ...restField }) => (
                        <div key={key} className="flex gap-2">
                          <Form.Item {...restField} className="!mb-0 flex-1" required hasFeedback rules={[{ required: true, message: '예시 문장을 입력하세요.' }]}>
                            <Input placeholder="예시 문장을 입력하세요." />
                          </Form.Item>
                          {fields.length > 1 && <Button type="text" icon={<MinusCircle className="size-4" />} onClick={() => remove(restField.name)} className="!text-red-500" />}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Button type="dashed" onClick={() => add('')} icon={<Plus className="size-4" />} className="!mt-2">
                          예시 문장 추가 (직접 입력)
                        </Button>
                        <Button type="dashed" onClick={handleOpenSelectModal} icon={<Plus className="size-4" />} className="!mt-2">
                          예시 문장 추가 (선택한 정답 의도 문장에서 선택)
                        </Button>
                      </div>
                    </div>
                  );
                }}
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

      {/* 의도 문장 선택 모달 */}
      <Modal
        title="예시 문장 선택하여 추가"
        open={isSelectModalOpen}
        onCancel={handleCloseSelectModal}
        onOk={handleConfirmSelectSentences}
        okText="예시 문장 추가"
        cancelText="닫기"
        width={600}
        centered
        destroyOnHidden
      >
        {isFetchingIntentSentences ? (
          <div className="flex justify-center py-8">
            <FallbackSpinner />
          </div>
        ) : intentSentences?.length === 0 ? (
          <div className="py-8 text-center text-gray-500">해당 의도에 등록된 문장이 없습니다.</div>
        ) : (
          <div className="flex flex-col gap-2">
            <Checkbox
              indeterminate={selectedSentences.length > 0 && selectedSentences.length < (intentSentences?.length ?? 0)}
              checked={selectedSentences.length === intentSentences?.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedSentences(intentSentences?.map((item) => item.sentence) ?? []);
                } else {
                  setSelectedSentences([]);
                }
              }}
            >
              모두 선택
            </Checkbox>
            <div className="max-h-[350px] overflow-y-auto border-t pt-2">
              <Checkbox.Group value={selectedSentences} onChange={(values) => setSelectedSentences(values as string[])} className="flex w-full flex-col gap-2">
                {intentSentences?.map((item) => (
                  <Checkbox key={item.sentenceId} value={item.sentence} className="!ml-0">
                    {item.sentence}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
});

export default EvaluationSentenceAutoGenDrawer;
