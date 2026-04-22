export interface KnowledgeListItem {
  documentId: string;
  documentName: string;
  description?: string;
  fileCount?: number;
  updatedAt?: string;
}

export interface KnowledgeOptionItem {
  optionId?: string;
  collection?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  topK?: number;
  enableHybridSearch?: string;
  denseWeight?: number;
  bm25Weight?: number;
}

export interface KnowledgeItem extends KnowledgeListItem {
  option?: KnowledgeOptionItem;
}

export interface KnowledgeUpdateDatas {
  documentName?: string;
  description?: string;
  option?: KnowledgeOptionItem;
}

export interface KnowledgeFileItem {
  fileId: string;
  fileName: string;
  chunkCount?: number;
  roleCode?: number;
  uploadedAt?: string;
}

export type MetaType = 'string' | 'number' | 'time' | 'boolean';

export interface KnowledgeMetadataItem {
  metaId: string;
  metaName: string;
  metaType: MetaType;
  isBuiltIn?: boolean;
}

export interface KnowledgeChunkData {
  id: number;
  characters: number;
  content: string;
}

export interface KnowledgeSearchChunk {
  chunk: string;
  score: number;
  chunkIndex: number;
  chunkCharacters: number;
  filename: string;
}

export interface KnowledgeSearchRecord {
  id: number;
  documentId: string;
  query: string;
  updatedAt: string;
}

export type KnowledgeEvalStatus = 'INACTIVE' | 'ACTIVE' | 'PENDING';

export interface KnowledgeEvalItem {
  evalId: string;
  evalName: string;
  description?: string;
  status?: KnowledgeEvalStatus;
  itemCount?: number;
  createdAt?: string;
}

export interface KnowledgeEvalExecution {
  resultId: string;
  evalId: string;
  evalName: string;
  precision?: number;
  recall?: number;
  f1?: number;
  mrr?: number;
  ndcg?: number;
  map?: number;
}

export interface KnowledgeEvalResultDoc {
  content: string;
  similarity: number;
}

export interface KnowledgeEvalResultItem {
  questionIndex: number;
  question: string;
  retrievedDocs: KnowledgeEvalResultDoc[];
  expectedAnswer?: string;
}

export interface KnowledgeEvalResult {
  resultId: string;
  evalName: string;
  items: KnowledgeEvalResultItem[];
}

export interface KnowledgeChunkItem {
  chunkId: string;
  chunk: string;
  chunkIndex: number;
  chunkCharacters?: number;
  fileName: string;
}

export interface EvalQuestionSetting {
  id: string;
  question: string;
  answer: string;
}

export interface EvalChunkSetting {
  chunkId: string;
  questions: EvalQuestionSetting[];
}

export interface KnowledgeEvalCreateDatas {
  evalName: string;
  description?: string;
  documentId: string;
  chunkSettings: EvalChunkSetting[];
}

export interface KnowledgeEvalLLMGenerateResult {
  chunkId: string;
  questions: { question: string; answer: string }[];
}
