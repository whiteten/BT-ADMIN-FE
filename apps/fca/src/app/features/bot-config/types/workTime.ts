export interface WorkTimeList {
  listSeq: number;
  weekdayByte: string;
  startTime: string;
  finishTime: string;
  useYn: number;
}

export interface WorkTime {
  worktimeId: number;
  tenantId: number;
  worktimeType: string;
  worktimeName: string;
  groupKey: string;
  worktimeDesc: string;
  workUser: number;
  workTime: string;
  workTimeLists?: WorkTimeList[];
}

export type WorkTimeListItem = Pick<WorkTime, 'worktimeId' | 'worktimeName'>;
