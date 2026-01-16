import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { Inference, RetrainDetail, RetrainListItem, RetrainUpdateDatas, SnapshotCompareResult, SnapshotCreateDatas, SnapshotListItem } from '../types';
import type { AoeListItem, GenerateSentenceDatas, GenerateSentenceResponse } from '../types/aoe';
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
  IntentBasicInfoUpdateDatas,
  IntentCreateDatas,
  IntentItem,
  IntentListItem,
  IntentSentenceCreateBulkDatas,
  IntentSentenceCreateDatas,
  IntentSentenceListItem,
} from '../types/intent';
import type { ModelBasicInfoUpdateDatas, ModelCreateDatas, ModelItem, ModelListItem } from '../types/model';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const modelApi = {
  getModels: async (params?: Record<string, unknown>): Promise<ModelListItem[]> => {
    const response = await apiClient.get<ListResponse<ModelListItem>>('/model-list', { params });
    return extractList(response);
  },
  getModel: async (params?: Record<string, unknown>): Promise<ModelItem> => {
    const response = await apiClient.get<DetailResponse<ModelItem>>('/model-detail', { params });
    return extractDetail(response);
  },
  createModel: async (data: ModelCreateDatas) => {
    const response = await apiClient.post('/model-create', data);
    return response;
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
  getIntents: async (params?: Record<string, unknown>): Promise<IntentListItem[]> => {
    const response = await apiClient.get<ListResponse<IntentListItem>>('/intent-list', { params });
    return extractList(response);
  },
  getIntent: async (params?: Record<string, unknown>): Promise<IntentItem> => {
    const response = await apiClient.get<DetailResponse<IntentItem>>('/intent-detail', { params });
    return extractDetail(response);
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
  getIntentSentences: async (params?: Record<string, unknown>): Promise<IntentSentenceListItem[]> => {
    const response = await apiClient.get<ListResponse<IntentSentenceListItem>>('/intent-sentence-list', { params });
    return extractList(response);
  },
  createIntentSentence: async ({ params, data }: { params: Record<string, unknown>; data: IntentSentenceCreateDatas }) => {
    const response = await apiClient.post('/intent-sentence-create', data, { params });
    return response;
  },
  createIntentSentenceBulk: async ({ params, data }: { params: Record<string, unknown>; data: IntentSentenceCreateBulkDatas }) => {
    const response = await apiClient.post('/intent-sentence-create-bulk', data, { params });
    return response;
  },
  deleteIntentSentence: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/intent-sentence-delete', { params });
    return response;
  },
  getEntities: async (params?: Record<string, unknown>): Promise<EntityListItem[]> => {
    const response = await apiClient.get<ListResponse<EntityListItem>>('/entity-list', { params });
    return extractList(response);
  },
  getEntity: async (params?: Record<string, unknown>): Promise<EntityItem> => {
    const response = await apiClient.get<DetailResponse<EntityItem>>('/entity-detail', { params });
    return extractDetail(response);
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
    const response = await apiClient.get<ListResponse<EntityValueListItem>>('/entity-values-list', { params });
    return extractList(response);
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
  getAoeAgents: async (params?: Record<string, unknown>): Promise<AoeListItem[]> => {
    const response = await apiClient.get<ListResponse<AoeListItem>>('/aoe-agent-list', { params });
    return extractList(response);
  },
  generateSentence: async ({ params, data }: { params: Record<string, unknown>; data: GenerateSentenceDatas }): Promise<string[]> => {
    const response = await apiClient.post<DetailResponse<GenerateSentenceResponse>>('/aoe-agent-sentence', data, { params });
    return extractDetail(response)?.sentences ?? [];
  },
  getEvaluations: async (params?: Record<string, unknown>): Promise<EvaluationListItem[]> => {
    const response = await apiClient.get<ListResponse<EvaluationListItem>>('/evaluation-list', { params });
    return extractList(response);
  },
  getEvaluation: async (params?: Record<string, unknown>): Promise<EvaluationItem> => {
    const response = await apiClient.get<DetailResponse<EvaluationItem>>('/evaluation-detail', { params });
    return extractDetail(response);
  },
  createEvaluation: async ({ params, data }: { params: Record<string, unknown>; data: EvaluationCreateDatas }) => {
    const response = await apiClient.post('/evaluation-create', data, { params });
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
    const response = await apiClient.get<ListResponse<EvaluationQuestionListItem>>('/evaluation-question-list', { params });
    return extractList(response);
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
  getEvaluationResults: async (params?: Record<string, unknown>): Promise<EvaluationResultListItem[]> => {
    const response = await apiClient.get<ListResponse<EvaluationResultListItem>>('/evaluation-result-list', { params });
    return extractList(response);
  },
  getEvaluationResultsByEvalDate: async (params?: Record<string, unknown>): Promise<EvaluationResultListByEvalDateItem[]> => {
    const response = await apiClient.get<ListResponse<EvaluationResultListByEvalDateItem>>('/evaluation-result-date-list', { params });
    return extractList(response);
  },
  getEvaluationResultsByEvalDateAndQuestionSeq: async (params?: Record<string, unknown>): Promise<EvaluationResultListByEvalDateAndQuestionSeqItem[]> => {
    const response = await apiClient.get<ListResponse<EvaluationResultListByEvalDateAndQuestionSeqItem>>('/evaluation-result-date-seq-list', { params });
    return extractList(response);
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
    const response = await apiClient.get<ListResponse<RetrainListItem>>('/intent-retrain-list', { params });
    return extractList(response);
  },
  getRetrainDetail: async (params?: Record<string, unknown>): Promise<RetrainDetail> => {
    const response = await apiClient.get<DetailResponse<RetrainDetail>>('/intent-retrain-detail', { params });
    return extractDetail(response);
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
    const response = await apiClient.get<ListResponse<SnapshotListItem>>('/snapshot-list', { params });
    return extractList(response);
  },
  compareSnapshots: async (params: { modelId: string; snapshotVersion: string; compareVersion: string }): Promise<SnapshotCompareResult> => {
    const response = await apiClient.get<DetailResponse<SnapshotCompareResult>>('/snapshot-compare', { params });
    return extractDetail(response);
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
    const response = await apiClient.post<DetailResponse<InferenceResponse>>('/model-inference', data, { params });
    return extractDetail(response);
  },
};
