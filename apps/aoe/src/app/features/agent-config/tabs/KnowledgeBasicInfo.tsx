import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, InputNumber, Row, Select } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { knowledgeQueryKeys, useDeleteKnowledge, useGetKnowledge, useUpdateKnowledge } from '../hooks/useKnowledgeQueries';
import type { KnowledgeUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const SEARCH_TYPE_OPTIONS = [
  { label: '벡터 검색', value: '0' },
  { label: '하이브리드 검색', value: '1' },
];

interface FormValues {
  documentName: string;
  description?: string;
  enableHybridSearch: string;
  topK: number;
  denseWeight: number;
  bm25Weight: number;
}

export default function KnowledgeBasicInfo() {
  const { documentId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const modal = useModal();
  const [form] = Form.useForm<FormValues>();
  const [searchType, setSearchType] = useState<string>('0');

  const { data: knowledge, isLoading } = useGetKnowledge({ params: { documentId } });

  const { mutate: updateKnowledge, isPending: isUpdating } = useUpdateKnowledge({
    mutationOptions: {
      onSuccess: () => {
        toast.success('지식 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledge({ documentId }).queryKey });
      },
      onError: (error) => Log.warn('updateKnowledge failed', error),
    },
  });

  const { mutate: deleteKnowledge, isPending: isDeleting } = useDeleteKnowledge({
    mutationOptions: {
      onSuccess: () => {
        toast.success('지식이 삭제되었습니다.');
        navigate('../list');
      },
      onError: (error) => Log.warn('deleteKnowledge failed', error),
    },
  });

  useEffect(() => {
    if (!knowledge) return;
    const opt = knowledge.option;
    form.setFieldsValue({
      documentName: knowledge.documentName,
      description: knowledge.description,
      enableHybridSearch: opt?.enableHybridSearch ?? '0',
      topK: opt?.topK ?? 3,
      denseWeight: opt?.denseWeight ?? 0.0,
      bm25Weight: opt?.bm25Weight ?? 1.0,
    });
    setSearchType(opt?.enableHybridSearch ?? '0');
  }, [knowledge, form]);

  const onFinish: FormProps<FormValues>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    const data: KnowledgeUpdateDatas = {
      documentName: values.documentName,
      description: values.description,
      option: {
        enableHybridSearch: values.enableHybridSearch,
        topK: values.topK,
        ...(values.enableHybridSearch === '1' && {
          denseWeight: values.denseWeight,
          bm25Weight: values.bm25Weight,
        }),
      },
    };
    updateKnowledge({ params: { documentId: documentId! }, data });
  };

  const onFinishFailed: FormProps<FormValues>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleClickDeleteBtn = () => {
    modal.confirm.delete({
      onOk: () => deleteKnowledge(documentId!),
    });
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed}>
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="documentName" label="문서명" required rules={[{ required: true, message: '문서명을 입력해 주세요.' }]}>
                <Input placeholder="문서명을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="description" label="설명">
                <Input.TextArea placeholder="지식에 대한 설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 5 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="enableHybridSearch" label="검색 유형">
                <Select options={SEARCH_TYPE_OPTIONS} onChange={(val) => setSearchType(val)} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="topK" label="상위 K" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>
          {searchType === '1' && (
            <Row gutter={20}>
              <Col span={12}>
                <Form.Item name="denseWeight" label="Dense Weight">
                  <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="bm25Weight" label="BM25 Weight">
                  <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
                </Form.Item>
              </Col>
            </Row>
          )}
          <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
            <Col>
              <Button variant="solid" onClick={() => navigate('../list')}>
                취소
              </Button>
            </Col>
            <Col>
              <Button color="red" variant="solid" loading={isDeleting} onClick={handleClickDeleteBtn}>
                삭제
              </Button>
            </Col>
            <Col>
              <Button color="primary" variant="solid" htmlType="submit" loading={isUpdating}>
                저장
              </Button>
            </Col>
          </Row>
        </>
      )}
    </Form>
  );
}
