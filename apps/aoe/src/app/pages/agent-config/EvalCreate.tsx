import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Checkbox, Col, Form, Input, Modal, Row, Select, Steps } from 'antd';
import { Plus, Settings, X } from 'lucide-react';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { knowledgeApi } from '../../features/agent-config/api/knowledgeApi';
import {
  knowledgeQueryKeys,
  useCreateKnowledgeEval,
  useGenerateKnowledgeEvalLLM,
  useGetKnowledge,
  useGetKnowledgeFiles,
} from '../../features/agent-config/hooks/useKnowledgeQueries';
import type { EvalChunkSetting, EvalGenerateDocItem, EvalQuestionSetting, KnowledgeChunkItem } from '../../features/agent-config/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

const DIFFICULTY_OPTIONS = [
  { label: '보통', value: '보통' },
  { label: '복잡', value: '복잡' },
];

const CHUNK_COUNT_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ label: `${n}개`, value: n }));

interface Step1FormValues {
  evalName: string;
  description?: string;
  fileIds: string[];
}

interface LLMSettings {
  chunkCount: number;
  difficultyLvl: string;
}

function ChunkCard({ chunk, selected, onToggle }: { chunk: KnowledgeChunkItem; selected: boolean; onToggle: (chunkId: string) => void }) {
  return (
    <div
      onClick={() => onToggle(chunk.chunkId)}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        selected ? 'bg-[var(--color-bt-primary-soft)] border-[var(--color-bt-primary)]' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Checkbox checked={selected} onClick={(e) => e.stopPropagation()} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 mb-1">{chunk.fileName ? `${chunk.fileName}_${chunk.chunkIndex}` : `Chunk ${chunk.chunkIndex}`}</p>
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{chunk.chunk}</p>
          <span className="text-[11px] text-gray-400 mt-1 inline-block">
            {chunk.chunkCharacters ? `${chunk.chunkCharacters.toLocaleString()}자 · ` : ''}
            {chunk.fileName ?? ''}
          </span>
        </div>
      </div>
    </div>
  );
}

function QuestionPanel({
  chunk,
  setting,
  onQuestionChange,
  onAddQuestion,
  onDeleteQuestion,
}: {
  chunk: KnowledgeChunkItem;
  setting: EvalChunkSetting;
  onQuestionChange: (chunkId: string, questionId: string, field: 'question' | 'answer', value: string) => void;
  onAddQuestion: (chunkId: string) => void;
  onDeleteQuestion: (chunkId: string, questionId: string) => void;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
      <div className="pb-2.5 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-700">
          {chunk.fileName}_{chunk.chunkIndex}
        </p>
        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{chunk.chunk}</p>
      </div>
      <div className="space-y-3">
        {setting.questions.map((q, idx) => (
          <div key={q.id} className="p-3 bg-white rounded-lg border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-bt-primary)]">질문 {idx + 1}</span>
              {setting.questions.length > 1 && (
                <button type="button" onClick={() => onDeleteQuestion(chunk.chunkId, q.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">질문</p>
              <Input.TextArea
                value={q.question}
                onChange={(e) => onQuestionChange(chunk.chunkId, q.id, 'question', e.target.value)}
                placeholder="이 항목과 관련한 질문을 입력하세요."
                autoSize={{ minRows: 2, maxRows: 4 }}
                className="text-xs"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">기대 답변</p>
              <Input.TextArea
                value={q.answer}
                onChange={(e) => onQuestionChange(chunk.chunkId, q.id, 'answer', e.target.value)}
                placeholder="이 항목에 대한 기대 답변을 입력하세요."
                autoSize={{ minRows: 2, maxRows: 4 }}
                className="text-xs"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onAddQuestion(chunk.chunkId)}
        className="w-full py-2 border-2 border-dashed border-[var(--color-bt-primary)]/40 rounded-lg text-xs text-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-soft)] flex items-center justify-center gap-1 transition-colors"
      >
        <Plus className="size-3.5" />
        질문 추가
      </button>
    </div>
  );
}

export default function EvalCreate() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [step1Form] = Form.useForm<Step1FormValues>();
  const [currentStep, setCurrentStep] = useState(0);

  const [selectedChunks, setSelectedChunks] = useState<string[]>([]);
  const [chunkSettings, setChunkSettings] = useState<EvalChunkSetting[]>([]);

  const [llmModalOpen, setLlmModalOpen] = useState(false);
  const [llmSettings, setLlmSettings] = useState<LLMSettings>({ chunkCount: 2, difficultyLvl: '보통' });

  const { data: knowledge } = useGetKnowledge({ params: { documentId } });
  const { data: files, isFetching: isFileFetching } = useGetKnowledgeFiles({ params: { documentId } });

  const { mutate: createEval, isPending: isCreating } = useCreateKnowledgeEval({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가셋이 생성되었습니다.');
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeEvals({ documentId }).queryKey });
        navigate(`/aoe/agent-config/knowledge/${documentId}?tab=tab3`);
      },
      onError: (error) => {
        Log.warn('createKnowledgeEval failed', error);
        toast.error('평가셋 생성에 실패했습니다.');
      },
    },
  });

  const { mutate: generateLLM, isPending: isGenerating } = useGenerateKnowledgeEvalLLM({
    mutationOptions: {
      onSuccess: (data) => {
        setChunkSettings((prev) =>
          prev.map((setting) => {
            const generated = data.find((d) => d.chunkId === setting.chunkId);
            if (!generated) return setting;
            const newQuestions: EvalQuestionSetting[] = generated.questions.map((q, idx) => ({
              id: `${setting.chunkId}-llm-${Date.now()}-${idx}`,
              question: q.question,
              answer: q.answer,
            }));
            return { ...setting, questions: newQuestions.length > 0 ? newQuestions : setting.questions };
          }),
        );
        toast.success('LLM 자동생성이 완료되었습니다.');
        setLlmModalOpen(false);
      },
      onError: (error) => {
        Log.warn('generateKnowledgeEvalLLM failed', error);
        toast.error('LLM 자동생성에 실패했습니다.');
      },
    },
  });

  const selectedFileIds: string[] = Form.useWatch('fileIds', step1Form) ?? [];

  const chunkQueries = useQueries({
    queries: selectedFileIds.map((fileId) => ({
      queryKey: knowledgeQueryKeys.getKnowledgeChunks({ fileId }).queryKey,
      queryFn: async () => {
        const chunks = await knowledgeApi.getKnowledgeChunks({ fileId });
        return chunks.map((chunk) => ({ ...chunk, fileId }));
      },
    })),
  });
  const chunksLoading = chunkQueries.some((q) => q.isPending);
  const availableChunks: KnowledgeChunkItem[] = chunkQueries.flatMap((q) => q.data ?? []);

  useEffect(() => {
    setSelectedChunks([]);
    setChunkSettings([]);
  }, [selectedFileIds.join(',')]);

  const handleChunkToggle = (chunkId: string) => {
    const isSelected = selectedChunks.includes(chunkId);
    if (isSelected) {
      setSelectedChunks((prev) => prev.filter((id) => id !== chunkId));
    } else {
      setSelectedChunks((prev) => [...prev, chunkId]);
      if (!chunkSettings.find((s) => s.chunkId === chunkId)) {
        setChunkSettings((prev) => [...prev, { chunkId, questions: [{ id: `${chunkId}-q1-${Date.now()}`, question: '', answer: '' }] }]);
      }
    }
  };

  const handleSelectAll = () => {
    const allIds = availableChunks.map((c) => c.chunkId);
    const allSelected = allIds.every((id) => selectedChunks.includes(id));
    if (allSelected) {
      setSelectedChunks([]);
    } else {
      const newIds = allIds.filter((id) => !selectedChunks.includes(id));
      setSelectedChunks(allIds);
      setChunkSettings((prev) => [
        ...prev,
        ...newIds.filter((id) => !prev.find((s) => s.chunkId === id)).map((id) => ({ chunkId: id, questions: [{ id: `${id}-q1-${Date.now()}`, question: '', answer: '' }] })),
      ]);
    }
  };

  const handleQuestionChange = (chunkId: string, questionId: string, field: 'question' | 'answer', value: string) => {
    setChunkSettings((prev) => prev.map((s) => (s.chunkId === chunkId ? { ...s, questions: s.questions.map((q) => (q.id === questionId ? { ...q, [field]: value } : q)) } : s)));
  };

  const handleAddQuestion = (chunkId: string) => {
    setChunkSettings((prev) =>
      prev.map((s) => (s.chunkId === chunkId ? { ...s, questions: [...s.questions, { id: `${chunkId}-q${s.questions.length + 1}-${Date.now()}`, question: '', answer: '' }] } : s)),
    );
  };

  const handleDeleteQuestion = (chunkId: string, questionId: string) => {
    setChunkSettings((prev) => prev.map((s) => (s.chunkId === chunkId ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) } : s)));
  };

  const handleNext = async () => {
    try {
      await step1Form.validateFields();
      if (!selectedFileIds.length) {
        toast.warning('파일을 선택해 주세요.');
        return;
      }
      setCurrentStep(1);
    } catch {
      // validation error
    }
  };

  const buildDocs = (chunkIds: string[]): EvalGenerateDocItem[] => {
    const selectedChunkItems = availableChunks.filter((c) => chunkIds.includes(c.chunkId));
    const fileMap = new Map<string, { fileName: string; fileId: string; chunks: KnowledgeChunkItem[] }>();
    selectedChunkItems.forEach((chunk) => {
      const key = chunk.fileId ?? chunk.fileName;
      if (!fileMap.has(key)) {
        fileMap.set(key, { fileName: chunk.fileName, fileId: chunk.fileId ?? '', chunks: [] });
      }
      fileMap.get(key)?.chunks.push(chunk);
    });
    return Array.from(fileMap.values()).map(({ fileName, fileId, chunks }) => ({
      fileName,
      fileId,
      chunkDatas: chunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        chunk: chunk.chunk,
        chunkIndex: chunk.chunkIndex,
        metaData: {
          chunkCharacters: chunk.chunkCharacters,
          chunkIndex: chunk.chunkIndex,
          filename: chunk.fileName,
          fileType: chunk.fileName.split('.').pop()?.toLowerCase(),
        },
      })),
    }));
  };

  const handleSubmit = () => {
    const values = step1Form.getFieldsValue();
    const activeSettings = chunkSettings.filter((s) => selectedChunks.includes(s.chunkId));
    createEval({
      params: { documentId: documentId! },
      data: {
        evalName: values.evalName,
        description: values.description,
        docs: buildDocs(selectedChunks),
        chunkSettings: activeSettings,
      },
    });
  };

  const handleLLMGenerate = () => {
    const docs = buildDocs(selectedChunks);

    generateLLM({
      params: { documentId: documentId! },
      data: {
        docs,
        chunkCount: llmSettings.chunkCount,
        difficultyLvl: llmSettings.difficultyLvl,
      },
    });
  };

  const isStep2Valid = selectedChunks.length > 0;

  const steps = [{ title: '파일 선택' }, { title: 'RAG Chunk 설정' }];

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: 'AOE 관리', path: '/aoe/agent-config' },
      { title: '지식', path: '/aoe/agent-config/knowledge/list' },
      { title: ':documentName', path: `/aoe/agent-config/knowledge/${documentId}` },
      { title: '평가셋 생성', path: `/aoe/agent-config/knowledge/${documentId}/eval/create` },
    ];
    setBreadcrumb(breadcrumb, { documentName: knowledge?.documentName ?? '-' });
    return () => clearBreadcrumb();
  }, [documentId, knowledge?.documentName, setBreadcrumb, clearBreadcrumb]);

  const fileOptions = (files ?? []).map((f) => ({
    label: `${f.fileName}${f.chunkCount !== undefined ? ` (${f.chunkCount}청크)` : ''}`,
    value: f.fileId,
  }));

  const allSelected = availableChunks.length > 0 && availableChunks.every((c) => selectedChunks.includes(c.chunkId));

  function renderStep1() {
    return (
      <Form form={step1Form} layout="vertical" className="max-w-2xl">
        <Form.Item name="evalName" label="평가셋 이름" rules={[{ required: true, message: '평가셋 이름을 입력해 주세요.' }]}>
          <Input placeholder="평가셋 이름을 입력하세요." />
        </Form.Item>
        <Form.Item name="description" label="설명">
          <Input.TextArea placeholder="평가셋에 대한 설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 5 }} />
        </Form.Item>
        <Form.Item name="fileIds" label="파일 선택" rules={[{ required: true, message: '파일을 선택해 주세요.' }]}>
          {isFileFetching ? <FallbackSpinner /> : <Select mode="multiple" placeholder="파일을 선택하세요." options={fileOptions} allowClear />}
        </Form.Item>
      </Form>
    );
  }

  function renderStep2() {
    if (selectedFileIds.length === 0) {
      return <NoData message="파일을 먼저 선택해 주세요." />;
    }
    return (
      <div className="flex gap-4 w-full h-full min-h-0">
        {/* 왼쪽: 청크 목록 */}
        <div className="flex-1 min-w-0 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">RAG Chunk 선택 ({selectedChunks.length}개 선택됨)</span>
            {availableChunks.length > 0 && (
              <Checkbox checked={allSelected} onChange={handleSelectAll} className="text-xs text-gray-500">
                전체 선택
              </Checkbox>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chunksLoading ? (
              <div className="flex items-center justify-center h-32">
                <FallbackSpinner />
              </div>
            ) : availableChunks.length === 0 ? (
              <NoData message="청크 데이터가 없습니다." />
            ) : (
              availableChunks.map((chunk) => <ChunkCard key={chunk.chunkId} chunk={chunk} selected={selectedChunks.includes(chunk.chunkId)} onToggle={handleChunkToggle} />)
            )}
          </div>
        </div>

        {/* 오른쪽: 질문-답변 패널 */}
        <div className="flex-1 min-w-0 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">선택된 항목별 질문 생성-LLM 설정</span>
            {selectedChunks.length > 0 && (
              <Button size="small" icon={<Settings className="size-3.5" />} onClick={() => setLlmModalOpen(true)}>
                LLM 자동생성
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {selectedChunks.length === 0 ? (
              <NoData message="왼쪽에서 청크를 선택해 주세요." />
            ) : (
              selectedChunks.map((chunkId) => {
                const chunk = availableChunks.find((c) => c.chunkId === chunkId);
                const setting = chunkSettings.find((s) => s.chunkId === chunkId);
                if (!chunk || !setting) return null;
                return (
                  <QuestionPanel
                    key={chunkId}
                    chunk={chunk}
                    setting={setting}
                    onQuestionChange={handleQuestionChange}
                    onAddQuestion={handleAddQuestion}
                    onDeleteQuestion={handleDeleteQuestion}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate(`/aoe/agent-config/knowledge/${documentId}?tab=tab3`)}>
            취소
          </Button>
        </Col>
        {currentStep > 0 && (
          <Col>
            <Button variant="solid" onClick={() => setCurrentStep(0)}>
              이전
            </Button>
          </Col>
        )}
        {currentStep === 0 && (
          <Col>
            <Button color="primary" variant="solid" onClick={handleNext}>
              다음
            </Button>
          </Col>
        )}
        {currentStep === 1 && (
          <Col>
            <Button color="primary" variant="solid" onClick={handleSubmit} loading={isCreating} disabled={!isStep2Valid}>
              평가셋 생성
            </Button>
          </Col>
        )}
      </Row>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps current={currentStep} items={steps.map((s) => ({ title: s.title }))} size="small" style={{ width: `${steps.length * 250}px` }} responsive={false} />
      </div>
      <div className="w-full flex-1 min-h-0 bg-white bt-shadow flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col p-7 pb-0">
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }} className="overflow-y-auto h-full">
            {renderStep1()}
          </div>
          <div style={{ display: currentStep === 1 ? 'flex' : 'none' }} className="flex-1 min-h-0 w-full">
            {renderStep2()}
          </div>
        </div>
        <div className="w-full px-7 pb-7 pt-4">{renderFooter()}</div>
      </div>

      <Modal
        title="LLM 자동생성 설정"
        open={llmModalOpen}
        onCancel={() => setLlmModalOpen(false)}
        onOk={handleLLMGenerate}
        confirmLoading={isGenerating}
        okText="생성하기"
        cancelText="취소"
        centered
        destroyOnHidden
      >
        <div className="space-y-4 mt-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">청크당 질문 수</p>
            <Select value={llmSettings.chunkCount} onChange={(v) => setLlmSettings((prev) => ({ ...prev, chunkCount: v }))} options={CHUNK_COUNT_OPTIONS} className="w-full" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">난이도</p>
            <Select value={llmSettings.difficultyLvl} onChange={(v) => setLlmSettings((prev) => ({ ...prev, difficultyLvl: v }))} options={DIFFICULTY_OPTIONS} className="w-full" />
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-1">
            <p>선택된 청크: {selectedChunks.length}개</p>
            <p>총 생성될 질문: {selectedChunks.length * llmSettings.chunkCount}개</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
