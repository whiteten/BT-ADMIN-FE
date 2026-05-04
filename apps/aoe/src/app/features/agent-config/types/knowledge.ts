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
  chunkCount?: number;
  fileCount?: number;
  createdAt?: string;
  chunkSettings?: KnowledgeEvalChunkSetting[];
}

export interface KnowledgeEvalChunkQuestion {
  seq: number;
  question: string;
  answer: string;
}

export interface KnowledgeEvalChunkSetting {
  chunkId: string;
  questions: KnowledgeEvalChunkQuestion[];
}

export interface KnowledgeEvalUpdateDatas {
  evalName: string;
  description?: string;
  docs?: EvalGenerateDocItem[];
  chunkSettings?: KnowledgeEvalChunkSetting[];
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
  workTime?: string;
}

export interface KnowledgeEvalResultDoc {
  retrievedChunkId: string;
  resultChunkId: string;
  rank: number;
  chunk: string;
  score: number;
}

export interface KnowledgeEvalResultItem {
  resultChunkId: string;
  question: string;
  answer: string;
  precision?: number;
  recall?: number;
  f1?: number;
  mrr?: number;
  ndcg?: number;
  map?: number;
  correctChunk?: string;
  rankList: KnowledgeEvalResultDoc[];
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
  /** 청크 로딩 시 주입되는 파일 ID (docs 조립에 사용). */
  fileId?: string;
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
  docs: EvalGenerateDocItem[];
  chunkSettings: EvalChunkSetting[];
}

export interface KnowledgeEvalLLMGenerateResult {
  chunkId: string;
  questions: { question: string; answer: string }[];
}

/** RAG 엔진으로 전달하는 청크 메타데이터. */
export interface EvalGenerateChunkMeta {
  chunkCharacters?: number;
  chunkIndex?: number;
  fileType?: string;
  filename?: string;
}

/** RAG 엔진으로 전달하는 청크 데이터 항목. */
export interface EvalGenerateChunkData {
  chunkId: string;
  chunk: string;
  chunkIndex: number;
  metaData?: EvalGenerateChunkMeta;
}

/** RAG 엔진으로 전달하는 파일 단위 docs 항목. */
export interface EvalGenerateDocItem {
  fileName: string;
  fileId: string;
  chunkDatas: EvalGenerateChunkData[];
}

/** /aoe-knowledge-eval-generate 요청 바디. */
export interface EvalGenerateBody {
  docs: EvalGenerateDocItem[];
  chunkCount: number;
  difficultyLvl: string;
}

export interface EvalGenerateRequest {
  params: { documentId: string };
  data: EvalGenerateBody;
}
