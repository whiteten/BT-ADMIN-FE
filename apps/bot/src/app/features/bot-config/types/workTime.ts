export interface WorkTime {
  worktimeId: number;
  tenantId: number;
  worktimeType: string;
  worktimeName: string;
  groupKey: string;
  worktimeDesc: string;
  workUser: number;
  workTime: string;
}

export type WorkTimeListItem = Pick<WorkTime, 'worktimeId' | 'worktimeName'>;
