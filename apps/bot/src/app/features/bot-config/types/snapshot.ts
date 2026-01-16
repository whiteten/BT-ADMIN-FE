export interface Snapshot {
  modelId: string;
  modelVersion: string;
  modelVersionName: string;
  workUser: number;
  workTime: string;
}

export type SnapshotListItem = Snapshot;
export type SnapshotCreateDatas = Pick<Snapshot, 'modelVersion' | 'modelVersionName'>;

// 스냅샷 비교 결과 타입
export interface SnapshotDiffItem {
  id?: string;
  type: string; // "INTENT" | "SENTENCE" | "ENTITY" | "ENTITY_VALUE" | "ENTITY_TYPEVALUES"
  label: string;
  changeStatus: string; // "추가" | "삭제" | "수정" | "변경없음"
  beforeValue?: string | null;
  afterValue?: string | null;
  children?: SnapshotDiffItem[];
}

export interface SnapshotCompareResult {
  intentDiffs: SnapshotDiffItem[];
  entityDiffs: SnapshotDiffItem[];
}

/**
 * Tree Data용 플랫 데이터 타입
 */
export interface FlatDiffItem extends SnapshotDiffItem {
  path: string[];
}
