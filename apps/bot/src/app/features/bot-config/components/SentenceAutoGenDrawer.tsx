import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Col, Drawer, Form, type FormProps, Input, InputNumber, Row, Select, Transfer, type TransferProps } from 'antd';
import { MinusCircle, Plus } from 'lucide-react';
import { Log } from '@/log';
import { createUUID } from '@/shared-util';
import { type SentenceAutoGenFormDatas } from '../types/model';

/**
 * SentenceAutoGenDrawer ref 타입
 */
export interface SentenceAutoGenDrawerRef {
  open: (params: { modelId: string; intentId: string }) => void;
  close: () => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  modelId: string;
  intentId: string;
}

/**
 * Transfer 아이템 타입
 */
interface TransferItem {
  key: string;
  sentence: string;
}

/**
 * 샘플 LLM Agent 옵션
 */
const llmAgentOptions = [
  { label: 'gpt-agent-0.1', value: 'gpt-agent-0.1' },
  { label: 'gpt-agent-0.2', value: 'gpt-agent-0.2' },
  { label: 'gpt-agent-0.3', value: 'gpt-agent-0.3' },
];

/**
 * 학습문장 자동생성 Drawer
 * - ref.open({ modelId, intentId }) : 드로어 열기
 * - ref.close() : 드로어 닫기
 */
const SentenceAutoGenDrawer = forwardRef<SentenceAutoGenDrawerRef>((_, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    modelId: '',
    intentId: '',
  });

  const { open } = drawerState;

  // Transfer 상태
  const [dataSource, setDataSource] = useState<TransferItem[]>([]);
  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>([]);
  const [selectedKeys, setSelectedKeys] = useState<TransferProps['targetKeys']>([]);

  const [form] = Form.useForm();

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        modelId: params.modelId,
        intentId: params.intentId,
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
    form.setFieldsValue({
      llmAgent: 'gpt-agent-0.1',
      sentenceCount: 3,
      exampleSentences: [''],
    });
    initTransfer();
    return () => {
      Log.debug('Reset Form Fields');
      form.resetFields();
    };
  }, [form, open]);

  const onFinish: FormProps<SentenceAutoGenFormDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    initTransfer();
    // 생성 문장 수에 맞게 샘플 데이터 생성
    const count = values.sentenceCount || 3;
    const generatedSentences: TransferItem[] = Array.from({ length: count }, (_, i) => ({
      key: `${createUUID()}`,
      sentence: `샘플 생성 문장 ${i + 1}`,
    }));
    setDataSource(generatedSentences);
    // TODO: 학습문장 자동생성 API 연동
  };

  const onFinishFailed: FormProps<SentenceAutoGenFormDatas>['onFinishFailed'] = (errorInfo) => {
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

  // 추가 버튼 핸들러 (placeholder)
  const handleAdd = () => {
    Log.debug('추가 버튼 클릭', targetKeys);
    // TODO: 선택된 문장 추가 API 연동
    handleClose();
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleCloseBtn}>
        닫기
      </Button>
      <Button variant="solid" onClick={handleExport}>
        Export
      </Button>
      <Button variant="solid" type="primary" onClick={handleAdd}>
        추가
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="학습문장 자동생성" closable={{ placement: 'end' }} size={732} footer={footer} destroyOnHidden>
      <div className="flex flex-col gap-6">
        {/* 상단 Form 영역 */}
        <Form
          form={form}
          layout="vertical"
          initialValues={{ llmAgent: 'gpt-agent-0.1', sentenceCount: 3, exampleSentences: [''] }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        >
          <Row gutter={20}>
            <Col span={16}>
              <Form.Item name="llmAgent" label="LLM Agent" required hasFeedback rules={[{ required: true, message: 'LLM Agent를 선택하세요.' }]}>
                <Select options={llmAgentOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sentenceCount" label="생성 문장 수" required hasFeedback rules={[{ required: true, message: '생성 문장 수를 입력하세요.' }]}>
                <InputNumber min={1} max={20} className="!w-full" />
              </Form.Item>
            </Col>
          </Row>

          {/* 예시 문장 - Form.List 동적 필드 */}
          <Form.Item label="예시 문장" required>
            <Form.List name="exampleSentences">
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
            <Button variant="solid" color="cyan" htmlType="submit">
              학습문장 자동생성
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
              notFoundContent: '데이터가 없습니다.',
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

export default SentenceAutoGenDrawer;
