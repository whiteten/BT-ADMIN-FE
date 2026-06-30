import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Card, Col, Form, Input, InputNumber, Row, Select, Steps, Upload } from 'antd';
import { Blocks, ChevronDown, ChevronUp, ClipboardCheck, CloudUpload, FileText, type LucideIcon, Search } from 'lucide-react';
import { Log } from '@/log';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { AOE_PERM } from '../../constants/permissions';
import { usePreviewKnowledge, useProcessKnowledge } from '../../features/agent-config/hooks/useKnowledgeQueries';
import type { KnowledgeChunkData } from '../../features/agent-config/types';
import NoData from '@/components/custom/NoData';

/** Step3 요약 그룹 — 그룹 라벨 + 항목 목록 */
function ReviewGroup({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="px-5 py-4">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-[#888B9A]">
        <Icon className="size-3.5 text-[var(--color-bt-primary)]" />
        {title}
      </div>
      <dl className="flex flex-col gap-2.5">{children}</dl>
    </section>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <dt className="w-28 shrink-0 text-[#888B9A]">{label}</dt>
      <dd className={`min-w-0 break-words text-[#495057] ${strong ? 'font-semibold' : ''}`}>{value}</dd>
    </div>
  );
}

function ChunkCard({ chunk }: { chunk: KnowledgeChunkData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (el) setIsClamped(el.scrollHeight > el.clientHeight);
  }, [chunk.content]);

  return (
    <div className="border border-gray-200 rounded-md p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="size-4 text-[var(--color-bt-primary)] shrink-0" />
        <span className="text-xs text-gray-500 font-medium">Chunk {chunk.id}</span>
        <span className="ml-auto text-xs text-gray-400">{chunk.characters}자</span>
      </div>
      <p ref={contentRef} className={`text-gray-600 text-xs leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-6'}`}>
        {chunk.content}
      </p>
      {(isClamped || isExpanded) && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="size-3" />
              접기
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />더 보기
            </>
          )}
        </button>
      )}
    </div>
  );
}

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'AOE 관리', path: '/aoe/agent-config' },
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
  description?: string;
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
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const canWrite = useNavigationStore((s) => s.permissions.includes(AOE_PERM.KNOWLEDGE_WRITE));
  const [step1Form] = Form.useForm<Step1FormValues>();
  const [step2Form] = Form.useForm<Step2FormValues>();
  const [currentStep, setCurrentStep] = useState(0);
  const [searchType, setSearchType] = useState<string>('0');
  const [chunks, setChunks] = useState<KnowledgeChunkData[]>([]);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { mutate: previewKnowledge, isPending: isPreviewing } = usePreviewKnowledge({
    mutationOptions: {
      onSuccess: (data) => {
        setChunks(data);
        if (!data.length) toast.warning('청크 데이터가 없습니다.');
      },
      onError: (error) => Log.warn('previewKnowledge failed', error),
    },
  });

  const { mutate: processKnowledge, isPending: isProcessing } = useProcessKnowledge({
    mutationOptions: {
      onSuccess: () => {
        toast.success('지식이 추가되었습니다.');
        navigate('../list');
      },
      onError: (error) => {
        Log.warn('processKnowledge failed', error);
        toast.error('지식 추가에 실패했습니다.');
      },
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
    processKnowledge({
      documentName: step1Values.documentName,
      description: step1Values.description,
      chunkSize: step2Values.chunkSize ?? 500,
      chunkOverlap: step2Values.chunkOverlap ?? 50,
      topK: step2Values.topK ?? 3,
      enableHybridSearch: step2Values.enableHybridSearch ?? '0',
      ...(step2Values.enableHybridSearch === '1' && {
        denseWeight: step2Values.denseWeight,
        bm25Weight: step2Values.bm25Weight,
      }),
      files,
    });
  };

  function renderStep1() {
    return (
      <Form form={step1Form} layout="vertical" className="max-w-2xl">
        <Form.Item name="documentName" label="문서 그룹명" required rules={[{ required: true, message: '문서 그룹명을 입력해 주세요.' }]}>
          <Input placeholder="문서 이름을 입력하세요" />
        </Form.Item>
        <Form.Item name="description" label="설명">
          <Input.TextArea placeholder="지식에 대한 설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 5 }} />
        </Form.Item>
        <Form.Item name="fileList" label="파일 업로드" required valuePropName="fileList" getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}>
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
      <div className="flex gap-4 w-full h-full min-h-0">
        {/* 왼쪽: 설정 패널 */}
        <div className="flex-1 min-w-0 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
            <span className="text-sm font-semibold text-gray-700">설정</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <Form form={step2Form} layout="vertical" initialValues={{ chunkSize: 500, chunkOverlap: 50, topK: 3, enableHybridSearch: '0', denseWeight: 0.0, bm25Weight: 1.0 }}>
              {/* 청크 설정 */}
              <div className="text-sm font-semibold text-gray-700 mb-3 mt-1">청크 설정</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="chunkSize" label="최대 청크 길이" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={1} max={10000} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="chunkOverlap" label="청크 중첩" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
              </Row>
              <Button variant="outlined" className="w-full" onClick={handlePreviewChunk} loading={isPreviewing}>
                청크 미리보기
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
                    <InputNumber style={{ width: '100%' }} min={1} />
                  </Form.Item>
                </Col>
              </Row>
              {searchType === '1' && (
                <Row gutter={16}>
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
            </Form>
          </div>
        </div>

        {/* 오른쪽: 미리보기 패널 */}
        <div className="flex-1 min-w-0 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
            <span className="text-sm font-semibold text-gray-700">미리보기 (10건)</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {chunks.length === 0 ? (
              <NoData message="청크 데이터가 없습니다." iconSize={32} fontSize="text-sm" gap={1} />
            ) : (
              <div className="flex flex-col gap-3">
                {chunks.map((chunk) => (
                  <ChunkCard key={chunk.id} chunk={chunk} />
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

    const isHybrid = step2Values.enableHybridSearch === '1';

    return (
      <div className="max-w-xl">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <header className="flex items-center gap-2.5 border-b border-[#F1F3F5] px-5 py-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bt-primary-soft)]">
              <ClipboardCheck className="size-[18px] text-[var(--color-bt-primary)]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#495057]">생성 설정 확인</h3>
              <p className="text-xs text-[#888B9A]">아래 설정으로 지식을 생성합니다.</p>
            </div>
          </header>
          <div className="divide-y divide-[#F1F3F5]">
            <ReviewGroup icon={FileText} title="문서 정보">
              <SummaryRow label="문서 그룹명" value={step1Values.documentName ?? '-'} strong />
              <SummaryRow label="설명" value={step1Values.description || '-'} />
              <SummaryRow label="업로드 파일" value={fileList.length > 0 ? `${fileList.length}개` : '-'} />
            </ReviewGroup>
            <ReviewGroup icon={Blocks} title="청킹 설정">
              <SummaryRow label="최대 청크 길이" value={step2Values.chunkSize} />
              <SummaryRow label="청크 중첩" value={step2Values.chunkOverlap} />
            </ReviewGroup>
            <ReviewGroup icon={Search} title="검색 설정">
              <SummaryRow label="검색 유형" value={searchLabel} strong />
              <SummaryRow label="상위 K" value={step2Values.topK} />
              {isHybrid && <SummaryRow label="Dense Weight" value={step2Values.denseWeight} />}
              {isHybrid && <SummaryRow label="BM25 Weight" value={step2Values.bm25Weight} />}
            </ReviewGroup>
          </div>
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
            <Button color="primary" variant="solid" onClick={handleSubmit} loading={isProcessing} disabled={!canWrite}>
              저장
            </Button>
          </Col>
        )}
      </Row>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps current={currentStep} items={steps.map((step) => ({ title: step.title }))} size="small" style={{ width: `${steps.length * 250}px` }} responsive={false} />
      </div>
      <div className="w-full flex-1 min-h-0 bg-white bt-shadow flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col p-7 pb-0">
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }} className="overflow-y-auto h-full">
            {renderStep1()}
          </div>
          <div style={{ display: currentStep === 1 ? 'flex' : 'none' }} className="flex-1 min-h-0 w-full">
            {renderStep2()}
          </div>
          <div style={{ display: currentStep === 2 ? 'block' : 'none' }} className="overflow-y-auto h-full">
            {renderStep3()}
          </div>
        </div>
        <div className="w-full px-7 pb-7 pt-4">{renderFooter()}</div>
      </div>
    </div>
  );
}
