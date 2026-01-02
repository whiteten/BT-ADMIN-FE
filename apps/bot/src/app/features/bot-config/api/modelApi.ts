import ApiClient, { type DetailResponse, type ListResponse, type ListWithItemsResponse, extractDetail, extractList, extractListItems } from '@/shared-util';
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
} from '../types/evaluation';
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
    const response = await apiClient.get<ListWithItemsResponse<ModelListItem>>('/model-list', { params });
    return extractListItems(response?.data);
  },
  getModel: async (params?: Record<string, unknown>): Promise<ModelItem> => {
    const response = await apiClient.get<DetailResponse<ModelItem>>('/model-detail', { params });
    return extractDetail(response?.data);
  },
  createModel: async (data: ModelCreateDatas) => {
    const response = await apiClient.post('/model-create', data);
    return response?.data;
  },
  updateModel: async ({ params, data }: { params: Record<string, unknown>; data: ModelBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/model-update', data, { params });
    return response?.data;
  },
  deleteModel: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/model-delete', { params });
    return response?.data;
  },
  getIntents: async (params?: Record<string, unknown>): Promise<IntentListItem[]> => {
    const response = await apiClient.get<ListWithItemsResponse<IntentListItem>>('/intent-list', { params });
    return extractListItems(response?.data);
  },
  getIntent: async (params?: Record<string, unknown>): Promise<IntentItem> => {
    const response = await apiClient.get<DetailResponse<IntentItem>>('/intent-detail', { params });
    return extractDetail(response?.data);
  },
  createIntent: async ({ params, data }: { params: Record<string, unknown>; data: IntentCreateDatas }) => {
    const response = await apiClient.post('/intent-create', data, { params });
    return response?.data;
  },
  updateIntent: async ({ params, data }: { params: Record<string, unknown>; data: IntentBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/intent-update', data, { params });
    return response?.data;
  },
  deleteIntent: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/intent-delete', { params });
    return response?.data;
  },
  getIntentSentences: async (params?: Record<string, unknown>): Promise<IntentSentenceListItem[]> => {
    const response = await apiClient.get<ListWithItemsResponse<IntentSentenceListItem>>('/intent-sentence-list', { params });
    return extractListItems(response?.data);
  },
  createIntentSentence: async ({ params, data }: { params: Record<string, unknown>; data: IntentSentenceCreateDatas }) => {
    const response = await apiClient.post('/intent-sentence-create', data, { params });
    return response?.data;
  },
  createIntentSentenceBulk: async ({ params, data }: { params: Record<string, unknown>; data: IntentSentenceCreateBulkDatas }) => {
    const response = await apiClient.post('/intent-sentence-create-bulk', data, { params });
    return response?.data;
  },
  deleteIntentSentence: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/intent-sentence-delete', { params });
    return response?.data;
  },
  getEntities: async (params?: Record<string, unknown>): Promise<EntityListItem[]> => {
    const response = await apiClient.get<ListWithItemsResponse<EntityListItem>>('/entity-list', { params });
    return extractListItems(response?.data);
  },
  getEntity: async (params?: Record<string, unknown>): Promise<EntityItem> => {
    const response = await apiClient.get<DetailResponse<EntityItem>>('/entity-detail', { params });
    return extractDetail(response?.data);
  },
  createEntity: async ({ params, data }: { params: Record<string, unknown>; data: EntityCreateDatas }) => {
    const response = await apiClient.post('/entity-create', data, { params });
    return response?.data;
  },
  updateEntity: async ({ params, data }: { params: Record<string, unknown>; data: EntityBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/entity-update', data, { params });
    return response?.data;
  },
  deleteEntity: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/entity-delete', { params });
    return response?.data;
  },
  getEntityValues: async (params?: Record<string, unknown>): Promise<EntityValueListItem[]> => {
    const response = await apiClient.get<ListWithItemsResponse<EntityValueListItem>>('/entity-values-list', { params });
    return extractListItems(response?.data);
  },
  createEntityValue: async ({ params, data }: { params: Record<string, unknown>; data: EntityValueCreateDatas }) => {
    const response = await apiClient.post('/entity-values-create', data, { params });
    return response?.data;
  },
  updateEntityValue: async ({ params, data }: { params: Record<string, unknown>; data: EntityValueUpdateDatas }) => {
    const response = await apiClient.put('/entity-values-update', data, { params });
    return response?.data;
  },
  deleteEntityValue: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/entity-values-delete', { params });
    return response?.data;
  },
  getAoeAgents: async (params?: Record<string, unknown>): Promise<AoeListItem[]> => {
    const response = await apiClient.get<ListResponse<AoeListItem>>('/aoe-agent-list', { params });
    return extractList(response?.data);
  },
  generateSentence: async ({ params, data }: { params: Record<string, unknown>; data: GenerateSentenceDatas }): Promise<string[]> => {
    const response = await apiClient.post<GenerateSentenceResponse>('/aoe-agent-sentence', data, { params });
    return response?.data?.data?.list?.data?.sentences ?? [];
  },
  getEvaluations: async (params?: Record<string, unknown>): Promise<EvaluationListItem[]> => {
    const response = await apiClient.get<ListWithItemsResponse<EvaluationListItem>>('/evaluation-list', { params });
    return extractListItems(response?.data);
  },
  getEvaluation: async (params?: Record<string, unknown>): Promise<EvaluationItem> => {
    const response = await apiClient.get<DetailResponse<EvaluationItem>>('/evaluation-detail', { params });
    return extractDetail(response?.data);
  },
  createEvaluation: async ({ params, data }: { params: Record<string, unknown>; data: EvaluationCreateDatas }) => {
    const response = await apiClient.post('/evaluation-create', data, { params });
    return response?.data;
  },
  updateEvaluation: async ({ params, data }: { params: Record<string, unknown>; data: EvaluationUpdateDatas }) => {
    const response = await apiClient.put('/evaluation-update', data, { params });
    return response?.data;
  },
  deleteEvaluation: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/evaluation-delete', { params });
    return response?.data;
  },
  getEvaluationQuestions: async (params?: Record<string, unknown>): Promise<EvaluationQuestionListItem[]> => {
    const response = await apiClient.get<ListResponse<EvaluationQuestionListItem>>('/evaluation-question-list', { params });
    return extractList(response?.data);
  },
  createEvaluationQuestion: async ({ params, data }: { params: Record<string, unknown>; data: EvaluationQuestionCreateDatas }) => {
    const response = await apiClient.post('/evaluation-question-create', data, { params });
    return response?.data;
  },
  createEvaluationQuestionBulk: async ({ params, data }: { params: Record<string, unknown>; data: EvaluationQuestionCreateBulkDatas }) => {
    const response = await apiClient.post('/evaluation-question-create-bulk', data, { params });
    return response?.data;
  },
  updateEvaluationQuestion: async ({ params, data }: { params: Record<string, unknown>; data: EvaluationQuestionUpdateDatas }) => {
    const response = await apiClient.put('/evaluation-question-update', data, { params });
    return response?.data;
  },
  deleteEvaluationQuestion: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/evaluation-question-delete', { params });
    return response?.data;
  },
  getEvaluationResults: async (params?: Record<string, unknown>): Promise<EvaluationResultListItem[]> => {
    const response = await apiClient.get<ListResponse<EvaluationResultListItem>>('/evaluation-result-list', { params });
    return extractList(response?.data);
  },
  getEvaluationResultsByEvalDate: async (params?: Record<string, unknown>): Promise<EvaluationResultListByEvalDateItem[]> => {
    const response = await apiClient.get<ListResponse<EvaluationResultListByEvalDateItem>>('/evaluation-result-date-list', { params });
    return extractList(response?.data);
  },
  getEvaluationResultsByEvalDateAndQuestionSeq: async (params?: Record<string, unknown>): Promise<EvaluationResultListByEvalDateAndQuestionSeqItem[]> => {
    const response = await apiClient.get<ListResponse<EvaluationResultListByEvalDateAndQuestionSeqItem>>('/evaluation-result-date-seq-list', { params });
    return extractList(response?.data);
  },
};
