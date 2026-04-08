export interface KnowledgeListItem {
  documentId: string;
  documentName: string;
  description?: string;
  fileCount?: number;
  updatedAt?: string;
}

export type KnowledgeItem = KnowledgeListItem;

export interface KnowledgeChunkData {
  id: number;
  characters: number;
  content: string;
}
