export interface Snapshot {
  modelId: string;
  modelVersion: string;
  modelVersionName: string;
  workUser: number;
  workTime: string;
}

export type SnapshotListItem = Snapshot;
export type SnapshotCreateDatas = Pick<Snapshot, 'modelVersion' | 'modelVersionName'>;
