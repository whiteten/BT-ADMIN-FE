import ApiClient, { type ApiResponse } from '@/shared-util';
import type { Inference, RetrainDetail, RetrainListItem, RetrainUpdateDatas, SnapshotCompareResult, SnapshotCreateDatas, SnapshotListItem } from '../types';
import type { AoeAgentItem, AoeListItem, GenerateSentenceDatas, GenerateSentenceResponse } from '../types/aoe';
import type {
  EntityBasicInfoUpdateDatas,
  EntityCreateDatas,
  EntityItem,
  EntityListItem,
  EntityValueCreateDatas,
  EntityValueListItem,
  EntityValueUpdateDatas,
} from '../types/entity';
import type {
  EvaluationCopyDatas,
  EvaluationCreateDatas,
  EvaluationItem,
  EvaluationListItem,
  EvaluationQuestionCreateBulkDatas,
  EvaluationQuestionCreateDatas,
  EvaluationQuestionListItem,
  EvaluationQuestionUpdateDatas,
  EvaluationResultListByEvalDateAndQuestionSeqItem,
  EvaluationResultListByEvalDateItem,
  EvaluationResultListItem,
  EvaluationUpdateDatas,
  ExecuteEvaluationDatas,
} from '../types/evaluation';
import type { InferenceResponse } from '../types/inference';
import type {
  ExcelImportResult,
  IntentBasicInfoUpdateDatas,
  IntentCreateDatas,
  IntentItem,
  IntentListItem,
  IntentSentenceCreateBulkDatas,
  IntentSentenceCreateDatas,
  IntentSentenceListItem,
  IntentSentenceUpdateDatas,
} from '../types/intent';
import type { KeywordCreateDatas, KeywordListItem, KeywordUpdateDatas } from '../types/keyword';
import type { GenerateExcelDatas, ModelBasicInfoUpdateDatas, ModelCreateDatas, ModelImportResult, ModelItem, ModelListItem } from '../types/model';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const modelApi = {
  getModels: async (params?: Record<string, unknown>): Promise<ModelListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: ModelListItem[] }>>('/model-list', { params });
    return response.data?.data?.items ?? [];
  },
  getModel: async (params?: Record<string, unknown>): Promise<ModelItem> => {
    const response = await apiClient.get<ApiResponse<ModelItem>>('/model-detail', { params });
    return response.data?.data;
  },
  createModel: async (data: ModelCreateDatas): Promise<ModelImportResult> => {
    const formData = new FormData();
    if (data.file) formData.append('uploadFile', data.file);
    formData.append('modelName', data.modelName);
    formData.append('expansion1', data.expansion1 ?? '');
    formData.append('modelType', String(data.modelType));
    const response = await apiClient.post<ApiResponse<ModelImportResult>>('/model-create', formData);
    return response.data?.data;
  },
  updateModel: async ({ params, data }: { params: Record<string, unknown>; data: ModelBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/model-update', data, { params });
    return response;
  },
  deleteModel: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/model-delete', { params });
    return response;
  },
  trainModel: async ({ params, data }: { params: Record<string, unknown>; data: Record<string, unknown> }) => {
    const response = await apiClient.post('/model-train', data, { params });
    return response;
  },
  deployModel: async ({ params, data }: { params: Record<string, unknown>; data: Record<string, unknown> }) => {
    const response = await apiClient.post('/model-deploy', data, { params });
    return response;
  },
  exportModel: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/model-intent-entity-export', { params, responseType: 'blob' });
    return response;
  },
  getIntents: async (params?: Record<string, unknown>): Promise<IntentListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: IntentListItem[] }>>('/intent-list', { params });
    return response.data?.data?.items ?? [];
  },
  getIntent: async (params?: Record<string, unknown>): Promise<IntentItem> => {
    const response = await apiClient.get<ApiResponse<IntentItem>>('/intent-detail', { params });
    return response.data?.data;
  },
  createIntent: async ({ params, data }: { params: Record<string, unknown>; data: IntentCreateDatas }) => {
    const response = await apiClient.post('/intent-create', data, { params });
    return response;
  },
  updateIntent: async ({ params, data }: { params: Record<string, unknown>; data: IntentBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/intent-update', data, { params });
    return response;
  },
  deleteIntent: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/intent-delete', { params });
    return response;
  },
  importIntent: async ({ params, data }: { params: Record<string, unknown>; data: File }): Promise<ExcelImportResult> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    const response = await apiClient.post<ApiResponse<ExcelImportResult>>('/intent-excel-import', formData, { params });
    return response.data?.data;
  },
  exportIntent: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/intent-excel-export', { params, responseType: 'blob' });
    return response;
  },
  getIntentSentences: async (params?: Record<string, unknown>): Promise<IntentSentenceListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: IntentSentenceListItem[] }>>('/intent-sentence-list', { params });
    return response.data?.data?.items ?? [];
  },
  createIntentSentence: async ({ params, data }: { params: Record<string, unknown>; data: IntentSentenceCreateDatas }) => {
    const response = await apiClient.post('/intent-sentence-create', data, { params });
    return response;
  },
  createIntentSentenceBulk: async ({ params, data }: { params: Record<string, unknown>; data: IntentSentenceCreateBulkDatas }) => {
    const response = await apiClient.post('/intent-sentence-create-bulk', data, { params });
    return response;
  },
  updateIntentSentence: async ({ params, data }: { params: Record<string, unknown>; data: IntentSentenceUpdateDatas }) => {
    const response = await apiClient.put('/intent-sentence-update', data, { params });
    return response;
  },
  deleteIntentSentence: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/intent-sentence-delete', { params });
    return response;
  },
  importIntentSentence: async ({ params, data }: { params: Record<string, unknown>; data: File }): Promise<ExcelImportResult> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    const response = await apiClient.post<ApiResponse<ExcelImportResult>>('/intent-sentence-excel-import', formData, { params });
    return response.data?.data;
  },
  exportIntentSentence: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/intent-sentence-excel-export', { params, responseType: 'blob' });
    return response;
  },
  getEntities: async (params?: Record<string, unknown>): Promise<EntityListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: EntityListItem[] }>>('/entity-list', { params });
    return response.data?.data?.items ?? [];
  },
  getEntity: async (params?: Record<string, unknown>): Promise<EntityItem> => {
    const response = await apiClient.get<ApiResponse<EntityItem>>('/entity-detail', { params });
    return response.data?.data;
  },
  createEntity: async ({ params, data }: { params: Record<string, unknown>; data: EntityCreateDatas }) => {
    const response = await apiClient.post('/entity-create', data, { params });
    return response;
  },
  updateEntity: async ({ params, data }: { params: Record<string, unknown>; data: EntityBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/entity-update', data, { params });
    return response;
  },
  deleteEntity: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/entity-delete', { params });
    return response;
  },
  getEntityValues: async (params?: Record<string, unknown>): Promise<EntityValueListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: EntityValueListItem[] }>>('/entity-values-list', { params });
    return response.data?.data?.items ?? [];
  },
  createEntityValue: async ({ params, data }: { params: Record<string, unknown>; data: EntityValueCreateDatas }) => {
    const response = await apiClient.post('/entity-values-create', data, { params });
    return response;
  },
  updateEntityValue: async ({ params, data }: { params: Record<string, unknown>; data: EntityValueUpdateDatas }) => {
    const response = await apiClient.put('/entity-values-update', data, { params });
    return response;
  },
  deleteEntityValue: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/entity-values-delete', { params });
    return response;
  },
  importEntity: async ({ params, data }: { params: Record<string, unknown>; data: File }): Promise<ExcelImportResult> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    const response = await apiClient.post<ApiResponse<ExcelImportResult>>('/entity-excel-import', formData, { params });
    return response.data?.data;
  },
  exportEntity: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/entity-excel-export', { params, responseType: 'blob' });
    return response;
  },
  exportIntentAndEntity: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/model-intent-entity-export', { params, responseType: 'blob' });
    return response;
  },
  getKeywords: async (params?: Record<string, unknown>): Promise<KeywordListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: KeywordListItem[] }>>('/keyword-list', { params });
    return response.data?.data?.items ?? [];
  },
  createKeyword: async ({ params, data }: { params: Record<string, unknown>; data: KeywordCreateDatas }) => {
    await apiClient.post('/keyword-create', data, { params });
  },
  updateKeyword: async ({ params, data }: { params: Record<string, unknown>; data: KeywordUpdateDatas }) => {
    await apiClient.put('/keyword-update', data, { params });
  },
  deleteKeyword: async (params: Record<string, unknown>) => {
    await apiClient.delete('/keyword-delete', { params });
  },
  importKeyword: async ({ params, data }: { params: Record<string, unknown>; data: File }): Promise<ExcelImportResult> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    const response = await apiClient.post<ApiResponse<ExcelImportResult>>('/keyword-excel-import', formData, { params });
    return response.data?.data;
  },
  exportKeyword: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/keyword-excel-export', { params, responseType: 'blob' });
    return response;
  },
  getAoeAgents: async (params?: Record<string, unknown>): Promise<AoeListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: AoeListItem[] }>>('/aoe-agent-list', { params });
    return response.data?.data?.items ?? [];
  },
  getAoeAgent: async (params?: Record<string, unknown>): Promise<AoeAgentItem> => {
    const response = await apiClient.get<ApiResponse<AoeAgentItem>>('/aoe-agent-detail', { params });
    return response.data?.data;
  },
  generateSentence: async ({ params, data }: { params: Record<string, unknown>; data: GenerateSentenceDatas }): Promise<string[]> => {
    const response = await apiClient.post<ApiResponse<GenerateSentenceResponse>>('/aoe-agent-sentence', data, { params });
    return response.data?.data?.sentences ?? [];
  },
  getEvaluations: async (params?: Record<string, unknown>): Promise<EvaluationListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: EvaluationListItem[] }>>('/evaluation-list', { params });
    return response.data?.data?.items ?? [];
  },
  getEvaluation: async (params?: Record<string, unknown>): Promise<EvaluationItem> => {
    const response = await apiClient.get<ApiResponse<EvaluationItem>>('/evaluation-detail', { params });
    return response.data?.data;
  },
  createEvaluation: async ({ params, data }: { params: Record<string, unknown>; data: EvaluationCreateDatas }) => {
    const response = await apiClient.post('/evaluation-create', data, { params });
    return response;
  },
  copyEvaluation: async ({ params, data }: { params: Record<string, unknown>; data: EvaluationCopyDatas }) => {
    const response = await apiClient.post('/evaluation-copy', data, { params });
    return response;
  },
  updateEvaluation: async ({ params, data }: { params: Record<string, unknown>; data: EvaluationUpdateDatas }) => {
    const response = await apiClient.put('/evaluation-update', data, { params });
    return response;
  },
  deleteEvaluation: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/evaluation-delete', { params });
    return response;
  },
  getEvaluationQuestions: async (params?: Record<string, unknown>): Promise<EvaluationQuestionListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: EvaluationQuestionListItem[] }>>('/evaluation-question-list', { params });
    return response.data?.data?.items ?? [];
  },
  createEvaluationQuestion: async ({ params, data }: { params: Record<string, unknown>; data: EvaluationQuestionCreateDatas }) => {
    const response = await apiClient.post('/evaluation-question-create', data, { params });
    return response;
  },
  createEvaluationQuestionBulk: async ({ params, data }: { params: Record<string, unknown>; data: EvaluationQuestionCreateBulkDatas }) => {
    const response = await apiClient.post('/evaluation-question-create-bulk', data, { params });
    return response;
  },
  updateEvaluationQuestion: async ({ params, data }: { params: Record<string, unknown>; data: EvaluationQuestionUpdateDatas }) => {
    const response = await apiClient.put('/evaluation-question-update', data, { params });
    return response;
  },
  deleteEvaluationQuestion: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/evaluation-question-delete', { params });
    return response;
  },
  importEvaluationQuestion: async ({ params, data }: { params: Record<string, unknown>; data: File }): Promise<ExcelImportResult> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    const response = await apiClient.post<ApiResponse<ExcelImportResult>>('/evaluation-question-excel-import', formData, { params });
    return response.data?.data;
  },
  exportEvaluationQuestion: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/evaluation-question-excel-export', { params, responseType: 'blob' });
    return response;
  },
  getEvaluationResults: async (params?: Record<string, unknown>): Promise<EvaluationResultListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: EvaluationResultListItem[] }>>('/evaluation-result-list', { params });
    return response.data?.data?.items ?? [];
  },
  getEvaluationResultsByEvalDate: async (params?: Record<string, unknown>): Promise<EvaluationResultListByEvalDateItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: EvaluationResultListByEvalDateItem[] }>>('/evaluation-result-date-list', { params });
    return response.data?.data?.items ?? [];
  },
  getEvaluationResultsByEvalDateAndQuestionSeq: async (params?: Record<string, unknown>): Promise<EvaluationResultListByEvalDateAndQuestionSeqItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: EvaluationResultListByEvalDateAndQuestionSeqItem[] }>>('/evaluation-result-date-seq-list', { params });
    return response.data?.data?.items ?? [];
  },
  deleteEvaluationResult: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/evaluation-result-delete', { params });
    return response;
  },
  executeEvaluation: async ({ params, data }: { params: Record<string, unknown>; data: ExecuteEvaluationDatas }) => {
    const response = await apiClient.post('/model-evaluate', data, { params });
    return response;
  },
  getRetrains: async (params?: Record<string, unknown>): Promise<RetrainListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: RetrainListItem[] }>>('/intent-retrain-list', { params });
    return response.data?.data?.items ?? [];
  },
  getRetrainDetail: async (params?: Record<string, unknown>): Promise<RetrainDetail> => {
    const response = await apiClient.get<ApiResponse<RetrainDetail>>('/intent-retrain-detail', { params });
    return response.data?.data;
  },
  updateRetrain: async ({ params, data }: { params: Record<string, unknown>; data: RetrainUpdateDatas }) => {
    const response = await apiClient.put('/intent-retrain-update', data, { params });
    return response;
  },
  applyRetrain: async ({ params, data }: { params: Record<string, unknown>; data: Record<string, unknown> }) => {
    const response = await apiClient.post('/intent-retrain-apply', data, { params });
    return response;
  },
  getSnapshots: async (params?: Record<string, unknown>): Promise<SnapshotListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: SnapshotListItem[] }>>('/snapshot-list', { params });
    return response.data?.data?.items ?? [];
  },
  compareSnapshots: async (params: { modelId: string; snapshotVersion: string; compareVersion: string }): Promise<SnapshotCompareResult> => {
    const response = await apiClient.get<ApiResponse<SnapshotCompareResult>>('/snapshot-compare', { params });
    return response.data?.data;
  },
  createSnapshot: async ({ params, data }: { params: Record<string, unknown>; data: SnapshotCreateDatas }) => {
    const response = await apiClient.post('/snapshot-create', data, { params });
    return response;
  },
  deleteSnapshot: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/snapshot-delete', { params });
    return response;
  },
  restoreSnapshot: async (params: { modelId: string; modelVersion: string }) => {
    const response = await apiClient.post('/snapshot-restore', {}, { params });
    return response;
  },
  executeInference: async ({ params, data }: { params: Record<string, unknown>; data: Inference }): Promise<InferenceResponse> => {
    const response = await apiClient.post<ApiResponse<InferenceResponse>>('/model-inference', data, { params });
    return response.data?.data;
  },
  generateExcel: async ({ params, data }: { params: Record<string, unknown>; data: GenerateExcelDatas }) => {
    const response = await apiClient.post<Blob>('/excel-generate', data, { params, responseType: 'blob' });
    return response;
  },
};
