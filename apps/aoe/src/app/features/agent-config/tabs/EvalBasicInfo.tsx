import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Checkbox, Col, Form, type FormProps, Input, Modal, Row, Select } from 'antd';
import { Plus, Settings, X } from 'lucide-react';
import { Log } from '@/log';
import ApiClient, { type ListResponse, extractList, toast } from '@/shared-util';
import {
  knowledgeQueryKeys,
  useDeleteKnowledgeEval,
  useGenerateKnowledgeEvalLLM,
  useGetKnowledgeEval,
  useGetKnowledgeFiles,
  useUpdateKnowledgeEval,
} from '../hooks/useKnowledgeQueries';
import type { EvalChunkSetting, EvalGenerateDocItem, EvalQuestionSetting, KnowledgeChunkItem, KnowledgeEvalUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const apiClient = new ApiClient({ serviceURL: '/bff' });

const DIFFICULTY_OPTIONS = [
  { label: '보통', value: '보통' },
  { label: '복잡', value: '복잡' },
];
const CHUNK_COUNT_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ label: `${n}개`, value: n }));

interface FormValues {
  evalName: string;
  description?: string;
  fileIds: string[];
}

interface LLMSettings {
  chunkCount: number;
  difficultyLvl: string;
}

function ChunkCard({ chunk, selected, onToggle }: { chunk: KnowledgeChunkItem; selected: boolean; onToggle: (id: string) => void }) {
  return (
    <div
      onClick={() => onToggle(chunk.chunkId)}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${selected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
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
              <span className="text-xs font-semibold text-blue-600">질문 {idx + 1}</span>
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
        className="w-full py-2 border-2 border-dashed border-blue-300 rounded-lg text-xs text-blue-500 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors"
      >
        <Plus className="size-3.5" />
        질문 추가
      </button>
    </div>
  );
}

export default function EvalBasicInfo() {
  const { documentId, evalId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const modal = useModal();
  const [form] = Form.useForm<FormValues>();
  const [currentStep, setCurrentStep] = useState(0);

  const [availableChunks, setAvailableChunks] = useState<KnowledgeChunkItem[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [selectedChunks, setSelectedChunks] = useState<string[]>([]);
  const [chunkSettings, setChunkSettings] = useState<EvalChunkSetting[]>([]);
  const [llmModalOpen, setLlmModalOpen] = useState(false);
  const [llmSettings, setLlmSettings] = useState<LLMSettings>({ chunkCount: 2, difficultyLvl: '보통' });

  // 초기 로드 시 기존 chunkSettings를 보존하기 위한 ref
  const pendingInit = useRef<EvalChunkSetting[] | null>(null);

  const { data: evalData, isLoading } = useGetKnowledgeEval({ params: { documentId, evalId } });
  const { data: files, isFetching: isFileFetching } = useGetKnowledgeFiles({ params: { documentId } });

  const { mutate: updateEval, isPending: isUpdating } = useUpdateKnowledgeEval({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가셋 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeEval({ documentId, evalId }).queryKey });
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeEvals({ documentId }).queryKey });
      },
      onError: (error) => Log.warn('updateKnowledgeEval failed', error),
    },
  });

  const { mutate: deleteEval, isPending: isDeleting } = useDeleteKnowledgeEval({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가셋이 삭제되었습니다.');
        navigate(`/aoe/agent-config/knowledge/${documentId}?tab=tab3`);
      },
      onError: (error) => Log.warn('deleteKnowledgeEval failed', error),
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

  const selectedFileIds: string[] = Form.useWatch('fileIds', form) ?? [];

  // evalData 로드 시 기존 데이터로 초기화
  useEffect(() => {
    if (!evalData) return;
    form.setFieldsValue({ evalName: evalData.evalName, description: evalData.description });

    if (!evalData.chunkSettings?.length) return;

    // chunkId에서 fileId 추출 (형식: <fileId>_chunk<n>)
    const fileIds = [...new Set(evalData.chunkSettings.map((s) => s.chunkId.replace(/_chunk\d+$/, '')))];
    form.setFieldValue('fileIds', fileIds);

    // 기존 chunkSettings를 FE 형식으로 변환해서 pendingInit에 보관
    pendingInit.current = evalData.chunkSettings.map((s) => ({
      chunkId: s.chunkId,
      questions: s.questions.map((q, i) => ({
        id: `${s.chunkId}-${q.seq ?? i}`,
        question: q.question,
        answer: q.answer,
      })),
    }));
  }, [evalData, form]);

  // 파일 선택이 변경될 때 청크 로드
  useEffect(() => {
    if (selectedFileIds.length === 0) {
      setAvailableChunks([]);
      setSelectedChunks([]);
      setChunkSettings([]);
      return;
    }
    setChunksLoading(true);
    Promise.all(
      selectedFileIds.map((fileId) =>
        apiClient
          .get<ListResponse<KnowledgeChunkItem>>('/aoe-knowledge-chunks', { params: { fileId } })
          .then((res) => extractList(res).map((chunk) => ({ ...chunk, fileId })))
          .catch(() => [] as KnowledgeChunkItem[]),
      ),
    )
      .then((results) => {
        setAvailableChunks(results.flat());
        // 초기 로드라면 기존 선택 복원
        if (pendingInit.current) {
          const init = pendingInit.current;
          setSelectedChunks(init.map((s) => s.chunkId));
          setChunkSettings(init);
          pendingInit.current = null;
        } else {
          setSelectedChunks([]);
          setChunkSettings([]);
        }
      })
      .finally(() => setChunksLoading(false));
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
      await form.validateFields();
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
      if (!fileMap.has(key)) fileMap.set(key, { fileName: chunk.fileName, fileId: chunk.fileId ?? '', chunks: [] });
      fileMap.get(key)?.chunks.push(chunk);
    });
    return Array.from(fileMap.values()).map(({ fileName, fileId, chunks }) => ({
      fileName,
      fileId,
      chunkDatas: chunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        chunk: chunk.chunk,
        chunkIndex: chunk.chunkIndex,
        metaData: { chunkCharacters: chunk.chunkCharacters, chunkIndex: chunk.chunkIndex, filename: chunk.fileName, fileType: chunk.fileName.split('.').pop()?.toLowerCase() },
      })),
    }));
  };

  const handleSubmit: FormProps<FormValues>['onFinish'] = (values) => {
    const activeSettings = chunkSettings.filter((s) => selectedChunks.includes(s.chunkId));
    const data: KnowledgeEvalUpdateDatas = {
      evalName: values.evalName,
      description: values.description,
      docs: buildDocs(selectedChunks),
      chunkSettings: activeSettings.map((s) => ({
        chunkId: s.chunkId,
        questions: s.questions.map((q, i) => ({ seq: i + 1, question: q.question, answer: q.answer })),
      })),
    };
    if (!documentId || !evalId) return;
    updateEval({ params: { documentId, evalId }, data });
  };

  const handleDelete = () => {
    if (!documentId || !evalId) return;
    modal.confirm.delete({ onOk: () => deleteEval({ documentId, evalId }) });
  };

  const handleLLMGenerate = () => {
    if (!documentId) return;
    generateLLM({
      params: { documentId },
      data: { docs: buildDocs(selectedChunks), chunkCount: llmSettings.chunkCount, difficultyLvl: llmSettings.difficultyLvl },
    });
  };

  const allSelected = availableChunks.length > 0 && availableChunks.every((c) => selectedChunks.includes(c.chunkId));
  const fileOptions = (files ?? []).map((f) => ({ label: `${f.fileName}${f.chunkCount !== undefined ? ` (${f.chunkCount}청크)` : ''}`, value: f.fileId }));

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit} className="flex flex-col h-full">
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          {/* Step 0: 기본정보 + 파일 선택 */}
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <Row gutter={20}>
              <Col span={12}>
                <Form.Item name="evalName" label="평가셋 이름" rules={[{ required: true, message: '평가셋 이름을 입력해 주세요.' }]}>
                  <Input placeholder="평가셋 이름을 입력하세요." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={20}>
              <Col span={12}>
                <Form.Item name="description" label="설명">
                  <Input.TextArea placeholder="평가셋에 대한 설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 5 }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={20}>
              <Col span={12}>
                <Form.Item name="fileIds" label="파일 선택" rules={[{ required: true, message: '파일을 선택해 주세요.' }]}>
                  {isFileFetching ? <FallbackSpinner /> : <Select mode="multiple" placeholder="파일을 선택하세요." options={fileOptions} allowClear />}
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Step 1: RAG Chunk 선택 + Q&A 편집 */}
          <div style={{ display: currentStep === 1 ? 'flex' : 'none' }} className="flex-1 min-h-0 w-full gap-4">
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

            {/* 오른쪽: Q&A 편집 */}
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

          {/* Footer */}
          <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pt-4 pb-7 mt-auto">
            <Col>
              <Button variant="solid" onClick={() => navigate(`/aoe/agent-config/knowledge/${documentId}?tab=tab3`)}>
                취소
              </Button>
            </Col>
            <Col>
              <Button color="red" variant="solid" loading={isDeleting} onClick={handleDelete}>
                삭제
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
                <Button color="primary" variant="solid" htmlType="submit" loading={isUpdating} disabled={selectedChunks.length === 0}>
                  저장
                </Button>
              </Col>
            )}
          </Row>
        </>
      )}

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
    </Form>
  );
}
