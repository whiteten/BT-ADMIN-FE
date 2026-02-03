import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import dayjs from 'dayjs';
import { type MutationHookOptions, type QueryHookWithParamsOptions, downloadBlob, extractFileName } from '@/shared-util';
import { modelApi } from '../api/modelApi';
import type { AoeAgentItem, AoeListItem } from '../types/aoe';
import type { EntityItem, EntityListItem, EntityValueListItem } from '../types/entity';
import type {
  EvaluationItem,
  EvaluationListItem,
  EvaluationQuestionListItem,
  EvaluationResultListByEvalDateAndQuestionSeqItem,
  EvaluationResultListByEvalDateItem,
  EvaluationResultListItem,
} from '../types/evaluation';
import type { IntentItem, IntentListItem, IntentSentenceListItem } from '../types/intent';
import type { GenerateExcelDatas, ModelItem, ModelListItem } from '../types/model';
import type { RetrainDetail, RetrainListItem } from '../types/retrain';
import type { SnapshotCompareResult, SnapshotListItem } from '../types/snapshot';

export const modelQueryKeys = createQueryKeys('models', {
  getModels: (params?: Record<string, unknown>) => [params],
  getModel: (params?: Record<string, unknown>) => [params],
  getIntents: (params?: Record<string, unknown>) => [params],
  getIntent: (params?: Record<string, unknown>) => [params],
  getIntentSentences: (params?: Record<string, unknown>) => [params],
  getEntities: (params?: Record<string, unknown>) => [params],
  getEntity: (params?: Record<string, unknown>) => [params],
  getEntityValues: (params?: Record<string, unknown>) => [params],
  getAoeAgents: (params?: Record<string, unknown>) => [params],
  getAoeAgent: (params?: Record<string, unknown>) => [params],
  getEvaluations: (params?: Record<string, unknown>) => [params],
  getEvaluation: (params?: Record<string, unknown>) => [params],
  getEvaluationQuestions: (params?: Record<string, unknown>) => [params],
  getEvaluationResults: (params?: Record<string, unknown>) => [params],
  getEvaluationResultsByEvalDate: (params?: Record<string, unknown>) => [params],
  getEvaluationResultsByEvalDateAndQuestionSeq: (params?: Record<string, unknown>) => [params],
  getRetrains: (params?: Record<string, unknown>) => [params],
  getRetrainDetail: (params?: Record<string, unknown>) => [params],
  getSnapshots: (params?: Record<string, unknown>) => [params],
  compareSnapshots: (params?: Record<string, unknown>) => [params],
});

export const useGetModels = ({ params, queryOptions }: QueryHookWithParamsOptions<ModelListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getModels(params).queryKey,
    queryFn: () => modelApi.getModels(params),
    ...queryOptions,
  });
};

export const useGetModel = ({ params, queryOptions }: QueryHookWithParamsOptions<ModelItem> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getModel(params).queryKey,
    queryFn: () => modelApi.getModel(params),
    ...queryOptions,
  });
};

export const useCreateModel = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createModel,
    ...mutationOptions,
  });
};

export const useUpdateModel = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.updateModel,
    ...mutationOptions,
  });
};

export const useDeleteModel = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteModel,
    ...mutationOptions,
  });
};

export const useGetIntents = ({ params, queryOptions }: QueryHookWithParamsOptions<IntentListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getIntents(params).queryKey,
    queryFn: () => modelApi.getIntents(params),
    ...queryOptions,
  });
};

export const useGetIntent = ({ params, queryOptions }: QueryHookWithParamsOptions<IntentItem> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getIntent(params).queryKey,
    queryFn: () => modelApi.getIntent(params),
    ...queryOptions,
  });
};

export const useCreateIntent = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createIntent,
    ...mutationOptions,
  });
};

export const useUpdateIntent = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.updateIntent,
    ...mutationOptions,
  });
};

export const useDeleteIntent = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteIntent,
    ...mutationOptions,
  });
};

export const useTrainModel = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.trainModel,
    ...mutationOptions,
  });
};

export const useDeployModel = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deployModel,
    ...mutationOptions,
  });
};

export const useGetIntentSentences = ({ params, queryOptions }: QueryHookWithParamsOptions<IntentSentenceListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getIntentSentences(params).queryKey,
    queryFn: () => modelApi.getIntentSentences(params),
    ...queryOptions,
  });
};

export const useCreateIntentSentence = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createIntentSentence,
    ...mutationOptions,
  });
};

export const useCreateIntentSentenceBulk = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createIntentSentenceBulk,
    ...mutationOptions,
  });
};

export const useUpdateIntentSentence = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.updateIntentSentence,
    ...mutationOptions,
  });
};

export const useDeleteIntentSentence = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteIntentSentence,
    ...mutationOptions,
  });
};

export const useGetEntities = ({ params, queryOptions }: QueryHookWithParamsOptions<EntityListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getEntities(params).queryKey,
    queryFn: () => modelApi.getEntities(params),
    ...queryOptions,
  });
};

export const useGetEntity = ({ params, queryOptions }: QueryHookWithParamsOptions<EntityItem> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getEntity(params).queryKey,
    queryFn: () => modelApi.getEntity(params),
    ...queryOptions,
  });
};

export const useCreateEntity = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createEntity,
    ...mutationOptions,
  });
};

export const useUpdateEntity = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.updateEntity,
    ...mutationOptions,
  });
};

export const useDeleteEntity = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteEntity,
    ...mutationOptions,
  });
};

export const useGetEntityValues = ({ params, queryOptions }: QueryHookWithParamsOptions<EntityValueListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getEntityValues(params).queryKey,
    queryFn: () => modelApi.getEntityValues(params),
    ...queryOptions,
  });
};

export const useCreateEntityValue = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createEntityValue,
    ...mutationOptions,
  });
};

export const useUpdateEntityValue = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.updateEntityValue,
    ...mutationOptions,
  });
};

export const useDeleteEntityValue = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteEntityValue,
    ...mutationOptions,
  });
};

export const useGetAoeAgents = ({ params, queryOptions }: QueryHookWithParamsOptions<AoeListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getAoeAgents(params).queryKey,
    queryFn: () => modelApi.getAoeAgents(params),
    ...queryOptions,
  });
};

export const useGetAoeAgent = ({ params, queryOptions }: QueryHookWithParamsOptions<AoeAgentItem> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getAoeAgent(params).queryKey,
    queryFn: () => modelApi.getAoeAgent(params),
    ...queryOptions,
  });
};

export const useGenerateSentence = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.generateSentence,
    ...mutationOptions,
  });
};

export const useGetEvaluations = ({ params, queryOptions }: QueryHookWithParamsOptions<EvaluationListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getEvaluations(params).queryKey,
    queryFn: () => modelApi.getEvaluations(params),
    ...queryOptions,
  });
};

export const useGetEvaluation = ({ params, queryOptions }: QueryHookWithParamsOptions<EvaluationItem> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getEvaluation(params).queryKey,
    queryFn: () => modelApi.getEvaluation(params),
    ...queryOptions,
  });
};

export const useCreateEvaluation = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createEvaluation,
    ...mutationOptions,
  });
};

export const useUpdateEvaluation = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.updateEvaluation,
    ...mutationOptions,
  });
};

export const useDeleteEvaluation = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteEvaluation,
    ...mutationOptions,
  });
};

export const useGetEvaluationQuestions = ({ params, queryOptions }: QueryHookWithParamsOptions<EvaluationQuestionListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getEvaluationQuestions(params).queryKey,
    queryFn: () => modelApi.getEvaluationQuestions(params),
    ...queryOptions,
  });
};

export const useCreateEvaluationQuestion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createEvaluationQuestion,
    ...mutationOptions,
  });
};

export const useCreateEvaluationQuestionBulk = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createEvaluationQuestionBulk,
    ...mutationOptions,
  });
};

export const useUpdateEvaluationQuestion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.updateEvaluationQuestion,
    ...mutationOptions,
  });
};

export const useDeleteEvaluationQuestion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteEvaluationQuestion,
    ...mutationOptions,
  });
};

export const useGetEvaluationResults = ({ params, queryOptions }: QueryHookWithParamsOptions<EvaluationResultListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getEvaluationResults(params).queryKey,
    queryFn: () => modelApi.getEvaluationResults(params),
    ...queryOptions,
  });
};

export const useGetEvaluationResultsByEvalDate = ({ params, queryOptions }: QueryHookWithParamsOptions<EvaluationResultListByEvalDateItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getEvaluationResultsByEvalDate(params).queryKey,
    queryFn: () => modelApi.getEvaluationResultsByEvalDate(params),
    ...queryOptions,
  });
};

export const useGetEvaluationResultsByEvalDateAndQuestionSeq = ({ params, queryOptions }: QueryHookWithParamsOptions<EvaluationResultListByEvalDateAndQuestionSeqItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getEvaluationResultsByEvalDateAndQuestionSeq(params).queryKey,
    queryFn: () => modelApi.getEvaluationResultsByEvalDateAndQuestionSeq(params),
    ...queryOptions,
  });
};

export const useDeleteEvaluationResult = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteEvaluationResult,
    ...mutationOptions,
  });
};

export const useExecuteEvaluation = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.executeEvaluation,
    ...mutationOptions,
  });
};

export const useGetRetrains = ({ params, queryOptions }: QueryHookWithParamsOptions<RetrainListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getRetrains(params).queryKey,
    queryFn: () => modelApi.getRetrains(params),
    ...queryOptions,
  });
};

export const useGetRetrainDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<RetrainDetail> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getRetrainDetail(params).queryKey,
    queryFn: () => modelApi.getRetrainDetail(params),
    ...queryOptions,
  });
};

export const useUpdateRetrain = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.updateRetrain,
    ...mutationOptions,
  });
};

export const useApplyRetrain = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.applyRetrain,
    ...mutationOptions,
  });
};

export const useGetSnapshots = ({ params, queryOptions }: QueryHookWithParamsOptions<SnapshotListItem[]> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getSnapshots(params).queryKey,
    queryFn: () => modelApi.getSnapshots(params),
    ...queryOptions,
  });
};

export const useCreateSnapshot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.createSnapshot,
    ...mutationOptions,
  });
};

export const useDeleteSnapshot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.deleteSnapshot,
    ...mutationOptions,
  });
};

export const useRestoreSnapshot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.restoreSnapshot,
    ...mutationOptions,
  });
};

export const useCompareSnapshots = ({ params, queryOptions }: QueryHookWithParamsOptions<SnapshotCompareResult> = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.compareSnapshots(params).queryKey,
    queryFn: () => modelApi.compareSnapshots(params as { modelId: string; snapshotVersion: string; compareVersion: string }),
    ...queryOptions,
  });
};

export const useExecuteInference = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.executeInference,
    ...mutationOptions,
  });
};

export const useExportIntent = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      const response = await modelApi.exportIntent(params);
      const fileName = extractFileName(response.headers['content-disposition'], `INTENTS_${dayjs().format('YYYYMMDD')}.xlsx`);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};

export const useImportIntent = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.importIntent,
    ...mutationOptions,
  });
};

export const useExportEntity = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      const response = await modelApi.exportEntity(params);
      const fileName = extractFileName(response.headers['content-disposition'], `ENTITIES_${dayjs().format('YYYYMMDD')}.xlsx`);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};

export const useImportEntity = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.importEntity,
    ...mutationOptions,
  });
};

export const useGenerateExcel = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async ({ params, data }: { params: Record<string, unknown>; data: GenerateExcelDatas }) => {
      const response = await modelApi.generateExcel({ params, data });
      const fileName = extractFileName(response.headers['content-disposition'], `${data.fileName}.xlsx`);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};

export const useImportIntentSentence = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.importIntentSentence,
    ...mutationOptions,
  });
};

export const useExportEvaluationQuestion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      const response = await modelApi.exportEvaluationQuestion(params);
      const fileName = extractFileName(response.headers['content-disposition'], `EVAL_QUESTIONS_${dayjs().format('YYYYMMDD')}.xlsx`);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};

export const useImportEvaluationQuestion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: modelApi.importEvaluationQuestion,
    ...mutationOptions,
  });
};
