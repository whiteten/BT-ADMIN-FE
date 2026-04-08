import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Card, Col, Form, Input, InputNumber, Row, Select, Steps, Upload } from 'antd';
import { CloudUpload, FileText } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { usePreviewKnowledge } from '../../features/agent-config/hooks/useKnowledgeQueries';
import type { KnowledgeChunkData } from '../../features/agent-config/types';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/aoe/agent-config' },
  { title: '지식', path: '/aoe/agent-config/knowledge/list' },
  { title: '지식 추가', path: '/aoe/agent-config/knowledge/create' },
];

const ACCEPTED_EXTENSIONS = '.txt,.md,.mdx,.pdf,.html,.htm,.xlsx,.xls,.docx,.csv,.hwp,.hwpx';
const ACCEPTED_LABEL = 'TXT, MARKDOWN, MDX, PDF, HTML, XLSX, XLS, DOCX, CSV, MD, HTM, HWP, HWPX';
const MAX_SIZE_MB = 15;

const SEARCH_TYPE_OPTIONS = [
  { label: '벡터 검색', value: '0' },
  { label: '하이브리드 검색', value: '1' },
];

interface Step1FormValues {
  documentName: string;
  fileList: { originFileObj: File }[];
}

interface Step2FormValues {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  enableHybridSearch: string;
  denseWeight: number;
  bm25Weight: number;
}

export default function KnowledgeCreate() {
  const navigate = useNavigate();
  const [step1Form] = Form.useForm<Step1FormValues>();
  const [step2Form] = Form.useForm<Step2FormValues>();
  const [currentStep, setCurrentStep] = useState(0);
  const [searchType, setSearchType] = useState<string>('0');
  const [chunks, setChunks] = useState<KnowledgeChunkData[]>([]);

  const { mutate: previewKnowledge, isPending: isPreviewing } = usePreviewKnowledge({
    mutationOptions: {
      onSuccess: (data) => {
        setChunks(data ?? []);
        if (!data?.length) toast.warning('청크 데이터가 없습니다.');
      },
      onError: (error) => Log.warn('previewKnowledge failed', error),
    },
  });

  const steps = [{ title: '파일 업로드' }, { title: '텍스트 전처리 및 클렌징' }, { title: '실행 및 완료' }];

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await step1Form.validateFields(['documentName']);
        const fileList = step1Form.getFieldValue('fileList');
        if (!fileList?.length) {
          toast.warning('파일을 업로드해 주세요.');
          return;
        }
      }
      if (currentStep === 1) {
        await step2Form.validateFields();
      }
      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      Log.warn('step validation failed', error);
    }
  };

  const handlePreviewChunk = async () => {
    const values = step2Form.getFieldsValue();
    const fileList = step1Form.getFieldValue('fileList');
    const file = fileList?.[0]?.originFileObj as File | undefined;
    if (!file) {
      toast.warning('Step 1에서 파일을 먼저 업로드해 주세요.');
      return;
    }
    previewKnowledge({ chunkSize: values.chunkSize ?? 500, chunkOverlap: values.chunkOverlap ?? 50, file });
  };

  const handleSubmit = () => {
    const step1Values = step1Form.getFieldsValue();
    const step2Values = step2Form.getFieldsValue();
    const files = (step1Values.fileList ?? []).map((f) => f.originFileObj);
    if (!files.length) {
      toast.warning('파일을 업로드해 주세요.');
      return;
    }
    Log.debug('[KnowledgeCreate] submit', { step2Values, files });
    // TODO: API 연동
    toast.success('지식이 추가되었습니다.');
    navigate('../list');
  };

  function renderStep1() {
    return (
      <Form form={step1Form} layout="vertical" className="max-w-2xl">
        <Form.Item name="documentName" label="문서 그룹명" required rules={[{ required: true, message: '문서 그룹명을 입력해 주세요.' }]}>
          <Input placeholder="문서 이름을 입력하세요" />
        </Form.Item>
        <Form.Item name="fileList" label="파일 업로드" valuePropName="fileList" getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}>
          <Upload.Dragger
            accept={ACCEPTED_EXTENSIONS}
            multiple
            beforeUpload={(file) => {
              const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
              const allowed = ACCEPTED_EXTENSIONS.replace(/\./g, '').split(',');
              if (!allowed.includes(ext)) {
                toast.warning(`지원하지 않는 파일 형식입니다.`);
                return Upload.LIST_IGNORE;
              }
              if (file.size / 1024 / 1024 >= MAX_SIZE_MB) {
                toast.warning(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`);
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
          >
            <div className="flex flex-col items-center gap-2 py-4">
              <CloudUpload className="size-8 text-gray-400" />
              <p className="text-sm text-gray-600">
                파일을 끌어다 놓거나 <span className="text-[var(--color-bt-primary)] cursor-pointer">찾아보기</span>
              </p>
              <p className="text-xs text-gray-400">
                {ACCEPTED_LABEL}(등) 지원합니다. 파일당 최대 크기는 {MAX_SIZE_MB}MB입니다.
              </p>
            </div>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    );
  }

  function renderStep2() {
    return (
      <div className="flex gap-4 h-full min-h-0">
        {/* 왼쪽: 설정 패널 */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto">
          {/* 문서 정보 */}
          <Card title="설정" size="small">
            <Form form={step2Form} layout="vertical" initialValues={{ chunkSize: 500, chunkOverlap: 50, topK: 3, enableHybridSearch: '0', denseWeight: 0.0, bm25Weight: 1.0 }}>
              {/* 청크 설정 */}
              <div className="text-sm font-semibold text-gray-700 mb-3 mt-1">청크 설정</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="chunkSize" label="최대 청크 길이" rules={[{ required: true }]}>
                    <InputNumber className="w-full" min={1} max={10000} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="chunkOverlap" label="청크 중첩" rules={[{ required: true }]}>
                    <InputNumber className="w-full" min={0} />
                  </Form.Item>
                </Col>
              </Row>
              <Button variant="outlined" className="w-full" onClick={handlePreviewChunk} loading={isPreviewing}>
                프리뷰 청크
              </Button>

              {/* 검색 설정 */}
              <div className="text-sm font-semibold text-gray-700 mb-3 mt-5">검색 설정</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="enableHybridSearch" label="검색 유형">
                    <Select options={SEARCH_TYPE_OPTIONS} onChange={(val) => setSearchType(val)} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="topK" label="상위 K" rules={[{ required: true }]}>
                    <InputNumber className="w-full" min={1} />
                  </Form.Item>
                </Col>
              </Row>
              {searchType === '1' && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="denseWeight" label="Dense Weight">
                      <InputNumber className="w-full" min={0} max={1} step={0.1} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="bm25Weight" label="BM25 Weight">
                      <InputNumber className="w-full" min={0} max={1} step={0.1} />
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </Form>
          </Card>
        </div>

        {/* 오른쪽: 미리보기 패널 */}
        <div className="w-[420px] min-w-[420px] flex flex-col border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">미리보기</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {chunks.length === 0 ? (
              <NoData message="청크 데이터가 없습니다." iconSize={32} fontSize="text-sm" gap={1} />
            ) : (
              <div className="flex flex-col gap-3">
                {chunks.map((chunk) => (
                  <div key={chunk.id} className="border border-gray-200 rounded-md p-3 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="size-4 text-blue-500 shrink-0" />
                      <span className="text-xs text-gray-500 font-medium">Chunk {chunk.id}</span>
                      <span className="ml-auto text-xs text-gray-400">{chunk.characters}자</span>
                    </div>
                    <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap line-clamp-6">{chunk.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderStep3() {
    const step1Values = step1Form.getFieldsValue();
    const step2Values = step2Form.getFieldsValue();
    const fileList = step1Values.fileList ?? [];
    const searchLabel = SEARCH_TYPE_OPTIONS.find((o) => o.value === step2Values.enableHybridSearch)?.label ?? '-';

    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-gray-500">아래 설정을 확인하고 실행 버튼을 눌러 지식을 생성합니다.</p>
        <div className="bg-gray-50 rounded-lg p-5 space-y-3 text-sm">
          <div className="flex gap-2">
            <span className="w-36 text-gray-500 shrink-0">문서 그룹명</span>
            <span className="font-medium">{step1Values.documentName ?? '-'}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-36 text-gray-500 shrink-0">업로드 파일</span>
            <span>{fileList.length > 0 ? `${fileList.length}개` : '-'}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-36 text-gray-500 shrink-0">최대 청크 길이</span>
            <span>{step2Values.chunkSize}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-36 text-gray-500 shrink-0">청크 중첩</span>
            <span>{step2Values.chunkOverlap}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-36 text-gray-500 shrink-0">검색 유형</span>
            <span>{searchLabel}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-36 text-gray-500 shrink-0">상위 K</span>
            <span>{step2Values.topK}</span>
          </div>
          {step2Values.enableHybridSearch === '1' && (
            <>
              <div className="flex gap-2">
                <span className="w-36 text-gray-500 shrink-0">Dense Weight</span>
                <span>{step2Values.denseWeight}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-36 text-gray-500 shrink-0">BM25 Weight</span>
                <span>{step2Values.bm25Weight}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate('../list')}>
            취소
          </Button>
        </Col>
        {currentStep > 0 && (
          <Col>
            <Button variant="solid" onClick={() => setCurrentStep((prev) => prev - 1)}>
              이전
            </Button>
          </Col>
        )}
        {currentStep < steps.length - 1 && (
          <Col>
            <Button color="primary" variant="solid" onClick={handleNext}>
              다음
            </Button>
          </Col>
        )}
        {currentStep === steps.length - 1 && (
          <Col>
            <Button color="primary" variant="solid" onClick={handleSubmit}>
              실행
            </Button>
          </Col>
        )}
      </Row>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps current={currentStep} items={steps.map((step) => ({ title: step.title }))} size="small" style={{ width: `${steps.length * 250}px` }} responsive={false} />
      </div>
      <div className="w-full flex-1 min-h-0 bg-white bt-shadow flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto p-7 pb-0">
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>{renderStep1()}</div>
          <div style={{ display: currentStep === 1 ? 'flex' : 'none' }} className="h-full">
            {renderStep2()}
          </div>
          <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>{renderStep3()}</div>
        </div>
        <div className="w-full px-7 pb-7 pt-4">{renderFooter()}</div>
      </div>
    </div>
  );
}
